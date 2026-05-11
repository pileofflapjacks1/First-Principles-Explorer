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
      "image_prompt": "string (a detailed image-generation prompt that visually explains THIS specific level. Aim for photorealistic scientific illustrations, cutaway diagrams, or educational infographics. Include style hints like 'photorealistic', 'cutaway diagram', 'high contrast dark background', 'glowing labels'. 1-2 sentences, ~30 words.)"
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
      "image_prompt": "string (a detailed image-generation prompt visualizing THIS innovation gap. Concept-art / futuristic / dramatic lighting style. 1-2 sentences, ~30 words.)",
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

const GAPS_SYSTEM_PROMPT = `You are a world-class innovation strategist. Given a first-principles breakdown of a topic, identify 3-5 concrete technological or scientific gaps that represent real innovation opportunities. Output ONLY valid JSON array with no markdown or code blocks.`;

function stripFences(content: string): string {
  return content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function parseJsonLoose<T>(content: string, kind: "object" | "array"): T {
  const cleaned = stripFences(content);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const re = kind === "object" ? /\{[\s\S]*\}/ : /\[[\s\S]*\]/;
    const match = cleaned.match(re);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("Failed to parse model response as JSON");
  }
}

async function chatCompletion(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<string> {
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`xAI chat error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("xAI returned no content");
  }
  return content;
}

export async function generateBreakdownWithXai(
  topic: string,
  apiKey: string,
): Promise<unknown> {
  const content = await chatCompletion(apiKey, {
    model: "grok-3",
    messages: [
      { role: "system", content: SYSTEM_PROMPT + "\n\n" + SCHEMA_HINT },
      { role: "user", content: `Break down from first principles: "${topic}"` },
    ],
    temperature: 0.7,
    max_tokens: 5000,
  });
  return parseJsonLoose<unknown>(content, "object");
}

const STOCK_SYSTEM_PROMPT = `You are a balanced equity research analyst writing for retail investors. Given a public company and a specific innovation gap it is positioned for, write a concise, plain-English analysis covering: (1) what the company actually does, (2) how it is positioned for this innovation gap, (3) recent business / stock-price commentary at a high level (do not invent specific prices or dates — speak in qualitative terms like "has rallied recently" or "trades at a premium multiple" only if you are confident), (4) bull case in 2-3 bullets, (5) bear case / risks in 2-3 bullets, (6) a one-line bottom line. End with a short disclaimer that this is informational, not financial advice. Output clean Markdown — use ## headings and bullet lists. Do NOT wrap in code fences.`;

export async function analyzeStockWithXai(
  params: {
    name: string;
    ticker: string;
    exchange: string;
    relevance: string;
    topic: string;
    gapTitle: string;
    gapWhyExists: string;
    gapInnovationPotential: string;
  },
  apiKey: string,
): Promise<string> {
  const userPrompt = [
    `Company: ${params.name} (${params.exchange}: ${params.ticker})`,
    `Topic context: ${params.topic}`,
    `Innovation gap: ${params.gapTitle}`,
    `Why the gap exists: ${params.gapWhyExists}`,
    `Innovation potential: ${params.gapInnovationPotential}`,
    `Why this company was surfaced: ${params.relevance}`,
    "",
    "Write the analysis now.",
  ].join("\n");

  const content = await chatCompletion(apiKey, {
    model: "grok-3",
    messages: [
      { role: "system", content: STOCK_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.5,
    max_tokens: 1500,
  });
  return stripFences(content);
}

export async function regenerateGapsWithXai(
  topic: string,
  breakdownTitles: string[],
  apiKey: string,
): Promise<unknown[]> {
  const content = await chatCompletion(apiKey, {
    model: "grok-3",
    messages: [
      { role: "system", content: GAPS_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Topic: "${topic}"\n\nBreakdown levels: ${breakdownTitles.join(", ")}\n\nReturn ONLY a JSON array:\n[\n  {\n    "gap_title": "string",\n    "why_exists": "string",\n    "innovation_potential": "string",\n    "search_query": "string (Google-style query for companies working on this)",\n    "image_prompt": "string (futuristic concept-art image-gen prompt visualizing this gap, ~30 words)",\n    "public_companies": [\n      {\n        "name": "string (full company name)",\n        "ticker": "string (stock ticker)",\n        "exchange": "string (NASDAQ, NYSE, etc.)",\n        "relevance": "string (1 sentence on how they are involved in this gap)"\n      }\n    ]\n  }\n]`,
      },
    ],
    temperature: 0.9,
    max_tokens: 2500,
  });
  return parseJsonLoose<unknown[]>(content, "array");
}
