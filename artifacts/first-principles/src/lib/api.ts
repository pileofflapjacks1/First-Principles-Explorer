import { customFetch } from "@workspace/api-client-react";
import type { GeneratedImage } from "@workspace/api-client-react";
import type { BreakdownResult } from "../types";

export async function generateImageOnServer(
  prompt: string,
): Promise<GeneratedImage> {
  return customFetch<GeneratedImage>("/api/images", {
    method: "POST",
    body: JSON.stringify({ prompt }),
    credentials: "include",
  });
}

export async function generateBreakdownOnServer(
  topic: string,
): Promise<BreakdownResult> {
  return customFetch<BreakdownResult>("/api/breakdown", {
    method: "POST",
    body: JSON.stringify({ topic }),
    credentials: "include",
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
