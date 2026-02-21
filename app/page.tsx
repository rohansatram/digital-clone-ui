"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Send, Upload, Sparkles, User, FileText } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsStreaming(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) throw new Error("Chat request failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let assistantContent = "";
      let sources: string[] = [];

      // Add empty assistant message
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", sources: [] },
      ]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6);

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === "sources") {
              sources = event.sources;
            } else if (event.type === "token") {
              assistantContent += event.content;
            }

            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: assistantContent,
                sources,
              };
              return updated;
            });
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't connect to the server. Make sure the backend and LM Studio are running.",
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "var(--accent-glow)" }}>
              <Sparkles size={18} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h1 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Digital Clone
              </h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Chat with your docs
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
          <Link
            href="/upload"
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full"
            style={{
              background: "var(--accent)",
              color: "white",
            }}
          >
            <Upload size={16} />
            Upload Files
          </Link>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col" style={{ background: "var(--bg-primary)" }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--accent-glow)" }}>
                <Sparkles size={32} style={{ color: "var(--accent)" }} />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                  What would you like to know?
                </h2>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Ask questions about your uploaded documents.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-8 px-4">
              {messages.map((msg, i) => (
                <div key={i} className="mb-6">
                  <div className="flex gap-3">
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        background:
                          msg.role === "user"
                            ? "var(--bg-tertiary)"
                            : "var(--accent-glow)",
                      }}
                    >
                      {msg.role === "user" ? (
                        <User size={16} style={{ color: "var(--text-secondary)" }} />
                      ) : (
                        <Sparkles size={16} style={{ color: "var(--accent)" }} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                        {msg.role === "user" ? "You" : "Digital Clone"}
                      </p>
                      <div
                        className="prose prose-invert prose-sm max-w-none"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <ReactMarkdown
                          components={{
                            code({ className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || "");
                              const codeStr = String(children).replace(/\n$/, "");

                              if (match) {
                                return (
                                  <SyntaxHighlighter
                                    style={oneDark}
                                    language={match[1]}
                                    PreTag="div"
                                    customStyle={{
                                      borderRadius: "8px",
                                      fontSize: "13px",
                                      margin: "12px 0",
                                    }}
                                  >
                                    {codeStr}
                                  </SyntaxHighlighter>
                                );
                              }
                              return (
                                <code
                                  className="px-1.5 py-0.5 rounded text-sm"
                                  style={{
                                    background: "var(--bg-tertiary)",
                                    color: "var(--accent)",
                                  }}
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                        {isStreaming && i === messages.length - 1 && msg.role === "assistant" && (
                          <span
                            className="inline-block w-2 h-4 ml-0.5 animate-pulse rounded-sm"
                            style={{ background: "var(--accent)" }}
                          />
                        )}
                      </div>

                      {/* Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {msg.sources.map((src, j) => (
                            <span
                              key={j}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                              style={{
                                background: "var(--bg-tertiary)",
                                color: "var(--text-secondary)",
                                border: "1px solid var(--border)",
                              }}
                            >
                              <FileText size={10} />
                              {src}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="max-w-3xl mx-auto">
            <div
              className="flex items-end gap-2 rounded-xl px-4 py-3"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your documents..."
                rows={1}
                className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed"
                style={{
                  color: "var(--text-primary)",
                  maxHeight: "120px",
                }}
                disabled={isStreaming}
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isStreaming}
                className="p-2 rounded-lg transition-all duration-200 shrink-0"
                style={{
                  background: input.trim() && !isStreaming ? "var(--accent)" : "var(--bg-tertiary)",
                  color: input.trim() && !isStreaming ? "white" : "var(--text-muted)",
                  cursor: input.trim() && !isStreaming ? "pointer" : "not-allowed",
                }}
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-center text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              Responses are generated from your uploaded documents via LM Studio.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
