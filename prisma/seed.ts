import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const email = process.env.OWNER_EMAIL ?? "owner@wareflow.local";
  const password = process.env.OWNER_PASSWORD ?? "wareflow-demo";
  const owner = await db.user.upsert({
    where: { email },
    update: { emailVerifiedAt: new Date(), role: "OWNER" },
    create: { email, name: "Pengguna", passwordHash: await hash(password, 12), emailVerifiedAt: new Date(), role: "OWNER" },
  });
  const workspace = owner.workspaceId
    ? await db.workspace.findUniqueOrThrow({ where: { id: owner.workspaceId } })
    : await db.workspace.create({
        data: { name: `${owner.name} Workspace`, users: { connect: { id: owner.id } } },
      });
  if (!owner.workspaceId) await db.user.update({ where: { id: owner.id }, data: { workspaceId: workspace.id } });

  const locations = [
    ["RAK-1", "Rak 1", "RAK"],
    ["RAK-2", "Rak 2", "RAK"],
    ["RAK-3", "Rak 3", "RAK"],
    ["RAK-4", "Rak 4", "RAK"],
    ["RAK-5", "Rak 5", "RAK"],
    ["GUDANG", "Gudang", "GUDANG"],
    ["BELUM-DITEMPATKAN", "Belum ditempatkan", "SISTEM"],
  ];
  for (const [code, name, type] of locations) {
    const existing = await db.location.findFirst({ where: { workspaceId: workspace.id, code } });
    if (existing) {
      await db.location.update({ where: { id: existing.id }, data: { name, type } });
    } else {
      await db.location.create({ data: { workspaceId: workspace.id, code, name, type } });
    }
  }

  const demoProducts = [
    ["KBL-HDMI-2M", "Kabel HDMI 2M", "Kabel", 24, 10, "RAK-1"],
    ["LMP-LED-12", "Lampu LED 12W", "Lampu", 8, 10, "RAK-2"],
    ["STK-4L", "Stop Kontak 4 Lubang", "Elektrikal", 18, 8, "RAK-3"],
    ["CHR-SAM-C", "Charger Samsung Type-C", "Aksesoris", 0, 5, "GUDANG"],
    ["KBL-LAN-C6", "Kabel LAN Cat 6", "Kabel", 42, 20, "GUDANG"],
  ] as const;
  for (const [sku, name, categoryName, quantity, minStock, locationCode] of demoProducts) {
    const category = await db.category.findFirst({ where: { workspaceId: workspace.id, name: categoryName } }) ?? await db.category.create({ data: { workspaceId: workspace.id, name: categoryName } });
    const normalizedName = name.toLowerCase();
    const existingProduct = await db.product.findFirst({ where: { workspaceId: workspace.id, normalizedName } });
    const product = existingProduct
      ? await db.product.update({ where: { id: existingProduct.id }, data: { sku, categoryId: category.id, minStock } })
      : await db.product.create({ data: { workspaceId: workspace.id, sku, name, normalizedName, categoryId: category.id, minStock } });
    const location = await db.location.findFirstOrThrow({ where: { workspaceId: workspace.id, code: locationCode } });
    await db.stockLevel.upsert({ where: { productId_locationId: { productId: product.id, locationId: location.id } }, update: { quantity }, create: { productId: product.id, locationId: location.id, quantity } });
  }
}

main().finally(() => db.$disconnect());
