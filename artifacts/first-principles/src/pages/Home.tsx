import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import {
  Atom,
  Plus,
  Download,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Crown,
  Zap,
  CreditCard,
} from "lucide-react";
import {
  Show,
  useClerk,
  useUser,
  UserButton,
} from "@clerk/react";
import { getGetMeQueryOptions, useHealthCheck } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import type { BreakdownResult, ImageEntry } from "../types";
import {
  generateImageOnServer,
  generateBreakdownOnServer,
  regenerateGapsOnServer,
} from "../lib/api";
import { TRANSISTOR_EXAMPLE } from "../data/transistorExample";
import { AtomSpinner } from "../components/AtomSpinner";
import { BreakdownCard } from "../components/BreakdownCard";
import { MermaidChart } from "../components/MermaidChart";
import { GapCard } from "../components/GapCard";
import { UpgradePrompt } from "../components/UpgradePrompt";
import { SubscriptionTab } from "../components/SubscriptionTab";

const EXAMPLE_PROMPTS = [
  "How does a transistor work",
  "How is a lithium-ion battery made",
  "How does photosynthesis work",
  "How does a jet engine work",
  "How does DNA replication occur",
  "How does a nuclear reactor work",
];

const breakdownKey = (level: number) => `breakdown-${level}`;
const gapKey = (index: number) => `gap-${index}`;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type BreakdownReceipt =
  | { kind: "free"; freeRemaining: number }
  | { kind: "credit"; creditsRemaining: number };

