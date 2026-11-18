import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

function parseNumber(value: unknown) {
  return Number(String(value ?? "0").replace(/\./g, "").replace(",", "."));
}

export async function POST(request: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "File wajib dipilih." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Ukuran file maksimal 5 MB." }, { status: 400 });
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
  if (rows.length > 2000) return NextResponse.json({ error: "Maksimal 2.000 baris." }, { status: 400 });
  const errors: { row: number; reason: string }[] = [];
  let successRows = 0;
  for (const [index, row] of rows.entries()) {
    const name = String(row.nama ?? row.name ?? "").trim();
    if (!name) {
      errors.push({ row: index + 2, reason: "Kolom nama wajib diisi." });
      continue;
    }
    const normalizedName = name.toLowerCase().replace(/\s+/g, " ").trim();
    const categoryName = String(row.kategori ?? row.category ?? "Umum").trim() || "Umum";
    const locationCode = String(row.lokasi_kode ?? "BELUM-DITEMPATKAN").trim() || "BELUM-DITEMPATKAN";
    const location = await db.location.findUnique({ where: { code: locationCode } });
    if (!location) {
      errors.push({ row: index + 2, reason: `Lokasi ${locationCode} tidak ditemukan.` });
      continue;
    }
    const category = await db.category.upsert({ where: { name: categoryName }, update: {}, create: { name: categoryName } });
    const product = await db.product.upsert({
      where: { normalizedName },
      update: { categoryId: category.id, updatedAt: new Date() },
      create: { name, normalizedName, sku: String(row.sku ?? "").trim() || null, categoryId: category.id, unit: String(row.satuan ?? "pcs"), minStock: Math.max(0, Math.round(parseNumber(row.stok_minimum))) },
    });
    const quantity = Math.max(0, Math.round(parseNumber(row.jumlah)));
    if (quantity > 0) {
      await db.$transaction([
        db.stockLevel.upsert({ where: { productId_locationId: { productId: product.id, locationId: location.id } }, update: { quantity: { increment: quantity } }, create: { productId: product.id, locationId: location.id, quantity } }),
        db.stockMovement.create({ data: { productId: product.id, locationId: location.id, type: "SALDO_AWAL", quantity, referenceType: "IMPORT", referenceId: file.name } }),
      ]);
    }
    successRows += 1;
  }
  await db.importBatch.create({ data: { filename: file.name, status: errors.length ? "SELESAI_DENGAN_ERROR" : "SELESAI", totalRows: rows.length, successRows, failedRows: errors.length, errorReport: JSON.stringify(errors) } });
  return NextResponse.json({ totalRows: rows.length, successRows, failedRows: errors.length, errors });
}
