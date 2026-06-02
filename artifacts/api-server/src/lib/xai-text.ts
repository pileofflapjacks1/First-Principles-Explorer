/**
 * xai-text.ts – First-principles xAI interaction layer
 *
 * Strongly typed, robust wrappers for Grok-4.3 using your detailed prompting.
 * Production-hardened with retries, timeouts, error classification (XaiError with type/retried/status),
 * and adaptive backoff for transient failures. This gives the system "smarter behavior" on flaky xAI calls
 * while preserving the rich first-principles prompts and structured JSON output.
 */

import { logger } from "./logger";

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

/** Structured error for xAI calls with metadata for smarter handling */
export class XaiError extends Error {
  readonly type: "RateLimit" | "Timeout" | "Auth" | "ServerError" | "Network" | "ParseError" | "CircuitOpen" | "Unknown";
  readonly status?: number;
  readonly retried: boolean;
  readonly originalMessage: string;

  constructor(
    message: string,
    type: XaiError["type"],
    options: { status?: number; retried?: boolean; originalMessage?: string } = {},
  ) {
    super(message);
    this.name = "XaiError";
    this.type = type;
    this.status = options.status;
    this.retried = options.retried ?? false;
    this.originalMessage = options.originalMessage ?? message;
  }
}

/** Classify any thrown value into rich XaiError metadata */
function classifyXaiError(err: unknown, hadRetries: boolean): XaiError {
  const retried = hadRetries;

  if (err instanceof XaiError) {
    return new XaiError(err.message, err.type, {
      status: err.status,
      retried: err.retried || retried,
      originalMessage: err.originalMessage,
    });
  }

  if (err instanceof Error) {
    const msg = err.message || String(err);

    // Abort / timeout from our controller
    if (err.name === "AbortError" || /abort|timeout/i.test(msg)) {
      return new XaiError("xAI request timed out", "Timeout", { retried, originalMessage: msg });
    }

    // Network / fetch level errors
    if (/fetch failed|ECONNRESET|ENOTFOUND|ETIMEDOUT|network/i.test(msg)) {
      return new XaiError("Network error reaching xAI", "Network", { retried, originalMessage: msg });
    }

    // Parse errors from our loose parser or JSON
    if (/parse|JSON|Failed to parse/i.test(msg)) {
      return new XaiError("Failed to parse xAI response", "ParseError", { retried, originalMessage: msg });
    }

    // Try to extract status from our existing error strings e.g. "xAI chat error 429: ..."
    const statusMatch = msg.match(/xAI (?:chat|image) error (\d{3})/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1], 10);
      if (status === 429) {
        return new XaiError(`xAI rate limited (status ${status})`, "RateLimit", { status, retried, originalMessage: msg });
      }
      if (status === 401 || status === 403) {
        return new XaiError(`xAI auth error (status ${status})`, "Auth", { status, retried, originalMessage: msg });
      }
      if (status >= 500) {
        return new XaiError(`xAI server error (status ${status})`, "ServerError", { status, retried, originalMessage: msg });
      }
      if (status >= 400) {
        return new XaiError(`xAI client error (status ${status})`, "Unknown", { status, retried, originalMessage: msg });
      }
    }
  }

  // Fallback
  return new XaiError(
    err instanceof Error ? err.message : "Unknown xAI error",
    "Unknown",
    { retried, originalMessage: String(err) },
  );
}

/** Create a CircuitOpen error quickly (no network attempt) */
function createCircuitOpenError(health: XaiCircuitHealth): XaiError {
  const remainingSec = Math.ceil(health.cooldownRemainingMs / 1000);
  return new XaiError(
    `xAI circuit open (cooldown ${remainingSec}s remaining) — protecting upstream after repeated transients`,
    "CircuitOpen",
    { retried: false, originalMessage: `circuit open until ${new Date(health.openUntil).toISOString()}` },
  );
}

/** Heuristic: should we retry this error? Only transients. */
function isTransientXaiError(err: unknown): boolean {
  const classified = classifyXaiError(err, false); // base classification, ignore prior retries for decision
  return (
    classified.type === "RateLimit" ||
    classified.type === "Timeout" ||
    classified.type === "Network" ||
    classified.type === "ServerError"
  );
}

/** ===================== Circuit Breaker / De-weighting State =====================
 * Strengthened lightweight in-memory circuit breaker.
 * - Separate counters for RateLimit (more sensitive) vs other transients.
 * - Differentiated thresholds (RateLimit opens faster).
 * - Time-based decay on both counters.
 * - Weighted de-weighting (RateLimit-heavy situations reduce effort more aggressively).
 * - Still exposes clean status for UI + health endpoints.
 */

interface CircuitState {
  // Separate counters for more precise protection
  rateLimitCount: number;        // consecutive or recent RateLimit (429) failures
  otherTransientCount: number;   // Timeout, Network, ServerError, etc.
  lastFailureAt: number;
  openUntil: number; // epoch ms; > now means open
}

