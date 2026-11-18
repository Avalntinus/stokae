import { NextResponse } from "next/server";
import { authenticate, issueOtp } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "Email dan kata sandi wajib diisi." }, { status: 400 });
  }
  const user = await authenticate(String(body.email), String(body.password));
  if (!user) return NextResponse.json({ error: "Email atau kata sandi salah." }, { status: 401 });
  if (!user.emailVerifiedAt) {
    const devOtp = await issueOtp(user.id, "REGISTER");
    return NextResponse.json({ requiresOtp: true, purpose: "REGISTER", email: user.email, devOtp }, { status: 403 });
  }
  const devOtp = await issueOtp(user.id, "LOGIN");
  return NextResponse.json({ requiresOtp: true, purpose: "LOGIN", email: user.email, devOtp });
}
