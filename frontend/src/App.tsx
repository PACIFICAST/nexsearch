import { useState, useCallback } from "react";
import "./index.css";
import { SearchBar } from "./components/SearchBar";
import { ComparisonPanel } from "./components/ComparisonPanel";
import { AIAssistant } from "./components/AIAssistant";
import { TrendDashboard } from "./components/TrendDashboard";
import {
  searchProducts,
  searchByImage,
  SearchResponse,
} from "./api";

type Tab = "search" | "ai" | "trends";

const FEATURES = [
  { icon: "🧠", color: "var(--teal)", label: "Dense Vectors", desc: "MiniLM-L6-v2 semantic embeddings understand meaning, not just words" },
  { icon: "🔍", color: "var(--coral)", label: "Sparse BM25", desc: "FastEmbed sparse vectors capture exact keywords and brand names" },
  { icon: "⚡", color: "var(--violet)", label: "Hybrid RRF Fusion", desc: "Qdrant's native Reciprocal Rank Fusion combines both signals in one query" },
  { icon: "🖼️", color: "var(--amber)", label: "Visual Image Search", desc: "CLIP embeddings let you search by pasting any product image URL" },
  { icon: "✦", color: "var(--teal)", label: "AI Shopping Assistant", desc: "Groq-powered assistant grounded in your live Qdrant product database" },
  { icon: "📊", color: "var(--violet)", label: "Live Trend Analytics", desc: "Real-time semantic clustering of search queries stored in Qdrant" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("search");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [dislikedIds, setDislikedIds] = useState<string[]>([]);

  const handleSearch = useCallback(async (query: string, mode: "text" | "image") => {
    // Switch to search tab when a search fires from any mode button
    setTab("search");
    setIsLoading(true);
    setError(null);
    setResults(null);
    setLikedIds([]);
    setDislikedIds([]);

    try {
      const t0 = Date.now();
      const data = mode === "image"
        ? await searchByImage(query)
        : await searchProducts(query);
      data.elapsed_ms = Date.now() - t0;
      setResults(data);
    } catch (e) {
      setError("Search failed. Check your connection or try again.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleModeChange = useCallback((mode: "text" | "image" | "ai") => {
    if (mode === "ai") setTab("ai");
  }, []);

  const handleLike = useCallback((id: string) => {
    setLikedIds(prev => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const handleDislike = useCallback((id: string) => {
    setDislikedIds(prev => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  return (
    <div>
      {/* ── NAV ── */}
      <nav className="nav">
        <div className="nav-logo">Nex<span>Search</span></div>
        <ul className="nav-links">
          <li>
            <button
              className={tab === "search" ? "active" : ""}
              onClick={() => setTab("search")}
            >
              Search
            </button>
          </li>
          <li>
            <button
              className={tab === "ai" ? "active" : ""}
              onClick={() => setTab("ai")}
            >
              AI Assistant
            </button>
          </li>
          <li>
            <button
              className={tab === "trends" ? "active" : ""}
              onClick={() => setTab("trends")}
            >
              Trends
            </button>
          </li>
        </ul>
        <div className="nav-pill">Qdrant Hackathon 2026</div>
      </nav>

      {/* ── SEARCH + HERO ── always shown */}
      <SearchBar
        onSearch={handleSearch}
        isLoading={isLoading}
        onModeChange={handleModeChange}
        activeTab={tab}
      />

      {/* ── ERROR ── */}
      {error && (
        <div style={{
          textAlign: "center",
          padding: "20px",
          color: "var(--coral)",
          fontSize: "0.82rem",
          letterSpacing: "0.05em",
          borderTop: "1px solid var(--border)",
        }}>
          {error}
        </div>
      )}

      {/* ── SEARCH TAB ── */}
      {tab === "search" && (results || isLoading) && (
        <ComparisonPanel
          results={results}
          isLoading={isLoading}
          onLike={handleLike}
          onDislike={handleDislike}
        />
      )}

      {/* ── AI ASSISTANT TAB ── */}
      {tab === "ai" && (
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="section-heading">
            <div className="section-heading-left">
              <div className="section-heading-title">AI Shopping Assistant</div>
              <div className="section-heading-count">Powered by Groq · Llama 3.3 70B</div>
            </div>
          </div>
          <AIAssistant />
        </div>
      )}

      {/* ── TRENDS TAB ── */}
      {tab === "trends" && (
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="section-heading">
            <div className="section-heading-left">
              <div className="section-heading-title">Live Trend Dashboard</div>
              <div className="section-heading-count">Real-time semantic analytics · Qdrant</div>
            </div>
          </div>
          <TrendDashboard />
        </div>
      )}

      {/* ── FEATURES STRIP ── always at bottom ── */}
      <div className="features-strip">
        {FEATURES.map((f, i) => (
          <div key={i} className="feature-item">
            <div
              className="feature-icon"
              style={{ background: `rgba(${f.color === "var(--teal)" ? "0,212,200" : f.color === "var(--coral)" ? "255,107,107" : f.color === "var(--violet)" ? "139,124,246" : "255,181,71"},0.1)` }}
            >
              {f.icon}
            </div>
            <div className="feature-label">{f.label}</div>
            <div className="feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* ── FOOTER ── */}
      <div className="footer">
        <div className="footer-left">
          <div className="footer-dot" />
          Powered by Qdrant Cloud
        </div>
        <div className="footer-right">
          {["Dense Vectors", "Sparse BM25", "RRF Fusion", "Recommend API", "Image Search"].map(t => (
            <div key={t} className="footer-tag">{t}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
