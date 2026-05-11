import { customFetch } from "@workspace/api-client-react";
import type { GeneratedImage } from "@workspace/api-client-react";

export async function generateImageOnServer(
  prompt: string,
): Promise<GeneratedImage> {
  return customFetch<GeneratedImage>("/api/images", {
    method: "POST",
    body: JSON.stringify({ prompt }),
    credentials: "include",
  });
}
