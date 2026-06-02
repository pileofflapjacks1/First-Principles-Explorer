export type AiHealthStatus = "healthy" | "degraded" | "open";

interface AtomSpinnerProps {
  message?: string;
  /** When provided, the spinner adapts its messaging to reflect current AI service health */
  healthStatus?: AiHealthStatus;
}

export function AtomSpinner({ message, healthStatus = "healthy" }: AtomSpinnerProps) {
  const isDegraded = healthStatus === "degraded";
  const isOpen = healthStatus === "open";

  // Primary message can be overridden, otherwise we use health-aware defaults
  const primary = message || (isOpen
    ? "AI service in protection mode"
    : isDegraded
      ? "Processing with reduced capacity"
      : "Thinking from first principles...");

  // Secondary line gives context about what's happening under the hood
  const secondary = isOpen
    ? "Circuit breaker active — waiting for capacity"
    : isDegraded
      ? "AI service under load — this may take longer"
      : "Breaking down to fundamentals";

  // Tertiary line only shown in non-healthy states for deeper context
  const tertiary = isOpen
    ? "New requests are being limited to protect the system"
    : isDegraded
      ? "Expect slower responses and delayed image generation"
      : null;

  const accentColor = isOpen
    ? "text-red-400"
    : isDegraded
      ? "text-amber-400"
      : "text-[hsl(215.4_16.3%_46.9%)]";

  return (
    <div className="flex flex-col items-center gap-6 py-16">
      <div className="relative w-20 h-20">
        {/* Nucleus — dim slightly when degraded/open */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`w-4 h-4 rounded-full transition-colors ${
              isOpen
                ? "bg-red-400 shadow-[0_0_12px_rgb(248,113,113,0.6)]"
                : isDegraded
                  ? "bg-amber-400 shadow-[0_0_12px_rgb(251,191,36,0.5)]"
                  : "bg-[hsl(210_100%_66%)] shadow-[0_0_12px_hsl(210_100%_66%/0.8)]"
            }`}
          />
        </div>

        {/* Orbit 1 */}
        <svg
          className="absolute inset-0 w-full h-full atom-orbit-1"
          viewBox="0 0 80 80"
        >
          <ellipse
            cx="40"
            cy="40"
            rx="36"
            ry="12"
            fill="none"
            stroke={isOpen ? "rgb(248 113 113 / 0.35)" : isDegraded ? "rgb(251 191 36 / 0.35)" : "hsl(210 100% 66% / 0.4)"}
            strokeWidth="1.5"
          />
          <circle
            cx="76"
            cy="40"
            r="3.5"
            fill={isOpen ? "#f87171" : isDegraded ? "#fbbf24" : "hsl(210 100% 66%)"}
          />
        </svg>

        {/* Orbit 2 */}
        <svg
          className="absolute inset-0 w-full h-full atom-orbit-2"
          viewBox="0 0 80 80"
          style={{ transform: "rotate(60deg)" }}
        >
          <ellipse
            cx="40"
            cy="40"
            rx="36"
            ry="12"
            fill="none"
            stroke={isOpen ? "rgb(248 113 113 / 0.35)" : isDegraded ? "rgb(251 191 36 / 0.35)" : "hsl(160 60% 45% / 0.4)"}
            strokeWidth="1.5"
          />
          <circle
            cx="76"
            cy="40"
            r="3.5"
            fill={isOpen ? "#f87171" : isDegraded ? "#fbbf24" : "hsl(160 60% 45%)"}
          />
        </svg>

        {/* Orbit 3 */}
        <svg
          className="absolute inset-0 w-full h-full atom-orbit-3"
          viewBox="0 0 80 80"
          style={{ transform: "rotate(120deg)" }}
        >
          <ellipse
            cx="40"
            cy="40"
            rx="36"
            ry="12"
            fill="none"
            stroke={isOpen ? "rgb(248 113 113 / 0.35)" : isDegraded ? "rgb(251 191 36 / 0.35)" : "hsl(280 65% 60% / 0.4)"}
            strokeWidth="1.5"
          />
          <circle
            cx="76"
            cy="40"
            r="3.5"
            fill={isOpen ? "#f87171" : isDegraded ? "#fbbf24" : "hsl(280 65% 60%)"}
          />
        </svg>
      </div>

      <div className="text-center space-y-1.5">
        <p className="text-[hsl(213_31%_91%)] font-medium text-sm">
          {primary}
        </p>
        <p className={`text-xs ${accentColor}`}>
          {secondary}
        </p>
        {tertiary && (
          <p className="text-[10px] text-[hsl(215.4_16.3%_46.9%)] max-w-[260px]">
            {tertiary}
          </p>
        )}
      </div>
    </div>
  );
}
