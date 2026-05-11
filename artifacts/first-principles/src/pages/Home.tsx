import { useState, useCallback, useRef } from "react";
import { Atom, Plus, Download, Copy, Check, RefreshCw, Key } from "lucide-react";
import type { BreakdownResult } from "../types";
import { generateBreakdown, regenerateGaps } from "../lib/grok";
import { TRANSISTOR_EXAMPLE } from "../data/transistorExample";
import { ApiKeyModal } from "../components/ApiKeyModal";
import { AtomSpinner } from "../components/AtomSpinner";
import { BreakdownCard } from "../components/BreakdownCard";
import { MermaidChart } from "../components/MermaidChart";
import { GapCard } from "../components/GapCard";

const EXAMPLE_PROMPTS = [
  "How does a transistor work",
  "How is a lithium-ion battery made",
  "How does photosynthesis work",
  "How does a jet engine work",
  "How does DNA replication occur",
  "How does a nuclear reactor work",
];

export function Home() {
  const [apiKey, setApiKey] = useState<string>(
    () => localStorage.getItem("xai_api_key") ?? ""
  );
  const [showApiModal, setShowApiModal] = useState(false);
  const [showApiEdit, setShowApiEdit] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<BreakdownResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingGaps, setLoadingGaps] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const breakdownRef = useRef<HTMLDivElement>(null);

  function handleApiKeySave(key: string) {
    setApiKey(key);
    setShowApiModal(false);
    setShowApiEdit(false);
  }

  async function handleSubmit(customPrompt?: string) {
    const topic = (customPrompt ?? prompt).trim();
    if (!topic) return;

    if (!apiKey) {
      setShowApiModal(true);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveCardId(null);

    try {
      const data = await generateBreakdown(topic, apiKey);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerateGaps() {
    if (!result || !apiKey) return;
    setLoadingGaps(true);
    try {
      const gaps = await regenerateGaps(result.topic, result.breakdown, apiKey);
      setResult({ ...result, gaps });
    } catch {
      // silently fail — keep existing gaps
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
    const shareText = `FirstPrinciples Explorer: ${result.topic}\n\nBreakdown levels:\n${result.breakdown.map((b) => `${b.level}. ${b.title}`).join("\n")}\n\nGenerated with FirstPrinciples Explorer`;
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function loadExample() {
    setResult(TRANSISTOR_EXAMPLE);
    setPrompt(TRANSISTOR_EXAMPLE.topic);
    setError(null);
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
              FirstPrinciples Explorer
            </span>
          </div>

          <div className="flex items-center gap-2">
            {apiKey && (
              <button
                onClick={() => setShowApiEdit(true)}
                title="Update API key"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[hsl(215.4_16.3%_56.9%)] hover:text-[hsl(213_31%_91%)] hover:bg-[hsl(216_34%_17%)] transition-colors"
              >
                <Key className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">API Key</span>
              </button>
            )}
            {hasResult && (
              <button
                onClick={() => {
                  setResult(null);
                  setPrompt("");
                  setError(null);
                  setActiveCardId(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[hsl(216_34%_17%)] hover:bg-[hsl(216_34%_22%)] transition-colors border border-[hsl(216_34%_25%)]"
              >
                <Plus className="w-3.5 h-3.5" />
                New Breakdown
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero / Input */}
      {!hasResult && !loading && (
        <div className="max-w-3xl mx-auto px-4 py-16 flex flex-col items-center gap-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(210_100%_66%/0.1)] border border-[hsl(210_100%_66%/0.2)] text-xs text-[hsl(210_100%_80%)] mb-2">
              <Atom className="w-3 h-3" />
              Powered by xAI Grok
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-br from-white via-[hsl(213_31%_80%)] to-[hsl(210_100%_66%)] bg-clip-text text-transparent">
              Understand anything
              <br />from first principles
            </h1>
            <p className="text-[hsl(215.4_16.3%_56.9%)] text-lg">
              Type a topic and get a hierarchical breakdown from atoms upward,
              with an interactive flowchart and innovation gaps.
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
                Load transistor example (no API key needed)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="max-w-2xl mx-auto px-4">
          <AtomSpinner message={`Breaking down "${prompt}" from first principles...`} />
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
              <p className="text-sm text-[hsl(215.4_16.3%_56.9%)] mt-1">
                {result.breakdown.length} levels from fundamentals to application
              </p>
            </div>
            {/* Quick re-query */}
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

          {/* Split view: Breakdown + Flowchart */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left: Breakdown */}
            <div className="lg:col-span-3 space-y-2" ref={breakdownRef}>
              <h3 className="text-sm font-semibold text-[hsl(215.4_16.3%_66.9%)] uppercase tracking-wide mb-3">
                Hierarchical Breakdown
              </h3>
              {result.breakdown.map((item) => {
                const id = `card-level-${item.level}`;
                return (
                  <BreakdownCard
                    key={item.level}
                    id={id}
                    item={item}
                    isActive={activeCardId === id}
                    defaultOpen={item.level <= 2}
                  />
                );
              })}
            </div>

            {/* Right: Flowchart */}
            <div className="lg:col-span-2">
              <div className="sticky top-20">
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
                    <span>· Click to jump to breakdown</span>
                  </div>
                </div>
              </div>
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
              <button
                onClick={handleRegenerateGaps}
                disabled={loadingGaps}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[hsl(216_34%_17%)] bg-[hsl(224_71%_7%)] hover:bg-[hsl(216_34%_17%)] text-xs text-[hsl(215.4_16.3%_66.9%)] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingGaps ? "animate-spin" : ""}`} />
                Regenerate Gaps
              </button>
            </div>

            {loadingGaps && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-[hsl(215.4_16.3%_56.9%)] text-sm">
                  <div className="w-4 h-4 border-2 border-[hsl(210_100%_66%)] border-t-transparent rounded-full animate-spin" />
                  Finding new innovation gaps...
                </div>
              </div>
            )}

            {!loadingGaps && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.gaps.map((gap, i) => (
                  <GapCard key={i} gap={gap} index={i} />
                ))}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="border-t border-[hsl(216_34%_17%)] pt-6 flex flex-wrap gap-3 items-center justify-between">
            <p className="text-xs text-[hsl(215.4_16.3%_36.9%)]">
              Generated with xAI Grok · FirstPrinciples Explorer
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

      {/* API Key Modals */}
      {showApiModal && (
        <ApiKeyModal onSave={handleApiKeySave} />
      )}
      {showApiEdit && (
        <ApiKeyModal onSave={handleApiKeySave} onClose={() => setShowApiEdit(false)} isEdit />
      )}
    </div>
  );
}
