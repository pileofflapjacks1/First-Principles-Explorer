import { useState } from "react";
import { ChevronDown, ChevronRight, BookOpen, ExternalLink } from "lucide-react";
import type { BreakdownLevel, ImageEntry } from "../types";
import { ImageBlock } from "./ImageBlock";
import type { AiHealthStatus } from "./AtomSpinner";

const LEVEL_COLORS = [
  { badge: "bg-[hsl(280_65%_60%/0.15)] text-[hsl(280_65%_75%)] border-[hsl(280_65%_60%/0.3)]", dot: "bg-[hsl(280_65%_60%)]", wiki: "text-[hsl(280_65%_70%)] hover:text-[hsl(280_65%_85%)] border-[hsl(280_65%_60%/0.25)] hover:border-[hsl(280_65%_60%/0.5)] hover:bg-[hsl(280_65%_60%/0.08)]" },
  { badge: "bg-[hsl(210_100%_66%/0.15)] text-[hsl(210_100%_80%)] border-[hsl(210_100%_66%/0.3)]", dot: "bg-[hsl(210_100%_66%)]", wiki: "text-[hsl(210_100%_70%)] hover:text-[hsl(210_100%_85%)] border-[hsl(210_100%_66%/0.25)] hover:border-[hsl(210_100%_66%/0.5)] hover:bg-[hsl(210_100%_66%/0.08)]" },
  { badge: "bg-[hsl(160_60%_45%/0.15)] text-[hsl(160_60%_70%)] border-[hsl(160_60%_45%/0.3)]", dot: "bg-[hsl(160_60%_45%)]", wiki: "text-[hsl(160_60%_65%)] hover:text-[hsl(160_60%_80%)] border-[hsl(160_60%_45%/0.25)] hover:border-[hsl(160_60%_45%/0.5)] hover:bg-[hsl(160_60%_45%/0.08)]" },
  { badge: "bg-[hsl(30_80%_55%/0.15)] text-[hsl(30_80%_75%)] border-[hsl(30_80%_55%/0.3)]", dot: "bg-[hsl(30_80%_55%)]", wiki: "text-[hsl(30_80%_70%)] hover:text-[hsl(30_80%_85%)] border-[hsl(30_80%_55%/0.25)] hover:border-[hsl(30_80%_55%/0.5)] hover:bg-[hsl(30_80%_55%/0.08)]" },
  { badge: "bg-[hsl(340_75%_55%/0.15)] text-[hsl(340_75%_80%)] border-[hsl(340_75%_55%/0.3)]", dot: "bg-[hsl(340_75%_55%)]", wiki: "text-[hsl(340_75%_70%)] hover:text-[hsl(340_75%_85%)] border-[hsl(340_75%_55%/0.25)] hover:border-[hsl(340_75%_55%/0.5)] hover:bg-[hsl(340_75%_55%/0.08)]" },
];

interface BreakdownCardProps {
  item: BreakdownLevel;
  isActive: boolean;
  defaultOpen?: boolean;
  id: string;
  imageEntry?: ImageEntry;
  upsellReason?: "signed-out" | "free-tier" | null;
  healthStatus?: AiHealthStatus;
}

export function BreakdownCard({ item, isActive, defaultOpen, id, imageEntry, upsellReason }: BreakdownCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? item.level === 1);
  const color = LEVEL_COLORS[(item.level - 1) % LEVEL_COLORS.length];
  const links = item.wiki_links ?? [];

  return (
    <div
      id={id}
      className={`rounded-xl border transition-all duration-200 ${
        isActive
          ? "border-[hsl(210_100%_66%)] shadow-[0_0_0_1px_hsl(210_100%_66%/0.2)] bg-[hsl(224_71%_7%)]"
          : "border-[hsl(216_34%_17%)] bg-[hsl(224_71%_7%)] hover:border-[hsl(216_34%_25%)]"
      }`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border text-xs font-bold ${color.badge}`}>
          L{item.level}
        </div>
        <span className="flex-1 font-semibold text-[hsl(213_31%_91%)] text-sm leading-tight">
          {item.title}
        </span>
        <div className="shrink-0 text-[hsl(215.4_16.3%_46.9%)]">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3 border-t border-[hsl(216_34%_17%)] pt-3">
          <p className="text-[hsl(215.4_16.3%_66.9%)] text-sm leading-relaxed">
            {item.description}
          </p>

          {/* Generated image (or upsell when not Pro) */}
          {item.image_prompt && (
            <ImageBlock
              imageEntry={imageEntry}
              caption={item.title}
              upsellReason={upsellReason ?? null}
              healthStatus={healthStatus}
            />
          )}

          {/* Sub-components */}
          <div className="flex flex-wrap gap-1.5">
            {item.components.map((comp, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs ${color.badge}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
                {comp}
              </span>
            ))}
          </div>

          {/* Wikipedia / further reading links */}
          {links.length > 0 && (
            <div className="pt-1 space-y-1">
              <div className="flex items-center gap-1.5 mb-1.5">
                <BookOpen className="w-3 h-3 text-[hsl(215.4_16.3%_46.9%)]" />
                <span className="text-[10px] font-semibold text-[hsl(215.4_16.3%_46.9%)] uppercase tracking-wider">
                  Learn More on Grokipedia
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs transition-all ${color.wiki}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {link.title}
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
