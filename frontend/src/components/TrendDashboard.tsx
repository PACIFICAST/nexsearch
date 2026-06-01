import { useState, useEffect } from "react";
import { getTrends, TrendItem } from "../api";

export function TrendDashboard() {
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getTrends();
        setTrends(data.trending);
        setTotal(data.total_searches);
      } catch {
        // show empty state
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const clusters = [
    { label: "Fashion", color: "var(--teal)", bg: "var(--teal-dim)", top: "18%", left: "12%", size: 64 },
    { label: "Sports", color: "var(--coral)", bg: "var(--coral-dim)", top: "55%", left: "28%", size: 54 },
    { label: "Electronics", color: "var(--violet)", bg: "var(--violet-dim)", top: "12%", left: "50%", size: 72 },
    { label: "Home", color: "var(--amber)", bg: "var(--amber-dim)", top: "55%", left: "65%", size: 50 },
    { label: "Gifts", color: "var(--teal)", bg: "var(--teal-dim)", top: "30%", left: "82%", size: 46 },
  ];

  const similarQueries = [
    "comfy shoes for standing",
    "best running shoes 2026",
    "cushioned sneakers",
    "wide fit athletic shoes",
    "supportive walking shoes",
  ];

  return (
    <div className="trends-section">
      {/* Trending queries */}
      <div className="trend-card">
        <div className="trend-card-title">Trending Searches</div>

        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="trend-item">
              <div className="skel" style={{ height: 12, width: "100%", borderRadius: 4 }} />
            </div>
          ))
        ) : trends.length > 0 ? (
          trends.map((t, i) => (
            <div key={i} className="trend-item">
              <div className="trend-num">{String(i + 1).padStart(2, "0")}</div>
              <div className="trend-query">{t.query}</div>
              <div className="trend-bar-wrap">
                <div className="trend-bar" style={{ width: `${t.pct}%` }} />
              </div>
              <div className="trend-count">{t.count}</div>
            </div>
          ))
        ) : (
          /* Fallback placeholder when no real data yet */
          [
            { query: "wireless earbuds noise cancelling", count: 142, pct: 90 },
            { query: "ergonomic office chair back pain", count: 98, pct: 69 },
            { query: "minimalist desk lamp home office", count: 84, pct: 59 },
            { query: "cozy blanket winter nights", count: 65, pct: 46 },
            { query: "waterproof hiking boots wide feet", count: 51, pct: 36 },
          ].map((t, i) => (
            <div key={i} className="trend-item">
              <div className="trend-num">{String(i + 1).padStart(2, "0")}</div>
              <div className="trend-query">{t.query}</div>
              <div className="trend-bar-wrap">
                <div className="trend-bar" style={{ width: `${t.pct}%` }} />
              </div>
              <div className="trend-count">{t.count}</div>
            </div>
          ))
        )}

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.7rem", color: "var(--text-3)", letterSpacing: "0.1em" }}>
            Total searches
          </span>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--teal)" }}>
            {total > 0 ? total.toLocaleString() : "—"}
          </span>
        </div>
      </div>

      {/* Cluster map + similar queries */}
      <div className="trend-card">
        <div className="trend-card-title">Semantic Search Clusters</div>

        <div className="cluster-area">
          {clusters.map((c, i) => (
            <div
              key={i}
              className="cluster-node"
              style={{
                width: c.size,
                height: c.size,
                background: c.bg,
                border: `1px solid ${c.color}`,
                color: c.color,
                top: c.top,
                left: c.left,
                animationDelay: `${i * 0.4}s`,
              }}
            >
              {c.label}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 10 }}>
            Semantically similar to last search
          </div>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {similarQueries.map((q, i) => (
              <span key={i} className="similar-chip">
                <i className="ti ti-arrow-right" style={{ fontSize: 10 }} aria-hidden="true" />
                {q}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
