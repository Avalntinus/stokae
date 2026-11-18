import { NextResponse } from "next/server";
import { getCurrentWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateText } from "@/lib/ai/provider";
import { assertAiQuota } from "@/lib/ai/quota";

export async function POST(request: Request) {
  const context = await getCurrentWorkspace();
  if (!context) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { question?: string } | null;
  const question = body?.question?.trim();
  if (!question) return NextResponse.json({ error: "Pertanyaan wajib diisi." }, { status: 400 });
  try {
    await assertAiQuota("TANYA_STOK", context.workspaceId);
  } catch {
    return NextResponse.json({ error: "Kuota AI hari ini sudah habis. Gunakan pencarian biasa.", fallback: true }, { status: 429 });
  }
  const products = await db.product.findMany({ where: { workspaceId: context.workspaceId, archivedAt: null }, include: { stockLevels: { include: { location: true } }, category: true }, take: 100 });
  const matches = products.filter((product) => `${product.name} ${product.sku ?? ""} ${product.category?.name ?? ""}`.toLowerCase().includes(question.toLowerCase()));
  const cards = matches.map((product) => ({ id: product.id, name: product.name, stock: product.stockLevels.reduce((sum, level) => sum + level.quantity, 0), locations: product.stockLevels.map((level) => ({ name: level.location.name, quantity: level.quantity })) }));
  let answer = matches.length ? `Saya menemukan ${matches.length} barang yang sesuai.` : "Barang belum ditemukan di data stok.";
  try {
    const ai = await generateText(`Jawab singkat dalam Bahasa Indonesia. Gunakan hanya data kartu berikut dan jangan mengarang: ${JSON.stringify(cards)}. Pertanyaan: ${question}`);
    if (ai.text) answer = ai.text;
    await db.aiUsageLog.create({ data: { workspaceId: context.workspaceId, feature: "TANYA_STOK", status: "BERHASIL", inputTokens: ai.inputTokens, outputTokens: ai.outputTokens } });
  } catch {
    await db.aiUsageLog.create({ data: { workspaceId: context.workspaceId, feature: "TANYA_STOK", status: "FALLBACK", errorCode: "AI_UNAVAILABLE" } });
  }
  return NextResponse.json({ answer, cards, fallback: !process.env.GEMINI_API_KEY });
}
