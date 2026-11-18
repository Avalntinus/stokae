import { NextResponse } from "next/server";
import { getCurrentWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const context = await getCurrentWorkspace();
  if (!context) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  const products = await db.product.findMany({ where: { workspaceId: context.workspaceId, archivedAt: null }, include: { category: true, stockLevels: { include: { location: true } } }, orderBy: { name: "asc" } });
  const rows = [["nama", "sku", "kategori", "stok_total", "lokasi"]].concat(products.map((product) => [product.name, product.sku ?? "", product.category?.name ?? "", String(product.stockLevels.reduce((sum, level) => sum + level.quantity, 0)), product.stockLevels.map((level) => `${level.location.name}: ${level.quantity}`).join(" | ")]));
  const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
  return new NextResponse(`\ufeff${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="wareflow-barang.csv"' } });
}
