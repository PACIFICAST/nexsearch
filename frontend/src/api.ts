// NexSearch — API Layer
// Replace VITE_API_URL in your .env with your Koyeb backend URL

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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
}

export async function searchProducts(
  query: string,
  limit: number = 8
): Promise<SearchResponse> {
  const res = await fetch(`${API_URL}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit }),
  });
  if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
  return res.json();
}

export async function dislikeProduct(productId: string): Promise<void> {
  await fetch(`${API_URL}/dislike`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_id: productId }),
  });
}

export async function getRecommendations(
  likedIds: string[],
  dislikedIds: string[],
  limit: number = 8
): Promise<SearchResult[]> {
  const res = await fetch(`${API_URL}/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ liked_ids: likedIds, disliked_ids: dislikedIds, limit }),
  });
  if (!res.ok) throw new Error("Recommend failed");
  const data = await res.json();
  return data.results;
}
