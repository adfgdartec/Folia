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

interface ChatSummary {
  id: string;
  title: string;
  last_message?: string;
  updated_at?: string;
}

export default function AdvisorPage() {
  const metadata = useFoliaStore((s) => s.metadata);
  const { send, streaming, content, citations, reset } = useAdvisorStream();

  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatTitle, setChatTitle] = useState("");
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [allCitations, setAllCitations] = useState<unknown[]>([]);
  const [pendingUserText, setPendingUserText] = useState<string | null>(null);
  const [assistantSavedForTurn, setAssistantSavedForTurn] = useState(false);

  const [pastChats, setPastChats] = useState<ChatSummary[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* ── Fetch past chats on mount ── */
  const fetchChats = useCallback(async () => {
    try {
      const res = await fetch("/api/advisor/chats", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPastChats(data);
      }
    } catch { /* ignore */ }
    finally { setLoadingChats(false); }
  }, []);

  useEffect(() => { fetchChats(); }, [fetchChats]);

  /* ── Load a past chat ── */
  const loadChat = useCallback(async (chat: ChatSummary) => {
    if (streaming) return;
    setLoadingMessages(true);
    reset();
    setAllCitations([]);
    setPendingUserText(null);
    setAssistantSavedForTurn(false);

    try {
      const res = await fetch(`/api/advisor/chats/${chat.id}/messages`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load messages");
      const messages: { role: "user" | "assistant"; content: string }[] = await res.json();
      setHistory(messages.map((m) => ({ role: m.role, content: m.content })));
      setChatId(chat.id);
      setChatTitle(chat.title);
      setSessionId(chat.id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  }, [streaming, reset]);

  /* ── Start new chat ── */
  const startNewChat = useCallback(() => {
    if (streaming) return;
    setHistory([]);
    reset();
    setAllCitations([]);
    setChatId(null);
    setChatTitle("");
    setSessionId(crypto.randomUUID());
    setPendingUserText(null);
    setAssistantSavedForTurn(false);
  }, [streaming, reset]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, content]);

  const makeChatTitle = (text: string) => {
    const cleaned = text.trim().replace(/\s+/g, " ");
    return cleaned.length > 50 ? cleaned.slice(0, 50) + "..." : cleaned || "New chat";
  };

  const createChatIfNeeded = useCallback(
    async (firstMessage: string) => {
      if (chatId) return { id: chatId, title: chatTitle || makeChatTitle(firstMessage) };

      const title = chatTitle || makeChatTitle(firstMessage);

      const res = await fetch("/api/advisor/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, session_id: sessionId }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to create chat");
      }

      const created = await res.json();
      setChatId(created.id);
      setChatTitle(created.title);

      // refresh sidebar
      fetchChats();

      return created;
    },
    [chatId, chatTitle, sessionId, fetchChats]
  );

  const saveMessage = useCallback(async (cid: string, role: "user" | "assistant", text: string) => {
    const res = await fetch(`/api/advisor/chats/${cid}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ role, content: text }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || `Failed to save ${role} message`);
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!metadata || !text.trim() || streaming) return;

      const trimmed = text.trim();
      const userMsg: ChatMessage = { role: "user", content: trimmed };

      setHistory((h) => [...h, userMsg]);
      setInput("");
      reset();
      setAllCitations([]);
      setPendingUserText(trimmed);
      setAssistantSavedForTurn(false);

      try {
        const chat = await createChatIfNeeded(trimmed);
        await saveMessage(chat.id, "user", trimmed);

        await send(trimmed, metadata, [...history, userMsg].slice(-12) as { role: "user" | "assistant"; content: string }[], sessionId);
      } catch (err) {
        console.error(err);
      }
    },
    [metadata, streaming, reset, createChatIfNeeded, saveMessage, send, history, sessionId]
  );

  useEffect(() => {
    async function persistAssistantMessage() {
      if (!streaming && content && pendingUserText && !assistantSavedForTurn) {
        const assistantMsg: ChatMessage = { role: "assistant", content };

        setHistory((h) => {
          const last = h[h.length - 1];
          if (last?.role === "assistant" && last.content === content) return h;
          return [...h, assistantMsg];
        });

        setAllCitations(citations as unknown[]);
        setAssistantSavedForTurn(true);
        setPendingUserText(null);

        try {
          const chat = await createChatIfNeeded(pendingUserText);
          await saveMessage(chat.id, "assistant", content);
          fetchChats();
        } catch (err) {
          console.error(err);
        } finally {
          reset();
        }
      }
    }

    persistAssistantMessage();
  }, [
    streaming,
    content,
    citations,
    pendingUserText,
    assistantSavedForTurn,
    createChatIfNeeded,
    saveMessage,
    reset,
    fetchChats,
  ]);

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
    <div style={{ display: "flex", height: "calc(100vh - 4rem)", gap: 0 }}>
      {/* ── Chat history sidebar ── */}
      <div
        style={{
          width: 260,
          minWidth: 260,
          borderRight: "1px solid var(--b1)",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "1rem 0.875rem 0.75rem",
            borderBottom: "1px solid var(--b1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--t2)" }}>
            Chat History
          </span>
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: "0.7rem", padding: "0.25rem 0.5rem" }}
            onClick={startNewChat}
          >
            + New
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0.375rem" }}>
          {loadingChats && (
            <div style={{ padding: "1rem", fontSize: "0.75rem", color: "var(--t4)", textAlign: "center" }}>
              Loading...
            </div>
          )}
          {!loadingChats && pastChats.length === 0 && (
            <div style={{ padding: "1rem", fontSize: "0.75rem", color: "var(--t4)", textAlign: "center" }}>
              No past chats yet
            </div>
          )}
          {pastChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => loadChat(chat)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: chat.id === chatId ? "var(--bg-3)" : "transparent",
                border: chat.id === chatId ? "1px solid var(--b1)" : "1px solid transparent",
                borderRadius: "var(--r)",
                padding: "0.625rem 0.75rem",
                cursor: "pointer",
                transition: "all 0.1s",
                marginBottom: 2,
              }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: chat.id === chatId ? 600 : 500,
                  color: "var(--t1)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {chat.title || "Untitled"}
              </div>
              {chat.last_message && (
                <div
                  style={{
                    fontSize: "0.68rem",
                    color: "var(--t4)",
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {chat.last_message}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main chat area ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          maxWidth: 760,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {loadingMessages && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg)",
              opacity: 0.7,
              zIndex: 10,
            }}
          >
            <span style={{ fontSize: "0.85rem", color: "var(--t3)" }}>Loading messages...</span>
          </div>
        )}

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
              <h1 className="page-title">{chatTitle || "AI Financial Advisor"}</h1>
              <p className="page-sub">
                Grounded in IRS, CFPB & SEC documents · Personalized to your profile
              </p>
            </div>

            {history.length > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={startNewChat}
              >
                Clear
              </button>
            )}
          </div>

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
            <span style={{ fontSize: "0.7rem", marginTop: 1 }}>&#x26A0;</span>
            Educational information only — not personalized financial advice.
            Consult a licensed advisor for major decisions.
          </div>
        </div>

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

          {history.map((msg, i) => (
            <Bubble key={i} msg={msg} />
          ))}

          {streaming && content && <Bubble msg={{ role: "assistant", content }} streaming />}
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

          {!streaming && allCitations.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
              {(allCitations as { source: string }[]).map((c, i) => (
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
                  {c.source}
                </span>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div
          style={{
            flexShrink: 0,
            paddingTop: "1rem",
            borderTop: "1px solid var(--b1)",
          }}
        >
          <div style={{ display: "flex", gap: "0.625rem", alignItems: "flex-end" }}>
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
              {streaming ? "..." : "Send"}
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
  const parts = content.split(/(\*\*[^*]+\*\*|\[[^\]]+\]|\n)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part === "\n") return <br key={i} />;
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} style={{ fontWeight: 600 }}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("[") && part.endsWith("]") && !isUser) {
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
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
