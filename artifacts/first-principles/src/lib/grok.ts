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
  "mermaid_flowchart": "string (valid Mermaid flowchart LR syntax, 6-10 nodes)",
  "gap_nodes": ["string"] (array of node IDs from the mermaid_flowchart — the exact single-letter or short IDs like "A", "B", "C" — that correspond to areas where innovation gaps exist. Include 2-4 node IDs.),
  "gaps": [
    {
      "gap_title": "string",
      "why_exists": "string",
      "innovation_potential": "string",
      "search_query": "string",
      "image_prompt": "string (a detailed image-generation prompt visualizing THIS innovation gap. Concept-art / futuristic / dramatic lighting style. 1-2 sentences, ~30 words. Example: 'futuristic 2D material transistor prototype on flexible substrate with performance metrics overlaid as holographic UI, dramatic blue and purple lighting, sci-fi laboratory aesthetic')",
      "public_companies": [
        {
          "name": "string (full company name)",
          "ticker": "string (stock ticker symbol)",
          "exchange": "string (e.g. NASDAQ, NYSE, TSX, LSE)",
          "relevance": "string (1 sentence: how this company is specifically involved in or positioned for this gap)"
        }
      ] (2-4 real publicly traded companies that are actively working on or positioned to benefit from this specific gap. Only include companies with verified stock tickers.)
    }
  ]
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

  try {
    return JSON.parse(cleaned) as BreakdownResult;
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as BreakdownResult;
    }
    throw new Error("Failed to parse API response as JSON");
  }
}

export async function regenerateGaps(
  topic: string,
  breakdown: BreakdownResult["breakdown"],
  apiKey: string
): Promise<BreakdownResult["gaps"]> {
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-3",
      messages: [
        {
          role: "system",
          content: `You are a world-class innovation strategist. Given a first-principles breakdown of a topic, identify 3-5 concrete technological or scientific gaps that represent real innovation opportunities. Output ONLY valid JSON array with no markdown or code blocks.`,
        },
        {
          role: "user",
          content: `Topic: "${topic}"\n\nBreakdown levels: ${breakdown.map((b) => b.title).join(", ")}\n\nReturn ONLY a JSON array:\n[\n  {\n    "gap_title": "string",\n    "why_exists": "string",\n    "innovation_potential": "string",\n    "search_query": "string (Google-style query for companies working on this)",\n    "image_prompt": "string (futuristic concept-art image-gen prompt visualizing this gap, ~30 words)",\n    "public_companies": [\n      {\n        "name": "string (full company name)",\n        "ticker": "string (stock ticker)",\n        "exchange": "string (NASDAQ, NYSE, etc.)",\n        "relevance": "string (1 sentence on how they are involved in this gap)"\n      }\n    ]\n  }\n]`,
        },
      ],
      temperature: 0.9,
      max_tokens: 2500,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("Failed to parse gaps response");
  }
}

export async function generateImage(
  prompt: string,
  apiKey: string
): Promise<string> {
  const response = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-imagine-image-quality",
      prompt,
      n: 1,
      response_format: "url",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Image API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const url = data?.data?.[0]?.url;
  if (!url) {
    throw new Error("Image API returned no URL");
  }
  return url;
}
