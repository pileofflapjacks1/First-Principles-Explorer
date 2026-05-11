import { useState } from "react";
import { ExternalLink, Lightbulb, AlertCircle, TrendingUp, ChevronDown, ChevronRight } from "lucide-react";
import type { Gap } from "../types";

interface GapCardProps {
  gap: Gap;
  index: number;
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

export function GapCard({ gap, index }: GapCardProps) {
  const [showCompanies, setShowCompanies] = useState(true);

  function handleFindCompanies() {
    const query = encodeURIComponent(gap.search_query + " startup OR company OR venture");
    window.open(`https://www.google.com/search?q=${query}`, "_blank", "noopener,noreferrer");
  }

  function handleStockResearch(ticker: string, exchange: string) {
    const query = encodeURIComponent(`${ticker} stock ${exchange} analysis`);
    window.open(`https://finance.yahoo.com/quote/${ticker}`, "_blank", "noopener,noreferrer");
  }

  const companies = gap.public_companies ?? [];

  return (
    <div className={`rounded-xl border p-5 space-y-4 transition-all ${GAP_COLORS[index % GAP_COLORS.length]}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[hsl(216_34%_17%)] flex items-center justify-center shrink-0 mt-0.5">
          <AlertCircle className="w-4 h-4 text-[hsl(215.4_16.3%_66.9%)]" />
        </div>
        <div>
          <h3 className="font-semibold text-[hsl(213_31%_91%)] text-sm leading-tight">
            {gap.gap_title}
          </h3>
          <p className="text-xs text-[hsl(215.4_16.3%_46.9%)] mt-0.5">Gap #{index + 1}</p>
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

      {/* Publicly traded companies */}
      {companies.length > 0 && (
        <div className="border border-[hsl(216_34%_17%)] rounded-lg overflow-hidden">
          <button
            onClick={() => setShowCompanies(!showCompanies)}
            className="w-full flex items-center justify-between px-3 py-2 bg-[hsl(223_47%_11%)] hover:bg-[hsl(216_34%_17%)] transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[hsl(160_60%_60%)]" />
              <span className="text-xs font-semibold text-[hsl(213_31%_91%)]">
                Publicly Traded Companies
              </span>
              <span className="text-xs text-[hsl(215.4_16.3%_46.9%)]">({companies.length})</span>
            </div>
            {showCompanies
              ? <ChevronDown className="w-3.5 h-3.5 text-[hsl(215.4_16.3%_46.9%)]" />
              : <ChevronRight className="w-3.5 h-3.5 text-[hsl(215.4_16.3%_46.9%)]" />
            }
          </button>

          {showCompanies && (
            <div className="divide-y divide-[hsl(216_34%_17%)]">
              {companies.map((company, i) => (
                <button
                  key={i}
                  onClick={() => handleStockResearch(company.ticker, company.exchange)}
                  className="w-full flex items-start gap-3 px-3 py-2.5 bg-[hsl(224_71%_7%)] hover:bg-[hsl(223_47%_11%)] transition-colors text-left group"
                >
                  {/* Ticker badge */}
                  <div className="shrink-0 mt-0.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded font-mono font-bold text-xs bg-[hsl(210_100%_66%/0.12)] text-[hsl(210_100%_75%)] border border-[hsl(210_100%_66%/0.25)]">
                      {company.ticker}
                    </span>
                  </div>
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
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
                  <ExternalLink className="w-3 h-3 text-[hsl(215.4_16.3%_36.9%)] group-hover:text-[hsl(210_100%_66%)] shrink-0 mt-1 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleFindCompanies}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-[hsl(210_100%_66%)] hover:bg-[hsl(210_100%_58%)] text-[hsl(224_71%_4%)] font-semibold rounded-lg transition-colors text-xs"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Find More Companies
        </button>
      </div>
    </div>
  );
}
