import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const productSchema = z.object({
  name: z.string().trim().min(1),
  sku: z.string().trim().optional(),
  category: z.string().trim().min(1).default("Umum"),
  unit: z.string().trim().min(1).default("pcs"),
  minStock: z.number().int().min(0).default(0),
  stock: z.number().int().min(0).default(0),
  cost: z.number().int().min(0).default(0),
  locationCode: z.string().trim().default("BELUM-DITEMPATKAN"),
});

export async function GET(request: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  const search = new URL(request.url).searchParams.get("search")?.trim().toLowerCase();
  const products = await db.product.findMany({
    where: { archivedAt: null, ...(search ? { OR: [{ normalizedName: { contains: search } }, { sku: { contains: search } }] } : {}) },
    include: { category: true, stockLevels: { include: { location: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data barang tidak valid.", details: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  const normalizedName = input.name.toLowerCase().replace(/\s+/g, " ").trim();
  const duplicate = await db.product.findFirst({ where: { archivedAt: null, OR: [{ normalizedName }, ...(input.sku ? [{ sku: input.sku }] : [])] } });
  if (duplicate) return NextResponse.json({ error: "Nama atau SKU barang sudah digunakan." }, { status: 409 });
  const category = await db.category.upsert({ where: { name: input.category }, update: {}, create: { name: input.category } });
  const location = await db.location.findUnique({ where: { code: input.locationCode } });
  if (!location) return NextResponse.json({ error: "Lokasi tidak ditemukan." }, { status: 400 });
  const product = await db.$transaction(async (tx) => {
    const created = await tx.product.create({ data: { name: input.name, normalizedName, sku: input.sku || null, unit: input.unit, minStock: input.minStock, categoryId: category.id } });
    if (input.stock > 0) {
      await tx.stockLevel.create({ data: { productId: created.id, locationId: location.id, quantity: input.stock } });
      await tx.stockMovement.create({ data: { productId: created.id, locationId: location.id, type: "SALDO_AWAL", quantity: input.stock, reason: "Saldo awal" } });
    }
    return created;
  });
  return NextResponse.json(product, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const parsed = productSchema.pick({ name: true, sku: true, category: true, unit: true, minStock: true }).safeParse(body);
  if (!id || !parsed.success) return NextResponse.json({ error: "Data barang tidak valid.", details: parsed.success ? undefined : parsed.error.flatten() }, { status: 400 });

  const input = parsed.data;
  const normalizedName = input.name.toLowerCase().replace(/\s+/g, " ").trim();
  const duplicate = await db.product.findFirst({
    where: {
      archivedAt: null,
      id: { not: id },
      OR: [{ normalizedName }, ...(input.sku ? [{ sku: input.sku }] : [])],
    },
  });
  if (duplicate) return NextResponse.json({ error: "Nama atau SKU barang sudah digunakan." }, { status: 409 });

  const category = await db.category.upsert({ where: { name: input.category }, update: {}, create: { name: input.category } });
  const product = await db.product.update({
    where: { id },
    data: {
      name: input.name,
      normalizedName,
      sku: input.sku || null,
      unit: input.unit,
      minStock: input.minStock,
      categoryId: category.id,
    },
  });
  return NextResponse.json(product);
}

export async function DELETE(request: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "ID barang tidak valid." }, { status: 400 });

  const product = await db.product.findFirst({ where: { id, archivedAt: null }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "Barang tidak ditemukan." }, { status: 404 });
  await db.product.update({ where: { id }, data: { archivedAt: new Date() } });
  return NextResponse.json({ success: true });
}
