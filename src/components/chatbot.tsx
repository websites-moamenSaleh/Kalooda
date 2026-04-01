"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function Chatbot() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetingInitialized = useRef(false);

  useEffect(() => {
    if (!greetingInitialized.current) {
      greetingInitialized.current = true;
      setMessages([{ role: "assistant", content: t("chatbotGreeting") }]);
    }
  }, [t]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? t("chatbotError") },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("chatbotOffline") },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 end-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-[#0A2923] shadow-lg hover:bg-primary-dark transition-all hover:scale-105 active:scale-95"
        aria-label={t("toggleChat")}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-22 end-5 z-50 flex h-[28rem] w-[22rem] flex-col overflow-hidden rounded-2xl border border-[#D3A94C]/20 bg-[#0F322B] shadow-2xl shadow-black/50 animate-slide-up">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-[#D3A94C]/20 bg-[#1F443C] px-4 py-3">
            <Bot className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold text-[#F5E6C8]">{t("sweetBot")}</span>
            <span className="ms-auto text-xs text-[#F5E6C8]/50">
              {t("chatbotSubtitle")}
            </span>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    msg.role === "user"
                      ? "bg-[#D3A94C] text-[#0A2923]"
                      : "bg-[#1F443C] text-primary"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="h-3.5 w-3.5" />
                  ) : (
                    <Bot className="h-3.5 w-3.5" />
                  )}
                </div>
                <div
                  className={`max-w-[75%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#D3A94C] text-[#0A2923]"
                      : "bg-[#1F443C] text-[#F5E6C8]"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1F443C] text-primary">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="rounded-xl bg-[#1F443C] px-4 py-2 text-sm text-[#F5E6C8]/50">
                  {t("typing")}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-[#D3A94C]/20 px-3 py-2.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("chatbotPlaceholder")}
              className="flex-1 rounded-lg border border-[#D3A94C]/20 bg-[#1F443C] px-3 py-2 text-sm text-[#F5E6C8] outline-none placeholder:text-[#F5E6C8]/30 focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-[#0A2923] disabled:opacity-40 hover:bg-primary-dark transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
