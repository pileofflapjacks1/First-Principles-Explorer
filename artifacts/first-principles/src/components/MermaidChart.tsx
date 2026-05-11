import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    primaryColor: "hsl(224, 71%, 10%)",
    primaryTextColor: "hsl(213, 31%, 91%)",
    primaryBorderColor: "hsl(210, 100%, 66%)",
    lineColor: "hsl(215.4, 16.3%, 46.9%)",
    secondaryColor: "hsl(216, 34%, 17%)",
    tertiaryColor: "hsl(224, 71%, 7%)",
    background: "transparent",
    mainBkg: "hsl(224, 71%, 10%)",
    nodeBorder: "hsl(210, 100%, 66%)",
    clusterBkg: "hsl(224, 71%, 7%)",
    titleColor: "hsl(213, 31%, 91%)",
    edgeLabelBackground: "hsl(224, 71%, 7%)",
    fontFamily: "Inter, sans-serif",
    fontSize: "13px",
  },
  flowchart: {
    htmlLabels: true,
    curve: "basis",
    padding: 16,
  },
});

let chartCounter = 0;

interface MermaidChartProps {
  chart: string;
  gapNodes?: string[];
  onNodeClick?: (nodeId: string) => void;
}

function injectGapStyling(chart: string, gapNodes: string[]): string {
  if (!gapNodes.length) return chart;

  const classDef = `classDef gapNode fill:#2d1f00,stroke:#f59e0b,stroke-width:2px,color:#fcd34d`;
  const classLine = `class ${gapNodes.join(",")} gapNode`;

  // Strip trailing whitespace and append
  return chart.trimEnd() + "\n" + classDef + "\n" + classLine;
}

export function MermaidChart({ chart, gapNodes = [], onNodeClick }: MermaidChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current || !chart) return;

    const render = async () => {
      setIsLoading(true);
      setError(null);

      try {
        chartCounter++;
        const id = `mermaid-chart-${chartCounter}`;

        const sanitized = chart
          .replace(/^\s*```(?:mermaid)?\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();

        const withGaps = injectGapStyling(sanitized, gapNodes);

        const { svg } = await mermaid.render(id, withGaps);

        if (containerRef.current) {
          containerRef.current.innerHTML = svg;

          const svgEl = containerRef.current.querySelector("svg");
          if (svgEl) {
            svgEl.style.maxWidth = "100%";
            svgEl.style.height = "auto";

            if (onNodeClick) {
              const nodes = svgEl.querySelectorAll(".node");
              nodes.forEach((node) => {
                (node as HTMLElement).style.cursor = "pointer";
                node.addEventListener("click", () => {
                  const labelEl = node.querySelector(".label, text, tspan");
                  const label = labelEl?.textContent?.trim() ?? "";
                  onNodeClick(label);
                });
              });
            }
          }
        }
      } catch (err) {
        console.error("Mermaid render error:", err);
        setError("Could not render flowchart");
      } finally {
        setIsLoading(false);
      }
    };

    render();
  }, [chart, gapNodes, onNodeClick]);

  if (error) {
    return (
      <div className="rounded-xl border border-[hsl(216_34%_17%)] p-4 text-center">
        <p className="text-[hsl(215.4_16.3%_46.9%)] text-sm">{error}</p>
        <pre className="mt-2 text-xs text-left text-[hsl(215.4_16.3%_36.9%)] overflow-auto max-h-32 p-2 bg-[hsl(223_47%_11%)] rounded">
          {chart}
        </pre>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-[hsl(210_100%_66%)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div
        ref={containerRef}
        className={`mermaid overflow-auto ${isLoading ? "hidden" : ""}`}
        style={{ minHeight: "120px" }}
      />
    </div>
  );
}
