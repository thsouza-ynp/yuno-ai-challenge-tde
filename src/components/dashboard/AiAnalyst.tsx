"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage, DashboardContext } from "@/lib/types";

interface AiAnalystProps {
  context: DashboardContext;
}

const SUGGESTED_QUESTIONS = [
  "What fraud patterns do you see?",
  "Which regions need investigation?",
  "Recommend fraud prevention rules",
];

export function AiAnalyst({ context }: AiAnalystProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: content.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, context }),
      });

      if (!res.ok) {
        throw new Error(`Chat API error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        const captured = assistantContent;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: captured };
          return updated;
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${errorMsg}. Make sure GROQ_API_KEY is set.` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-sm font-medium"
        style={{
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          color: "white",
        }}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        AI Analyst
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-20 right-6 z-50 flex flex-col rounded-xl shadow-2xl overflow-hidden"
          style={{
            width: 400,
            height: 520,
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
            <div>
              <span className="text-sm font-semibold text-white">AI Fraud Analyst</span>
              <span className="text-xs text-[var(--text-secondary)] ml-2">Llama 3.3 70B</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-[var(--text-secondary)] hover:text-white">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-[var(--text-secondary)]">
                  Ask about fraud patterns, anomalies, or get recommendations based on your dashboard data.
                </p>
                <div className="space-y-2 mt-3">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="block w-full text-left px-3 py-2 rounded-lg text-xs transition-colors"
                      style={{
                        background: "rgba(99,102,241,0.1)",
                        color: "#a5b4fc",
                        border: "1px solid rgba(99,102,241,0.2)",
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed whitespace-pre-wrap"
                  style={{
                    background:
                      msg.role === "user"
                        ? "rgba(99,102,241,0.2)"
                        : "rgba(255,255,255,0.05)",
                    color: "var(--text-primary)",
                  }}
                >
                  {msg.content || (isLoading && i === messages.length - 1 ? "Thinking..." : "")}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[var(--border-color)] p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                placeholder="Ask about fraud patterns..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 rounded-lg text-xs outline-none disabled:opacity-50"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-30"
                style={{ background: "#6366f1", color: "white" }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
