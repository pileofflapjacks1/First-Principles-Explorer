export interface WikiLink {
  title: string;
  url: string;
}

export interface ImageEntry {
  url: string | null;
  loading: boolean;
  error: boolean;
}

export interface BreakdownLevel {
  level: number;
  title: string;
  description: string;
  components: string[];
  wiki_links: WikiLink[];
  image_prompt: string;
}

export interface PublicCompany {
  name: string;
  ticker: string;
  exchange: string;
  relevance: string;
}

export interface Gap {
  gap_title: string;
  why_exists: string;
  innovation_potential: string;
  search_query: string;
  public_companies: PublicCompany[];
  image_prompt: string;
}

export interface BreakdownResult {
  topic: string;
  breakdown: BreakdownLevel[];
  mermaid_flowchart: string;
  gap_nodes: string[];
  gaps: Gap[];
}
