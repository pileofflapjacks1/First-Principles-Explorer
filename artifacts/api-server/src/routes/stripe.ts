import express, { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { db, usersTable, stripeProcessedSessionsTable } from "@workspace/db";
import {
  CreateStripeCheckoutSessionBody,
  CreateCreditCheckoutSessionBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { getStripeSync, getUncachableStripeClient } from "../lib/stripeClient";

const PRO_PRICE_MONTHLY_CENTS = 1200;
const PRO_PRICE_ANNUAL_CENTS = 10800; // $108/yr — 25% off $144
const PRO_PRODUCT_NAME = "FirstPrinciples Pro";

const CREDIT_PACKS: Record<"1" | "5" | "10", { cents: number; credits: number; label: string }> = {
  "1": { cents: 300, credits: 1, label: "1 Topic Credit" },
  "5": { cents: 1200, credits: 5, label: "5 Topic Credits" },
  "10": { cents: 2200, credits: 10, label: "10 Topic Credits" },
};

type BillingInterval = "month" | "year";

// Statuses that grant Pro access. `past_due`, `unpaid`, `incomplete`,
// `incomplete_expired`, `canceled`, and `paused` all revoke access — payment
// failure must immediately downgrade the user.
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

async function getProPriceId(interval: BillingInterval = "month"): Promise<string> {
  const stripe = await getUncachableStripeClient();
  // Idempotently locate or create the Pro price for the requested interval.
  const products = await stripe.products.search({
    query: `name:'${PRO_PRODUCT_NAME}' AND active:'true'`,
  });
  let product = products.data[0];
  if (!product) {
    product = await stripe.products.create({
      name: PRO_PRODUCT_NAME,
      description: "Server-hosted Grok Imagine visuals + 100 images/month",
    });
  }
  const amount =
    interval === "year" ? PRO_PRICE_ANNUAL_CENTS : PRO_PRICE_MONTHLY_CENTS;
  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 100,
  });
  const existing = prices.data.find(
    (p) =>
      p.unit_amount === amount &&
      p.currency === "usd" &&
      p.recurring?.interval === interval,
  );
  if (existing) return existing.id;
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency: "usd",
    recurring: { interval },
  });
  return price.id;
}

async function getProPortalConfigurationId(): Promise<string> {
  const stripe = await getUncachableStripeClient();
  const monthlyPriceId = await getProPriceId("month");
  const annualPriceId = await getProPriceId("year");
  const product = (await stripe.prices.retrieve(monthlyPriceId)).product;
  const productId = typeof product === "string" ? product : product.id;

  // Look for an existing configuration that already covers both prices.
  const existing = await stripe.billingPortal.configurations.list({ limit: 100 });
  const match = existing.data.find((cfg) => {
    const update = cfg.features.subscription_update;
    if (!update?.enabled) return false;
    const products = update.products ?? [];
    const target = products.find((p) => p.product === productId);
    if (!target) return false;
    const prices = new Set(target.prices);
    return prices.has(monthlyPriceId) && prices.has(annualPriceId);
  });
  if (match) return match.id;

  const created = await stripe.billingPortal.configurations.create({
    business_profile: { headline: "FirstPrinciples Pro" },
    features: {
      customer_update: { enabled: true, allowed_updates: ["email", "address"] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"],
        proration_behavior: "create_prorations",
        products: [
          { product: productId, prices: [monthlyPriceId, annualPriceId] },
        ],
      },
    },
  });
  return created.id;
}

function originFromRequest(req: Request): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const host = (req.headers["x-forwarded-host"] as string) || req.get("host");
  return `${proto}://${host}`;
}

const router: IRouter = Router();

// Webhook MUST be registered before express.json() — see app.ts
export const stripeWebhookRouter: IRouter = Router();
stripeWebhookRouter.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res): Promise<void> => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing signature" });
      return;
    }
    const sig = Array.isArray(signature) ? signature[0] : signature;
    try {
      const stripeSync = await getStripeSync();
      await stripeSync.processWebhook(req.body as Buffer, sig);
    } catch (err) {
      req.log.error({ err }, "Stripe webhook verification/sync failed");
      res.status(400).json({ error: "Webhook processing failed" });
      return;
    }

    // Signature was verified by processWebhook above; safe to parse the body.
    // If applying the event to our users table fails, return 5xx so Stripe
    // retries — otherwise entitlement state can drift permanently.
    try {
      const event = JSON.parse((req.body as Buffer).toString("utf8")) as Stripe.Event;
      await applyEventToUsers(event, req.log);
    } catch (err) {
      req.log.error({ err }, "Failed to apply Stripe event to users table");
      res.status(500).json({ error: "Failed to apply event" });
      return;
    }
    res.status(200).json({ received: true });
  },
);

