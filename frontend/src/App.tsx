import { useState, useCallback } from "react";
import "./index.css";
import { SearchBar } from "./components/SearchBar";
import { ComparisonPanel } from "./components/ComparisonPanel";
import {
  searchProducts,
  dislikeProduct,
  SearchResponse,
} from "./api";

export default function App() {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [dislikedIds, setDislikedIds] = useState<string[]>([]);

  const handleSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await searchProducts(query, 8);
      setResults(data);
      // Reset feedback on new search
      setLikedIds([]);
      setDislikedIds([]);
    } catch (e) {
      setError("Search failed. Make sure the backend is running.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLike = useCallback((id: string) => {
    setLikedIds((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
  }, []);

  const handleDislike = useCallback(async (id: string) => {
    setDislikedIds((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
    // Tell Qdrant about the dislike
    try {
      await dislikeProduct(id);
    } catch (e) {
      console.warn("Dislike not recorded:", e);
    }
  }, []);

  return (
    <div>
      {/* Search hero section */}
      <SearchBar onSearch={handleSearch} isLoading={isLoading} />

      {/* Error state */}
      {error && (
        <div
          style={{
            textAlign: "center",
            padding: "24px",
            color: "#D4622A",
            fontSize: "0.75rem",
            letterSpacing: "0.1em",
            borderTop: "1px solid #1E1E22",
          }}
        >
          {error}
        </div>
      )}

      {/* Results — shown once first search fires */}
      {(results || isLoading) && (
        <section className="results-section">
          <ComparisonPanel
            results={results}
            isLoading={isLoading}
            onLike={handleLike}
            onDislike={handleDislike}
          />

          {/* Tech strip at the bottom */}
          {results && !isLoading && (
            <div className="tech-strip">
              {[
                "Qdrant Cloud",
                "Hybrid Search",
                "RRF Fusion",
                "BM25 Sparse",
                "Dense Vectors",
                "Recommend API",
              ].map((t) => (
                <div key={t} className="tech-item">
                  <div className="tech-dot" />
                  {t}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
