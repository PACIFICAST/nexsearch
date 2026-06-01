import { useState, FormEvent } from "react";

interface Props {
  onSearch: (query: string, mode: "text" | "image") => void;
  isLoading: boolean;
  onModeChange?: (mode: "text" | "image" | "ai") => void;
  activeTab: "search" | "ai" | "trends";
}

const SUGGESTIONS = [
  "cozy blanket for winter nights",
  "wireless earbuds noise cancelling",
  "minimalist desk lamp home office",
  "waterproof hiking boots wide feet",
  "gift for dad who likes fishing",
];

type SearchMode = "text" | "image" | "ai";

export function SearchBar({ onSearch, isLoading, onModeChange, activeTab }: Props) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("text");
  const [imageUrl, setImageUrl] = useState("");
  const [imgValid, setImgValid] = useState(false);

  const switchMode = (m: SearchMode) => {
    setMode(m);
    onModeChange?.(m);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (mode === "image" && imageUrl.trim()) {
      onSearch(imageUrl.trim(), "image");
    } else if (mode === "text" && query.trim()) {
      onSearch(query.trim(), "text");
    }
  };

  const handleSuggestion = (s: string) => {
    setQuery(s);
    switchMode("text");
    onSearch(s, "text");
  };

  return (
    <section className="hero">
      <div className="hero-eyebrow">
        <div className="eyebrow-dot" />
        Multi-Vector Intelligence · Qdrant Hackathon 2026
      </div>

      <h1 className="hero-title">
        Search that actually<br />
        <em>understands</em> what<br />
        you <span className="accent-coral">mean</span>
      </h1>

      <p className="hero-sub">
        Four Qdrant technologies running simultaneously —<br />
        dense vectors, sparse BM25, hybrid fusion, and image search.
      </p>

      {/* SEARCH BAR */}
      <div className="search-outer">
        <div className="search-glow-ring" />
        <form className="search-bar" onSubmit={handleSubmit}>
          <button
            type="button"
            className="search-icon-btn"
            aria-label="Search"
          >
            <i className="ti ti-search" aria-hidden="true" />
          </button>

          <input
            className="search-input"
            type="text"
            value={mode === "text" ? query : ""}
            onChange={e => setQuery(e.target.value)}
            placeholder={
              mode === "image"
                ? "Switch to Text tab to type a query..."
                : "describe what you're looking for..."
            }
            readOnly={mode === "image"}
            autoComplete="off"
            autoFocus
          />

          <div className="search-divider" />

          <div className="search-mode-btns">
            <button
              type="button"
              className={`mode-btn ${mode === "text" ? "active" : ""}`}
              onClick={() => switchMode("text")}
            >
              <i className="ti ti-typography" aria-hidden="true" />
              Text
            </button>
            <button
              type="button"
              className={`mode-btn img ${mode === "image" ? "active img" : ""}`}
              onClick={() => switchMode("image")}
            >
              <i className="ti ti-camera" aria-hidden="true" />
              Image
            </button>
          </div>

          <button
            type="submit"
            className="search-submit"
            disabled={
              isLoading ||
              (mode === "text" && !query.trim()) ||
              (mode === "image" && !imageUrl.trim())
            }
          >
            {isLoading ? "..." : "Search"}
          </button>
        </form>
      </div>

      {/* Image URL input — shown when image mode active */}
      {mode === "image" && (
        <div className="image-url-row">
          {imgValid && (
            <img
              className="image-preview-thumb"
              src={imageUrl}
              alt="preview"
              onError={() => setImgValid(false)}
            />
          )}
          <input
            className="image-url-input"
            type="url"
            placeholder="Paste an image URL to search by visual similarity..."
            value={imageUrl}
            onChange={e => {
              setImageUrl(e.target.value);
              setImgValid(false);
            }}
            onBlur={() => imageUrl.trim() && setImgValid(true)}
            autoFocus
          />
        </div>
      )}

      {/* Suggestion chips — text mode only */}
      {mode === "text" && (
        <div className="chips">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              type="button"
              className="chip"
              onClick={() => handleSuggestion(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
