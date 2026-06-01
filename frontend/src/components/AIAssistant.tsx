import { useState, useRef, useEffect } from "react";
import { askAssistant } from "../api";
import type { SearchResult } from "../api";

interface Message {
  role: "user" | "ai";
  content: string;
  products?: SearchResult[];
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content:
        "Hi! I'm your AI shopping assistant. Tell me what you're looking for — I'll search the product database and recommend the best matches. Try something like \"I need a gift for my dad who likes fishing, budget $50\".",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.content,
      }));
      const { reply, products } = await askAssistant(msg, history);
      setMessages(prev => [...prev, { role: "ai", content: reply, products }]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "ai", content: "Sorry, I couldn't connect to the assistant right now. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <div className="ai-header-left">
          <div className="ai-orb">✦</div>
          <div>
            <div className="ai-panel-title">NexSearch AI</div>
            <div className="ai-panel-sub">Powered by Groq · Grounded in your product database</div>
          </div>
        </div>
        <div className="ai-panel-badge">Live</div>
      </div>

      <div className="ai-messages">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className={`msg-avatar ${m.role}`}>
              {m.role === "user" ? "U" : "AI"}
            </div>
            <div>
              <div className={`msg-bubble ${m.role}`}>{m.content}</div>
              {m.products && m.products.length > 0 && (
                <div className="ai-result-cards">
                  {m.products.slice(0, 3).map(p => (
                    <div key={p.id} className="ai-result-mini">
                      {p.payload.brand && (
                        <div style={{ fontSize: "0.6rem", color: "var(--coral)", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 3 }}>
                          {p.payload.brand}
                        </div>
                      )}
                      <div className="mini-title">{p.payload.title}</div>
                      {p.payload.price && (
                        <div className="mini-price">${p.payload.price}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="msg ai">
            <div className="msg-avatar ai">AI</div>
            <div className="msg-bubble ai">
              <div className="msg-typing">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="ai-input-row">
        <input
          className="ai-input"
          type="text"
          placeholder="Ask me to find something..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading}
        />
        <button
          className="ai-send-btn"
          onClick={send}
          disabled={loading || !input.trim()}
          type="button"
        >
          {loading ? "..." : "Ask →"}
        </button>
      </div>
    </div>
  );
}