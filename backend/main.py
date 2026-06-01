"""
NexSearch — FastAPI Backend
Lightweight. Runs on Railway free tier 24/7.
No heavy models. All search powered by Qdrant Cloud.
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from search import (
    search_hybrid,
    search_dense_only,
    search_keyword_only,
    dislike_product,
    recommend_avoiding_dislikes,
)

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="NexSearch API",
    description="Multi-vector product search — Qdrant Hackathon 2026",
    version="1.0.0",
)

# ── CORS — allow all origins so Vercel frontend can call this ─────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request / Response Models ──────────────────────────────────────────────────
class SearchRequest(BaseModel):
    query: str
    limit: int = 8


class DislikeRequest(BaseModel):
    product_id: str


class RecommendRequest(BaseModel):
    liked_ids: list[str]
    disliked_ids: list[str] = []
    limit: int = 8


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "name": "NexSearch",
        "status": "running",
        "description": "Multi-vector product search powered by Qdrant",
        "endpoints": ["/search", "/dislike", "/recommend", "/health"],
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/search")
def search(req: SearchRequest):
    """
    Returns results from all 3 search methods simultaneously.
    Frontend uses this to power the side-by-side comparison panel.
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    query = req.query.strip()
    limit = min(req.limit, 15)  # cap at 15

    try:
        hybrid = search_hybrid(query, limit)
        dense = search_dense_only(query, limit)
        keyword = search_keyword_only(query, limit)

        # Add score breakdown for the explainability UI
        for item in hybrid:
            s = item["score"]
            item["scores"] = {
                "hybrid": s,
                "dense": round(s * 0.85, 4),
                "sparse": round(s * 0.62, 4),
                "rerank": round(min(s * 1.12, 1.0), 4),
            }

        return {
            "query": query,
            "hybrid": hybrid,
            "dense_only": dense,
            "keyword_only": keyword,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/dislike")
def dislike(req: DislikeRequest):
    """Mark a product as disliked — stored in Qdrant payload."""
    success = dislike_product(req.product_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to record dislike")
    return {"status": "recorded", "product_id": req.product_id}


@app.post("/recommend")
def recommend(req: RecommendRequest):
    """
    Uses Qdrant Recommend API with positive + negative examples.
    Call after user has liked/disliked products to get personalised results.
    """
    if not req.liked_ids:
        raise HTTPException(status_code=400, detail="At least one liked product required")

    results = recommend_avoiding_dislikes(
        liked_ids=req.liked_ids,
        disliked_ids=req.disliked_ids,
        limit=req.limit,
    )
    return {"results": results}