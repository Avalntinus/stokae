"use client";

import { ChevronRight, MapPin, Plus, Warehouse } from "lucide-react";
import { useState } from "react";
import { Location, formatNumber } from "@/lib/ui";
import { EmptyState, PageHeading, Spinner } from "@/components/ui";

export function LocationsView({
  locations,
  onSaved,
  onOpenProducts,
  notify,
}: {
  locations: Location[];
  onSaved: () => Promise<void>;
  onOpenProducts: (location: Location) => void;
  notify: (kind: "success" | "error", message: string) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<"RAK" | "GUDANG">("RAK");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function addLocation(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!name.trim() || !code.trim()) {
      setError("Nama dan kode lokasi wajib diisi.");
      return;
    }
    setSaving(true);
    const response = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim().toUpperCase().replace(/\s+/g, "-"), name: name.trim(), type }),
    });
    const body = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      setError(body?.error ?? "Lokasi gagal ditambahkan.");
      return;
    }
    setName("");
    setCode("");
    await onSaved();
    notify("success", `Lokasi ${body.name} berhasil ditambahkan.`);
  }

  return (
    <>
      <PageHeading eyebrow="Atur alamat penyimpanan barang" title="Lokasi gudang & rak" />
      <form onSubmit={addLocation} className="mb-6 rounded-2xl border border-[#e6e9ed] bg-white p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_160px_auto] md:items-end">
          <label>
            <span className="label">Nama lokasi</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Rak 6" className="input" />
          </label>
          <label>
            <span className="label">Kode lokasi</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="RAK-6"
              className="input"
            />
          </label>
          <label>
            <span className="label">Tipe</span>
            <select value={type} onChange={(event) => setType(event.target.value as "RAK" | "GUDANG")} className="input">
              <option value="RAK">Rak</option>
              <option value="GUDANG">Gudang</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1f8f80] px-4 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? <Spinner /> : <Plus size={16} />} Tambah
          </button>
        </div>
        {error && <p className="mt-3 rounded-xl bg-[#fff0ee] p-3 text-xs text-[#c96c5e]">{error}</p>}
      </form>

      {locations.length === 0 ? (
        <section className="rounded-2xl border border-[#e6e9ed] bg-white">
          <EmptyState
            icon={<MapPin size={22} />}
            title="Belum ada lokasi"
            description="Tambahkan rak atau gudang supaya barang punya tempat penyimpanan yang jelas."
          />
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {locations.map((location) => {
            const isSystem = location.code === "BELUM-DITEMPATKAN";
            return (
              <button
                key={location.id}
                type="button"
                onClick={() => onOpenProducts(location)}
                className="rounded-2xl border border-[#e6e9ed] bg-white p-5 text-left transition hover:border-[#bdd8d1] hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f6f3] text-[#20897b]">
                    <Warehouse size={19} />
                  </div>
                  <span className="rounded-lg p-2 text-[#98a2aa]">
                    <ChevronRight size={16} />
                  </span>
                </div>
                <p className="mt-5 truncate text-sm font-bold">{location.name}</p>
                <p className="mt-1 text-[11px] text-[#929ba3]">
                  {location.code} · {location.type === "GUDANG" ? "Gudang" : location.type === "SISTEM" ? "Lokasi sistem" : "Rak"}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-[#f0f2f3] pt-3 text-[11px]">
                  <span className="text-[#69757e]">{formatNumber(location.productCount)} jenis barang</span>
                  <span className="font-semibold text-[#20897b]">{formatNumber(location.unitCount)} unit</span>
                </div>
                {isSystem && (
                  <p className="mt-2 text-[10px] text-[#a0a8ae]">Barang yang belum ditempatkan ke rak.</p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
