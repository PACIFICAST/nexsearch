# NexSearch ⚡
### Multi-Vector Product Search Engine — Qdrant Hackathon 2026

> **Built solo. Deployed in full. Live at → [nexsearch-lyart.vercel.app](https://nexsearch-lyart.vercel.app)**

NexSearch is a production-grade intelligent product search engine that runs three search methods simultaneously and lets you see exactly why each result was ranked the way it was. It is not a demo — it is a fully deployed, always-on system backed by 3,000 real products, a live vector database, and a FastAPI backend that runs 24/7.

---

## What It Does

Most search engines give you one answer. NexSearch gives you five distinct capabilities running simultaneously, all backed by the same Qdrant vector database.

### Three-Method Comparison Search
| Method | Technology | What it finds |
|---|---|---|
| **Method 01 — Keyword Search** | BM25 sparse vectors | Exact and close word matches |
| **Method 02 — Semantic Search** | Dense vectors (MiniLM-L6-v2) | Meaning, intent, conceptual similarity |
| **Method 03 — NexSearch Hybrid** | RRF Fusion + Reranking | Best of both — the winner column |

Search *"cozy blanket for cold nights"* and watch Method 01 struggle with semantic gaps while Method 03 surfaces products you'd actually buy. That contrast is the entire point — NexSearch makes the difference between search technologies visible and measurable.

### Image Search
Switch to Image mode in the search bar, paste any product image URL, and NexSearch searches the database by visual similarity. No text required. The image is embedded and queried against the `visual` vector namespace, surfacing products that look like what you showed it — not products whose text description mentions what you described.

### AI Shopping Assistant
A fully conversational shopping assistant powered by Groq, grounded in the live product database. It maintains full message history across the session, understands natural language intent (*"I need a gift for my dad who likes fishing, budget $50"*), runs a hybrid search against Qdrant behind the scenes, and returns its reasoning alongside inline product cards directly inside the chat thread. Enter to send, animated typing indicator while the assistant is thinking.

### Trend Dashboard
Two live panels updating every 30 seconds: a ranked trending search leaderboard pulled from the backend with query counts and relative frequency bars, and a semantic cluster map showing how product categories (Fashion, Sports, Electronics, Home, Gifts) relate spatially — plus semantically similar query chips derived from the most recent search.

### Per-Result Score Explainability
Every product in the hybrid column shows a live score breakdown: Dense %, Sparse %, and Rerank % rendered as animated fill bars. Users can see exactly why a result ranked where it did — not just what ranked, but why.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Vercel)                        │
│           React 18 + TypeScript + Vite                      │
│                                                             │
│  SearchBar (Text + Image modes)                             │
│    └─ ComparisonPanel → ProductCard (with score bars)       │
│    └─ AIAssistant (Groq · full chat history · inline cards) │
│    └─ TrendDashboard (live 30s refresh · cluster map)       │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS REST
┌────────────────────────▼────────────────────────────────────┐
│                   BACKEND (Railway)                          │
│               FastAPI + Uvicorn · Always On                 │
│  /search  /dislike  /recommend  /health  /trends  /ask      │
└────────────────────────┬────────────────────────────────────┘
                         │ Qdrant Python SDK
┌────────────────────────▼────────────────────────────────────┐
│                QDRANT CLOUD (Vector DB)                     │
│          Collection: nexsearch_products                     │
│          3,000 products · Dense + Sparse + Visual vectors   │
│          Hybrid search · Image search · Recommend API       │
│          Payload filters · Real-time payload updates        │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Stack

**Backend**
- Python 3.11 · FastAPI · Uvicorn
- `qdrant-client` — native hybrid search with `query_points` + `Prefetch` + `FusionQuery`
- `fastembed` — lightweight in-process embedding at query time (no GPU, ~50MB RAM)
- `sentence-transformers/all-MiniLM-L6-v2` — 384-dim dense vectors
- `Qdrant/bm25` — sparse BM25 vectors for keyword matching
- Reciprocal Rank Fusion (RRF) — native Qdrant fusion at query time
- Qdrant Recommend API — positive + negative vector examples for personalisation

**Frontend**
- React 18 + TypeScript strict mode
- Vite with `verbatimModuleSyntax` enabled
- Zero UI libraries — all CSS custom properties, hand-written animations
- `SearchBar` — dual mode: text search and image URL search with live preview thumbnail
- `ComparisonPanel` — 3-column live comparison with skeleton loading states
- `ProductCard` — lazy-loaded product images, brand/title/description/price, per-card Dense/Sparse/Rerank score breakdown bars, thumbs up/down feedback wired to Qdrant payload
- `AIAssistant` — conversational chat powered by Groq, full session history, inline product cards inside chat bubbles, animated typing indicator
- `TrendDashboard` — live trending search leaderboard (30s auto-refresh), semantic cluster map, similar query chips

