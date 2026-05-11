import { ExternalLink, Lightbulb, AlertCircle } from "lucide-react";
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

export function GapCard({ gap, index }: GapCardProps) {
  function handleFindCompanies() {
    const query = encodeURIComponent(gap.search_query + " startup OR company OR venture");
    window.open(`https://www.google.com/search?q=${query}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className={`rounded-xl border p-5 space-y-4 transition-all ${GAP_COLORS[index % GAP_COLORS.length]}`}>
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

      <button
        onClick={handleFindCompanies}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[hsl(210_100%_66%)] hover:bg-[hsl(210_100%_58%)] text-[hsl(224_71%_4%)] font-semibold rounded-lg transition-colors text-sm"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Find Companies Working on This
      </button>
    </div>
  );
}
