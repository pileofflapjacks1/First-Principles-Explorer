import { useState } from "react";
import {
  ExternalLink,
  Lightbulb,
  AlertCircle,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Link } from "wouter";
import ReactMarkdown from "react-markdown";
import { useMutation } from "@tanstack/react-query";
import type { Gap } from "../types";
import { analyzeStockOnServer, findMoreCompaniesOnServer } from "../lib/api";

interface GapCardProps {
  gap: Gap;
  topic: string;
  index: number;
  isPro?: boolean;
  creditSessionToken?: string | null;
}

const GAP_COLORS = [
  "border-[hsl(210_100%_66%/0.3)] bg-[hsl(210_100%_66%/0.04)]",
  "border-[hsl(160_60%_45%/0.3)] bg-[hsl(160_60%_45%/0.04)]",
  "border-[hsl(280_65%_60%/0.3)] bg-[hsl(280_65%_60%/0.04)]",
  "border-[hsl(30_80%_55%/0.3)] bg-[hsl(30_80%_55%/0.04)]",
  "border-[hsl(340_75%_55%/0.3)] bg-[hsl(340_75%_55%/0.04)]",
];

const EXCHANGES: Record<string, string> = {
  NASDAQ: "NASDAQ",
  NYSE: "NYSE",
  TSX: "TSX",
  LSE: "LSE",
  HKEX: "HKEX",
  KRX: "KRX",
  TYO: "TYO",
  OTCMKTS: "OTC",
};

interface AnalysisState {
  loading: boolean;
  text: string | null;
  error: string | null;
}

interface ExtraCompany {
  name: string;
  ticker: string;
  exchange: string;
  relevance: string;
}

interface ExtraCompaniesState {
  loading: boolean;
  companies: ExtraCompany[];
  error: string | null;
}

