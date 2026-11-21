import { NextResponse } from "next/server";
import { getCurrentWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateText } from "@/lib/ai/provider";
import { assertAiQuota } from "@/lib/ai/quota";

const STOP_WORDS = new Set([
  "ada", "apa", "apakah", "berapa", "bagaimana", "barang", "barangnya", "bisa", "dengan",
  "di", "dimana", "mana", "dan", "dari", "itu", "ini", "jumlah", "ke", "kita", "lokasi",
  "mau", "nya", "saya", "sedang", "sekitar", "stok", "stoknya", "tersedia", "tidak",
  "untuk", "yang", "gudang", "rak", "toko", "masih", "cari", "carikan", "tampilkan",
]);

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  minStock: number;
  aliases: string;
  category: { name: string } | null;
  stockLevels: { quantity: number; location: { name: string; code: string } }[];
};

function tokenize(question: string) {
  return Array.from(
    new Set(
      question
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 1 && !STOP_WORDS.has(token)),
    ),
  );
}

function scoreProduct(product: ProductRow, question: string, tokens: string[]) {
  const name = product.name.toLowerCase();
  const sku = (product.sku ?? "").toLowerCase();
  const category = (product.category?.name ?? "").toLowerCase();
  const aliasText = product.aliases.toLowerCase();
  const locationText = product.stockLevels
    .map((level) => `${level.location.name} ${level.location.code}`)
    .join(" ")
    .toLowerCase();

  let score = 0;
  if (question.length > 2 && name.includes(question)) score += 12;
  for (const token of tokens) {
    if (name.includes(token)) score += 5;
    if (sku.includes(token)) score += 5;
    if (category.includes(token)) score += 3;
    if (aliasText.includes(token)) score += 3;
    if (locationText.includes(token)) score += 1;
  }
  return score;
}

function fallbackAnswer(cards: { name: string; stock: number; unit: string; locations: { name: string; quantity: number }[] }[]) {
  if (!cards.length) {
    return "Barang belum ditemukan. Coba sebutkan nama barang, SKU, kategori, atau lokasi dengan lebih spesifik.";
  }
  const lines = cards.slice(0, 4).map((card) => {
    const locations = card.locations
      .filter((location) => location.quantity > 0)
      .map((location) => `${location.name} (${location.quantity} ${card.unit})`)
      .join(", ");
    return `${card.name}: ${card.stock} ${card.unit}${locations ? ` — ${locations}` : ""}`;
  });
  return `Saya menemukan ${cards.length} barang yang cocok. ${lines.join(". ")}.`;
}

export async function POST(request: Request) {
  const context = await getCurrentWorkspace();
  if (!context) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { question?: string } | null;
  const question = body?.question?.trim();
  if (!question) return NextResponse.json({ error: "Pertanyaan wajib diisi." }, { status: 400 });
  if (question.length > 300) return NextResponse.json({ error: "Pertanyaan terlalu panjang (maksimal 300 karakter)." }, { status: 400 });

  try {
    await assertAiQuota("TANYA_STOK", context.workspaceId);
  } catch {
    return NextResponse.json({ error: "Kuota Tanya Stok hari ini sudah habis. Gunakan pencarian biasa.", fallback: true }, { status: 429 });
  }

  const products = await db.product.findMany({
    where: { workspaceId: context.workspaceId, archivedAt: null },
    include: { stockLevels: { include: { location: true } }, category: true },
    take: 200,
  });

  const tokens = tokenize(question);
  const normalizedQuestion = question.toLowerCase().trim();
  const scored = products
    .map((product) => ({ product, score: scoreProduct(product, normalizedQuestion, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .slice(0, 6);

  const cards = scored.map(({ product }) => {
    const stock = product.stockLevels.reduce((sum, level) => sum + level.quantity, 0);
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      category: product.category?.name ?? "Umum",
      stock,
      minStock: product.minStock,
      status: stock === 0 ? "Habis" : stock <= product.minStock ? "Menipis" : "Aman",
      locations: product.stockLevels
        .filter((level) => level.quantity > 0)
        .map((level) => ({ name: level.location.name, code: level.location.code, quantity: level.quantity })),
    };
  });

  let answer = fallbackAnswer(cards);
  let usedAi = false;

  try {
    const ai = await generateText(
      `Jawab singkat dalam Bahasa Indonesia (maksimal 3 kalimat). Gunakan hanya data kartu berikut dan jangan mengarang. Jika kartu kosong, katakan barang tidak ditemukan dan sarankan kata kunci lain. Data: ${JSON.stringify(cards)}. Pertanyaan pengguna: ${question}`,
    );
    if (ai.text.trim()) {
      answer = ai.text.trim();
      usedAi = true;
    }
    await db.aiUsageLog.create({
      data: {
        workspaceId: context.workspaceId,
        feature: "TANYA_STOK",
        status: usedAi ? "BERHASIL" : "FALLBACK",
        inputTokens: ai.inputTokens,
        outputTokens: ai.outputTokens,
        errorCode: usedAi ? undefined : "AI_EMPTY_RESPONSE",
      },
    });
  } catch {
    await db.aiUsageLog.create({
      data: { workspaceId: context.workspaceId, feature: "TANYA_STOK", status: "FALLBACK", errorCode: "AI_UNAVAILABLE" },
    });
  }

  return NextResponse.json({ answer, cards, fallback: !usedAi, aiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL) });
}
