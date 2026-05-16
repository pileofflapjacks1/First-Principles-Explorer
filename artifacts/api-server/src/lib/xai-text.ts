/**
 * xai-text.ts – First-principles xAI interaction layer
 *
 * Strongly typed, robust wrappers for Grok-3 using your detailed prompting.
 * Everything starts from fundamentals: correctness first, then clarity, then extensibility.
 */

export interface WikiLink {
  title: string;
  url: string;
}

export interface BreakdownLevel {
  level: number;
  title: string;
  description: string;
  components: string[];
  wiki_links: WikiLink[];
  image_prompt: string;
}

export interface GapCompany {
  name: string;
  ticker: string;
  exchange: string;
  relevance: string;
}

export interface Gap {
  gap_title: string;
  why_exists: string;
  innovation_potential: string;
  search_query: string;
  image_prompt: string;
  public_companies: GapCompany[];
}

export interface BreakdownResponse {
  topic: string;
  breakdown: BreakdownLevel[];
  mermaid_flowchart: string;
  gap_nodes: string[];
  gaps: Gap[];
}

export interface XaiOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

/** Core system prompt – world-class first-principles thinker */
const SYSTEM_PROMPT = `You are a world-class first-principles thinker and systems engineer. Break the user's topic down from absolute fundamentals (physics, chemistry, raw materials, or first logical atoms) upward in clear hierarchical layers. Never skip steps. Output ONLY valid JSON matching the schema exactly. Use precise technical language but keep descriptions understandable to a smart high-school student. For the mermaid_flowchart, make it a clean left-to-right flowchart with 6–10 nodes maximum. Use flowchart LR syntax. Keep node labels short (2-3 words max, use \\n for line breaks if needed). Do not use special characters in node IDs.`;

/** Your exact detailed schema hint (preserved verbatim) */
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
          "url": "string (Grokipedia direct topic URL in the format: https://grokipedia.com/page/concept-slug where concept-slug is the concept title in lowercase with spaces replaced by hyphens, e.g. 'Quantum Tunneling' → https://grokipedia.com/page/quantum-tunneling)"
        }
      ] (2-3 Grokipedia direct-page links for concepts most relevant to this level — use lowercase hyphenated slugs, no special characters),
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

/** Gap regeneration system prompt */
const GAPS_SYSTEM_PROMPT = `You are a world-class innovation strategist. Given a first-principles breakdown of a topic, identify 3-5 concrete technological or scientific gaps that represent real innovation opportunities. Output ONLY valid JSON array with no markdown or code blocks.`;

/** Stock analysis system prompt */
const STOCK_SYSTEM_PROMPT = `You are a balanced equity research analyst writing for retail investors. Given a public company and a specific innovation gap it is positioned for, write a concise, plain-English analysis covering: (1) what the company actually does, (2) how it is positioned for this innovation gap, (3) recent business / stock-price commentary at a high level (do not invent specific prices or dates — speak in qualitative terms like "has rallied recently" or "trades at a premium multiple" only if you are confident), (4) bull case in 2-3 bullets, (5) bear case / risks in 2-3 bullets, (6) a one-line bottom line. End with a short disclaimer that this is informational, not financial advice. Output clean Markdown — use ## headings and bullet lists. Do NOT wrap in code fences.`;

/** Remove any markdown code fences */
function stripFences(content: string): string {
  return content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

/** Robust JSON parser */
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

/** Clean chat completion helper */
async function chatCompletion(
  apiKey: string,
  messages: { role: "system" | "user"; content: string }[],
  options: XaiOptions = {},
): Promise<string> {
  const body = {
    model: options.model ?? "grok-4.3",
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 5000,
  };

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
  if (!content) throw new Error("xAI returned no content");

  return content;
}

/** Generate complete first-principles breakdown */
export async function generateBreakdownWithXai(
  topic: string,
  apiKey: string,
  options: XaiOptions = {},
): Promise<BreakdownResponse> {
  const content = await chatCompletion(
    apiKey,
    [
      { role: "system", content: SYSTEM_PROMPT + "\n\n" + SCHEMA_HINT },
      { role: "user", content: `Break down from first principles: "${topic}"` },
    ],
    { temperature: 0.7, max_tokens: 5000, ...options },
  );

  return parseJsonLoose<BreakdownResponse>(content, "object");
}

/** Analyze a specific company's position relative to an innovation gap */
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
  options: XaiOptions = {},
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

  const content = await chatCompletion(
    apiKey,
    [
      { role: "system", content: STOCK_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.5, max_tokens: 1500, ...options },
  );

  return stripFences(content);
}

/** Find additional publicly traded companies working on a specific innovation gap */
const FIND_COMPANIES_SYSTEM_PROMPT = `You are a world-class investment research analyst. Given an innovation gap, identify additional publicly traded companies that are actively working on or well-positioned for it. Focus on companies NOT already on the provided list. Only include companies with real, verified stock tickers. Output ONLY a valid JSON array, no markdown, no code fences.`;

export async function findMoreCompaniesWithXai(
  params: {
    topic: string;
    gapTitle: string;
    gapWhyExists: string;
    gapInnovationPotential: string;
    existingTickers: string[];
  },
  apiKey: string,
  options: XaiOptions = {},
): Promise<GapCompany[]> {
  const exclusionNote =
    params.existingTickers.length > 0
      ? `Do NOT include these already-listed companies: ${params.existingTickers.join(", ")}.`
      : "";

  const userPrompt = [
    `Topic context: ${params.topic}`,
    `Innovation gap: ${params.gapTitle}`,
    `Why the gap exists: ${params.gapWhyExists}`,
    `Innovation potential: ${params.gapInnovationPotential}`,
    exclusionNote,
    "",
    "Return 3-5 additional publicly traded companies as a JSON array:",
    '[{"name":"string","ticker":"string","exchange":"string","relevance":"string (1 sentence on their involvement)"}]',
  ]
    .filter(Boolean)
    .join("\n");

  const content = await chatCompletion(
    apiKey,
    [
      { role: "system", content: FIND_COMPANIES_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.6, max_tokens: 1000, ...options },
  );

  return parseJsonLoose<GapCompany[]>(content, "array");
}

/** Regenerate innovation gaps */
export async function regenerateGapsWithXai(
  topic: string,
  breakdownTitles: string[],
  apiKey: string,
  options: XaiOptions = {},
): Promise<Gap[]> {
  const content = await chatCompletion(
    apiKey,
    [
      { role: "system", content: GAPS_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Topic: "${topic}"\n\nBreakdown levels: ${breakdownTitles.join(", ")}\n\nReturn ONLY a JSON array:\n[\n  {\n    "gap_title": "string",\n    "why_exists": "string",\n    "innovation_potential": "string",\n    "search_query": "string (Google-style query for companies working on this)",\n    "image_prompt": "string (futuristic concept-art image-gen prompt visualizing this gap, ~30 words)",\n    "public_companies": [\n      {\n        "name": "string (full company name)",\n        "ticker": "string (stock ticker)",\n        "exchange": "string (NASDAQ, NYSE, etc.)",\n        "relevance": "string (1 sentence on how they are involved in this gap)"\n      }\n    ]\n  }\n]`,
      },
    ],
    { temperature: 0.9, max_tokens: 2500, ...options },
  );

  return parseJsonLoose<Gap[]>(content, "array");
}
