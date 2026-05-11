export function AtomSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-6 py-16">
      <div className="relative w-20 h-20">
        {/* Nucleus */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-[hsl(210_100%_66%)] shadow-[0_0_12px_hsl(210_100%_66%/0.8)]" />
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
            stroke="hsl(210 100% 66% / 0.4)"
            strokeWidth="1.5"
          />
          <circle cx="76" cy="40" r="3.5" fill="hsl(210 100% 66%)" />
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
            stroke="hsl(160 60% 45% / 0.4)"
            strokeWidth="1.5"
          />
          <circle cx="76" cy="40" r="3.5" fill="hsl(160 60% 45%)" />
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
            stroke="hsl(280 65% 60% / 0.4)"
            strokeWidth="1.5"
          />
          <circle cx="76" cy="40" r="3.5" fill="hsl(280 65% 60%)" />
        </svg>
      </div>

      <div className="text-center space-y-1">
        <p className="text-[hsl(213_31%_91%)] font-medium text-sm">
          {message || "Thinking from first principles..."}
        </p>
        <p className="text-[hsl(215.4_16.3%_46.9%)] text-xs">
          Breaking down to fundamentals
        </p>
      </div>
    </div>
  );
}
