import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import { logger } from "./logger";

let initialized = false;

export async function initStripe(): Promise<void> {
  if (initialized) return;
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) throw new Error("DATABASE_URL required");

  await runMigrations({ databaseUrl });
  const stripeSync = await getStripeSync();

  const domain = process.env["REPLIT_DOMAINS"]?.split(",")[0];
  if (domain) {
    const webhookUrl = `https://${domain}/api/stripe/webhook`;
    try {
      await stripeSync.findOrCreateManagedWebhook(webhookUrl);
      logger.info({ webhookUrl }, "Stripe managed webhook ready");
    } catch (err) {
      logger.error({ err }, "Failed to set up Stripe managed webhook");
    }
  } else {
    logger.warn("REPLIT_DOMAINS not set; skipping managed webhook setup");
  }

  try {
    await stripeSync.syncBackfill();
    logger.info("Stripe data backfilled");
  } catch (err) {
    logger.error({ err }, "Stripe backfill failed");
  }

  initialized = true;
}
