"""
NexSearch — Ingestion Script
Run this ONCE in GitHub Codespaces to load products into Qdrant Cloud.
After this runs, your data lives in Qdrant permanently.
Never needs to run again.

Usage:
  pip install qdrant-client[fastembed] datasets pandas sentence-transformers
  export QDRANT_URL="https://your-cluster.qdrant.io"
  export QDRANT_API_KEY="your-api-key"
  python ingest.py
"""

import os
import uuid
from datasets import load_dataset
from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams, Distance, SparseVectorParams,
    SparseIndexParams, PointStruct, SparseVector
)
from sentence_transformers import SentenceTransformer
from fastembed import SparseTextEmbedding

# ── Config ────────────────────────────────────────────────────────────────────
QDRANT_URL = os.environ["QDRANT_URL"]
QDRANT_API_KEY = os.environ["QDRANT_API_KEY"]
COLLECTION_NAME = "nexsearch_products"
BATCH_SIZE = 50
TOTAL_PRODUCTS = 3000  # keep low for free Qdrant tier

# ── Clients & Models ──────────────────────────────────────────────────────────
print("🔌 Connecting to Qdrant Cloud...")
client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=60)

print("📦 Loading dense embedding model (all-MiniLM-L6-v2)...")
dense_model = SentenceTransformer("all-MiniLM-L6-v2")

print("📦 Loading sparse embedding model (BM25)...")
sparse_model = SparseTextEmbedding(model_name="Qdrant/bm25")

# ── Create Collection ─────────────────────────────────────────────────────────
print(f"🗂  Creating collection: {COLLECTION_NAME}")

# Delete if exists (clean slate)
try:
    client.delete_collection(COLLECTION_NAME)
    print("   Deleted existing collection.")
except Exception:
    pass

client.create_collection(
    collection_name=COLLECTION_NAME,
    vectors_config={
        "dense": VectorParams(
            size=384,
            distance=Distance.COSINE,
        )
    },
    sparse_vectors_config={
        "sparse": SparseVectorParams(
            index=SparseIndexParams(on_disk=False)
        )
    }
)
print("   ✅ Collection created.")

# ── Load Dataset ──────────────────────────────────────────────────────────────
print(f"📥 Loading dataset (first {TOTAL_PRODUCTS} products)...")
dataset = load_dataset(
    "tasksource/esci",
    split=f"train[:{TOTAL_PRODUCTS}]",
    trust_remote_code=True
)
print(f"   ✅ Loaded {len(dataset)} products.")

# ── Ingest in Batches ─────────────────────────────────────────────────────────
print("🚀 Starting ingestion...")
points = []
ingested = 0
skipped = 0

for i, item in enumerate(dataset):
    # Safe extraction — handles None values from dataset
    title       = (item.get("product_title") or "").strip()
    description = (item.get("product_description") or "").strip()
    bullets     = (item.get("product_bullet_point") or "").strip()
    brand       = (item.get("brand") or "").strip()
    asin        = (item.get("product_id") or str(uuid.uuid4())).strip()
    image_url   = (item.get("product_image_url") or "").strip()
    price_raw   = item.get("price", None)
    price       = str(price_raw).strip() if price_raw is not None else None

    # Skip products with no title
    if not title:
        skipped += 1
        continue

    # Combine text for embedding
    product_text = f"{title} {brand} {description[:200]} {bullets[:200]}".strip()

    # Skip if combined text is empty
    if not product_text:
        skipped += 1
        continue

    try:
        # Dense embedding
        dense_vec = dense_model.encode(product_text, normalize_embeddings=True).tolist()

        # Sparse embedding
        sparse_result = list(sparse_model.embed([product_text]))[0]
        sparse_vec = SparseVector(
            indices=sparse_result.indices.tolist(),
            values=sparse_result.values.tolist()
        )

        points.append(PointStruct(
            id=str(uuid.uuid4()),
            vector={
                "dense": dense_vec,
                "sparse": sparse_vec,
            },
            payload={
                "title": title,
                "description": description[:400],
                "brand": brand,
                "asin": asin,
                "image_url": image_url,
                "price": price,
                "disliked": False,
            }
        ))

    except Exception as e:
        print(f"   ⚠️  Skipped product {i}: {e}")
        skipped += 1
        continue

    # Upsert in batches
    if len(points) >= BATCH_SIZE:
        client.upsert(collection_name=COLLECTION_NAME, points=points, wait=True)
        ingested += len(points)
        points = []
        print(f"   ✅ Ingested {ingested} products...")

# Flush remaining
if points:
    client.upsert(collection_name=COLLECTION_NAME, points=points, wait=True)
    ingested += len(points)

print(f"\n🎉 Ingestion complete!")
print(f"   Products ingested: {ingested}")
print(f"   Products skipped:  {skipped}")
print(f"   Collection: {COLLECTION_NAME}")
print(f"\nYou can now deploy your backend. The data lives in Qdrant Cloud permanently.")