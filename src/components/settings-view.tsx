"use client";

import { Download, KeyRound, LogOut, Save, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { AccountInfo, formatDate } from "@/lib/ui";
import { PageHeading, Spinner } from "@/components/ui";

export function SettingsView({
  account,
  onAccountUpdated,
  onLogout,
  notify,
}: {
  account: AccountInfo;
  onAccountUpdated: (account: AccountInfo) => void;
  onLogout: () => void;
  notify: (kind: "success" | "error", message: string) => void;
}) {
  const [name, setName] = useState(account.name);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  async function saveName(event: React.FormEvent) {
    event.preventDefault();
    setNameError("");
    if (name.trim().length < 2) {
      setNameError("Nama minimal 2 karakter.");
      return;
    }
    setSavingName(true);
    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const body = await response.json().catch(() => null);
    setSavingName(false);
    if (!response.ok) {
      setNameError(body?.error ?? "Nama gagal disimpan.");
      return;
    }
    onAccountUpdated({ ...account, name: body.name });
    notify("success", "Nama akun berhasil diperbarui.");
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    setPasswordError("");
    if (newPassword.length < 8) {
      setPasswordError("Kata sandi baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi kata sandi tidak sama.");
      return;
    }
    setSavingPassword(true);
    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const body = await response.json().catch(() => null);
    setSavingPassword(false);
    if (!response.ok) {
      setPasswordError(body?.error ?? "Kata sandi gagal diubah.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    notify("success", "Kata sandi diperbarui. Perangkat lain sudah dikeluarkan.");
  }

  return (
    <>
      <PageHeading eyebrow="Kelola akun dan preferensi" title="Pengaturan" />

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-5">
          <section className="rounded-2xl border border-[#e6e9ed] bg-white p-5 md:p-6">
            <div className="flex items-center gap-2 text-sm font-bold">
              <UserRound size={17} className="text-[#20897b]" /> Profil
            </div>
            <form onSubmit={saveName} className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="label">Nama</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} className="input" required />
                </label>
                <label>
                  <span className="label">Email</span>
                  <input value={account.email} readOnly className="input bg-[#f7f9fa] text-[#7d8991]" />
                </label>
              </div>
              {nameError && <p className="rounded-lg bg-[#fff0ee] p-3 text-xs text-[#c96c5e]">{nameError}</p>}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingName || name.trim() === account.name}
                  className="flex items-center gap-2 rounded-xl bg-[#1f8f80] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {savingName ? <Spinner /> : <Save size={15} />} Simpan nama
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-[#e6e9ed] bg-white p-5 md:p-6">
            <div className="flex items-center gap-2 text-sm font-bold">
              <KeyRound size={17} className="text-[#20897b]" /> Ubah kata sandi
            </div>
            <p className="mt-1 text-[11px] text-[#929ba3]">
              Setelah kata sandi diubah, semua perangkat lain akan keluar otomatis.
            </p>
            <form onSubmit={savePassword} className="mt-5 grid gap-4">
              <label>
                <span className="label">Kata sandi saat ini</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                  className="input"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="label">Kata sandi baru</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="input"
                  />
                </label>
                <label>
                  <span className="label">Ulangi kata sandi baru</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    autoComplete="new-password"
                    className="input"
                  />
                </label>
              </div>
              {passwordError && <p className="rounded-lg bg-[#fff0ee] p-3 text-xs text-[#c96c5e]">{passwordError}</p>}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="flex items-center gap-2 rounded-xl bg-[#1f8f80] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {savingPassword ? <Spinner /> : <KeyRound size={15} />} Ubah kata sandi
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="grid gap-5">
          <section className="rounded-2xl border border-[#e6e9ed] bg-white p-5 md:p-6">
            <div className="flex items-center gap-2 text-sm font-bold">
              <ShieldCheck size={17} className="text-[#20897b]" /> Informasi akun
            </div>
            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#8a949d]">Peran</dt>
                <dd className="font-semibold">{account.role === "OWNER" ? "Pemilik" : "Pengguna"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#8a949d]">Workspace</dt>
                <dd className="max-w-[60%] truncate text-right font-semibold">{account.workspaceName}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#8a949d]">Terdaftar</dt>
                <dd className="font-semibold">{formatDate(account.createdAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-[#e6e9ed] bg-white p-5 md:p-6">
            <h3 className="text-sm font-bold">Data & sesi</h3>
            <a
              href="/api/export/products"
              className="mt-4 flex items-center justify-between rounded-xl border border-[#e4e8ea] px-4 py-3 text-xs font-semibold text-[#5f6c76] hover:bg-[#f8fafb]"
            >
              <span className="flex items-center gap-2"><Download size={15} /> Ekspor semua barang (CSV)</span>
              <span className="text-[#a0a8ae]">Unduh</span>
            </a>
            <button
              type="button"
              onClick={onLogout}
              className="mt-3 flex w-full items-center justify-between rounded-xl border border-[#f0d6d1] px-4 py-3 text-xs font-semibold text-[#c96c5e] hover:bg-[#fff5f3]"
            >
              <span className="flex items-center gap-2"><LogOut size={15} /> Keluar dari akun</span>
              <span className="text-[#d9a49b]">Logout</span>
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
