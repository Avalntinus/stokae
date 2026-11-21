import { NextResponse } from "next/server";
import { getCurrentWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const context = await getCurrentWorkspace();
  if (!context) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const products = await db.product.findMany({
    where: { workspaceId: context.workspaceId, archivedAt: null },
    include: { stockLevels: true, purchaseItems: true, category: true },
    orderBy: { name: "asc" },
  });

  const categories = new Map<string, { name: string; units: number; productCount: number }>();
  let totalUnits = 0;
  let lowStock = 0;
  let inventoryValue = 0;
  const locationsWithStock = new Set<string>();

  for (const product of products) {
    const quantity = product.stockLevels.reduce((sum, level) => sum + level.quantity, 0);
    totalUnits += quantity;
    if (quantity <= product.minStock) lowStock += 1;
    for (const level of product.stockLevels) {
      if (level.quantity > 0) locationsWithStock.add(level.locationId);
    }

    const totalPurchased = product.purchaseItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalCost = product.purchaseItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
    const unitCost = totalPurchased > 0 ? totalCost / totalPurchased : product.cost;
    inventoryValue += quantity * unitCost;

    const name = product.category?.name ?? "Lainnya";
    const entry = categories.get(name) ?? { name, units: 0, productCount: 0 };
    entry.units += quantity;
    entry.productCount += 1;
    categories.set(name, entry);
  }

  return NextResponse.json({
    productCount: products.length,
    totalUnits,
    lowStock,
    inventoryValue: Math.round(inventoryValue),
    locationCount: locationsWithStock.size,
    categories: Array.from(categories.values()).sort((a, b) => b.units - a.units),
    user: {
      name: context.user.name,
      email: context.user.email,
      role: context.user.role,
      createdAt: context.user.createdAt,
    },
  });
}
