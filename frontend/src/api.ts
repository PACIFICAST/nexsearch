const API_URL = import.meta.env.VITE_API_URL || "http://nexsearch-production.up.railway.app";

export interface ProductPayload {
  title: string;
  description: string;
  brand: string;
  asin: string;
  image_url: string;
  price: string | null;
}

export interface ScoreBreakdown {
  hybrid: number;
  dense: number;
  sparse: number;
  rerank: number;
}

export interface SearchResult {
  id: string;
  rank: number;
  mode: string;
  score: number;
  scores?: ScoreBreakdown;
  payload: ProductPayload;
}

export interface SearchResponse {
  query: string;
  hybrid: SearchResult[];
  dense_only: SearchResult[];
  keyword_only: SearchResult[];
  elapsed_ms?: number;
}

export interface TrendItem {
  query: string;
  count: number;
  pct: number;
}

export interface TrendResponse {
  trending: TrendItem[];
  total_searches: number;
}

// ── Text search ───────────────────────────────────────
export async function searchProducts(
  query: string,
  limit = 8
): Promise<SearchResponse> {
  const res = await fetch(`${API_URL}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit }),
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

// ── Image search ──────────────────────────────────────
export async function searchByImage(
  imageUrl: string,
  limit = 8
): Promise<SearchResponse> {
  const res = await fetch(`${API_URL}/search/image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, limit }),
  });
  if (!res.ok) throw new Error(`Image search failed: ${res.status}`);
  return res.json();
}

// ── AI Assistant ──────────────────────────────────────
export async function askAssistant(
  message: string,
  history: { role: string; content: string }[]
): Promise<{ reply: string; products: SearchResult[] }> {
  const res = await fetch(`${API_URL}/assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error(`Assistant failed: ${res.status}`);
  return res.json();
}

// ── Dislike ───────────────────────────────────────────
export async function dislikeProduct(productId: string): Promise<void> {
  await fetch(`${API_URL}/dislike`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_id: productId }),
  }).catch(() => {});
}

// ── Trends ────────────────────────────────────────────
export async function getTrends(): Promise<TrendResponse> {
  const res = await fetch(`${API_URL}/trends`);
  if (!res.ok) throw new Error("Trends failed");
  return res.json();
}
