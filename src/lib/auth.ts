import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { createHash, randomInt } from "crypto";
import { db } from "@/lib/db";

const SESSION_COOKIE = "wareflow_session";
const SESSION_DAYS = 7;

export async function createOwnerIfMissing() {
  const email = process.env.OWNER_EMAIL ?? "owner@wareflow.local";
  const password = process.env.OWNER_PASSWORD ?? "wareflow-demo";
  const existing = await db.user.findUnique({ where: { email } });
  if (!existing) {
    const owner = await db.user.create({
      data: { email, name: "Pemilik", passwordHash: await hash(password, 12), emailVerifiedAt: new Date(), role: "OWNER" },
    });
    await ensureWorkspaceForUser(owner);
  } else {
    await ensureWorkspaceForUser(existing);
  }
}

export async function authenticate(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !(await compare(password, user.passwordHash))) return null;
  return user;
}

export async function createSession(userId: string) {
  const token = crypto.randomUUID();
  await db.session.create({
    data: {
      token,
      userId,
      expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return token;
}

export async function issueOtp(userId: string, purpose: "REGISTER" | "LOGIN") {
  const code = String(randomInt(100000, 1000000));
  const codeHash = createHash("sha256").update(code).digest("hex");
  await db.otpCode.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });
  await db.otpCode.create({
    data: {
      userId,
      purpose,
      codeHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) throw new Error("Pengguna tidak ditemukan.");
  if (process.env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Wareflow <onboarding@resend.dev>",
        to: [user.email],
        subject: "Kode verifikasi Wareflow",
        text: `Kode OTP Wareflow Anda adalah ${code}. Kode berlaku selama 10 menit.`,
      }),
    });
  } else {
    console.info(`[Wareflow OTP] ${user.email}: ${code}`);
  }
  return process.env.NODE_ENV !== "production" ? code : null;
}

export function hashOtp(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function ensureWorkspaceForUser(user: { id: string; name: string; role: string; workspaceId: string | null }) {
  if (user.workspaceId) return { id: user.workspaceId };
  const workspace = await db.workspace.create({ data: { name: `${user.name} Workspace` } });
  await db.user.update({ where: { id: user.id }, data: { workspaceId: workspace.id } });

  if (user.role === "OWNER") {
    await db.$transaction([
      db.category.updateMany({ where: { workspaceId: null }, data: { workspaceId: workspace.id } }),
      db.product.updateMany({ where: { workspaceId: null }, data: { workspaceId: workspace.id } }),
      db.location.updateMany({ where: { workspaceId: null }, data: { workspaceId: workspace.id } }),
      db.supplier.updateMany({ where: { workspaceId: null }, data: { workspaceId: workspace.id } }),
      db.purchase.updateMany({ where: { workspaceId: null }, data: { workspaceId: workspace.id } }),
      db.stockCount.updateMany({ where: { workspaceId: null }, data: { workspaceId: workspace.id } }),
      db.importBatch.updateMany({ where: { workspaceId: null }, data: { workspaceId: workspace.id } }),
      db.aiUsageLog.updateMany({ where: { workspaceId: null }, data: { workspaceId: workspace.id } }),
    ]);
  } else {
    await db.location.createMany({
      data: [
        ["RAK-1", "Rak 1", "RAK"],
        ["RAK-2", "Rak 2", "RAK"],
        ["RAK-3", "Rak 3", "RAK"],
        ["RAK-4", "Rak 4", "RAK"],
        ["RAK-5", "Rak 5", "RAK"],
        ["GUDANG", "Gudang", "GUDANG"],
        ["BELUM-DITEMPATKAN", "Belum ditempatkan", "SISTEM"],
      ].map(([code, name, type]) => ({ workspaceId: workspace.id, code, name, type })),
    });
  }
  return { id: workspace.id };
}

export async function getCurrentWorkspace() {
  const user = await getCurrentUser();
  if (!user) return null;
  const workspace = await ensureWorkspaceForUser(user);
  return { user, workspaceId: workspace.id };
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { token } });
  cookieStore.delete(SESSION_COOKIE);
}
