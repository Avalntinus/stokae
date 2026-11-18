import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const movementSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(["KELUAR", "PINDAH"]),
  quantity: z.number().int().positive(),
  locationCode: z.string().min(1),
  destinationCode: z.string().min(1).optional(),
  reason: z.string().trim().min(1),
});

export async function POST(request: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  const parsed = movementSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Perubahan stok tidak valid." }, { status: 400 });
  const input = parsed.data;
  try {
    const result = await db.$transaction(async (tx) => {
    const from = await tx.location.findUnique({ where: { code: input.locationCode } });
    if (!from) throw new Error("Lokasi asal tidak ditemukan.");
    const source = await tx.stockLevel.findUnique({ where: { productId_locationId: { productId: input.productId, locationId: from.id } } });
    if (!source || source.quantity < input.quantity) throw new Error("Stok di lokasi asal tidak mencukupi.");
    await tx.stockLevel.update({ where: { id: source.id }, data: { quantity: { decrement: input.quantity } } });
    await tx.stockMovement.create({ data: { productId: input.productId, locationId: from.id, type: input.type === "KELUAR" ? "KELUAR" : "PINDAH_KELUAR", quantity: input.quantity, reason: input.reason } });
    if (input.type === "PINDAH") {
      if (!input.destinationCode) throw new Error("Lokasi tujuan wajib dipilih.");
      const destination = await tx.location.findUnique({ where: { code: input.destinationCode } });
      if (!destination) throw new Error("Lokasi tujuan tidak ditemukan.");
      await tx.stockLevel.upsert({ where: { productId_locationId: { productId: input.productId, locationId: destination.id } }, update: { quantity: { increment: input.quantity } }, create: { productId: input.productId, locationId: destination.id, quantity: input.quantity } });
      await tx.stockMovement.create({ data: { productId: input.productId, locationId: destination.id, fromLocationId: from.id, type: "PINDAH_MASUK", quantity: input.quantity, reason: input.reason } });
    }
    return { ok: true };
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Perubahan stok gagal." }, { status: 400 });
  }
}