export function GapCard({
  gap,
  topic,
  index,
  isPro,
  creditSessionToken,
}: GapCardProps) {
  // "Can use Pro features" — true for actual Pro/admin users AND for free
  // users who unlocked this breakdown by spending a credit.
  const canUsePro = !!isPro;
  const [showCompanies, setShowCompanies] = useState(true);
  const [analyses, setAnalyses] = useState<Record<string, AnalysisState>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [extraCompanies, setExtraCompanies] = useState<ExtraCompaniesState>({
    loading: false,
    companies: [],
    error: null,
  });

  const analyzeMutation = useMutation({
    mutationFn: (vars: Parameters<typeof analyzeStockOnServer>[0]) =>
      analyzeStockOnServer(vars, creditSessionToken),
  });
  const findCompaniesMutation = useMutation({
    mutationFn: (vars: Parameters<typeof findMoreCompaniesOnServer>[0]) =>
      findMoreCompaniesOnServer(vars, creditSessionToken),
  });

  function handleAskGrok() {
    if (!canUsePro) return;
    const existingTickers = (gap.public_companies ?? []).map((c) => c.ticker);
    setExtraCompanies({ loading: true, companies: [], error: null });
    findCompaniesMutation.mutate(
      {
        topic,
        gapTitle: gap.gap_title,
        gapWhyExists: gap.why_exists,
        gapInnovationPotential: gap.innovation_potential,
        existingTickers,
      },
      {
        onSuccess: (data) => {
          setExtraCompanies({
            loading: false,
            companies: data.companies ?? [],
            error: null,
          });
        },
        onError: () => {
          setExtraCompanies({
            loading: false,
            companies: [],
            error: "Grok couldn't find companies. Please try again.",
          });
        },
      },
    );
  }

  function handleStockResearch(ticker: string) {
    window.open(
      `https://finance.yahoo.com/quote/${ticker}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function handleAnalyze(company: Gap["public_companies"][number]) {
    if (!canUsePro) return;
    const key = company.ticker;
    setExpanded((prev) => ({ ...prev, [key]: true }));
    setAnalyses((prev) => ({
      ...prev,
      [key]: { loading: true, text: prev[key]?.text ?? null, error: null },
    }));
    analyzeMutation.mutate(
      {
        name: company.name,
        ticker: company.ticker,
        exchange: company.exchange,
        relevance: company.relevance,
        topic,
        gapTitle: gap.gap_title,
        gapWhyExists: gap.why_exists,
        gapInnovationPotential: gap.innovation_potential,
      },
      {
        onSuccess: (data) => {
          setAnalyses((prev) => ({
            ...prev,
            [key]: { loading: false, text: data.analysis, error: null },
          }));
        },
        onError: () => {
          setAnalyses((prev) => ({
            ...prev,
            [key]: {
              loading: false,
              text: prev[key]?.text ?? null,
              error: "Couldn't generate analysis. Try again.",
            },
          }));
        },
      },
    );
  }

  const companies = gap.public_companies ?? [];

  return (
    <div
      className={`rounded-xl border p-5 space-y-4 transition-all ${GAP_COLORS[index % GAP_COLORS.length]}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[hsl(216_34%_17%)] flex items-center justify-center shrink-0 mt-0.5">
          <AlertCircle className="w-4 h-4 text-[hsl(215.4_16.3%_66.9%)]" />
        </div>
        <div>
          <h3 className="font-semibold text-[hsl(213_31%_91%)] text-sm leading-tight">
            {gap.gap_title}
          </h3>
          <p className="text-xs text-[hsl(215.4_16.3%_46.9%)] mt-0.5">
            Gap #{index + 1}
          </p>
        </div>
      </div>

      {/* Why it exists */}
      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-[hsl(215.4_16.3%_56.9%)] uppercase tracking-wide mb-1">
            Why It Exists
          </p>
          <p className="text-sm text-[hsl(215.4_16.3%_76.9%)] leading-relaxed">
            {gap.why_exists}
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <div className="w-6 h-6 rounded-md bg-[hsl(160_60%_45%/0.15)] flex items-center justify-center shrink-0 mt-0.5">
            <Lightbulb className="w-3.5 h-3.5 text-[hsl(160_60%_60%)]" />
          </div>
          <p className="text-sm text-[hsl(215.4_16.3%_76.9%)] leading-relaxed">
            {gap.innovation_potential}
          </p>
        </div>
      </div>

      {/* Companies of Interest */}
      {companies.length > 0 && (
        <div className="border border-[hsl(216_34%_17%)] rounded-lg overflow-hidden">
          <button
            onClick={() => setShowCompanies(!showCompanies)}
            className="w-full flex items-center justify-between px-3 py-2 bg-[hsl(223_47%_11%)] hover:bg-[hsl(216_34%_17%)] transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[hsl(160_60%_60%)]" />
              <span className="text-xs font-semibold text-[hsl(213_31%_91%)]">
                Companies of Interest
              </span>
              <span className="text-xs text-[hsl(215.4_16.3%_46.9%)]">
                ({companies.length})
              </span>
            </div>
            {showCompanies ? (
              <ChevronDown className="w-3.5 h-3.5 text-[hsl(215.4_16.3%_46.9%)]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[hsl(215.4_16.3%_46.9%)]" />
            )}
          </button>

          {showCompanies && (
            <div className="divide-y divide-[hsl(216_34%_17%)]">
              {companies.map((company, i) => {
                const key = company.ticker;
                const analysis = analyses[key];
                const isExpanded = !!expanded[key];
                const showPanel =
                  isExpanded &&
                  (analysis?.loading || analysis?.text || analysis?.error);
                return (
                  <div key={i} className="bg-[hsl(224_71%_7%)]">
                    <div className="flex items-start gap-3 px-3 py-2.5">
                      {/* Ticker badge */}
                      <button
                        onClick={() => handleStockResearch(company.ticker)}
                        title="Open on Yahoo Finance"
                        className="shrink-0 mt-0.5 group"
                      >
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono font-bold text-xs bg-[hsl(210_100%_66%/0.12)] text-[hsl(210_100%_75%)] border border-[hsl(210_100%_66%/0.25)] group-hover:bg-[hsl(210_100%_66%/0.2)] transition-colors">
                          {company.ticker}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      </button>
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-[hsl(213_31%_91%)] truncate">
                            {company.name}
                          </span>
                          <span className="shrink-0 text-[10px] text-[hsl(215.4_16.3%_36.9%)]">
                            {EXCHANGES[company.exchange] ?? company.exchange}
                          </span>
                        </div>
                        <p className="text-xs text-[hsl(215.4_16.3%_56.9%)] leading-snug mt-0.5">
                          {company.relevance}
                        </p>
                        {/* Analyze action */}
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          {canUsePro ? (
                            <button
                              onClick={() => handleAnalyze(company)}
                              disabled={analysis?.loading}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[hsl(280_65%_60%/0.15)] hover:bg-[hsl(280_65%_60%/0.25)] border border-[hsl(280_65%_60%/0.35)] text-[10px] font-semibold text-[hsl(280_65%_85%)] transition-colors disabled:opacity-60"
                            >
                              {analysis?.loading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : analysis?.text ? (
                                <RefreshCw className="w-3 h-3" />
                              ) : (
                                <Sparkles className="w-3 h-3" />
                              )}
                              {analysis?.loading
                                ? "Analyzing…"
                                : analysis?.text
                                  ? "Re-analyze"
                                  : "AI analysis"}
                            </button>
                          ) : (
                            <Link
                              href="/pricing"
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[hsl(280_65%_60%/0.1)] hover:bg-[hsl(280_65%_60%/0.2)] border border-[hsl(280_65%_60%/0.3)] text-[10px] font-semibold text-[hsl(280_65%_85%)] transition-colors"
                            >
                              <Sparkles className="w-3 h-3" />
                              AI analysis (Pro)
                            </Link>
                          )}
                          {analysis?.text && canUsePro && (
                            <button
                              onClick={() =>
                                setExpanded((prev) => ({
                                  ...prev,
                                  [key]: !prev[key],
                                }))
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-[hsl(215.4_16.3%_66.9%)] hover:text-[hsl(213_31%_91%)] hover:bg-[hsl(216_34%_17%)] transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronDown className="w-3 h-3" />
                                  Hide
                                </>
                              ) : (
                                <>
                                  <ChevronRight className="w-3 h-3" />
                                  Show analysis
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {showPanel && (
                      <div className="px-3 pb-3">
                        <div className="rounded-md border border-[hsl(280_65%_60%/0.25)] bg-[hsl(280_65%_60%/0.05)] p-3">
                          {analysis?.loading && !analysis.text && (
                            <div className="flex items-center gap-2 text-xs text-[hsl(215.4_16.3%_66.9%)]">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Generating an analysis of {company.ticker}…
                            </div>
                          )}
                          {analysis?.text && (
                            <div className="prose-stock text-xs text-[hsl(215.4_16.3%_86.9%)] leading-relaxed">
                              <ReactMarkdown
                                components={{
                                  h1: ({ children }) => (
                                    <h4 className="text-sm font-bold text-[hsl(213_31%_91%)] mt-2 mb-1">
                                      {children}
                                    </h4>
                                  ),
                                  h2: ({ children }) => (
                                    <h4 className="text-xs font-bold uppercase tracking-wide text-[hsl(280_65%_85%)] mt-3 mb-1 first:mt-0">
                                      {children}
                                    </h4>
                                  ),
                                  h3: ({ children }) => (
                                    <h5 className="text-xs font-semibold text-[hsl(213_31%_91%)] mt-2 mb-0.5">
                                      {children}
                                    </h5>
                                  ),
                                  p: ({ children }) => (
                                    <p className="my-1.5">{children}</p>
                                  ),
                                  ul: ({ children }) => (
                                    <ul className="my-1.5 ml-4 list-disc space-y-0.5">
                                      {children}
                                    </ul>
                                  ),
                                  ol: ({ children }) => (
                                    <ol className="my-1.5 ml-4 list-decimal space-y-0.5">
                                      {children}
                                    </ol>
                                  ),
                                  li: ({ children }) => (
                                    <li className="leading-snug">{children}</li>
                                  ),
                                  strong: ({ children }) => (
                                    <strong className="text-[hsl(213_31%_96%)] font-semibold">
                                      {children}
                                    </strong>
                                  ),
                                  a: ({ children, href }) => (
                                    <a
                                      href={href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[hsl(210_100%_75%)] underline"
                                    >
                                      {children}
                                    </a>
                                  ),
                                }}
                              >
                                {analysis.text}
                              </ReactMarkdown>
                            </div>
                          )}
                          {analysis?.error && (
                            <p className="mt-2 text-[11px] text-[hsl(0_85%_70%)]">
                              {analysis.error}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Ask Grok for more companies */}
      <div className="border border-[hsl(216_34%_17%)] rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-[hsl(223_47%_11%)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[hsl(280_65%_75%)]" />
            <span className="text-xs font-semibold text-[hsl(213_31%_91%)]">
              Ask Grok for Other Companies
            </span>
          </div>
          {canUsePro ? (
            <button
              onClick={handleAskGrok}
              disabled={extraCompanies.loading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[hsl(280_65%_60%/0.18)] hover:bg-[hsl(280_65%_60%/0.30)] border border-[hsl(280_65%_60%/0.4)] text-[10px] font-semibold text-[hsl(280_65%_85%)] transition-colors disabled:opacity-60"
            >
              {extraCompanies.loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : extraCompanies.companies.length > 0 ? (
                <RefreshCw className="w-3 h-3" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              {extraCompanies.loading
                ? "Asking Grok…"
                : extraCompanies.companies.length > 0
                  ? "Ask Again"
                  : "Ask Grok"}
            </button>
          ) : (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[hsl(280_65%_60%/0.1)] hover:bg-[hsl(280_65%_60%/0.2)] border border-[hsl(280_65%_60%/0.3)] text-[10px] font-semibold text-[hsl(280_65%_85%)] transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              Pro only
            </Link>
          )}
        </div>

        {/* Results area */}
        {extraCompanies.loading && (
          <div className="flex items-center gap-2 px-3 py-3 text-xs text-[hsl(215.4_16.3%_66.9%)] bg-[hsl(224_71%_7%)]">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            Grok is researching companies…
          </div>
        )}

        {extraCompanies.error && (
          <div className="px-3 py-2 bg-[hsl(224_71%_7%)]">
            <p className="text-[11px] text-[hsl(0_85%_70%)]">
              {extraCompanies.error}
            </p>
          </div>
        )}

        {extraCompanies.companies.length > 0 && (
          <div className="divide-y divide-[hsl(216_34%_17%)]">
            {extraCompanies.companies.map((company, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-3 py-2.5 bg-[hsl(224_71%_7%)]"
              >
                <button
                  onClick={() => handleStockResearch(company.ticker)}
                  title="Open on Yahoo Finance"
                  className="shrink-0 mt-0.5 group"
                >
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono font-bold text-xs bg-[hsl(280_65%_60%/0.12)] text-[hsl(280_65%_80%)] border border-[hsl(280_65%_60%/0.25)] group-hover:bg-[hsl(280_65%_60%/0.22)] transition-colors">
                    {company.ticker}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-[hsl(213_31%_91%)] truncate">
                      {company.name}
                    </span>
                    <span className="shrink-0 text-[10px] text-[hsl(215.4_16.3%_36.9%)]">
                      {EXCHANGES[company.exchange] ?? company.exchange}
                    </span>
                  </div>
                  <p className="text-xs text-[hsl(215.4_16.3%_56.9%)] leading-snug mt-0.5">
                    {company.relevance}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
