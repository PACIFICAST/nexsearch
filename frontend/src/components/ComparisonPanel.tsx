import type { SearchResponse } from "../api";
import { ProductCard, SkeletonCard } from "./ProductCard";

interface Props {
  results: SearchResponse | null;
  isLoading: boolean;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
}

const SKELS = Array.from({ length: 6 });

export function ComparisonPanel({ results, isLoading, onLike, onDislike }: Props) {
  const uniqueToHybrid = results
    ? results.hybrid.filter(
        h =>
          !results.keyword_only.some(k => k.id === h.id) &&
          !results.dense_only.some(d => d.id === h.id)
      ).length
    : 0;

  return (
    <>
      {results && !isLoading && (
        <div className="query-stats">
          <div className="stats-left">
            Results for&nbsp;<strong>"{results.query}"</strong>
            {uniqueToHybrid > 0 && (
              <span className="stats-badge">+{uniqueToHybrid} unique to NexSearch</span>
            )}
          </div>
          <div className="stats-right">
            {results.elapsed_ms
              ? `${results.elapsed_ms}ms · 3 methods · 3,000 products`
              : "3 methods compared · 3,000 products"}
          </div>
        </div>
      )}

      <div className="comparison">
        {/* Col 1 — Keyword */}
        <div className="col">
          <div className="col-header">
            <div className="col-number">Method 01</div>
            <div className="col-name">Keyword Search</div>
            <div className="col-desc">BM25 sparse vectors · traditional</div>
          </div>
          <div className="col-items">
            {isLoading
              ? SKELS.map((_, i) => <SkeletonCard key={i} delay={i * 0.04} />)
              : results?.keyword_only.length
              ? results.keyword_only.map((r, i) => (
                  <ProductCard key={r.id} result={r} mode="keyword" delay={i * 0.05} />
                ))
              : <EmptyCol label="No keyword results" />}
          </div>
        </div>

        {/* Col 2 — Dense */}
        <div className="col">
          <div className="col-header">
            <div className="col-number">Method 02</div>
            <div className="col-name">Semantic Search</div>
            <div className="col-desc">Dense vectors · MiniLM</div>
          </div>
          <div className="col-items">
            {isLoading
              ? SKELS.map((_, i) => <SkeletonCard key={i} delay={i * 0.04 + 0.06} />)
              : results?.dense_only.length
              ? results.dense_only.map((r, i) => (
                  <ProductCard key={r.id} result={r} mode="dense" delay={i * 0.05} />
                ))
              : <EmptyCol label="No semantic results" />}
          </div>
        </div>

        {/* Col 3 — Hybrid Winner */}
        <div className="col">
          <div className="col-header">
            <div className="col-number">
              Method 03
              <span className="col-winner-badge">Best</span>
            </div>
            <div className="col-name">NexSearch</div>
            <div className="col-desc">Hybrid RRF · Dense + Sparse · Reranked</div>
          </div>
          <div className="col-items">
            {isLoading
              ? SKELS.map((_, i) => <SkeletonCard key={i} delay={i * 0.04 + 0.12} />)
              : results?.hybrid.length
              ? results.hybrid.map((r, i) => (
                  <ProductCard
                    key={r.id}
                    result={r}
                    mode="hybrid"
                    delay={i * 0.05}
                    onLike={onLike}
                    onDislike={onDislike}
                  />
                ))
              : <EmptyCol label="No results found" />}
          </div>
        </div>
      </div>
    </>
  );
}

function EmptyCol({ label }: { label: string }) {
  return (
    <div className="col-empty">
      <div className="col-empty-title">{label}</div>
      <div className="col-empty-sub">Try a different query</div>
    </div>
  );
}
