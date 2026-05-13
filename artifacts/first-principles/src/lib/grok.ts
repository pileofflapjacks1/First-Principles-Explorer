import type { BreakdownResult } from "../types";

const SYSTEM_PROMPT = `You are a world-class first-principles thinker and systems engineer. Break the user's topic down from absolute fundamentals (physics, chemistry, raw materials, or first logical atoms) upward in clear hierarchical layers. Never skip steps. Output ONLY valid JSON matching the schema exactly. Use precise technical language but keep descriptions understandable to a smart high-school student. For the mermaid_flowchart, make it a clean left-to-right flowchart with 6–10 nodes maximum. Use flowchart LR syntax. Keep node labels short (2-3 words max, use \\n for line breaks if needed). Do not use special characters in node IDs.`;

const SCHEMA_HINT = `Return ONLY this JSON structure with no markdown, no code blocks, no explanation:
{
  "topic": "string",
  "breakdown": [
    {
      "level": number,
      "title": "string",
      "description": "string (2-4 sentences)",
      "components": ["string", "string"],
      "wiki_links": [
        {
          "title": "string (short descriptive label for the concept)",
          "url": "string (Grokipedia search URL in the format: https://grokipedia.com/page/grokipedia-search?q=SEARCH+TERMS where SEARCH+TERMS is the concept URL-encoded)"
        }
      ] (2-3 Grokipedia search links for concepts most relevant to this level — encode spaces as + in the query string),
      "image_prompt": "string (a detailed image-generation prompt that visually explains THIS specific level. Aim for photorealistic scientific illustrations, cutaway diagrams, or educational infographics. Include style hints like 'photorealistic', 'cutaway diagram', 'high contrast dark background', 'glowing labels'. 1-2 sentences, ~30 words. Example: 'photorealistic cutaway diagram of a P-N junction showing depletion region as a translucent zone, charge carriers as glowing spheres, electric field arrows, dark background, educational style, high contrast')"
    }
  ],
  "mermaid_flowchart": "string (valid Mermaid flowchart LR syntax, 6-10 nodes)"
}`;

export async function generateBreakdown(
  topic: string,
  apiKey: string
): Promise<BreakdownResult> {
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-3",
      messages: [
        { role: "system", content: SYSTEM_PROMPT + "\n\n" + SCHEMA_HINT },
        {
          role: "user",
          content: `Break down from first principles: "${topic}"`,
        },
      ],
      temperature: 0.7,
      max_tokens: 5000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 401) {
      throw new Error("Invalid API key. Please check your xAI Grok API key.");
    }
    if (response.status === 400 && error.toLowerCase().includes("api key")) {
      throw new Error("Invalid API key. Please check your xAI Grok API key.");
    }
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please wait a moment and try again.");
    }
    throw new Error(`API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response from API");
  }

  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: Partial<BreakdownResult>;
  try {
    parsed = JSON.parse(cleaned) as Partial<BreakdownResult>;
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse API response as JSON");
    }
    parsed = JSON.parse(jsonMatch[0]) as Partial<BreakdownResult>;
  }

  // Free tier: gaps & gap_nodes are a Pro-only feature. The model isn't asked
  // for them, but stamp empty arrays defensively so the UI shape stays valid.
  return {
    ...(parsed as BreakdownResult),
    gap_nodes: [],
    gaps: [],
  };
}

// Image generation is server-side only — see src/lib/api.ts
// (gated behind Pro tier in the API server).
