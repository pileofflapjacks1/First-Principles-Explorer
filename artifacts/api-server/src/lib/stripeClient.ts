import Stripe from "stripe";
import type { StripeSync } from "stripe-replit-sync";

interface StripeCredentials {
  publishableKey: string;
  secretKey: string;
}

async function getCredentials(): Promise<StripeCredentials> {
  const hostname = process.env["REPLIT_CONNECTORS_HOSTNAME"];
  const xReplitToken = process.env["REPL_IDENTITY"]
    ? "repl " + process.env["REPL_IDENTITY"]
    : process.env["WEB_REPL_RENEWAL"]
      ? "depl " + process.env["WEB_REPL_RENEWAL"]
      : null;

  if (!xReplitToken) {
    throw new Error("X-Replit-Token not found for repl/depl");
  }

  const isProduction = process.env["REPLIT_DEPLOYMENT"] === "1";
  const targetEnvironment = isProduction ? "production" : "development";

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", "stripe");
  url.searchParams.set("environment", targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-Replit-Token": xReplitToken,
    },
  });

  const data = (await response.json()) as {
    items?: Array<{
      settings?: { publishable?: string; secret?: string };
    }>;
  };

  const settings = data.items?.[0]?.settings;
  if (!settings?.publishable || !settings?.secret) {
    throw new Error(`Stripe ${targetEnvironment} connection not found`);
  }

  return { publishableKey: settings.publishable, secretKey: settings.secret };
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey);
}

export async function getStripePublishableKey(): Promise<string> {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey(): Promise<string> {
  const { secretKey } = await getCredentials();
  return secretKey;
}

let stripeSync: StripeSync | null = null;

export async function getStripeSync(): Promise<StripeSync> {
  if (!stripeSync) {
    const { StripeSync: StripeSyncCtor } = await import("stripe-replit-sync");
    const secretKey = await getStripeSecretKey();
    stripeSync = new StripeSyncCtor({
      poolConfig: {
        connectionString: process.env["DATABASE_URL"]!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
