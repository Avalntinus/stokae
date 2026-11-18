import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const locationSchema = z.object({ code: z.string().trim().min(2), name: z.string().trim().min(1), type: z.enum(["RAK", "GUDANG"]).default("RAK") });

export async function GET() {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  return NextResponse.json(await db.location.findMany({ where: { archivedAt: null }, include: { _count: { select: { stockLevels: true } } }, orderBy: { name: "asc" } }));
}

export async function POST(request: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  const parsed = locationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data lokasi tidak valid." }, { status: 400 });
  const existing = await db.location.findFirst({
    where: {
      OR: [{ code: parsed.data.code }, { name: parsed.data.name }],
      archivedAt: null,
    },
  });
  if (existing) return NextResponse.json({ error: "Kode atau nama lokasi sudah digunakan." }, { status: 409 });
  try {
    return NextResponse.json(await db.location.create({ data: parsed.data }), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Kode atau nama lokasi sudah digunakan." }, { status: 409 });
  }
}
