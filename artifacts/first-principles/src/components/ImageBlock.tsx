import { ZoomIn, ImageOff } from "lucide-react";
import type { ImageEntry } from "../types";
import { UpgradePrompt } from "./UpgradePrompt";
import type { AiHealthStatus } from "./AtomSpinner";

interface ImageBlockProps {
  imageEntry: ImageEntry | undefined;
  caption?: string;
  compact?: boolean;
  upsellReason?: "signed-out" | "free-tier" | null;
  /** Health status passed from parent so image loading UI can be health-aware */
  healthStatus?: AiHealthStatus;
}

export function ImageBlock({ imageEntry, caption, compact, upsellReason }: ImageBlockProps) {
  if (!imageEntry) {
    if (upsellReason) {
      return <UpgradePrompt compact={compact} reason={upsellReason} />;
    }
    return null;
  }
  const { url, loading, error } = imageEntry;
  const aspect = compact ? "aspect-[4/3]" : "aspect-video";

  if (loading) {
    const isDegraded = healthStatus === "degraded";
    const isOpen = healthStatus === "open";

    const imageMessage = isOpen
      ? "Image generation paused (AI in protection mode)"
      : isDegraded
        ? "Generating with Grok Imagine (service under load)…"
        : "Generating with Grok Imagine…";

    return (
      <div className={`mt-3 rounded-xl overflow-hidden border border-[hsl(216_34%_17%)] bg-[hsl(223_47%_11%)] ${aspect} flex flex-col items-center justify-center gap-3 relative`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[hsl(210_100%_66%/0.05)] to-transparent animate-pulse" />
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px] transition-colors ${
              isOpen ? "bg-red-400 shadow-red-400/70" : isDegraded ? "bg-amber-400 shadow-amber-400/70" : "bg-[hsl(210_100%_66%)] shadow-[0_0_10px_hsl(210_100%_66%/0.9)]"
            }`} />
          </div>
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s" }}>
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${isOpen ? "bg-red-400" : isDegraded ? "bg-amber-400" : "bg-[hsl(210_100%_66%)]"}`} />
          </div>
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: "2s", animationDirection: "reverse" }}>
            <div className={`absolute bottom-0 right-2 w-1.5 h-1.5 rounded-full ${isOpen ? "bg-red-400" : isDegraded ? "bg-amber-400" : "bg-[hsl(280_65%_60%)]"}`} />
          </div>
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: "4s" }}>
            <div className={`absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full ${isOpen ? "bg-red-400" : isDegraded ? "bg-amber-400" : "bg-[hsl(160_60%_55%)]"}`} />
          </div>
        </div>
        <p className={`text-xs relative ${isOpen ? "text-red-400/80" : isDegraded ? "text-amber-400/80" : "text-[hsl(215.4_16.3%_46.9%)]"}`}>
          {imageMessage}
        </p>
      </div>
    );
  }

  if (error) {
    const isHealthRelated = healthStatus === "degraded" || healthStatus === "open";
    return (
      <div className={`mt-3 rounded-xl border ${isHealthRelated ? "border-amber-400/30 bg-amber-900/5" : "border-[hsl(0_63%_31%/0.4)] bg-[hsl(0_63%_31%/0.07)]"} ${aspect} flex flex-col items-center justify-center gap-2`}>
        <ImageOff className="w-6 h-6 text-[hsl(0_63%_51%)]" />
        <p className="text-xs text-[hsl(0_63%_61%)]">
          {isHealthRelated ? "Image generation skipped due to AI load" : "Image generation failed"}
        </p>
      </div>
    );
  }

  if (!url) return null;

  return (
    <div className="mt-3 space-y-1.5">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block rounded-xl overflow-hidden border border-[hsl(216_34%_17%)] hover:border-[hsl(210_100%_66%/0.4)] transition-colors bg-[hsl(223_47%_11%)]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={url}
          alt={caption ?? "Generated visual"}
          className="w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex items-center gap-1.5 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full">
            <ZoomIn className="w-3.5 h-3.5" />
            View full size
          </div>
        </div>
      </a>
      <p className="text-[10px] text-[hsl(215.4_16.3%_36.9%)] italic truncate">
        Generated with xAI Grok Imagine
      </p>
    </div>
  );
}