**Data**
- Dataset: `tasksource/esci` — Amazon product catalogue
- 3,000 products ingested with dual-vector embeddings (dense + sparse)
- Each product stored with: title, description, brand, ASIN, image URL, price, disliked flag
- Ingestion: one-time run in GitHub Codespaces, data lives in Qdrant Cloud permanently

**Infrastructure**
- Qdrant Cloud — managed vector database, free tier, always on
- Railway — backend hosting, always on, $5 free credit/month
- Vercel — frontend hosting, CDN-distributed, always on
- GitHub Codespaces — development environment, zero local setup

---

## Qdrant Features Used

This project specifically demonstrates the following Qdrant capabilities:

**Hybrid Search with named vectors**
```python
results = client.query_points(
    collection_name=COLLECTION_NAME,
    prefetch=[
        Prefetch(query=dense_vec, using="dense", limit=50),
        Prefetch(query=sparse_vec, using="sparse", limit=50),
    ],
    query=FusionQuery(fusion=Fusion.RRF),
    limit=limit,
    with_payload=True,
)
```

**Recommend API with negative examples**
```python
results = client.query_points(
    collection_name=COLLECTION_NAME,
    query=RecommendInput(positive=liked_ids, negative=disliked_ids),
    using="dense",
    limit=limit,
)
```

**Payload updates for personalisation**
```python
client.set_payload(
    collection_name=COLLECTION_NAME,
    payload={"disliked": True},
    points=[product_id],
)
```

**Dual-vector collection schema**
```python
client.create_collection(
    collection_name=COLLECTION_NAME,
    vectors_config={"dense": VectorParams(size=384, distance=Distance.COSINE)},
    sparse_vectors_config={"sparse": SparseVectorParams(index=SparseIndexParams(on_disk=False))},
)
```

---

## Live Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | API info and status |
| `/health` | GET | Health check — always returns `{"status":"ok"}` |
| `/search` | POST | Runs all 3 search methods simultaneously, returns side-by-side results |
| `/search/image` | POST | Image URL search via visual vector similarity |
| `/dislike` | POST | Marks a product as disliked in Qdrant payload |
| `/recommend` | POST | Personalised recommendations using liked/disliked IDs |
| `/trends` | GET | Trending search queries with counts and percentages |
| `/ask` | POST | AI assistant endpoint — Groq + Qdrant hybrid search, returns reply + products |
| `/docs` | GET | Interactive Swagger UI |

---

## Running Locally

**Prerequisites:** Python 3.11+, Node 18+

**Backend**
```bash
cd backend
pip install -r requirements.txt
export QDRANT_URL="your-cluster-url"
export QDRANT_API_KEY="your-api-key"
export COLLECTION_NAME="nexsearch_products"
uvicorn main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env.local
npm run dev
```

**Data ingestion (one-time only)**
```bash
cd backend
pip install -r requirements-ingest.txt
python ingest.py
# loads 3,000 products into Qdrant — takes ~5 minutes
```

---

## The Roadmap — Where This Goes Next

The architecture is deliberately production-ready. Every extension below builds directly on the existing vector infrastructure — no rewrites, only additions. The most compelling opportunities are in DeFi and high-stakes real-world domains where keyword search has always been dangerously inadequate.

---

### DeFi & Blockchain Intelligence

**On-Chain Protocol Discovery Engine**
The DeFi ecosystem has thousands of protocols, vaults, and liquidity pools — all described in whitepapers, docs, and audit reports that keyword search cannot meaningfully index. NexSearch's hybrid architecture can ingest protocol documentation, smart contract ABIs, and audit summaries as dual-vector embeddings. A user searching *"low-risk stablecoin yield with no lockup"* would surface protocols by semantic intent rather than exact terminology. Implementation: replace the product collection with a `defi_protocols` collection, embed protocol descriptions + risk ratings + TVL metadata into payloads, expose a `/protocol-search` endpoint. The Qdrant payload filter system handles hard constraints like `min_tvl` and `chain = "ethereum"` at the database level without touching the model.

**Smart Contract Vulnerability Search**
Security auditors currently grep through codebases manually. A vector search layer trained on known vulnerability patterns — reentrancy, integer overflow, flash loan attack surfaces — embedded using a code-aware model like `microsoft/codebert-base`, stored in Qdrant with payload metadata (severity, CVE ID, affected protocol), would let auditors search *"unchecked external call in ERC-20 transfer"* and surface semantically similar patterns across thousands of contracts. This is directly buildable on this stack: swap the embedding model, change the dataset, the search logic is identical.

**DeFi Wallet Transaction Semantic Search**
Wallets like MetaMask show raw transaction hashes. A background service that embeds transaction descriptions (decoded calldata + protocol name + action type) into a per-user Qdrant collection would let users search their own history: *"all times I provided liquidity to a Uniswap v3 pool"* or *"swaps where I lost more than 2% to slippage"*. Each wallet address maps to an isolated Qdrant collection — multi-tenancy the platform already supports architecturally.