const CIRCUIT: CircuitState = {
  rateLimitCount: 0,
  otherTransientCount: 0,
  lastFailureAt: 0,
  openUntil: 0,
};

// Differentiated thresholds — RateLimits are more actionable signals from the provider
const RATE_LIMIT_THRESHOLD = 3;     // Rate limits trigger protection faster
const OTHER_TRANSIENT_THRESHOLD = 5; // Other errors are noisier, higher tolerance
const CIRCUIT_COOLDOWN_MS = 60_000; // 60s protection window
const CIRCUIT_DECAY_MS = 5 * 60_000; // time-based decay on both counters

export type XaiCircuitStatus = "healthy" | "degraded" | "open";

export interface XaiCircuitHealth {
  status: XaiCircuitStatus;
  // Richer differentiated data
  rateLimitCount: number;
  otherTransientCount: number;
  totalRecentTransients: number;
  // Legacy alias (total) for existing consumers
  consecutiveTransients: number;
  openUntil: number;
  cooldownRemainingMs: number;
  lastFailureAt: number;
}

/** Snapshot for logging, health endpoints, UI banners, or future adaptive routing. */
export function getXaiHealth(): XaiCircuitHealth {
  const now = Date.now();
  let status: XaiCircuitStatus = "healthy";
  let remaining = 0;

  // Time-based decay applied to both counters
  if (
    CIRCUIT.lastFailureAt > 0 &&
    now - CIRCUIT.lastFailureAt > CIRCUIT_DECAY_MS &&
    (CIRCUIT.rateLimitCount > 0 || CIRCUIT.otherTransientCount > 0) &&
    CIRCUIT.openUntil <= now
  ) {
    CIRCUIT.rateLimitCount = Math.max(0, CIRCUIT.rateLimitCount - 1);
    CIRCUIT.otherTransientCount = Math.max(0, CIRCUIT.otherTransientCount - 1);
    CIRCUIT.lastFailureAt = now;
  }

  const total = CIRCUIT.rateLimitCount + CIRCUIT.otherTransientCount;

  // Smarter opening logic with separate thresholds
  const shouldOpen =
    CIRCUIT.rateLimitCount >= RATE_LIMIT_THRESHOLD ||
    CIRCUIT.otherTransientCount >= OTHER_TRANSIENT_THRESHOLD;

  if (CIRCUIT.openUntil > now) {
    status = "open";
    remaining = CIRCUIT.openUntil - now;
  } else if (total >= 2 || shouldOpen) {
    status = "degraded";
  }

  // If we should open but aren't yet, do it now
  if (shouldOpen && CIRCUIT.openUntil < now) {
    CIRCUIT.openUntil = now + CIRCUIT_COOLDOWN_MS;
    status = "open";
    remaining = CIRCUIT_COOLDOWN_MS;
  }

  return {
    status,
    rateLimitCount: CIRCUIT.rateLimitCount,
    otherTransientCount: CIRCUIT.otherTransientCount,
    totalRecentTransients: total,
    // Legacy field for smooth transition in existing logs / routes
    consecutiveTransients: total,
    openUntil: CIRCUIT.openUntil,
    cooldownRemainingMs: Math.max(0, remaining),
    lastFailureAt: CIRCUIT.lastFailureAt,
  };
}

function isCircuitOpen(now: number = Date.now()): boolean {
  return CIRCUIT.openUntil > now;
}

/** Record a transient failure, distinguishing RateLimit (more actionable) from others */
function recordTransientFailure(type: "RateLimit" | "Other" = "Other", now: number = Date.now()): void {
  if (type === "RateLimit") {
    CIRCUIT.rateLimitCount += 1;
  } else {
    CIRCUIT.otherTransientCount += 1;
  }
  CIRCUIT.lastFailureAt = now;

  // Check opening condition immediately (uses the new differentiated thresholds)
  const health = getXaiHealth(); // triggers any pending open logic
  if (health.status === "open" && CIRCUIT.openUntil < now) {
    // already handled inside getXaiHealth in most cases
  }
}

function recordSuccess(): void {
  if (CIRCUIT.rateLimitCount !== 0 || CIRCUIT.otherTransientCount !== 0 || CIRCUIT.openUntil !== 0) {
    CIRCUIT.rateLimitCount = 0;
    CIRCUIT.otherTransientCount = 0;
    CIRCUIT.openUntil = 0;
  }
}

/** Debug helper: Completely reset the circuit breaker to a healthy state. */
export function resetXaiCircuit(): XaiCircuitHealth {
  CIRCUIT.rateLimitCount = 0;
  CIRCUIT.otherTransientCount = 0;
  CIRCUIT.lastFailureAt = 0;
  CIRCUIT.openUntil = 0;
  return getXaiHealth();
}

