import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const itemSchema = z.object({
  productId: z.string().min(1),
  locationCode: z.string().min(1),
  quantity: z.number().int().positive(),
  unitCost: z.number().int().min(0),
});
const purchaseSchema = z.object({
  purchaseDate: z.coerce.date().default(new Date()),
  supplier: z.string().trim().min(1).optional(),
  invoiceNo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  items: z.array(itemSchema).min(1),
});

export async function GET() {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  return NextResponse.json(await db.purchase.findMany({ include: { supplier: true, items: { include: { product: true, location: true } } }, orderBy: { purchaseDate: "desc" } }));
}

export async function POST(request: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  const parsed = purchaseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data pembelian tidak valid.", details: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  const totalCost = input.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const purchase = await db.$transaction(async (tx) => {
    const supplier = input.supplier ? await tx.supplier.upsert({ where: { name: input.supplier }, update: {}, create: { name: input.supplier } }) : null;
    const created = await tx.purchase.create({ data: { purchaseDate: input.purchaseDate, invoiceNo: input.invoiceNo, notes: input.notes, totalCost, supplierId: supplier?.id } });
    for (const item of input.items) {
      const location = await tx.location.findUnique({ where: { code: item.locationCode } });
      if (!location) throw new Error(`Lokasi ${item.locationCode} tidak ditemukan.`);
      await tx.purchaseItem.create({ data: { purchaseId: created.id, productId: item.productId, locationId: location.id, quantity: item.quantity, unitCost: item.unitCost } });
      const current = await tx.stockLevel.upsert({ where: { productId_locationId: { productId: item.productId, locationId: location.id } }, update: { quantity: { increment: item.quantity } }, create: { productId: item.productId, locationId: location.id, quantity: item.quantity } });
      await tx.stockMovement.create({ data: { productId: item.productId, locationId: location.id, type: "MASUK", quantity: item.quantity, referenceType: "PURCHASE", referenceId: created.id } });
      void current;
    }
    return created;
  });
  return NextResponse.json(purchase, { status: 201 });
}
