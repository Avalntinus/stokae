import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { createHash, randomInt } from "crypto";
import { db } from "@/lib/db";

const SESSION_COOKIE = "stokae_session";
const SESSION_DAYS = 7;

export async function createOwnerIfMissing() {
  const email = process.env.OWNER_EMAIL ?? "owner@stokae.local";
  const password = process.env.OWNER_PASSWORD ?? "stokae-demo";
  const existing = await db.user.findUnique({ where: { email } });
  if (!existing) {
    await db.user.create({
      data: { email, name: "Pemilik", passwordHash: await hash(password, 12), emailVerifiedAt: new Date(), role: "OWNER" },
    });
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

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { token } });
  cookieStore.delete(SESSION_COOKIE);
}