/**
 * Debug helper: Simulate a transient failure to exercise the breaker.
 * Useful for demos and testing resilience behavior.
 */
export function simulateXaiFailure(type: "RateLimit" | "Other" = "Other"): XaiCircuitHealth {
  const now = Date.now();

  if (type === "RateLimit") {
    CIRCUIT.rateLimitCount += 1;
  } else {
    CIRCUIT.otherTransientCount += 1;
  }
  CIRCUIT.lastFailureAt = now;

  // Re-evaluate health (this may trigger open if thresholds are crossed)
  return getXaiHealth();
}

/** Lightweight retry + timeout + backoff. No extra deps. Now with circuit awareness. */
export async function withResilience<T>(
  operation: (attempt: number, signal: AbortSignal) => Promise<T>,
  options: {
    maxAttempts?: number;
    timeoutMs?: number;
    log?: (obj: Record<string, unknown>, msg: string) => void;
  } = {},
): Promise<T> {
  const now = Date.now();
  const health = getXaiHealth();

  // Fast-fail when circuit is open (lightweight circuit breaker)
  if (isCircuitOpen(now)) {
    const err = createCircuitOpenError(health);
    if (log) {
      log(
        { status: health.status, cooldownRemainingMs: health.cooldownRemainingMs },
        "xAI circuit open — fast fail (no attempt)",
      );
    }
    throw err;
  }

  // De-weighting: smarter now that we have separate counters
  // RateLimit-heavy situations are treated as more serious than general noise
  const isDegraded = health.status === "degraded" || health.totalRecentTransients >= 2;
  const rateLimitHeavy = health.rateLimitCount > health.otherTransientCount;

  const effectiveMaxAttempts = isDegraded ? Math.max(1, (options.maxAttempts ?? 3) - (rateLimitHeavy ? 2 : 1)) : (options.maxAttempts ?? 3);
  const effectiveTimeout = isDegraded
    ? Math.min(options.timeoutMs ?? 30000, rateLimitHeavy ? 8000 : 12000)
    : (options.timeoutMs ?? 30000);

  const maxAttempts = effectiveMaxAttempts;
  const timeoutMs = effectiveTimeout;
  const log = options.log;

  let lastErr: unknown;
  let attemptSucceeded = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const result = await operation(attempt, controller.signal);
      if (attempt > 1 && log) {
        log({ attempt, success: true }, "xAI call recovered after transient failure");
      }
      recordSuccess();
      attemptSucceeded = true;
      return result;
    } catch (err) {
      lastErr = err;
      clearTimeout(timeoutId);

      const isTransient = isTransientXaiError(err);
      const isFinal = attempt === maxAttempts;

      if (log) {
        const preview = err instanceof Error ? err.message.slice(0, 200) : String(err);
        log(
          {
            attempt,
            isFinal,
            isTransient,
            errorPreview: preview,
            circuit: {
              status: health.status,
              rateLimit: CIRCUIT.rateLimitCount,
              otherTransient: CIRCUIT.otherTransientCount,
            },
          },
          `xAI attempt ${attempt} failed`,
        );
      }

      if (!isTransient || isFinal) {
        if (isTransient) {
          const classified = classifyXaiError(err, false);
          const failureType = classified.type === "RateLimit" ? "RateLimit" : "Other";
          recordTransientFailure(failureType);
        } else {
          // Non-transient (auth, parse, client error) → do not open circuit
        }
        // Wrap for consistent metadata on the way out
        throw classifyXaiError(err, attempt > 1);
      }

      // Exponential backoff with jitter (capped) — still applied on internal retries
      const base = Math.min(800 * Math.pow(1.8, attempt - 1), 6000);
      const jitter = Math.floor(Math.random() * 250);
      await new Promise((r) => setTimeout(r, base + jitter));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // All attempts exhausted — record if the final error was transient
  const finalClassified = classifyXaiError(lastErr, true);
  if (
    finalClassified.type === "RateLimit" ||
    finalClassified.type === "Timeout" ||
    finalClassified.type === "Network" ||
    finalClassified.type === "ServerError"
  ) {
    const failureType = finalClassified.type === "RateLimit" ? "RateLimit" : "Other";
    recordTransientFailure(failureType);
  }

  throw finalClassified;
}

/** Clean chat completion helper (now resilient) */
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

  const timeout = options.max_tokens && options.max_tokens > 3000 ? 35000 : 25000;

  return withResilience<string>(
    async (_attempt, signal) => {
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
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
    },
    {
      maxAttempts: 3,
      timeoutMs: timeout,
      log: (obj, msg) => {
        // Internal structured logs using the shared pino logger.
        // Routes additionally wrap final outcomes with req.log for request correlation.
        if (obj.success) {
          logger.info(obj, `[xai] ${msg}`);
        } else {
          logger.warn(obj, `[xai] ${msg}`);
        }
      },
    },
  );
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
