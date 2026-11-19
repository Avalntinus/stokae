import { NextResponse } from "next/server";
import { authenticate, createSession, issueOtp } from "@/lib/auth";
import { otpErrorResponse } from "@/lib/otp-response";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "Email dan kata sandi wajib diisi." }, { status: 400 });
  }
  const user = await authenticate(String(body.email), String(body.password));
  if (!user) return NextResponse.json({ error: "Email atau kata sandi salah." }, { status: 401 });
  if (!user.emailVerifiedAt) {
    try {
      const devOtp = await issueOtp(user.id, "REGISTER");
      return NextResponse.json({ requiresOtp: true, purpose: "REGISTER", email: user.email, devOtp }, { status: 403 });
    } catch (error) {
      return otpErrorResponse(error, {
        requiresOtp: true,
        purpose: "REGISTER",
        email: user.email,
        message: "Kata sandi benar, tetapi kode OTP gagal dikirim. Coba lagi.",
      });
    }
  }
  await createSession(user.id);
  return NextResponse.json({ success: true });
}
