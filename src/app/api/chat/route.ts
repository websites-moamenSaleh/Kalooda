import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { chatCompletion, type ChatMessage } from "@/lib/ai";

interface ProductRow {
  name: string;
  name_ar: string | null;
  price: number;
  allergens: string[];
  allergens_ar: string[] | null;
  unavailable_today: boolean;
}

async function getProducts(): Promise<ProductRow[]> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("name, name_ar, price, allergens, allergens_ar, unavailable_today");
  if (error) throw error;
  return data ?? [];
}

function buildSystemPrompt(products: ProductRow[], lang: "ar" | "en"): string {
  const available = products.filter((p) => !p.unavailable_today);
  const unavailable = products.filter((p) => p.unavailable_today);

  const formatProduct = (p: ProductRow) => {
    const name = lang === "ar" && p.name_ar ? p.name_ar : p.name;
    const allergens =
      p.allergens.length > 0
        ? (lang === "ar" && p.allergens_ar?.length
            ? p.allergens_ar
            : p.allergens
          ).join(", ")
        : lang === "ar"
          ? "لا يوجد"
          : "none";
    return `• **${name}** — ₪${p.price} | ${allergens}`;
  };

  const langDirective =
    lang === "ar"
      ? "LANGUAGE: Arabic only (العربية فقط). Every word of your response must be in Arabic. Do not use English, Spanish, or any other language."
      : "LANGUAGE: English only. Every word of your response must be in English. Do not use Arabic, Spanish, or any other language.";

  return `${langDirective}

You are the customer assistant for Kalooda, a premium sweets shop. Your only purpose is to help customers with Kalooda products — what's available, prices, ingredients, and allergens. Nothing else.

STRICT SCOPE:
- You ONLY answer questions about Kalooda products, availability, allergens, and ingredients
- If the customer asks about ANYTHING else — weather, news, general knowledge, other businesses, coding, or any off-topic subject — respond with a single short sentence declining and redirect to products. Do not engage with the topic at all, even briefly.
- Do not answer hypothetical or general food questions not tied to a specific Kalooda product

DATA INTEGRITY — CRITICAL:
- The ONLY products that exist are those listed below. Do not mention, suggest, or invent any product not in the list.
- The ONLY allergens that exist are those listed below for each product. Do not use your own knowledge about food ingredients or allergens. If a product has no allergens listed, say it has none.
- If the available list is empty, tell the customer nothing is available today and do not suggest any products.

RESPONSE RULES:
- Be concise — 1 to 3 sentences for simple questions
- Use **bold** for product names
- Use bullet points when listing multiple items
- When asked about availability: list available products briefly (max 6) — never dump the full catalog
- When asked about a specific allergen: only list products from the data below that contain it
- When asked about a specific product: answer about that product only using only the data below
- Never volunteer information that wasn't asked for

AVAILABLE TODAY (${available.length}):
${available.map(formatProduct).join("\n")}

${
  unavailable.length > 0
    ? `UNAVAILABLE TODAY (${unavailable.length}):
${unavailable.map((p) => `• ${lang === "ar" && p.name_ar ? p.name_ar : p.name}`).join("\n")}`
    : ""
}

FORMAT: allergens column shows what each product contains (or "none"/"لا يوجد").

REMINDER: Respond in ${lang === "ar" ? "Arabic (العربية) only" : "English only"}. No other language is acceptable.`;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, lang } = (await req.json()) as {
      messages: ChatMessage[];
      lang?: "ar" | "en";
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const products = await getProducts();
    const resolvedLang = lang === "ar" ? "ar" : "en";
    const available = products.filter((p) => !p.unavailable_today);

    if (available.length === 0) {
      const reply =
        resolvedLang === "ar"
          ? "عذرًا، لا تتوفر منتجات متاحة اليوم. يرجى التحقق مرة أخرى لاحقًا."
          : "Sorry, no products are available today. Please check back later.";
      return NextResponse.json({ reply });
    }

    const systemPrompt = buildSystemPrompt(products, resolvedLang);
    const reply = await chatCompletion(systemPrompt, messages);
    return NextResponse.json({ reply });
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes("not configured")
        ? "AI assistant is not available yet."
        : "Sorry, I'm having trouble right now. Please try again later.";

    console.error("Chat error:", err);
    return NextResponse.json({ reply: message });
  }
}
