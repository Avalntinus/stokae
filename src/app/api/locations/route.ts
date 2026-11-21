import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";

const locationSchema = z.object({ code: z.string().trim().min(2), name: z.string().trim().min(1), type: z.enum(["RAK", "GUDANG"]).default("RAK") });

export async function GET() {
  const context = await getCurrentWorkspace();
  if (!context) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const locations = await db.location.findMany({
    where: { workspaceId: context.workspaceId, archivedAt: null },
    include: { stockLevels: { select: { quantity: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    locations.map(({ stockLevels, ...location }) => ({
      ...location,
      productCount: stockLevels.filter((level) => level.quantity > 0).length,
      unitCount: stockLevels.reduce((sum, level) => sum + level.quantity, 0),
    })),
  );
}

export async function POST(request: Request) {
  const context = await getCurrentWorkspace();
  if (!context) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  const parsed = locationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data lokasi tidak valid." }, { status: 400 });
  const existing = await db.location.findFirst({
    where: {
      workspaceId: context.workspaceId,
      OR: [{ code: parsed.data.code }, { name: parsed.data.name }],
      archivedAt: null,
    },
  });
  if (existing) return NextResponse.json({ error: "Kode atau nama lokasi sudah digunakan." }, { status: 409 });
  try {
    return NextResponse.json(await db.location.create({ data: { ...parsed.data, workspaceId: context.workspaceId } }), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Kode atau nama lokasi sudah digunakan." }, { status: 409 });
  }
}
