"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Boxes, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";
type OtpState = { email: string; purpose: "REGISTER" | "LOGIN"; code: string } | null;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [otp, setOtp] = useState<OtpState>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const body = mode === "register"
      ? { name: form.get("name"), email: form.get("email"), password: form.get("password") }
      : { email: form.get("email"), password: form.get("password") };
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok && !data?.requiresOtp) {
      setError(data?.error ?? "Permintaan gagal diproses.");
      setLoading(false);
      return;
    }
    if (data?.requiresOtp) {
      setOtp({ email: data.email, purpose: data.purpose, code: "" });
      setError(data.devOtp ? `Kode uji lokal: ${data.devOtp}` : "");
      setLoading(false);
      return;
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!otp) return;
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(otp),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setError(data?.error ?? "Verifikasi gagal.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function resendOtp() {
    if (!otp) return;
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: otp.email, purpose: otp.purpose }),
    });
    const data = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      setError(data?.error ?? "OTP gagal dikirim ulang.");
      return;
    }
    setError(data.devOtp ? `Kode uji lokal baru: ${data.devOtp}` : "Kode OTP baru sudah dikirim ke email.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/60 bg-white/80 shadow-2xl backdrop-blur-2xl md:grid-cols-[1.05fr_.95fr]">
        <div className="hidden min-h-[560px] flex-col justify-between bg-[#0b292b] p-10 text-white md:flex">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2ab29d] font-bold">SA</div>
              <span className="text-xl font-bold">StokAE</span>
            </div>
            <div className="mt-24 max-w-sm">
              <p className="text-sm text-[#89b9b1]">Manajemen stok yang lebih rapi</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight tracking-[-.04em]">Tahu barangnya. Tahu tempatnya.</h1>
              <p className="mt-5 text-sm leading-6 text-[#a5c9c4]">Kelola barang, pembelian, lokasi, dan pergerakan stok dalam satu ruang kerja.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#79a9a2]"><ShieldCheck size={15} /> Verifikasi dua langkah untuk akun Anda</div>
        </div>

        <div className="p-7 sm:p-10">
          <div className="mx-auto max-w-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e5f6f1] text-[#20897b] md:hidden"><Boxes size={21} /></div>
            {otp ? (
              <>
                <p className="mt-8 text-sm text-[#819098] md:mt-16">Verifikasi keamanan</p>
                <h2 className="mt-2 text-2xl font-bold">Masukkan kode OTP</h2>
                <p className="mt-2 text-xs leading-5 text-[#8d999f]">Kode 6 angka dikirim ke <b className="text-[#4f6660]">{otp.email}</b>.</p>
                <form onSubmit={verifyOtp} className="mt-8 space-y-4">
                  <div>
                    <label className="label" htmlFor="otp">Kode OTP</label>
                    <input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp.code} onChange={(event) => setOtp({ ...otp, code: event.target.value.replace(/\D/g, "") })} className="input text-center text-lg tracking-[0.5em]" placeholder="000000" required />
                  </div>
                  {error && <p className="rounded-xl bg-[#eef7f5] p-3 text-xs text-[#2b806f]">{error}</p>}
                  <button disabled={loading || otp.code.length !== 6} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1f8f80] text-xs font-bold text-white disabled:opacity-60">Verifikasi & masuk <ArrowRight size={16} /></button>
                  <button type="button" disabled={loading} onClick={resendOtp} className="w-full text-xs font-semibold text-[#2b6f91]">Kirim ulang OTP</button>
                  <button type="button" onClick={() => { setOtp(null); setError(""); }} className="w-full text-xs text-[#8d999f]">Kembali</button>
                </form>
              </>
            ) : (
              <>
                <p className="mt-8 text-sm text-[#819098] md:mt-16">{mode === "login" ? "Selamat datang kembali" : "Mulai gunakan StokAE"}</p>
                <h2 className="mt-2 text-2xl font-bold">{mode === "login" ? "Masuk ke akun" : "Daftar akun baru"}</h2>
                <p className="mt-2 text-xs leading-5 text-[#8d999f]">Setiap login akan dilindungi kode OTP melalui email.</p>
                <form onSubmit={submit} className="mt-8 space-y-4">
                  {mode === "register" && (
                    <div>
                      <label className="label" htmlFor="name">Nama lengkap</label>
                      <input id="name" name="name" className="input" placeholder="Nama Anda" required />
                    </div>
                  )}
                  <div>
                    <label className="label" htmlFor="email">Email</label>
                    <div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[#98a5aa]" size={16} /><input id="email" className="input pl-10" type="email" name="email" placeholder="nama@email.com" required /></div>
                  </div>
                  <div>
                    <label className="label" htmlFor="password">Kata sandi</label>
                    <div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[#98a5aa]" size={16} /><input id="password" className="input pl-10 pr-20" type={showPassword ? "text" : "password"} name="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === "register" ? 8 : 1} required /><button type="button" aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} onClick={() => setShowPassword((current) => !current)} className="absolute right-1 top-1/2 z-20 flex h-9 min-w-[58px] -translate-y-1/2 items-center justify-center gap-1 rounded-lg px-2 text-[10px] font-bold text-[#2b6f91] hover:bg-[#eef3f5]">{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}<span>{showPassword ? "Sembunyikan" : "Lihat"}</span></button></div>
                  </div>
                  {error && <p className="rounded-xl bg-[#fff0ee] p-3 text-xs text-[#c96559]">{error}</p>}
                  <button disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1f8f80] text-xs font-bold text-white disabled:opacity-60">{loading ? "Memproses..." : mode === "login" ? "Lanjut dengan OTP" : "Daftar & kirim OTP"} <ArrowRight size={16} /></button>
                </form>
                <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setPassword(""); }} className="mt-6 w-full text-xs font-semibold text-[#2b6f91]">{mode === "login" ? "Belum punya akun? Daftar sekarang" : "Sudah punya akun? Masuk"}</button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
