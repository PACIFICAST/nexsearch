import { useState, FormEvent } from "react";

interface Props {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

const SUGGESTIONS = [
  "cozy blanket for winter nights",
  "minimalist desk lamp home office",
  "waterproof hiking boots wide feet",
  "wireless earbuds noise cancelling",
  "ergonomic office chair back pain",
];

export function SearchBar({ onSearch, isLoading }: Props) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  const handleSuggestion = (s: string) => {
    setQuery(s);
    onSearch(s);
  };

  return (
    <section className="hero">
      <div className="hero-eyebrow">Qdrant Hackathon 2026</div>
      <h1 className="hero-title">
        Nex<em>Search</em>
      </h1>

      <div className="search-container">
        <form className="search-form" onSubmit={handleSubmit}>
          <input
            className="search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="describe what you're looking for..."
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            className="search-btn"
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? "Searching" : "Search →"}
          </button>
        </form>

        <div className="search-meta">
          <span>Dense · Sparse · Hybrid RRF · ColBERT Reranking</span>
          <span>Powered by Qdrant</span>
        </div>

        <div className="suggestions">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className="suggestion-chip"
              onClick={() => handleSuggestion(s)}
              type="button"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
