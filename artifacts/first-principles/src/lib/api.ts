import { customFetch, getAuthToken } from "@workspace/api-client-react";
import type { GeneratedImage } from "@workspace/api-client-react";
import type { BreakdownResult } from "../types";

export async function generateImageOnServer(
  prompt: string,
  creditSessionToken?: string | null,
): Promise<GeneratedImage> {
  const headers: Record<string, string> = {};
  if (creditSessionToken) {
    headers["x-credit-session"] = creditSessionToken;
  }
  return customFetch<GeneratedImage>("/api/images", {
    method: "POST",
    body: JSON.stringify({ prompt }),
    credentials: "include",
    headers,
  });
}

export async function generateBreakdownOnServer(
  topic: string,
): Promise<{
  data: BreakdownResult;
  creditSessionToken: string | null;
  usedFreeBreakdown: boolean;
  usedCredit: boolean;
}> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const token = await getAuthToken();
  if (token) headers["authorization"] = `Bearer ${token}`;
  const response = await fetch("/api/breakdown", {
    method: "POST",
    body: JSON.stringify({ topic }),
    credentials: "include",
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const err = new Error(
      (body as { error?: string }).error ?? `Server error ${response.status}`,
    );
    (err as Error & { status?: number }).status = response.status;
    throw err;
  }
  const { creditSessionToken, usedFreeBreakdown, usedCredit, ...rest } =
    (await response.json()) as BreakdownResult & {
      creditSessionToken?: string;
      usedFreeBreakdown?: boolean;
      usedCredit?: boolean;
    };
  return {
    data: rest as BreakdownResult,
    creditSessionToken: creditSessionToken ?? null,
    usedFreeBreakdown: usedFreeBreakdown ?? false,
    usedCredit: usedCredit ?? false,
  };
}

export async function analyzeStockOnServer(
  data: {
    name: string;
    ticker: string;
    exchange: string;
    relevance: string;
    topic: string;
    gapTitle: string;
    gapWhyExists: string;
    gapInnovationPotential: string;
  },
  creditSessionToken?: string | null,
): Promise<{ analysis: string }> {
  const headers: Record<string, string> = {};
  if (creditSessionToken) headers["x-credit-session"] = creditSessionToken;
  return customFetch<{ analysis: string }>("/api/stocks/analyze", {
    method: "POST",
    body: JSON.stringify(data),
    credentials: "include",
    headers,
  });
}

export async function findMoreCompaniesOnServer(
  data: {
    topic: string;
    gapTitle: string;
    gapWhyExists: string;
    gapInnovationPotential: string;
    existingTickers: string[];
  },
  creditSessionToken?: string | null,
): Promise<{ companies: Array<{ name: string; ticker: string; exchange: string; relevance: string }> }> {
  const headers: Record<string, string> = {};
  if (creditSessionToken) headers["x-credit-session"] = creditSessionToken;
  return customFetch<{
    companies: Array<{ name: string; ticker: string; exchange: string; relevance: string }>;
  }>("/api/stocks/find-companies", {
    method: "POST",
    body: JSON.stringify(data),
    credentials: "include",
    headers,
  });
}

export async function regenerateGapsOnServer(
  topic: string,
  breakdownTitles: string[],
): Promise<{ gaps: BreakdownResult["gaps"] }> {
  return customFetch<{ gaps: BreakdownResult["gaps"] }>("/api/breakdown/gaps", {
    method: "POST",
    body: JSON.stringify({ topic, breakdownTitles }),
    credentials: "include",
  });
}
