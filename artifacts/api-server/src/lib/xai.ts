export async function generateImageWithXai(
  prompt: string,
  apiKey: string,
): Promise<string> {
  const response = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-imagine-image-quality",
      prompt: `Ultra-photorealistic, hyperrealistic, physically accurate, sharp focus, high resolution, real-world materials and lighting. ${prompt}`,
      n: 1,
      response_format: "url",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`xAI image error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as { data?: { url?: string }[] };
  const url = data?.data?.[0]?.url;
  if (!url) {
    throw new Error("xAI returned no image URL");
  }
  return url;
}
