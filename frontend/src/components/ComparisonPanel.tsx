import type { SearchResponse } from "../api";
import { ProductCard, SkeletonCard } from "./ProductCard";

interface Props {
  results: SearchResponse | null;
  isLoading: boolean;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
}

const SKELETONS = Array.from({ length: 6 });

export function ComparisonPanel({
  results,
  isLoading,
  onLike,
  onDislike,
}: Props) {
  return (
    <>
      {/* Results header */}
      {results && !isLoading && (
        <div className="results-header">
          <div className="results-query">
            Results for <span>"{results.query}"</span>
          </div>
          <div className="results-count">
            {results.hybrid.length} results · 3 methods compared
          </div>
        </div>
      )}

      {/* 3-column grid */}
      <div className="comparison-grid">

        {/* Column 1 — Keyword only */}
        <div className="col">
          <div className="col-header">
            <div className="col-number">Method 01</div>
            <div className="col-name">Keyword Search</div>
            <div className="col-desc">BM25 sparse vectors only</div>
          </div>
          <div className="col-items">
            {isLoading
              ? SKELETONS.map((_, i) => (
                  <SkeletonCard key={i} delay={i * 0.04} />
                ))
              : results?.keyword_only.map((r, i) => (
                  <ProductCard
                    key={r.id}
                    result={r}
                    mode="keyword"
                    animationDelay={i * 0.05}
                  />
                ))}
            {!isLoading && results?.keyword_only.length === 0 && (
              <EmptyCol />
            )}
          </div>
        </div>

        {/* Column 2 — Dense only */}
        <div className="col">
          <div className="col-header">
            <div className="col-number">Method 02</div>
            <div className="col-name">Semantic Search</div>
            <div className="col-desc">Dense vectors only · MiniLM</div>
          </div>
          <div className="col-items">
            {isLoading
              ? SKELETONS.map((_, i) => (
                  <SkeletonCard key={i} delay={i * 0.04 + 0.05} />
                ))
              : results?.dense_only.map((r, i) => (
                  <ProductCard
                    key={r.id}
                    result={r}
                    mode="dense"
                    animationDelay={i * 0.05}
                  />
                ))}
            {!isLoading && results?.dense_only.length === 0 && (
              <EmptyCol />
            )}
          </div>
        </div>

        {/* Column 3 — Hybrid + Reranked (WINNER) */}
        <div className="col">
          <div className="col-header">
            <div className="col-number">
              Method 03
              <span className="col-badge">Best</span>
            </div>
            <div className="col-name">NexSearch</div>
            <div className="col-desc">
              Hybrid RRF · Dense + Sparse · Reranked
            </div>
          </div>
          <div className="col-items">
            {isLoading
              ? SKELETONS.map((_, i) => (
                  <SkeletonCard key={i} delay={i * 0.04 + 0.1} />
                ))
              : results?.hybrid.map((r, i) => (
                  <ProductCard
                    key={r.id}
                    result={r}
                    mode="hybrid"
                    animationDelay={i * 0.05}
                    onLike={onLike}
                    onDislike={onDislike}
                  />
                ))}
            {!isLoading && results?.hybrid.length === 0 && <EmptyCol />}
          </div>
        </div>
      </div>
    </>
  );
}

function EmptyCol() {
  return (
    <div className="state-empty">
      <div className="state-empty-title">No results</div>
      <div className="state-empty-sub">Try a different query</div>
    </div>
  );
}