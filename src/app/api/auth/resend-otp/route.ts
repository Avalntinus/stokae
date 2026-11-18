import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { issueOtp } from "@/lib/auth";

export async function POST(request: Request) {
  const parsed = z.object({ email: z.string().email(), purpose: z.enum(["REGISTER", "LOGIN"]) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Email atau jenis verifikasi tidak valid." }, { status: 400 });
  const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  const devOtp = await issueOtp(user.id, parsed.data.purpose);
  return NextResponse.json({ success: true, devOtp });
}
