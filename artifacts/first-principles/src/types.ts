export interface BreakdownLevel {
  level: number;
  title: string;
  description: string;
  components: string[];
}

export interface Gap {
  gap_title: string;
  why_exists: string;
  innovation_potential: string;
  search_query: string;
}

export interface BreakdownResult {
  topic: string;
  breakdown: BreakdownLevel[];
  mermaid_flowchart: string;
  gap_nodes: string[];
  gaps: Gap[];
}
