"""
NexSearch — Search Logic
Lightweight: no AI models loaded at runtime.
All embedding was done at ingestion time.
At query time we use fastembed integration
which runs inside the qdrant-client itself (tiny footprint).
"""

import os
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Prefetch, SparseVector, FusionQuery, Fusion,
    NamedVector, NamedSparseVector, RecommendInput
)
from fastembed import TextEmbedding, SparseTextEmbedding

# ── Config ────────────────────────────────────────────────────────────────────
QDRANT_URL = os.environ["QDRANT_URL"]
QDRANT_API_KEY = os.environ["QDRANT_API_KEY"]
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "nexsearch_products")

# ── Client ────────────────────────────────────────────────────────────────────
client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=30)

# ── Lightweight models via fastembed ──────────────────────────────────────────
_dense_model = None
_sparse_model = None


def get_dense_model():
    global _dense_model
    if _dense_model is None:
        _dense_model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
    return _dense_model


def get_sparse_model():
    global _sparse_model
    if _sparse_model is None:
        _sparse_model = SparseTextEmbedding(model_name="Qdrant/bm25")
    return _sparse_model


def embed_dense(text: str) -> list[float]:
    model = get_dense_model()
    result = list(model.embed([text]))[0]
    return result.tolist()


def embed_sparse(text: str) -> SparseVector:
    model = get_sparse_model()
    result = list(model.embed([text]))[0]
    return SparseVector(
        indices=result.indices.tolist(),
        values=result.values.tolist()
    )


# ── Format result helper ───────────────────────────────────────────────────────
def format_result(point, rank: int, mode: str) -> dict:
    p = point.payload or {}
    return {
        "id": str(point.id),
        "rank": rank,
        "mode": mode,
        "score": round(point.score, 4) if point.score else 0,
        "payload": {
            "title": p.get("title", "Unknown Product"),
            "description": p.get("description", ""),
            "brand": p.get("brand", ""),
            "asin": p.get("asin", ""),
            "image_url": p.get("image_url", ""),
            "price": p.get("price", None),
        }
    }


# ── Search Functions ───────────────────────────────────────────────────────────

def search_hybrid(query: str, limit: int = 10) -> list[dict]:
    """
    Full hybrid search:
    Dense + Sparse vectors prefetched separately,
    then fused with Reciprocal Rank Fusion (RRF).
    """
    dense_vec = embed_dense(query)
    sparse_vec = embed_sparse(query)

    results = client.query_points(
        collection_name=COLLECTION_NAME,
        prefetch=[
            Prefetch(
                query=dense_vec,
                using="dense",
                limit=50,
            ),
            Prefetch(
                query=sparse_vec,
                using="sparse",
                limit=50,
            ),
        ],
        query=FusionQuery(fusion=Fusion.RRF),
        limit=limit,
        with_payload=True,
        with_vectors=False,
    )

    return [format_result(p, i + 1, "hybrid") for i, p in enumerate(results.points)]


def search_dense_only(query: str, limit: int = 10) -> list[dict]:
    """
    Dense vector search only — semantic meaning.
    Used for the comparison panel (Method 02).
    """
    dense_vec = embed_dense(query)

    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=dense_vec,
        using="dense",
        limit=limit,
        with_payload=True,
        with_vectors=False,
    )

    return [format_result(p, i + 1, "dense") for i, p in enumerate(results.points)]


def search_keyword_only(query: str, limit: int = 10) -> list[dict]:
    """
    Sparse/BM25 keyword search only.
    Used for the comparison panel (Method 01).
    """
    sparse_vec = embed_sparse(query)

    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=sparse_vec,
        using="sparse",
        limit=limit,
        with_payload=True,
        with_vectors=False,
    )

    return [format_result(p, i + 1, "keyword") for i, p in enumerate(results.points)]


def dislike_product(product_id: str) -> bool:
    """
    Mark a product as disliked.
    Stored in Qdrant payload — used for negative recommendation.
    """
    try:
        client.set_payload(
            collection_name=COLLECTION_NAME,
            payload={"disliked": True},
            points=[product_id],
        )
        return True
    except Exception as e:
        print(f"Dislike error: {e}")
        return False


def recommend_avoiding_dislikes(
    liked_ids: list[str],
    disliked_ids: list[str],
    limit: int = 10
) -> list[dict]:
    """
    Qdrant Recommend API with positive + negative examples.
    Pushes results away from disliked products.
    """
    try:
        results = client.query_points(
            collection_name=COLLECTION_NAME,
            query=RecommendInput(
                positive=liked_ids,
                negative=disliked_ids if disliked_ids else [],
            ),
            using="dense",
            limit=limit,
            with_payload=True,
            with_vectors=False,
        )
        return [format_result(p, i + 1, "recommended") for i, p in enumerate(results.points)]
    except Exception as e:
        print(f"Recommend error: {e}")
        return []