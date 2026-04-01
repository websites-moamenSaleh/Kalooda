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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 end-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-[#D3A94C]/35 bg-gradient-to-b from-[#E6BE68] to-[#D3A94C] text-[#082018] shadow-[0_8px_28px_rgba(10, 41, 35,0.35)] transition-all hover:brightness-105 hover:shadow-[0_12px_36px_rgba(211, 169, 76,0.4)] active:scale-95"
        aria-label={t("toggleChat")}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 end-5 z-50 flex h-[min(28rem,calc(100vh-8rem))] w-[min(22rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-xl border border-[#D3A94C]/25 bg-gradient-to-b from-[#0A2923] to-[#082018] shadow-2xl animate-slide-up">
          <div className="flex items-center gap-3 border-b border-[#D3A94C]/15 bg-[#082018]/90 px-4 py-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D3A94C]/15">
              <Bot className="h-5 w-5 text-[#FFEC94]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-display block text-sm font-semibold text-[#F0F5F3]">
                {t("sweetBot")}
              </span>
              <span className="block truncate text-xs text-[#A8B5AD]/65">
                {t("chatbotSubtitle")}
              </span>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    msg.role === "user"
                      ? "bg-[#D3A94C] text-[#082018]"
                      : "border border-[#D3A94C]/25 bg-[#0A2923] text-[#FFEC94]"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="h-3.5 w-3.5" />
                  ) : (
                    <Bot className="h-3.5 w-3.5" />
                  )}
                </div>
                <div
                  className={`max-w-[82%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-[#E6BE68] to-[#D3A94C] text-[#082018]"
                      : "border border-[#D3A94C]/12 bg-[#082018]/80 text-[#E5EDE8]"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D3A94C]/25 bg-[#0A2923] text-[#FFEC94]">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="rounded-xl border border-[#D3A94C]/12 bg-[#082018]/80 px-4 py-2.5 text-sm text-[#A8B5AD]/55">
                  {t("typing")}
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="flex items-center gap-2 border-t border-[#D3A94C]/15 bg-[#082018]/95 px-3 py-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("chatbotPlaceholder")}
              className="input-premium-dark flex-1 border-[#D3A94C]/15 py-2.5"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-[#E6BE68] to-[#D3A94C] text-[#082018] transition-opacity disabled:opacity-35 hover:brightness-105"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
