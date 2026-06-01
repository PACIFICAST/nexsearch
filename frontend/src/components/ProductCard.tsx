import { useState } from "react";
import { SearchResult } from "../api";
import { dislikeProduct } from "../api";

interface Props {
  result: SearchResult;
  mode: "hybrid" | "dense" | "keyword";
  delay: number;
  onLike?: (id: string) => void;
  onDislike?: (id: string) => void;
}

export function ProductCard({ result, mode, delay, onLike, onDislike }: Props) {
  const [fb, setFb] = useState<"liked" | "disliked" | null>(null);
  const { payload, rank, scores } = result;

  const handleLike = () => {
    setFb("liked");
    onLike?.(result.id);
  };

  const handleDislike = async () => {
    setFb("disliked");
    onDislike?.(result.id);
    await dislikeProduct(result.id);
  };

  return (
    <div className="card" style={{ animationDelay: `${delay}s` }}>
      <div className="card-rank">#{String(rank).padStart(2, "0")}</div>

      {payload.image_url && (
        <div className="card-img-wrap">
          <img
            className="card-img"
            src={payload.image_url}
            alt={payload.title}
            loading="lazy"
            onError={e => {
              (e.currentTarget.parentElement as HTMLElement).style.display = "none";
            }}
          />
        </div>
      )}

      {payload.brand && <div className="card-brand">{payload.brand}</div>}

      <div className="card-title">{payload.title}</div>

      {payload.description && (
        <div className="card-desc">{payload.description}</div>
      )}

      {payload.price && <div className="card-price">${payload.price}</div>}

      {/* Score breakdown — winner column only */}
      {mode === "hybrid" && scores && (
        <div className="scores">
          <div className="score-row">
            <span className="score-lbl">Dense</span>
            <div className="score-track">
              <div
                className="score-fill dense"
                style={{ width: `${Math.round(scores.dense * 100)}%` }}
              />
            </div>
            <span className="score-pct">{Math.round(scores.dense * 100)}%</span>
          </div>
          <div className="score-row">
            <span className="score-lbl">Sparse</span>
            <div className="score-track">
              <div
                className="score-fill sparse"
                style={{ width: `${Math.round(scores.sparse * 100)}%` }}
              />
            </div>
            <span className="score-pct">{Math.round(scores.sparse * 100)}%</span>
          </div>
          <div className="score-row">
            <span className="score-lbl">Rerank</span>
            <div className="score-track">
              <div
                className="score-fill rerank"
                style={{ width: `${Math.round(scores.rerank * 100)}%` }}
              />
            </div>
            <span className="score-pct">{Math.round(scores.rerank * 100)}%</span>
          </div>
        </div>
      )}

      {mode === "hybrid" && (
        <div className="card-feedback">
          <span className="feedback-label">Rate</span>
          <button
            className={`btn-fb ${fb === "liked" ? "liked" : ""}`}
            onClick={handleLike}
            type="button"
            title="Relevant"
          >
            <i className="ti ti-thumb-up" aria-hidden="true" />
          </button>
          <button
            className={`btn-fb ${fb === "disliked" ? "disliked" : ""}`}
            onClick={handleDislike}
            type="button"
            title="Not relevant"
          >
            <i className="ti ti-thumb-down" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

export function SkeletonCard({ delay }: { delay: number }) {
  return (
    <div className="skeleton-card" style={{ animationDelay: `${delay}s` }}>
      <div className="skel" style={{ height: 10, width: "25%", marginBottom: 12 }} />
      <div className="skel" style={{ height: 90, width: "100%", marginBottom: 14 }} />
      <div className="skel" style={{ height: 10, width: "45%", marginBottom: 8 }} />
      <div className="skel" style={{ height: 16, width: "92%", marginBottom: 6 }} />
      <div className="skel" style={{ height: 16, width: "78%" }} />
    </div>
  );
}
