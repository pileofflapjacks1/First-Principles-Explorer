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
  // Optional 3D scene data for the Component Explorer (procedural or manifest)
  three_d?: ThreeDScene;
}

export interface ThreeDPart {
  id: string;
  label: string;
  level?: number;
  component?: string;
  primitive: 'box' | 'cylinder' | 'sphere' | 'cone' | 'group';
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  color?: string;
  children?: string[];
  explodeWeight?: number;
  metadata?: Record<string, unknown>;
}

export interface ThreeDScene {
  rootLabel: string;
  parts: ThreeDPart[];
  cameraPresets?: Array<{
    name: string;
    position: [number, number, number];
    target: [number, number, number];
  }>;
  upAxis?: 'y' | 'z';
  suggestedExplodeAxis?: [number, number, number];
}
