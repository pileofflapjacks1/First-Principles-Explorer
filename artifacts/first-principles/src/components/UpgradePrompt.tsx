import { Sparkles, Lock } from "lucide-react";
import { Link } from "wouter";
import { Show, useClerk } from "@clerk/react";

interface UpgradePromptProps {
  compact?: boolean;
  reason: "signed-out" | "free-tier";
  title?: string;
  body?: string;
  fullWidth?: boolean;
}

export function UpgradePrompt({
  compact,
  reason,
  title,
  body,
  fullWidth,
}: UpgradePromptProps) {
  const aspect = fullWidth
    ? "min-h-[14rem]"
    : compact
      ? "aspect-[4/3]"
      : "aspect-video";
  const { openSignIn } = useClerk();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const resolvedTitle =
    title ??
    (reason === "signed-out"
      ? "Sign in to unlock visuals"
      : "AI visuals are a Pro feature");
  const resolvedBody =
    body ??
    (reason === "signed-out"
      ? "Create a free account, then upgrade to Pro for Grok Imagine visuals."
      : "Upgrade to Pro and we'll generate images for every level and gap.");

  return (
    <div
      className={`mt-3 rounded-xl border border-[hsl(280_65%_60%/0.3)] bg-gradient-to-br from-[hsl(280_65%_60%/0.08)] via-[hsl(210_100%_66%/0.06)] to-[hsl(224_71%_7%)] ${aspect} flex flex-col items-center justify-center gap-2 p-4 text-center relative overflow-hidden`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(280_65%_60%/0.15),_transparent_70%)]" />
      <div className="relative w-10 h-10 rounded-full bg-[hsl(280_65%_60%/0.15)] border border-[hsl(280_65%_60%/0.35)] flex items-center justify-center">
        {reason === "signed-out" ? (
          <Lock className="w-5 h-5 text-[hsl(280_65%_75%)]" />
        ) : (
          <Sparkles className="w-5 h-5 text-[hsl(280_65%_75%)]" />
        )}
      </div>
      <div className="relative space-y-0.5">
        <p
          className={`font-semibold text-[hsl(213_31%_91%)] ${
            fullWidth ? "text-base" : "text-xs"
          }`}
        >
          {resolvedTitle}
        </p>
        <p
          className={`text-[hsl(215.4_16.3%_56.9%)] ${
            fullWidth ? "text-sm max-w-md" : "text-[10px] max-w-[16rem]"
          }`}
        >
          {resolvedBody}
        </p>
      </div>
      <Show when="signed-out">
        <button
          onClick={() => openSignIn({ fallbackRedirectUrl: basePath || "/" })}
          className="relative mt-1 px-3 py-1.5 rounded-lg bg-[hsl(210_100%_66%)] hover:bg-[hsl(210_100%_58%)] text-[hsl(224_71%_4%)] text-xs font-bold transition-colors"
        >
          Sign in
        </button>
      </Show>
      <Show when="signed-in">
        <Link
          href="/pricing"
          className="relative mt-1 px-3 py-1.5 rounded-lg bg-[hsl(280_65%_60%)] hover:bg-[hsl(280_65%_55%)] text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
        >
          <Sparkles className="w-3 h-3" />
          Upgrade to Pro
        </Link>
      </Show>
    </div>
  );
}