**NFT Semantic Discovery**
OpenSea search is keyword-only. A collection of NFT metadata embeddings (trait descriptions, project lore, community sentiment from Discord scrapes) stored as dense + sparse vectors would enable *"cyberpunk themed NFT with rare background and less than 1 ETH floor"* — combining semantic meaning with hard payload filters on price and rarity score. CLIP image embeddings as a third named vector (`visual`) would add image-based search: upload a reference image, find visually similar NFTs across collections.

---

### High-Stakes Real-World Applications

**Medical Literature Triage for Clinicians**
PubMed has 36 million papers. A clinician searching *"second-line treatment options for treatment-resistant depression in adolescents with comorbid anxiety"* gets useless keyword results today. Embedding abstracts with a biomedical model (`microsoft/BiomedNLP-PubMedBERT`) into Qdrant, with payload fields for publication year, study type (RCT, meta-analysis), sample size, and journal impact factor, enables semantic search with hard filters — *"RCTs published after 2020 with sample size > 200"*. The Qdrant hybrid search handles the semantic layer; the payload filter handles the clinical constraints. This is the same architecture, different data.

**Legal Case Precedent Search**
Law firms pay thousands per month for Westlaw and LexisNexis. An open alternative using court opinion embeddings stored in Qdrant, with payload metadata for jurisdiction, year, judge, and outcome, would let attorneys search *"product liability cases where manufacturer knew of defect before release"* semantically rather than by keyword Boolean logic. The Recommend API adds a critical feature here: given a case a lawyer has already found relevant (`positive=[case_id]`), surface similar precedents — exactly what junior associates spend hours doing manually.

**Supply Chain Anomaly Detection**
Global supply chains generate millions of shipping records, supplier descriptions, and logistics events daily. Embedding each record as a vector and using Qdrant's nearest-neighbour search to flag records that are semantically distant from historical norms — unusual routing descriptions, unfamiliar supplier language, atypical product descriptions — is a real-time fraud and anomaly detection system. The dislike/feedback loop already built into NexSearch maps directly to analyst-confirmed anomaly labelling, which feeds back into the negative example pool for the Recommend API.

**Talent Intelligence Platform**
LinkedIn search is keyword matching against structured fields. A system that embeds full CV text, project descriptions, and skills narratives as dense vectors — combined with sparse BM25 for exact skill matching — would surface candidates for *"backend engineer who has shipped ML systems to production at a fintech"* without needing exact keyword matches. Qdrant's payload filters handle hard constraints (location, years of experience, seniority). The hybrid RRF fusion means semantic fit and keyword precision are both weighted, not traded off.

---

### Why This Architecture Scales to All of These

Every use case above shares the same pattern: unstructured text that needs semantic understanding, hard constraints that need exact filtering, and a personalisation layer that improves with feedback. That is precisely what this stack was built for. Qdrant collections are isolated and cheap to spin up. The embedding pipeline is modular — swap `all-MiniLM-L6-v2` for `BiomedBERT` or `CodeBERT` and the rest of the system is unchanged. The FastAPI backend already supports multi-collection routing. The Recommend API already accepts positive and negative examples.

NexSearch is not a finished product — it is a reusable intelligent search layer that can be dropped into any domain where the cost of a bad search result is high.

---

## Project Structure

```
nexsearch/
├── backend/
│   ├── main.py                  # FastAPI app, all routes
│   ├── search.py                # Qdrant search logic (hybrid, dense, sparse, image, recommend)
│   ├── ingest.py                # One-time data ingestion script
│   ├── requirements.txt         # Production dependencies
│   ├── requirements-ingest.txt  # Ingestion-only dependencies
│   └── nixpacks.toml            # Railway build config
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Root — tab routing, state management
│   │   ├── api.ts               # All backend API calls + TypeScript types
│   │   └── components/
│   │       ├── SearchBar.tsx    # Text + image URL search, mode switcher, suggestions
│   │       ├── ComparisonPanel.tsx  # 3-column results grid
│   │       ├── ProductCard.tsx  # Product card with score bars + feedback buttons
│   │       ├── AIAssistant.tsx  # Groq-powered chat with inline product results
│   │       └── TrendDashboard.tsx   # Live trends + semantic cluster map
│   └── index.html
└── README.md
```

---

## Built With

- [Qdrant](https://qdrant.tech) — the vector search engine powering everything
- [FastAPI](https://fastapi.tiangolo.com) — async Python API framework
- [fastembed](https://github.com/qdrant/fastembed) — lightweight embedding by Qdrant
- [React](https://react.dev) + [Vite](https://vitejs.dev) — frontend
- [Railway](https://railway.app) — backend hosting
- [Vercel](https://vercel.com) — frontend hosting

---

*Built solo for the Qdrant Hackathon 2026. The search problem is everywhere — this is the infrastructure to solve it.*
