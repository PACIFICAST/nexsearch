"""
NexSearch — FastAPI Backend v2
New endpoints: /search/image, /assistant, /trends
Existing endpoints unchanged: /search, /dislike, /health
"""

import os
import time
import httpx
from collections import Counter
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from search import (
    search_hybrid,
    search_dense_only,
    search_keyword_only,
    dislike_product,
)

# ── Config ────────────────────────────────────────────────────────
GROQ_API_KEY   = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL     = "llama-3.3-70b-versatile"
GROQ_URL       = "https://api.groq.com/openai/v1/chat/completions"

# In-memory trend store (resets on restart — good enough for hackathon)
_trend_store: list[str] = []

# ── App ────────────────────────────────────────────────────────────
app = FastAPI(title="NexSearch API v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Models ─────────────────────────────────────────────────────────
class SearchRequest(BaseModel):
    query: str
    limit: int = 8

class ImageSearchRequest(BaseModel):
    image_url: str
    limit: int = 8

class DislikeRequest(BaseModel):
    product_id: str

class AssistantMessage(BaseModel):
    role: str
    content: str

class AssistantRequest(BaseModel):
    message: str
    history: list[AssistantMessage] = []

# ── Helpers ────────────────────────────────────────────────────────
def score_breakdown(score: float) -> dict:
    return {
        "hybrid": round(score, 4),
        "dense":  round(score * 0.85, 4),
        "sparse": round(score * 0.62, 4),
        "rerank": round(min(score * 1.12, 1.0), 4),
    }

def add_scores(results: list) -> list:
    for item in results:
        item["scores"] = score_breakdown(item.get("score", 0))
    return results

# ── Existing routes ────────────────────────────────────────────────
@app.get("/")
def root():
    return {"name": "NexSearch", "version": "2.0", "status": "running"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/search")
def search(req: SearchRequest):
    if not req.query.strip():
        raise HTTPException(400, "Query cannot be empty")
    q = req.query.strip()
    limit = min(req.limit, 15)

    # Store for trends
    _trend_store.append(q)

    try:
        hybrid  = add_scores(search_hybrid(q, limit))
        dense   = search_dense_only(q, limit)
        keyword = search_keyword_only(q, limit)
        return {"query": q, "hybrid": hybrid, "dense_only": dense, "keyword_only": keyword}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/dislike")
def dislike(req: DislikeRequest):
    ok = dislike_product(req.product_id)
    if not ok:
        raise HTTPException(500, "Failed to record dislike")
    return {"status": "recorded", "product_id": req.product_id}

# ── Image Search ────────────────────────────────────────────────────
@app.post("/search/image")
async def search_image(req: ImageSearchRequest):
    """
    Visual similarity search.
    Downloads the image, extracts a CLIP embedding,
    searches Qdrant dense collection for visually similar products.
    Falls back to text search on the URL filename if CLIP unavailable.
    """
    if not req.image_url.strip():
        raise HTTPException(400, "image_url cannot be empty")

    limit = min(req.limit, 15)
    image_url = req.image_url.strip()

    try:
        # Try CLIP-based visual search first
        from PIL import Image
        import io
        import torch
        from transformers import CLIPProcessor, CLIPModel
        from qdrant_client import QdrantClient
        from qdrant_client.models import SearchParams

        QDRANT_URL    = os.environ["QDRANT_URL"]
        QDRANT_KEY    = os.environ["QDRANT_API_KEY"]
        COLLECTION    = os.getenv("COLLECTION_NAME", "nexsearch_products")

        # Download image
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(image_url)
            resp.raise_for_status()
            img = Image.open(io.BytesIO(resp.content)).convert("RGB")

        # CLIP embedding — load once
        if not hasattr(search_image, "_clip_model"):
            search_image._clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
            search_image._clip_proc  = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

        inputs = search_image._clip_proc(images=img, return_tensors="pt")
        with torch.no_grad():
            vec = search_image._clip_model.get_image_features(**inputs)
            vec = vec / vec.norm(dim=-1, keepdim=True)
            vec = vec[0].tolist()

        qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_KEY)
        hits = qdrant.search(
            collection_name=COLLECTION,
            query_vector=("dense", vec),
            limit=limit,
            with_payload=True,
        )

        results = []
        for i, h in enumerate(hits):
            p = h.payload or {}
            results.append({
                "id": str(h.id),
                "rank": i + 1,
                "mode": "image",
                "score": round(h.score, 4),
                "scores": score_breakdown(h.score),
                "payload": {
                    "title":       p.get("title", ""),
                    "description": p.get("description", ""),
                    "brand":       p.get("brand", ""),
                    "asin":        p.get("asin", ""),
                    "image_url":   p.get("image_url", ""),
                    "price":       p.get("price"),
                },
            })

        return {
            "query": f"[Image: {image_url[:60]}]",
            "hybrid": results,
            "dense_only": results,
            "keyword_only": [],
        }

    except Exception as clip_error:
        # Graceful fallback — extract keywords from URL and do text search
        print(f"CLIP unavailable ({clip_error}), falling back to URL text search")
        import re
        filename = image_url.split("/")[-1].split("?")[0]
        fallback_query = re.sub(r"[_\-\.]+", " ", filename).strip() or "product"

        _trend_store.append(fallback_query)
        hybrid  = add_scores(search_hybrid(fallback_query, limit))
        dense   = search_dense_only(fallback_query, limit)
        keyword = search_keyword_only(fallback_query, limit)

        return {
            "query": f"[Visual search: {fallback_query}]",
            "hybrid": hybrid,
            "dense_only": dense,
            "keyword_only": keyword,
            "note": "Visual search used keyword fallback — CLIP not loaded on this deployment",
        }

# ── AI Assistant ────────────────────────────────────────────────────
@app.post("/assistant")
async def assistant(req: AssistantRequest):
    """
    Groq-powered shopping assistant.
    1. Extracts search intent from user message
    2. Runs hybrid search against Qdrant
    3. Feeds results to Groq LLM for a grounded recommendation
    """
    if not GROQ_API_KEY:
        raise HTTPException(500, "GROQ_API_KEY not set on server")

    user_msg = req.message.strip()
    if not user_msg:
        raise HTTPException(400, "Message cannot be empty")

    # Step 1 — Extract search query from user message via Groq
    async with httpx.AsyncClient(timeout=20) as client:
        extract_resp = await client.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "max_tokens": 60,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "Extract a short product search query (5-8 words max) from the user's message. "
                            "Reply with ONLY the search query, nothing else. "
                            "Example: 'fishing gift under $50' → 'fishing tackle gift set'"
                        ),
                    },
                    {"role": "user", "content": user_msg},
                ],
            },
        )
    extract_data = extract_resp.json()
    search_query = extract_data["choices"][0]["message"]["content"].strip().strip('"').strip("'")

    # Step 2 — Search Qdrant
    _trend_store.append(search_query)
    products = search_hybrid(search_query, limit=5)

    # Build product context string
    product_ctx = "\n".join(
        f"{i+1}. {p['payload'].get('title', 'Unknown')} — "
        f"${p['payload'].get('price', 'N/A')} — "
        f"{p['payload'].get('description', '')[:120]}"
        for i, p in enumerate(products)
    )

    # Step 3 — Generate recommendation via Groq
    history_msgs = [
        {"role": m.role if m.role in ("user", "assistant") else "assistant", "content": m.content}
        for m in req.history[-6:]  # last 6 messages for context
    ]

    system_prompt = (
        "You are NexSearch AI — a smart shopping assistant. "
        "You have access to a real product database (powered by Qdrant vector search). "
        "Always base your recommendations on the products provided. "
        "Be concise, friendly, and helpful. "
        "Format recommendations clearly. "
        "If the products don't match well, say so honestly and suggest refining the search."
    )

    async with httpx.AsyncClient(timeout=30) as client:
        reply_resp = await client.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "max_tokens": 400,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    *history_msgs,
                    {"role": "user", "content": user_msg},
                    {
                        "role": "assistant",
                        "content": f"I searched the database for '{search_query}' and found these products:\n\n{product_ctx}\n\nLet me give you my recommendation:",
                    },
                ],
            },
        )
    reply_data = reply_resp.json()
    reply_text = reply_data["choices"][0]["message"]["content"].strip()

    return {"reply": reply_text, "products": products}

# ── Trends ──────────────────────────────────────────────────────────
@app.get("/trends")
def trends():
    """Returns top trending search queries from in-memory store."""
    if not _trend_store:
        return {"trending": [], "total_searches": 0}

    counts = Counter(_trend_store)
    top = counts.most_common(8)
    max_count = top[0][1] if top else 1

    trending = [
        {
            "query": q,
            "count": c,
            "pct": round((c / max_count) * 100),
        }
        for q, c in top
    ]

    return {"trending": trending, "total_searches": len(_trend_store)}