export function Home() {
  const [showSignedOutPrompt, setShowSignedOutPrompt] = useState(false);
  const [showNoCreditsPrompt, setShowNoCreditsPrompt] = useState(false);
  const [pendingCreditTopic, setPendingCreditTopic] = useState<string | null>(null);
  const [usedCreditBreakdown, setUsedCreditBreakdown] = useState(false);
  const [receipt, setReceipt] = useState<BreakdownReceipt | null>(null);
  const [receiptDismissed, setReceiptDismissed] = useState(false);
  // Stores the HMAC session token issued by /breakdown for credit users.
  // A ref (not state) so all closures in generateOne/generateAllImages always see the latest value.
  const creditSessionRef = useRef<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<BreakdownResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingGaps, setLoadingGaps] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [images, setImages] = useState<Record<string, ImageEntry>>({});
  const breakdownRef = useRef<HTMLDivElement>(null);
  const generationRef = useRef(0);

  const { isSignedIn, isLoaded: userLoaded } = useUser();
  const { openSignIn } = useClerk();

  // Only fetch /me when signed in (avoid 401 noise when signed out).
  // Compose the generated query options with `enabled` to satisfy strict typing.
  const { data: account, refetch: refetchAccount } = useQuery({
    ...getGetMeQueryOptions(),
    enabled: isSignedIn === true,
    retry: false,
  });

  // Public AI health (circuit breaker status) — polled for banner.
  // Lightweight polling so users see when the service recovers.
  const { data: healthData } = useHealthCheck({
    query: {
      refetchInterval: 45_000, // 45s is a good balance for status
      retry: 1,
      staleTime: 30_000,
    },
  });
  const aiHealth = healthData?.ai;
  const showAiBanner = aiHealth && aiHealth.status !== "healthy";
  const [aiBannerDismissed, setAiBannerDismissed] = useState(false);

  // Reset dismissal automatically when service recovers (so the next degradation shows the banner again)
  useEffect(() => {
    if (aiHealth?.status === "healthy" && aiBannerDismissed) {
      setAiBannerDismissed(false);
    }
  }, [aiHealth?.status, aiBannerDismissed]);
  const isPro = (account?.isPro || account?.isAdmin) ?? false;

  // Effective AI health status — prefer the one from /me for signed-in users (now includes aiStatus),
  // fall back to the public polled health endpoint. This powers proactive UX protection.
  const effectiveAiStatus: "healthy" | "degraded" | "open" =
    (account?.aiStatus as any) ?? healthData?.ai?.status ?? "healthy";

  const aiIsDegraded = effectiveAiStatus !== "healthy";
  const aiIsOpen = effectiveAiStatus === "open";

  const monthlyLimit = account?.monthlyImageLimit ?? 0;
  const monthlyUsed = account?.imagesGeneratedThisMonth ?? 0;
  const topicCredits = account?.topicCredits ?? 0;
  const freeBreakdownsUsed = account?.freeBreakdownsUsedThisMonth ?? 0;
  const freeBreakdownsLimit = account?.freeBreakdownsPerMonth ?? 2;
  const freeBreakdownsRemaining = Math.max(0, freeBreakdownsLimit - freeBreakdownsUsed);

  const upsellReason: "signed-out" | "free-tier" | null = !userLoaded
    ? null
    : !isSignedIn
      ? "signed-out"
      : !isPro
        ? "free-tier"
        : null;
  // Pro users always get images. Non-Pro users only get images when they
  // spend a paid credit on the breakdown (free monthly breakdowns are text-only).
  const canGenerateImages = isPro || usedCreditBreakdown;

  // Separate signal for whether we should attempt image generation right now
  // (respects the circuit breaker without changing quota logic).
  const imagesAllowedByHealth = !aiIsOpen;

  function setImageEntry(key: string, patch: Partial<ImageEntry>) {
    setImages((prev) => ({
      ...prev,
      [key]: {
        url: prev[key]?.url ?? null,
        loading: prev[key]?.loading ?? false,
        error: prev[key]?.error ?? false,
        ...patch,
      },
    }));
  }

  async function generateOne(key: string, imagePrompt: string, genId: number) {
    if (generationRef.current !== genId) return;
    setImageEntry(key, { loading: true, error: false, url: null });
    try {
      const { url } = await generateImageOnServer(imagePrompt, creditSessionRef.current);
      if (generationRef.current !== genId) return;
      setImageEntry(key, { url, loading: false, error: false });
      void refetchAccount();
    } catch {
      if (generationRef.current !== genId) return;
      setImageEntry(key, { loading: false, error: true, url: null });
    }
  }

  async function generateAllImages(data: BreakdownResult, overrideCanGenerate = false) {
    if (!canGenerateImages && !overrideCanGenerate) return;

    // When the AI circuit is open, we still allow the breakdown text (it's already paid for),
    // but we strongly deprioritize / warn on the expensive image generation step.
    if (aiIsOpen) {
      // We still set the placeholders so the UI shows the state, but we skip network calls.
      // This protects both the user (no wasted slots) and the backend.
      const initial: Record<string, ImageEntry> = {};
      data.breakdown.forEach((b) => {
        if (b.image_prompt) initial[breakdownKey(b.level)] = { url: null, loading: false, error: true };
      });
      data.gaps.forEach((g, i) => {
        if (g.image_prompt) initial[gapKey(i)] = { url: null, loading: false, error: true };
      });
      setImages(initial);
      return;
    }

    const genId = ++generationRef.current;
    // Capture token at the time generation starts so the closure is stable.
    const sessionToken = creditSessionRef.current;

    const initial: Record<string, ImageEntry> = {};
    data.breakdown.forEach((b) => {
      if (b.image_prompt) initial[breakdownKey(b.level)] = { url: null, loading: true, error: false };
    });
    data.gaps.forEach((g, i) => {
      if (g.image_prompt) initial[gapKey(i)] = { url: null, loading: true, error: false };
    });
    setImages(initial);

    const tasks: Promise<unknown>[] = [];
    data.breakdown.forEach((b) => {
      if (b.image_prompt) {
        tasks.push(
          generateImageOnServer(b.image_prompt, sessionToken)
            .then(({ url }) => {
              if (generationRef.current === genId) {
                setImageEntry(breakdownKey(b.level), { url, loading: false, error: false });
              }
            })
            .catch(() => {
              if (generationRef.current === genId) {
                setImageEntry(breakdownKey(b.level), { loading: false, error: true, url: null });
              }
            })
        );
      }
    });
    data.gaps.forEach((g, i) => {
      if (g.image_prompt) {
        tasks.push(
          generateImageOnServer(g.image_prompt, sessionToken)
            .then(({ url }) => {
              if (generationRef.current === genId) {
                setImageEntry(gapKey(i), { url, loading: false, error: false });
              }
            })
            .catch(() => {
              if (generationRef.current === genId) {
                setImageEntry(gapKey(i), { loading: false, error: true, url: null });
              }
            })
        );
      }
    });
    await Promise.allSettled(tasks);
    void refetchAccount();
  }

  async function runBreakdown(topic: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    setActiveCardId(null);
    setImages({});
    // Reset credit session at the start of each new breakdown.
    creditSessionRef.current = null;
    setUsedCreditBreakdown(false);
    setReceipt(null);
    setReceiptDismissed(false);
    generationRef.current++;

    const usingNonPro = !isPro;

    try {
      const result = await generateBreakdownOnServer(topic);
      const data = result.data;
      if (usingNonPro) {
        // Always refetch so the navbar quota dropdown updates immediately.
        const refreshed = await refetchAccount();
        if (result.creditSessionToken) {
          creditSessionRef.current = result.creditSessionToken;
          setUsedCreditBreakdown(true);
        }
        // Build the receipt based on which quota was consumed.
        const fresh = refreshed.data;
        if (result.usedCredit) {
          setReceipt({ kind: "credit", creditsRemaining: fresh?.topicCredits ?? 0 });
        } else if (result.usedFreeBreakdown) {
          const used = fresh?.freeBreakdownsUsedThisMonth ?? 0;
          const limit = fresh?.freeBreakdownsPerMonth ?? freeBreakdownsLimit;
          setReceipt({ kind: "free", freeRemaining: Math.max(0, limit - used) });
        }
      }
      setResult(data);
      // Pass true to bypass the stale canGenerateImages state.
      // We still respect imagesAllowedByHealth inside generateAllImages.
      void generateAllImages(data, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(customPrompt?: string) {
    const topic = (customPrompt ?? prompt).trim();
    if (!topic) return;

    // Signed-out users: invite them to sign in or load the demo instead of
    // hitting the server and getting a generic 402.
    if (userLoaded && !isSignedIn) {
      setShowSignedOutPrompt(true);
      return;
    }

    // When the circuit breaker is open, give Pro users a clear heads-up before
    // they spend quota or trigger expensive image work.
    if (aiIsOpen && isPro) {
      setError(
        "AI service is currently in protection mode after rate limits. " +
        "Please wait a minute or two before starting a new breakdown (images will be delayed)."
      );
      return;
    }

    // Pro users go straight through.
    if (isPro) {
      await runBreakdown(topic);
      return;
    }

    // Free user has free breakdowns left this month — run with no friction.
    if (freeBreakdownsRemaining > 0) {
      await runBreakdown(topic);
      return;
    }

    // Out of free breakdowns but has credits — confirm before spending one.
    if (topicCredits > 0) {
      setPendingCreditTopic(topic);
      return;
    }

    // No free breakdowns and no credits — prompt to upgrade or buy credits.
    setShowNoCreditsPrompt(true);
  }

  async function handleProceedWithCredit() {
    if (!pendingCreditTopic) return;
    const topic = pendingCreditTopic;
    setPendingCreditTopic(null);
    await runBreakdown(topic);
  }

  async function handleRegenerateGaps() {
    if (!result || !isPro) return;
    setLoadingGaps(true);
    try {
      const { gaps } = await regenerateGapsOnServer(
        result.topic,
        result.breakdown.map((b) => b.title),
      );
      const newResult = { ...result, gaps };
      setResult(newResult);

      setImages((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => { if (k.startsWith("gap-")) delete next[k]; });
        return next;
      });
      if (canGenerateImages && imagesAllowedByHealth) {
        const genId = generationRef.current;
        gaps.forEach((g, i) => {
          if (g.image_prompt) {
            void generateOne(gapKey(i), g.image_prompt, genId);
          }
        });
      }
    } catch {
      // silently fail
    } finally {
      setLoadingGaps(false);
    }
  }

  function handleNodeClick(label: string) {
    if (!result) return;
    const match = result.breakdown.find((b) =>
      label.toLowerCase().includes(b.title.toLowerCase().split(" ")[0].toLowerCase()) ||
      b.title.toLowerCase().includes(label.toLowerCase().replace(/\n/g, " ").split(" ")[0].toLowerCase())
    );
    if (match) {
      const id = `card-level-${match.level}`;
      setActiveCardId(id);
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => setActiveCardId(null), 2000);
      }
    }
  }

  function handleExportJson() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `first-principles-${result.topic.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopyShare() {
    if (!result) return;
    const shareText = `Zwyppy: ${result.topic}\n\nBreakdown levels:\n${result.breakdown.map((b) => `${b.level}. ${b.title}`).join("\n")}\n\nGenerated with Zwyppy — Your First Principles Explorer`;
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function loadExample() {
    setResult(TRANSISTOR_EXAMPLE);
    setPrompt(TRANSISTOR_EXAMPLE.topic);
    setError(null);
    setImages({});
    generationRef.current++;
    if (canGenerateImages && imagesAllowedByHealth) {
      void generateAllImages(TRANSISTOR_EXAMPLE);
    }
  }

  const hasResult = result !== null;

  return (
    <div className="min-h-screen bg-[hsl(224_71%_4%)] text-[hsl(213_31%_91%)]">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 border-b border-[hsl(216_34%_17%)] bg-[hsl(224_71%_4%/0.9)] backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[hsl(210_100%_66%/0.15)] flex items-center justify-center">
              <Atom className="w-5 h-5 text-[hsl(210_100%_66%)]" />
            </div>
            <span className="font-bold text-[hsl(213_31%_91%)] text-sm hidden sm:block">
              Zwyppy
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasResult && (
              <button
                onClick={() => {
                  setResult(null);
                  setPrompt("");
                  setError(null);
                  setActiveCardId(null);
                  setImages({});
                  generationRef.current++;
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[hsl(216_34%_17%)] hover:bg-[hsl(216_34%_22%)] transition-colors border border-[hsl(216_34%_25%)]"
              >
                <Plus className="w-3.5 h-3.5" />
                New Breakdown
              </button>
            )}

            <Show when="signed-in">
              {isPro ? (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(210_100%_66%/0.15)] border border-[hsl(210_100%_66%/0.35)] text-[10px] font-bold text-[hsl(210_100%_75%)]">
                  <Crown className="w-3 h-3" />
                  PRO · {monthlyUsed}/{monthlyLimit}
                </span>
              ) : topicCredits > 0 ? (
                <Link
                  href="/pricing"
                  title="Buy more credits"
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[hsl(38_92%_50%/0.15)] border border-[hsl(38_92%_50%/0.35)] text-[10px] font-bold text-[hsl(38_92%_70%)] hover:bg-[hsl(38_92%_50%/0.25)] transition-colors"
                >
                  <Zap className="w-3 h-3" />
                  {topicCredits} credit{topicCredits !== 1 ? "s" : ""}
                </Link>
              ) : freeBreakdownsRemaining > 0 ? (
                <Link
                  href="/pricing"
                  title="Upgrade for unlimited breakdowns"
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[hsl(160_60%_45%/0.15)] border border-[hsl(160_60%_45%/0.35)] text-[10px] font-bold text-[hsl(160_60%_70%)] hover:bg-[hsl(160_60%_45%/0.25)] transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  {freeBreakdownsRemaining}/{freeBreakdownsLimit} free
                </Link>
              ) : (
                <Link
                  href="/pricing"
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[hsl(280_65%_60%/0.15)] border border-[hsl(280_65%_60%/0.35)] text-[10px] font-bold text-[hsl(280_65%_80%)] hover:bg-[hsl(280_65%_60%/0.25)] transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  Upgrade
                </Link>
              )}
              <UserButton>
                <UserButton.UserProfilePage
                  label="Subscription"
                  url="subscription"
                  labelIcon={<CreditCard style={{ width: 16, height: 16 }} />}
                >
                  <SubscriptionTab />
                </UserButton.UserProfilePage>
              </UserButton>
            </Show>
            <Show when="signed-out">
              <button
                onClick={() => openSignIn({ fallbackRedirectUrl: basePath || "/" })}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[hsl(210_100%_66%)] hover:bg-[hsl(210_100%_58%)] text-[hsl(224_71%_4%)] transition-colors"
              >
                Sign in
              </button>
            </Show>
          </div>
        </div>
      </nav>

      {/* AI Service Health Banner — driven by the circuit breaker (aiStatus from /me + public /healthz) */}
      {showAiBanner && !aiBannerDismissed && (
        <div className="border-b border-[hsl(216_34%_17%)] bg-[hsl(224_71%_6%)]">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 text-[hsl(215.4_16.3%_78%)]">
              <span
                className={
                  effectiveAiStatus === "open"
                    ? "inline-block w-2 h-2 rounded-full bg-red-400"
                    : "inline-block w-2 h-2 rounded-full bg-amber-400"
                }
              />
              <span>
                {effectiveAiStatus === "open"
                  ? "AI service is in protection mode after rate limits."
                  : "AI service is under elevated load — responses may be slower."}
              </span>
              {healthData?.ai?.cooldownRemainingMs && healthData.ai.cooldownRemainingMs > 5000 && (
                <span className="text-[hsl(215.4_16.3%_56%)] text-xs">
                  (recovers in ~{Math.ceil(healthData.ai.cooldownRemainingMs / 1000)}s)
                </span>
              )}
            </div>
            <button
              onClick={() => setAiBannerDismissed(true)}
              className="text-[hsl(215.4_16.3%_56.9%)] hover:text-[hsl(213_31%_91%)] text-xs px-2 py-0.5 rounded transition-colors"
              aria-label="Dismiss AI status banner"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Hero / Input */}
      {!hasResult && !loading && (
        <div className="max-w-3xl mx-auto px-4 py-16 flex flex-col items-center gap-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(210_100%_66%/0.1)] border border-[hsl(210_100%_66%/0.2)] text-xs text-[hsl(210_100%_80%)] mb-2">
              <Atom className="w-3 h-3" />
              Powered by xAI Grok + Grok Imagine
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-br from-white via-[hsl(213_31%_80%)] to-[hsl(210_100%_66%)] bg-clip-text text-transparent">
              Understand anything
              <br />from first principles
            </h1>
            <p className="text-[hsl(215.4_16.3%_56.9%)] text-lg">
              Type a topic and get a hierarchical breakdown from atoms upward,
              with an interactive flowchart, AI-generated visuals, and innovation gaps.
            </p>
          </div>

          <div className="w-full space-y-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
              }}
              placeholder="How does a transistor work?"
              rows={3}
              className="w-full px-4 py-3.5 bg-[hsl(224_71%_7%)] border border-[hsl(216_34%_17%)] rounded-2xl text-white placeholder-[hsl(215.4_16.3%_36.9%)] text-base resize-none outline-none focus:border-[hsl(210_100%_66%)] transition-colors"
            />

            <button
              onClick={() => handleSubmit()}
              disabled={!prompt.trim()}
              className="w-full py-3.5 bg-[hsl(210_100%_66%)] hover:bg-[hsl(210_100%_58%)] disabled:opacity-40 disabled:cursor-not-allowed text-[hsl(224_71%_4%)] font-bold rounded-2xl transition-colors text-base shadow-lg shadow-[hsl(210_100%_66%/0.2)]"
            >
              Break It Down from First Principles
            </button>

            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPrompt(p);
                    handleSubmit(p);
                  }}
                  className="px-3 py-1.5 rounded-full border border-[hsl(216_34%_17%)] bg-[hsl(224_71%_7%)] hover:border-[hsl(216_34%_30%)] hover:bg-[hsl(216_34%_17%)] text-xs text-[hsl(215.4_16.3%_66.9%)] transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={loadExample}
                className="text-xs text-[hsl(215.4_16.3%_46.9%)] hover:text-[hsl(210_100%_66%)] transition-colors underline underline-offset-2"
              >
                Load transistor example
              </button>
            </div>
          </div>

          {/* Signed-out prompt */}
          {showSignedOutPrompt && (
            <div className="w-full rounded-2xl border border-[hsl(210_100%_66%/0.35)] bg-gradient-to-r from-[hsl(210_100%_66%/0.08)] to-[hsl(280_65%_60%/0.04)] p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-[hsl(210_100%_75%)] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[hsl(213_31%_91%)]">
                    Sign in to run your first breakdown
                  </p>
                  <p className="text-xs text-[hsl(215.4_16.3%_66.9%)] mt-0.5">
                    Create a free account to get 2 full server-hosted breakdowns every month — no credit card required.
                    Or take a quick tour with the transistor example first.
                  </p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setShowSignedOutPrompt(false);
                    openSignIn({ fallbackRedirectUrl: basePath || "/" });
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-[hsl(210_100%_66%)] hover:bg-[hsl(210_100%_58%)] text-[hsl(224_71%_4%)] transition-colors text-left"
                >
                  <Sparkles className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">Sign in or sign up</p>
                    <p className="text-[10px] opacity-80">Free · 5 breakdowns/month</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowSignedOutPrompt(false);
                    loadExample();
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-[hsl(216_34%_25%)] bg-[hsl(224_71%_7%)] hover:bg-[hsl(216_34%_17%)] transition-colors text-left"
                >
                  <Atom className="w-5 h-5 text-[hsl(210_100%_66%)] shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[hsl(213_31%_91%)]">Load transistor example</p>
                    <p className="text-[10px] text-[hsl(215.4_16.3%_56.9%)]">See what a full breakdown looks like</p>
                  </div>
                </button>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => setShowSignedOutPrompt(false)}
                  className="text-xs text-[hsl(215.4_16.3%_46.9%)] hover:text-[hsl(213_31%_91%)] transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Credit confirmation banner */}
          {pendingCreditTopic && (
            <div className="w-full rounded-2xl border border-[hsl(38_92%_50%/0.4)] bg-[hsl(38_92%_50%/0.08)] p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Zap className="w-4 h-4 text-[hsl(38_92%_60%)] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[hsl(38_92%_75%)]">
                    1 credit will be used
                  </p>
                  <p className="text-xs text-[hsl(215.4_16.3%_66.9%)] mt-0.5">
                    You're out of free breakdowns this month. This will use 1 of your topic credits to run a full breakdown of &ldquo;{pendingCreditTopic}&rdquo;, including innovation gaps and AI images.
                    You have {topicCredits} credit{topicCredits !== 1 ? "s" : ""} remaining.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleProceedWithCredit}
                  className="flex-1 min-w-[180px] py-2 rounded-xl bg-[hsl(38_92%_50%)] hover:bg-[hsl(38_92%_44%)] text-[hsl(224_71%_4%)] text-sm font-bold transition-colors"
                >
                  Proceed (use 1 credit)
                </button>
                <button
                  onClick={() => setPendingCreditTopic(null)}
                  className="px-4 py-2 rounded-xl border border-[hsl(216_34%_17%)] text-sm text-[hsl(215.4_16.3%_66.9%)] hover:bg-[hsl(216_34%_17%)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* No-credits prompt */}
          {showNoCreditsPrompt && !pendingCreditTopic && (
            <div className="w-full rounded-2xl border border-[hsl(280_65%_60%/0.3)] bg-gradient-to-r from-[hsl(280_65%_60%/0.06)] to-[hsl(38_92%_50%/0.04)] p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-[hsl(280_65%_80%)] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[hsl(213_31%_91%)]">
                    You've used all {freeBreakdownsLimit} free breakdowns this month
                  </p>
                  <p className="text-xs text-[hsl(215.4_16.3%_66.9%)] mt-0.5">
                    Free breakdowns reset on the 1st of each month. To keep exploring now, buy topic credits or upgrade to Pro.
                  </p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Link
                  href="/pricing"
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-[hsl(38_92%_50%/0.35)] bg-[hsl(38_92%_50%/0.08)] hover:bg-[hsl(38_92%_50%/0.15)] transition-colors group"
                >
                  <Zap className="w-5 h-5 text-[hsl(38_92%_60%)] shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[hsl(38_92%_75%)]">Buy topic credits</p>
                    <p className="text-[10px] text-[hsl(215.4_16.3%_56.9%)]">From $1.99 · one-time, never expire</p>
                  </div>
                </Link>
                <Link
                  href="/pricing"
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-[hsl(280_65%_60%/0.3)] bg-[hsl(280_65%_60%/0.06)] hover:bg-[hsl(280_65%_60%/0.12)] transition-colors group"
                >
                  <Crown className="w-5 h-5 text-[hsl(280_65%_75%)] shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[hsl(280_65%_85%)]">Upgrade to Pro</p>
                    <p className="text-[10px] text-[hsl(215.4_16.3%_56.9%)]">From $8.25/mo · unlimited breakdowns</p>
                  </div>
                </Link>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => setShowNoCreditsPrompt(false)}
                  className="text-xs text-[hsl(215.4_16.3%_46.9%)] hover:text-[hsl(213_31%_91%)] transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading — now deeply influenced by AI health state */}
      {loading && (
        <div className="max-w-2xl mx-auto px-4">
          <AtomSpinner
            message={
              effectiveAiStatus === "open"
                ? `Waiting for AI capacity to break down "${prompt}"...`
                : effectiveAiStatus === "degraded"
                  ? `Breaking down "${prompt}" (service under load)...`
                  : `Breaking down "${prompt}" from first principles...`
            }
            healthStatus={effectiveAiStatus}
          />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="rounded-xl border border-[hsl(0_63%_31%/0.5)] bg-[hsl(0_63%_31%/0.1)] p-4 text-center space-y-3">
            <p className="text-[hsl(0_63%_71%)] text-sm">{error}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 rounded-lg border border-[hsl(216_34%_17%)] text-sm text-[hsl(215.4_16.3%_66.9%)] hover:bg-[hsl(216_34%_17%)] transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={() => handleSubmit()}
                className="px-4 py-2 rounded-lg bg-[hsl(210_100%_66%)] text-[hsl(224_71%_4%)] text-sm font-medium hover:bg-[hsl(210_100%_58%)] transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {hasResult && !loading && (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Topic header */}
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-xs text-[hsl(215.4_16.3%_46.9%)] uppercase tracking-wide mb-1">First Principles Breakdown</p>
              <h2 className="text-2xl font-bold text-white">{result.topic}</h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <p className="text-sm text-[hsl(215.4_16.3%_56.9%)]">
                  {result.breakdown.length} levels from fundamentals to application
                </p>
                {usedCreditBreakdown && receipt?.kind === "credit" && (
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(38_92%_50%/0.12)] border border-[hsl(38_92%_50%/0.35)] text-[hsl(38_92%_65%)] text-xs font-medium hover:bg-[hsl(38_92%_50%/0.22)] hover:text-[hsl(38_92%_80%)] transition-colors"
                  >
                    <Zap className="w-3 h-3" />
                    {topicCredits} credit{topicCredits !== 1 ? "s" : ""} left
                  </Link>
                )}
                {usedCreditBreakdown && receipt?.kind === "free" && (
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(160_60%_45%/0.12)] border border-[hsl(160_60%_45%/0.35)] text-[hsl(160_60%_70%)] text-xs font-medium hover:bg-[hsl(160_60%_45%/0.22)] transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    {receipt.freeRemaining}/{freeBreakdownsLimit} free left this month
                  </Link>
                )}
              </div>

              {/* AI Health status note for Pro users when the circuit breaker is active */}
              {isPro && aiIsDegraded && (
                <div className="mt-1 text-[10px] text-amber-400/80">
                  AI service is {effectiveAiStatus}. Image generation is paused until it recovers.
                </div>
              )}
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <div className="flex items-center gap-2 bg-[hsl(224_71%_7%)] border border-[hsl(216_34%_17%)] rounded-xl px-3 py-2">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="Try another topic..."
                  className="bg-transparent text-sm text-white placeholder-[hsl(215.4_16.3%_36.9%)] outline-none w-40 sm:w-60"
                />
                <button
                  onClick={() => handleSubmit()}
                  disabled={!prompt.trim()}
                  className="shrink-0 px-3 py-1 bg-[hsl(210_100%_66%)] hover:bg-[hsl(210_100%_58%)] disabled:opacity-40 text-[hsl(224_71%_4%)] text-xs font-semibold rounded-lg transition-colors"
                >
                  Go
                </button>
              </div>
            </div>
          </div>

          {/* Usage receipt */}
          {receipt && !receiptDismissed && (
            receipt.kind === "credit" ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[hsl(38_92%_50%/0.35)] bg-[hsl(38_92%_50%/0.07)]">
                <Zap className="w-4 h-4 text-[hsl(38_92%_60%)] shrink-0" />
                <p className="flex-1 text-sm text-[hsl(38_92%_75%)]">
                  <span className="font-semibold">1 credit used</span>
                  {" — "}
                  {receipt.creditsRemaining} credit{receipt.creditsRemaining !== 1 ? "s" : ""} remaining.{" "}
                  <Link href="/pricing" className="underline underline-offset-2 hover:text-[hsl(38_92%_90%)] transition-colors">
                    Buy more
                  </Link>
                </p>
                <button
                  onClick={() => setReceiptDismissed(true)}
                  aria-label="Dismiss"
                  className="shrink-0 text-[hsl(215.4_16.3%_46.9%)] hover:text-[hsl(213_31%_91%)] transition-colors text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[hsl(160_60%_45%/0.35)] bg-[hsl(160_60%_45%/0.07)]">
                <Sparkles className="w-4 h-4 text-[hsl(160_60%_70%)] shrink-0" />
                <p className="flex-1 text-sm text-[hsl(160_60%_75%)]">
                  <span className="font-semibold">Free breakdown used</span>
                  {" — "}
                  {receipt.freeRemaining} of {freeBreakdownsLimit} free breakdown{freeBreakdownsLimit !== 1 ? "s" : ""} left this month.{" "}
                  <Link href="/pricing" className="underline underline-offset-2 hover:text-[hsl(160_60%_90%)] transition-colors">
                    Go unlimited with Pro
                  </Link>
                </p>
                <button
                  onClick={() => setReceiptDismissed(true)}
                  aria-label="Dismiss"
                  className="shrink-0 text-[hsl(215.4_16.3%_46.9%)] hover:text-[hsl(213_31%_91%)] transition-colors text-lg leading-none"
                >
                  ×
                </button>
              </div>
            )
          )}

          {/* Visuals notice */}
          {canGenerateImages && Object.keys(images).length > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(280_65%_60%/0.1)] border border-[hsl(280_65%_60%/0.25)] text-[10px] text-[hsl(280_65%_80%)]">
              <Sparkles className="w-3 h-3" />
              Visuals generated on-the-fly with xAI Grok Imagine · {monthlyUsed}/{monthlyLimit} this month
            </div>
          )}
          {!canGenerateImages && (
            <div className="rounded-xl border border-[hsl(280_65%_60%/0.3)] bg-gradient-to-r from-[hsl(280_65%_60%/0.08)] to-[hsl(210_100%_66%/0.06)] p-3.5 flex items-center gap-3 flex-wrap">
              <Sparkles className="w-4 h-4 text-[hsl(280_65%_80%)] shrink-0" />
              <p className="text-xs text-[hsl(213_31%_85%)] flex-1 min-w-[200px]">
                {upsellReason === "signed-out"
                  ? "Sign in and upgrade to Pro — or buy credits — to generate AI visuals for every level and gap."
                  : "Free breakdowns are text-only. Buy credits or go Pro to generate AI visuals for every level and gap."}
              </p>
              {upsellReason === "signed-out" ? (
                <button
                  onClick={() => openSignIn({ fallbackRedirectUrl: basePath || "/" })}
                  className="px-3 py-1.5 rounded-lg bg-[hsl(210_100%_66%)] hover:bg-[hsl(210_100%_58%)] text-[hsl(224_71%_4%)] text-xs font-bold transition-colors"
                >
                  Sign in
                </button>
              ) : (
                <Link
                  href="/pricing"
                  className="px-3 py-1.5 rounded-lg bg-[hsl(280_65%_60%)] hover:bg-[hsl(280_65%_55%)] text-white text-xs font-bold transition-colors"
                >
                  Upgrade to Pro
                </Link>
              )}
            </div>
          )}

          {/* Flow Diagram */}
          <div>
            <h3 className="text-sm font-semibold text-[hsl(215.4_16.3%_66.9%)] uppercase tracking-wide mb-3">
              Flow Diagram
            </h3>
            <div className="rounded-xl border border-[hsl(216_34%_17%)] bg-[hsl(224_71%_7%)] p-4">
              <MermaidChart
                chart={result.mermaid_flowchart}
                gapNodes={result.gap_nodes ?? []}
                onNodeClick={handleNodeClick}
              />
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-[hsl(215.4_16.3%_36.9%)]">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm border border-[hsl(210_100%_66%)] bg-[hsl(224_71%_10%)] inline-block" />
                  Standard node
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm border-2 border-[hsl(38_92%_50%)] bg-[hsl(38_92%_8%)] inline-block" />
                  Innovation gap
                </span>
                <span>· Click a node to jump to its breakdown</span>
              </div>
            </div>
          </div>

          {/* Hierarchical Breakdown */}
          <div ref={breakdownRef}>
            <h3 className="text-sm font-semibold text-[hsl(215.4_16.3%_66.9%)] uppercase tracking-wide mb-3">
              Hierarchical Breakdown
            </h3>
            <div className="space-y-2">
              {result.breakdown.map((item) => {
                const id = `card-level-${item.level}`;
                return (
                  <BreakdownCard
                    key={item.level}
                    id={id}
                    item={item}
                    isActive={activeCardId === id}
                    defaultOpen={item.level <= 2}
                    imageEntry={images[breakdownKey(item.level)]}
                    upsellReason={upsellReason}
                    healthStatus={effectiveAiStatus}
                  />
                );
              })}
            </div>
          </div>

          {/* Gaps & Innovation */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Gaps & Innovation Opportunities</h3>
                <p className="text-sm text-[hsl(215.4_16.3%_56.9%)]">
                  Concrete frontiers where breakthroughs are needed
                </p>
              </div>
              {isPro && (
                <button
                  onClick={handleRegenerateGaps}
                  disabled={loadingGaps || effectiveAiStatus === "open"}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[hsl(216_34%_17%)] bg-[hsl(224_71%_7%)] hover:bg-[hsl(216_34%_17%)] text-xs text-[hsl(215.4_16.3%_66.9%)] transition-colors disabled:opacity-50"
                  title={effectiveAiStatus === "open" ? "AI service is in protection mode" : undefined}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingGaps ? "animate-spin" : ""}`} />
                  Regenerate Gaps
                  {effectiveAiStatus !== "healthy" && (
                    <span className={`ml-1 text-[10px] ${effectiveAiStatus === "open" ? "text-red-400" : "text-amber-400"}`}>
                      {effectiveAiStatus}
                    </span>
                  )}
                </button>
              )}
            </div>

            {!isPro && !usedCreditBreakdown && upsellReason !== null ? (
              <UpgradePrompt
                reason={upsellReason}
                fullWidth
                title={
                  upsellReason === "signed-out"
                    ? "Sign in to unlock innovation gaps"
                    : "Innovation gaps are a Pro feature"
                }
                body={
                  upsellReason === "signed-out"
                    ? "Create a free account, then upgrade to Pro to see concrete innovation gaps with the public companies positioned to capture them."
                    : "Upgrade to Pro to see concrete innovation gaps for this topic, complete with publicly traded companies positioned in each one."
                }
              />
            ) : loadingGaps ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-[hsl(215.4_16.3%_56.9%)] text-sm">
                  <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${effectiveAiStatus !== "healthy" ? "border-amber-400" : "border-[hsl(210_100%_66%)]"}`} />
                  {effectiveAiStatus === "open"
                    ? "AI service in protection mode — gap regeneration paused"
                    : effectiveAiStatus === "degraded"
                      ? "Finding new innovation gaps (under load)..."
                      : "Finding new innovation gaps..."}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.gaps.map((gap, i) => (
                  <GapCard
                    key={i}
                    gap={gap}
                    topic={result.topic}
                    index={i}
                    isPro={canGenerateImages}
                    creditSessionToken={isPro ? null : creditSessionRef.current}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="border-t border-[hsl(216_34%_17%)] pt-6 flex flex-wrap gap-3 items-center justify-between">
            <p className="text-xs text-[hsl(215.4_16.3%_36.9%)]">
              Generated with xAI Grok + Grok Imagine · Zwyppy
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleExportJson}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[hsl(216_34%_17%)] bg-[hsl(224_71%_7%)] hover:bg-[hsl(216_34%_17%)] text-xs text-[hsl(215.4_16.3%_66.9%)] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export JSON
              </button>
              <button
                onClick={handleCopyShare}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[hsl(216_34%_17%)] bg-[hsl(224_71%_7%)] hover:bg-[hsl(216_34%_17%)] text-xs text-[hsl(215.4_16.3%_66.9%)] transition-colors"
              >
                {copied ? (
                  <><Check className="w-3.5 h-3.5 text-[hsl(160_60%_60%)]" />Copied!</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" />Share Link</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-16 border-t border-[hsl(216_34%_17%)] py-6">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-[hsl(215.4_16.3%_36.9%)]">
            © {new Date().getFullYear()} Zwyppy
          </p>
          <div className="flex flex-wrap gap-4 text-xs text-[hsl(215.4_16.3%_46.9%)]">
            <Link href="/pricing" className="hover:text-[hsl(215.4_16.3%_66.9%)] transition-colors">
              Pricing
            </Link>
            <Link href="/products" className="hover:text-[hsl(215.4_16.3%_66.9%)] transition-colors">
              Products &amp; Services
            </Link>
            <Link href="/terms" className="hover:text-[hsl(215.4_16.3%_66.9%)] transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-[hsl(215.4_16.3%_66.9%)] transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
