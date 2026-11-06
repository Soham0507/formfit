const API_BASE = "http://localhost:4000/api";

export interface MatchedLine {
  rawLine: string;
  tool: { id: string; partNumber: string; name: string } | null;
  matchType: "exact" | "fuzzy" | "none";
  score: number;
}

export interface TopLayout {
  layoutId: string;
  name: string;
  overlapScore: number;
  matchedTools: string[];
  missingTools: string[];
  extraTools: string[];
}

export interface Quote {
  basedOnLayoutId: string;
  drawerAreaSqIn: number;
  foamCost: number;
  missingToolCount: number;
  designHours: number;
  designCost: number;
  totalEstimate: number;
}

export interface AnalyzeResponse {
  matchedLines: MatchedLine[];
  topLayouts: TopLayout[];
  quote: Quote | null;
}

export interface BacktestRow {
  jobId: string;
  actualLayoutId: string;
  actualLayoutName: string;
  top3: string[];
  hitInTop3: boolean;
  rank: number | null;
}

export interface BacktestResponse {
  totalJobs: number;
  hits: number;
  hitRate: number;
  results: BacktestRow[];
}

export async function analyze(toolListText: string): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toolListText }),
  });
  if (!res.ok) throw new Error(`Analyze failed: ${res.status}`);
  return res.json();
}

export async function backtest(): Promise<BacktestResponse> {
  const res = await fetch(`${API_BASE}/backtest`);
  if (!res.ok) throw new Error(`Backtest failed: ${res.status}`);
  return res.json();
}

export async function renderLayout(layoutId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/render-layout/${layoutId}`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Render failed: ${res.status}`);
  }
  const { imageUrl } = (await res.json()) as { imageUrl: string };
  return `http://localhost:4000${imageUrl}`;
}

export async function renderToolImage(toolId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/tool-image/${toolId}`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Render failed: ${res.status}`);
  }
  const { imageUrl } = (await res.json()) as { imageUrl: string };
  return `http://localhost:4000${imageUrl}`;
}
