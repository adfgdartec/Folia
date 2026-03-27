"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useFoliaStore } from "@/store";
import { useAdvisorStream } from "@/hooks";
import type { ChatMessage } from "@/types";

const STARTERS = [
  { q: "Should I pay off debt or invest first?", tag: "Strategy" },
  { q: "How much emergency fund do I actually need?", tag: "Safety" },
  { q: "Explain Roth IRA vs Traditional IRA for my age", tag: "Retirement" },
  { q: "How do tax brackets actually work?", tag: "Tax" },
  { q: "What's the right savings rate for my income?", tag: "Budgeting" },
  { q: "How do I build credit from scratch?", tag: "Credit" },
];

export default function AdvisorPage() {
  const metadata = useFoliaStore((s) => s.metadata);
  const { send, streaming, content, citations, reset } = useAdvisorStream();
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionId] = useState<string>(() =>
    Math.random().toString(36).slice(2),
  );
  const [allCitations, setAllCitations] = useState<unknown[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [streamDone, setStreamDone] = useState(true);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, content]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!metadata || !text.trim() || streaming) return;
      const userMsg: ChatMessage = { role: "user", content: text.trim() };
      setHistory((h) => [...h, userMsg]);
      setInput("");
      reset();
      setStreamDone(false);
      setAllCitations([]);

      await send(text.trim(), metadata, history.slice(-12), sessionId);
      setStreamDone(true);
    },
    [metadata, streaming, history, sessionId, send, reset],
  );

  // Append assistant message after stream ends
  useEffect(() => {
    if (
      streamDone &&
      content &&
      history.length > 0 &&
      history[history.length - 1].role === "user"
    ) {
      setHistory((h) => [...h, { role: "assistant", content }]);
      setAllCitations(citations as unknown[]);
      reset();
    }
  }, [streamDone]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const isEmpty = history.length === 0 && !streaming;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 4rem)",
        maxWidth: 760,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          paddingBottom: "1.25rem",
          flexShrink: 0,
          borderBottom: "1px solid var(--b1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h1 className="page-title">AI Financial Advisor</h1>
            <p className="page-sub">
              Grounded in IRS, CFPB & SEC documents · Personalized to your
              profile
            </p>
          </div>
          {history.length > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setHistory([]);
                reset();
                setAllCitations([]);
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Disclaimer */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "flex-start",
            marginTop: "0.875rem",
            padding: "0.625rem 0.875rem",
            background: "var(--amber-bg)",
            border: "1px solid var(--amber-border)",
            borderRadius: "var(--r)",
            fontSize: "0.775rem",
            color: "var(--amber)",
            lineHeight: 1.5,
          }}
        >
          <span style={{ fontSize: "0.7rem", marginTop: 1 }}>⚠</span>
          Educational information only — not personalized financial advice.
          Consult a licensed advisor for major decisions.
        </div>
      </div>

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1.25rem 0",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {/* Empty state */}
        {isEmpty && (
          <div
            className="fade-up"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              paddingTop: "1rem",
            }}
          >
            {metadata && (
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "0.825rem",
                    color: "var(--t3)",
                    marginBottom: "0.375rem",
                  }}
                >
                  Financial metadata loaded
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "0.375rem",
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    `Age ${metadata.age}`,
                    `${metadata.life_stage} stage`,
                    `${metadata.income_type.replace("_", "-")} income`,
                    metadata.literacy_level,
                  ].map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem",
              }}
            >
              {STARTERS.map(({ q, tag }) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  disabled={!metadata}
                  style={{
                    background: "var(--bg-3)",
                    border: "1px solid var(--b1)",
                    borderRadius: "var(--r)",
                    padding: "0.875rem",
                    textAlign: "left",
                    cursor: metadata ? "pointer" : "not-allowed",
                    transition: "all 0.12s",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.375rem",
                  }}
                  onMouseEnter={(e) => {
                    if (metadata) {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "var(--b2)";
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--bg-4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "var(--b1)";
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--bg-3)";
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--green)",
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {tag}
                  </span>
                  <span
                    style={{
                      fontSize: "0.825rem",
                      color: "var(--t1)",
                      lineHeight: 1.5,
                    }}
                  >
                    {q}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {history.map((msg, i) => (
          <Bubble key={i} msg={msg} />
        ))}

        {/* Streaming */}
        {streaming && content && (
          <Bubble msg={{ role: "assistant", content }} streaming />
        )}
        {streaming && !content && (
          <div
            style={{
              display: "flex",
              gap: "0.375rem",
              alignItems: "center",
              padding: "0.25rem 0",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--green)",
                  animation: "pulse 1.2s ease-in-out infinite",
                  animationDelay: `${i * 0.18}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Citations */}
        {!streaming && allCitations.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
            {(allCitations as any[]).map((c: any, i: number) => (
              <span
                key={i}
                style={{
                  background: "var(--bg-3)",
                  border: "1px solid var(--b1)",
                  borderRadius: "100px",
                  padding: "0.2rem 0.625rem",
                  fontSize: "0.68rem",
                  color: "var(--t3)",
                  fontWeight: 500,
                }}
              >
                📎 {c.source}
              </span>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          flexShrink: 0,
          paddingTop: "1rem",
          borderTop: "1px solid var(--b1)",
        }}
      >
        <div
          style={{ display: "flex", gap: "0.625rem", alignItems: "flex-end" }}
        >
          <div style={{ flex: 1, position: "relative" }}>
            <textarea
              ref={inputRef}
              className="input"
              style={{
                resize: "none",
                height: 44,
                maxHeight: 120,
                lineHeight: 1.5,
                padding: "0.625rem 0.75rem",
                overflow: "hidden",
              }}
              placeholder={
                metadata
                  ? "Ask anything about your finances..."
                  : "Complete onboarding first"
              }
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autoResize(e.target);
              }}
              onKeyDown={handleKey}
              disabled={!metadata || streaming}
              rows={1}
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ height: 44, minWidth: 72, flexShrink: 0 }}
            onClick={() => sendMessage(input)}
            disabled={!metadata || streaming || !input.trim()}
          >
            {streaming ? (
              <div
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid rgba(4,26,12,0.3)",
                  borderTop: "2px solid #041a0c",
                  borderRadius: "50%",
                  animation: "spin 0.6s linear infinite",
                }}
              />
            ) : (
              "Send"
            )}
          </button>
        </div>
        <div
          style={{
            fontSize: "0.68rem",
            color: "var(--t4)",
            marginTop: "0.375rem",
          }}
        >
          Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}

function Bubble({ msg, streaming }: { msg: ChatMessage; streaming?: boolean }) {
  const isUser = msg.role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        animation: "fadeUp 0.16s ease",
      }}
    >
      <div
        style={{
          maxWidth: "80%",
          padding: "0.75rem 1rem",
          background: isUser ? "var(--green)" : "var(--bg-3)",
          color: isUser ? "#041a0c" : "var(--t1)",
          borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
          fontSize: "0.875rem",
          lineHeight: 1.7,
          border: isUser ? "none" : "1px solid var(--b1)",
          fontWeight: isUser ? 500 : 400,
        }}
      >
        <FormattedText content={msg.content} isUser={isUser} />
        {streaming && (
          <span
            style={{
              display: "inline-block",
              width: 7,
              height: 15,
              background: "var(--green)",
              marginLeft: 2,
              borderRadius: 1,
              verticalAlign: "text-bottom",
              animation: "pulse 0.7s infinite",
            }}
          />
        )}
      </div>
    </div>
  );
}

function FormattedText({
  content,
  isUser,
}: {
  content: string;
  isUser: boolean;
}) {
  // Render bold (**text**), citations ([Source]), and line breaks
  const parts = content.split(/(\*\*[^*]+\*\*|\[[^\]]+\]|\n)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part === "\n") return <br key={i} />;
        if (part.startsWith("**") && part.endsWith("**"))
          return (
            <strong key={i} style={{ fontWeight: 600 }}>
              {part.slice(2, -2)}
            </strong>
          );
        if (part.startsWith("[") && part.endsWith("]") && !isUser)
          return (
            <span
              key={i}
              style={{
                fontSize: "0.75rem",
                color: "var(--green)",
                fontWeight: 500,
                opacity: 0.8,
              }}
            >
              {part}
            </span>
          );
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
