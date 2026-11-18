import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const email = process.env.OWNER_EMAIL ?? "owner@stokae.local";
  const password = process.env.OWNER_PASSWORD ?? "stokae-demo";
  await db.user.upsert({
    where: { email },
    update: { emailVerifiedAt: new Date(), role: "OWNER" },
    create: { email, name: "Pengguna", passwordHash: await hash(password, 12), emailVerifiedAt: new Date(), role: "OWNER" },
  });

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
    await db.location.upsert({ where: { code }, update: { name, type }, create: { code, name, type } });
  }

  const demoProducts = [
    ["KBL-HDMI-2M", "Kabel HDMI 2M", "Kabel", 24, 10, "RAK-1"],
    ["LMP-LED-12", "Lampu LED 12W", "Lampu", 8, 10, "RAK-2"],
    ["STK-4L", "Stop Kontak 4 Lubang", "Elektrikal", 18, 8, "RAK-3"],
    ["CHR-SAM-C", "Charger Samsung Type-C", "Aksesoris", 0, 5, "GUDANG"],
    ["KBL-LAN-C6", "Kabel LAN Cat 6", "Kabel", 42, 20, "GUDANG"],
  ] as const;
  for (const [sku, name, categoryName, quantity, minStock, locationCode] of demoProducts) {
    const category = await db.category.upsert({ where: { name: categoryName }, update: {}, create: { name: categoryName } });
    const product = await db.product.upsert({ where: { normalizedName: name.toLowerCase() }, update: { sku, categoryId: category.id, minStock }, create: { sku, name, normalizedName: name.toLowerCase(), categoryId: category.id, minStock } });
    const location = await db.location.findUniqueOrThrow({ where: { code: locationCode } });
    await db.stockLevel.upsert({ where: { productId_locationId: { productId: product.id, locationId: location.id } }, update: { quantity }, create: { productId: product.id, locationId: location.id, quantity } });
  }
}

main().finally(() => db.$disconnect());
