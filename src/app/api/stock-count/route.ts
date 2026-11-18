import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const countSchema = z.object({
  locationCode: z.string().min(1),
  items: z.array(z.object({ productId: z.string(), countedQty: z.number().int().min(0) })).min(1),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  const parsed = countSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data stock count tidak valid." }, { status: 400 });
  const location = await db.location.findUnique({ where: { code: parsed.data.locationCode } });
  if (!location) return NextResponse.json({ error: "Lokasi tidak ditemukan." }, { status: 400 });
  const count = await db.$transaction(async (tx) => {
    const created = await tx.stockCount.create({ data: { notes: parsed.data.notes, status: "SELESAI" } });
    for (const item of parsed.data.items) {
      const current = await tx.stockLevel.findUnique({ where: { productId_locationId: { productId: item.productId, locationId: location.id } } });
      const systemQty = current?.quantity ?? 0;
      const difference = item.countedQty - systemQty;
      await tx.stockCountItem.create({ data: { stockCountId: created.id, productId: item.productId, locationId: location.id, systemQty, countedQty: item.countedQty, difference } });
      if (difference !== 0) {
        await tx.stockLevel.upsert({ where: { productId_locationId: { productId: item.productId, locationId: location.id } }, update: { quantity: item.countedQty }, create: { productId: item.productId, locationId: location.id, quantity: item.countedQty } });
        await tx.stockMovement.create({ data: { productId: item.productId, locationId: location.id, type: "KOREKSI", quantity: Math.abs(difference), reason: `Stock Count ${created.id}` } });
      }
    }
    return created;
  });
  return NextResponse.json(count, { status: 201 });
}
