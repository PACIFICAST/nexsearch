import { useState } from "react";
import type { SearchResult } from "../api";

interface Props {
  result: SearchResult;
  mode: "hybrid" | "dense" | "keyword";
  animationDelay: number;
  onLike?: (id: string) => void;
  onDislike?: (id: string) => void;
}

export function ProductCard({
  result,
  mode,
  animationDelay,
  onLike,
  onDislike,
}: Props) {
  const [feedback, setFeedback] = useState<"liked" | "disliked" | null>(null);
  const { payload, rank, scores } = result;

  const handleLike = () => {
    setFeedback("liked");
    onLike?.(result.id);
  };

  const handleDislike = () => {
    setFeedback("disliked");
    onDislike?.(result.id);
  };

  return (
    <div
      className="product-card"
      style={{ animationDelay: `${animationDelay}s` }}
    >
      <div className="card-rank">
        #{rank.toString().padStart(2, "0")}
      </div>

      {payload.image_url && (
        <div className="card-image-wrap">
          <img
            className="card-image"
            src={payload.image_url}
            alt={payload.title}
            onError={(e) => {
              (e.currentTarget.parentElement as HTMLElement).style.display =
                "none";
            }}
            loading="lazy"
          />
        </div>
      )}

      {payload.brand && (
        <div className="card-brand">{payload.brand}</div>
      )}

      <div className="card-title">{payload.title}</div>

      {payload.description && (
        <div className="card-desc">{payload.description}</div>
      )}

      {payload.price && (
        <div className="card-price">${payload.price}</div>
      )}

      {/* Score breakdown — only on hybrid column */}
      {mode === "hybrid" && scores && (
        <div className="score-breakdown">
          <div className="score-row">
            <span className="score-label">Dense</span>
            <div className="score-track">
              <div
                className="score-fill score-fill--dense"
                style={{ width: `${Math.round(scores.dense * 100)}%` }}
              />
            </div>
            <span className="score-pct">
              {Math.round(scores.dense * 100)}%
            </span>
          </div>
          <div className="score-row">
            <span className="score-label">Sparse</span>
            <div className="score-track">
              <div
                className="score-fill score-fill--sparse"
                style={{ width: `${Math.round(scores.sparse * 100)}%` }}
              />
            </div>
            <span className="score-pct">
              {Math.round(scores.sparse * 100)}%
            </span>
          </div>
          <div className="score-row">
            <span className="score-label">Rerank</span>
            <div className="score-track">
              <div
                className="score-fill score-fill--rerank"
                style={{ width: `${Math.round(scores.rerank * 100)}%` }}
              />
            </div>
            <span className="score-pct">
              {Math.round(scores.rerank * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Feedback — only on hybrid column */}
      {mode === "hybrid" && (
        <div className="card-feedback">
          <span className="feedback-label">Rate</span>
          <button
            className={`btn-feedback ${feedback === "liked" ? "liked" : ""}`}
            onClick={handleLike}
            title="Good result"
            type="button"
          >
            ↑
          </button>
          <button
            className={`btn-feedback ${
              feedback === "disliked" ? "disliked" : ""
            }`}
            onClick={handleDislike}
            title="Not relevant"
            type="button"
          >
            ↓
          </button>
        </div>
      )}
    </div>
  );
}

/* Skeleton card for loading state */
export function SkeletonCard({ delay }: { delay: number }) {
  return (
    <div
      className="skeleton-card"
      style={{ animationDelay: `${delay}s` }}
    >
      <div
        className="skeleton-line"
        style={{ height: 10, width: "30%", marginBottom: 12 }}
      />
      <div
        className="skeleton-line"
        style={{ height: 90, width: "100%", marginBottom: 12 }}
      />
      <div
        className="skeleton-line"
        style={{ height: 10, width: "50%", marginBottom: 8 }}
      />
      <div
        className="skeleton-line"
        style={{ height: 14, width: "90%", marginBottom: 6 }}
      />
      <div
        className="skeleton-line"
        style={{ height: 14, width: "75%" }}
      />
    </div>
  );
}