import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

interface ProductRow {
  name: string;
  name_ar: string | null;
  price: number;
  allergens: string[];
  ingredients: string;
  ingredients_ar: string | null;
  description: string;
  description_ar: string | null;
  unavailable_today: boolean;
}

async function getProducts(): Promise<ProductRow[]> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      "name, name_ar, price, allergens, ingredients, ingredients_ar, description, description_ar, unavailable_today"
    );

  if (error) throw error;
  return (data ?? []).filter((p: ProductRow) => !p.unavailable_today);
}

function buildSystemPrompt(products: ProductRow[]): string {
  return `You are SweetBot, the friendly AI assistant for SweetDrop, a premium sweets and candy shop.

Your responsibilities:
1. Help customers find products and answer questions about ingredients and allergens.
2. When a customer asks about allergies, ALWAYS check the product data below and give specific, accurate answers.
3. If a product contains an allergen the customer asked about, warn them clearly.
4. Be warm, helpful, and concise. Use emojis sparingly.

PRODUCT DATA:
${products
  .map(
    (p) =>
      `- ${p.name} ($${p.price}) | Allergens: ${p.allergens.length ? p.allergens.join(", ") : "none"} | Ingredients: ${p.ingredients}`
  )
  .join("\n")}

RULES:
- Never invent products that are not in the list above.
- If someone asks about a product you don't have data for, say so honestly.
- If asked about delivery, tell them we offer same-day delivery in the metro area.
- Keep answers under 3 sentences unless the customer asks for details.`;
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const products = await getProducts();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === "your_openai_api_key") {
      return fallbackReply(messages, products);
    }

    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: buildSystemPrompt(products) },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    return NextResponse.json({
      reply:
        completion.choices[0]?.message?.content ??
        "I'm not sure how to answer that.",
    });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json(
      {
        reply: "Sorry, I'm having trouble right now. Please try again later.",
      },
      { status: 500 }
    );
  }
}

function fallbackReply(
  messages: { role: string; content: string }[],
  products: ProductRow[]
) {
  const last = messages[messages.length - 1]?.content?.toLowerCase() ?? "";

  if (last.includes("allerg")) {
    const warnings = products
      .filter((p) => p.allergens.length > 0)
      .map((p) => `${p.name}: contains ${p.allergens.join(", ")}`)
      .join("\n");
    return NextResponse.json({
      reply: `Here are products with allergens:\n${warnings}\n\nLet me know if you need details on a specific item!`,
    });
  }

  if (
    last.includes("dairy") ||
    last.includes("soy") ||
    last.includes("gluten") ||
    last.includes("nut") ||
    last.includes("egg")
  ) {
    const allergen =
      ["dairy", "soy", "gluten", "nuts", "eggs"].find((a) =>
        last.includes(a.replace("s", ""))
      ) ?? "";
    const safe = products.filter(
      (p) => !p.allergens.some((a) => a.includes(allergen.replace("s", "")))
    );
    const unsafe = products.filter((p) =>
      p.allergens.some((a) => a.includes(allergen.replace("s", "")))
    );

    let reply = "";
    if (unsafe.length)
      reply += `⚠️ Contains ${allergen}: ${unsafe.map((p) => p.name).join(", ")}\n`;
    if (safe.length)
      reply += `✅ ${allergen}-free options: ${safe.map((p) => p.name).join(", ")}`;
    return NextResponse.json({
      reply:
        reply ||
        "I could not find specific allergen info. Please ask about a specific allergen.",
    });
  }

  if (last.includes("deliver")) {
    return NextResponse.json({
      reply: "We offer same-day delivery in the metro area! Delivery is tracked in real-time.",
    });
  }

  const matchedProduct = products.find((p) =>
    last.includes(p.name.toLowerCase().split(" ")[0])
  );
  if (matchedProduct) {
    return NextResponse.json({
      reply: `${matchedProduct.name} ($${matchedProduct.price}) — ${matchedProduct.description}\nIngredients: ${matchedProduct.ingredients}\nAllergens: ${matchedProduct.allergens.length ? matchedProduct.allergens.join(", ") : "none"}`,
    });
  }

  return NextResponse.json({
    reply: "I can help you with our products, ingredients, and allergy info! Just ask about a specific product or allergen.",
  });
}
