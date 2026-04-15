/**
 * Provider-agnostic AI chat interface.
 *
 * To wire a provider, implement the body of `chatCompletion`:
 *
 * Ollama (local):
 *   const res = await fetch("http://localhost:11434/api/chat", { ... })
 *
 * OpenAI / OpenAI-compatible (cloud):
 *   const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
 *   const res = await openai.chat.completions.create({ ... })
 *
 * Anthropic Claude:
 *   const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 *   const res = await anthropic.messages.create({ ... })
 */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function chatCompletion(
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  // Ollama (local) — http://localhost:11434
  const res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "aya-expanse:8b",
      stream: false,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? "No response.";
}
