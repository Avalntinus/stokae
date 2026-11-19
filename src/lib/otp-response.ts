import { NextResponse } from "next/server";
import { OtpCooldownError } from "@/lib/auth";

type OtpErrorOptions = {
  requiresOtp?: boolean;
  purpose?: "REGISTER" | "LOGIN";
  email?: string;
  message?: string;
};

export function otpErrorResponse(error: unknown, options: OtpErrorOptions = {}) {
  if (error instanceof OtpCooldownError) {
    return NextResponse.json(
      { error: `Tunggu ${error.retryAfterSeconds} detik sebelum meminta kode baru.`, ...options },
      { status: 429 },
    );
  }

  console.error("[Wareflow OTP] gagal:", error instanceof Error ? error.message : error);
  return NextResponse.json(
    {
      error: options.message ?? "Kode OTP gagal dikirim. Periksa konfigurasi BREVO_API_KEY dan EMAIL_FROM, lalu coba lagi.",
      ...options,
    },
    { status: 502 },
  );
}