async function applyEventToUsers(
  event: Stripe.Event,
  log: { info: (...a: unknown[]) => void; warn: (...a: unknown[]) => void },
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? session.metadata?.["userId"];
      if (!userId) {
        log.warn({ sessionId: session.id }, "checkout.session.completed missing userId");
        return;
      }

      // One-time payment: add topic credits to the user.
      if (session.mode === "payment") {
        const creditCountRaw = session.metadata?.["creditCount"];
        const creditCount = creditCountRaw ? parseInt(creditCountRaw, 10) : 0;
        if (creditCount > 0) {
          // Wrap dedup insert + credit increment in a transaction so that
          // a crash between the two operations never silently loses credits.
          // If the insert conflicts (duplicate event), the transaction is a
          // no-op and Stripe retries are safely handled.
          await db.transaction(async (tx) => {
            const inserted = await tx
              .insert(stripeProcessedSessionsTable)
              .values({ stripeSessionId: session.id, userId, creditsAdded: creditCount })
              .onConflictDoNothing()
              .returning({ stripeSessionId: stripeProcessedSessionsTable.stripeSessionId });
            if (inserted.length === 0) {
              log.info({ sessionId: session.id }, "Duplicate payment event skipped");
              return;
            }
            await tx
              .update(usersTable)
              .set({ topicCredits: sql`topic_credits + ${creditCount}` })
              .where(eq(usersTable.id, userId));
            log.info({ userId, creditCount }, "Topic credits added");
          });
        }
        return;
      }

      // Subscription payment: grant Pro access.
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      await db
        .update(usersTable)
        .set({
          stripeCustomerId: customerId ?? null,
          stripeSubscriptionId: subscriptionId ?? null,
          subscriptionStatus: "active",
          isPro: true,
        })
        .where(eq(usersTable.id, userId));
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const status =
        event.type === "customer.subscription.deleted" ? "canceled" : sub.status;
      const isPro =
        event.type !== "customer.subscription.deleted" &&
        ACTIVE_STATUSES.has(sub.status);
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.stripeCustomerId, customerId));
      if (!user) {
        log.warn({ customerId }, "No user mapped to Stripe customer");
        return;
      }
      const rawPeriodEnd = sub.items?.data?.[0]?.current_period_end;
      const periodEnd =
        event.type !== "customer.subscription.deleted" && rawPeriodEnd
          ? new Date(rawPeriodEnd * 1000)
          : null;
      await db
        .update(usersTable)
        .set({
          stripeSubscriptionId: sub.id,
          subscriptionStatus: status,
          isPro,
          ...(periodEnd !== null ? { subscriptionCurrentPeriodEnd: periodEnd } : {}),
        })
        .where(eq(usersTable.id, user.id));
      return;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;
      if (!customerId) return;
      await db
        .update(usersTable)
        .set({ isPro: false, subscriptionStatus: "past_due" })
        .where(eq(usersTable.stripeCustomerId, customerId));
      return;
    }
    default:
      return;
  }
}

router.post(
  "/stripe/checkout",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const parsed = CreateStripeCheckoutSessionBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const interval = parsed.data.interval;

    try {
      const stripe = await getUncachableStripeClient();
      const priceId = await getProPriceId(interval);
      const origin = originFromRequest(req);

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/pricing?checkout=success`,
        cancel_url: `${origin}/pricing?checkout=cancelled`,
        client_reference_id: userId,
        metadata: { userId },
        allow_promotion_codes: true,
      };
      if (user.stripeCustomerId) {
        sessionParams.customer = user.stripeCustomerId;
      } else if (user.email) {
        sessionParams.customer_email = user.email;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      if (!session.url) {
        res.status(502).json({ error: "Stripe did not return a checkout URL" });
        return;
      }
      res.json({ url: session.url });
    } catch (err) {
      req.log.error({ err }, "Failed to create Stripe checkout session");
      res.status(502).json({ error: "Failed to create checkout session" });
    }
  },
);

router.post(
  "/stripe/credits/checkout",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const parsed = CreateCreditCheckoutSessionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid pack selection" });
      return;
    }

    const pack = CREDIT_PACKS[parsed.data.pack as "1" | "5" | "10"];
    if (!pack) {
      res.status(400).json({ error: "Invalid pack selection" });
      return;
    }

    try {
      const stripe = await getUncachableStripeClient();
      const origin = originFromRequest(req);

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: pack.cents,
              product_data: {
                name: pack.label,
                description: `Use ${pack.credits} server-hosted AI breakdown${pack.credits > 1 ? "s" : ""} — no API key needed.`,
              },
            },
          },
        ],
        success_url: `${origin}/pricing?credits=success`,
        cancel_url: `${origin}/pricing?credits=cancelled`,
        client_reference_id: userId,
        metadata: { userId, creditCount: String(pack.credits) },
      };
      if (user.stripeCustomerId) {
        sessionParams.customer = user.stripeCustomerId;
      } else if (user.email) {
        sessionParams.customer_email = user.email;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      if (!session.url) {
        res.status(502).json({ error: "Stripe did not return a checkout URL" });
        return;
      }
      res.json({ url: session.url });
    } catch (err) {
      req.log.error({ err }, "Failed to create credit checkout session");
      res.status(502).json({ error: "Failed to create checkout session" });
    }
  },
);

router.post(
  "/stripe/portal",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    if (!user?.stripeCustomerId) {
      res.status(404).json({ error: "No Stripe customer for this account" });
      return;
    }
    try {
      const stripe = await getUncachableStripeClient();
      const configurationId = await getProPortalConfigurationId();
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${originFromRequest(req)}/pricing`,
        configuration: configurationId,
      });
      res.json({ url: session.url });
    } catch (err) {
      req.log.error({ err }, "Failed to create Stripe billing portal session");
      res.status(502).json({ error: "Failed to open billing portal" });
    }
  },
);

export default router;
