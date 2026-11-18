import { NextResponse } from "next/server";
import { getCurrentWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const context = await getCurrentWorkspace();
  if (!context) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  const products = await db.product.findMany({ where: { workspaceId: context.workspaceId, archivedAt: null }, include: { stockLevels: true, purchaseItems: true } });
  const totalUnits = products.reduce((sum, product) => sum + product.stockLevels.reduce((levelSum, level) => levelSum + level.quantity, 0), 0);
  const lowStock = products.filter((product) => product.stockLevels.reduce((sum, level) => sum + level.quantity, 0) <= product.minStock).length;
  const inventoryValue = products.reduce((sum, product) => {
    const quantity = product.stockLevels.reduce((levelSum, level) => levelSum + level.quantity, 0);
    const totalCost = product.purchaseItems.reduce((cost, item) => cost + item.quantity * item.unitCost, 0);
    const totalPurchased = product.purchaseItems.reduce((count, item) => count + item.quantity, 0);
    return sum + quantity * (totalPurchased ? totalCost / totalPurchased : 0);
  }, 0);
  return NextResponse.json({ productCount: products.length, totalUnits, lowStock, inventoryValue: Math.round(inventoryValue) });
}
