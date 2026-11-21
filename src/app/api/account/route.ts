import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { createSession, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const updateSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8).optional(),
  })
  .refine((data) => data.name !== undefined || data.newPassword !== undefined, {
    message: "Tidak ada perubahan yang dikirim.",
  });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  const workspace = user.workspaceId
    ? await db.workspace.findUnique({ where: { id: user.workspaceId }, select: { name: true } })
    : null;
  return NextResponse.json({
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    workspaceName: workspace?.name ?? "Workspace",
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data akun tidak valid." },
      { status: 400 },
    );
  }

  const { name, currentPassword, newPassword } = parsed.data;
  const data: { name?: string; passwordHash?: string } = {};

  if (name !== undefined) data.name = name;

  if (newPassword !== undefined) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Kata sandi saat ini wajib diisi." }, { status: 400 });
    }
    const valid = await compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Kata sandi saat ini salah." }, { status: 400 });
    }
    data.passwordHash = await hash(newPassword, 12);
  }

  const updated = await db.user.update({ where: { id: user.id }, data });

  if (newPassword !== undefined) {
    await db.session.deleteMany({ where: { userId: user.id } });
    await createSession(user.id);
  }

  return NextResponse.json({
    name: updated.name,
    email: updated.email,
    role: updated.role,
    createdAt: updated.createdAt,
    passwordChanged: newPassword !== undefined,
  });
}
