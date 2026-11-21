"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Location, Product, defaultLocationCode, formatNumber } from "@/lib/ui";
import { Modal, Spinner } from "@/components/ui";

export type ProductFormValues = {
  name: string;
  category: string;
  sku: string;
  unit: string;
  minStock: number;
  cost: number;
  stock: number;
  locationCode: string;
};

export function AddProductModal({
  product,
  locations,
  onClose,
  onSubmit,
}: {
  product?: Product;
  locations: Location[];
  onClose: () => void;
  onSubmit: (values: ProductFormValues) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const editing = Boolean(product);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [unit, setUnit] = useState(product?.unit ?? "pcs");
  const [locationCode, setLocationCode] = useState(defaultLocationCode(locations));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const result = await onSubmit({
      name: String(form.get("name") ?? "").trim(),
      category: String(form.get("category") ?? "").trim(),
      sku: String(form.get("sku") ?? "").trim(),
      unit,
      minStock: Number(form.get("minStock") ?? 0),
      cost: Number(form.get("cost") ?? 0),
      stock: Number(form.get("stock") ?? 0),
      locationCode,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
  }

  return (
    <Modal
      title={editing ? "Edit barang" : "Tambah barang baru"}
      description={
        editing
          ? "Perbarui informasi barang tanpa mengubah riwayat stok."
          : "Isi informasi dasar barang yang ingin dicatat."
      }
      onClose={onClose}
    >
      <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="label">Nama barang</span>
          <input name="name" required defaultValue={product?.name} placeholder="Contoh: Kabel HDMI 3M" className="input" />
        </label>
        <label>
          <span className="label">Kategori</span>
          <input name="category" required defaultValue={product?.category} placeholder="Kabel" className="input" />
        </label>
        <label>
          <span className="label">SKU <small>(opsional)</small></span>
          <input name="sku" defaultValue={product?.sku === "—" ? "" : product?.sku} placeholder="KBL-001" className="input" />
        </label>
        <label>
          <span className="label">Satuan</span>
          <select name="unit" value={unit} onChange={(event) => setUnit(event.target.value)} className="input">
            <option value="pcs">pcs</option>
            <option value="unit">unit</option>
            <option value="meter">meter</option>
            <option value="box">box</option>
            <option value="kg">kg</option>
            <option value="liter">liter</option>
          </select>
        </label>
        <label>
          <span className="label">Stok minimum</span>
          <input name="minStock" type="number" min="0" defaultValue={product?.minStock ?? 5} className="input" />
        </label>
        <label>
          <span className="label">Harga modal per {unit}</span>
          <input name="cost" type="number" min="0" defaultValue={product?.avgCost ?? 0} className="input" />
        </label>

        {editing ? (
          <label>
            <span className="label">Stok saat ini</span>
            <input value={`${formatNumber(product?.stock ?? 0)} ${product?.unit ?? ""}`} readOnly className="input bg-[#f7f9fa] text-[#7d8991]" />
          </label>
        ) : (
          <>
            <label>
              <span className="label">Stok awal</span>
              <input name="stock" type="number" min="0" defaultValue={0} className="input" />
            </label>
            <label>
              <span className="label">Lokasi stok awal</span>
              <select value={locationCode} onChange={(event) => setLocationCode(event.target.value)} className="input">
                {locations.map((location) => (
                  <option key={location.code} value={location.code}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="sm:col-span-2 rounded-lg bg-[#f6f8f9] p-3 text-[11px] leading-5 text-[#7a858d]">
              Stok awal dicatat sebagai saldo awal. Pembelian berikutnya akan memperbarui harga modal rata-rata.
            </p>
          </>
        )}

        {error && <p className="sm:col-span-2 rounded-lg bg-[#fff0ee] p-3 text-xs text-[#c96c5e]">{error}</p>}

        <div className="mt-2 flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-[#e1e6e8] px-4 py-2.5 text-xs font-semibold text-[#6d7880]">
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#1f8f80] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? <Spinner label="Menyimpan..." /> : editing ? "Simpan perubahan" : "Simpan barang"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function StockActionModal({
  product,
  locations,
  type,
  onClose,
  onSaved,
}: {
  product: Product;
  locations: Location[];
  type: "KELUAR" | "PINDAH";
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const sourceOptions = product.locations.filter((location) => location.quantity > 0);
  const [sourceCode, setSourceCode] = useState(sourceOptions[0]?.code ?? "");
  const [destCode, setDestCode] = useState(locations.find((location) => location.code !== sourceOptions[0]?.code)?.code ?? "");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState(type === "KELUAR" ? "Terjual" : "Penyusunan ulang");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const source = product.locations.find((location) => location.code === sourceCode);
  const maxQuantity = source?.quantity ?? 0;
  const destinationOptions = locations.filter((location) => location.code !== sourceCode);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!sourceCode) {
      setError("Pilih lokasi asal yang memiliki stok.");
      return;
    }
    if (quantity < 1 || quantity > maxQuantity) {
      setError(`Jumlah harus antara 1 dan ${maxQuantity}.`);
      return;
    }
    if (type === "PINDAH" && !destCode) {
      setError("Pilih lokasi tujuan.");
      return;
    }
    setSaving(true);
    const response = await fetch("/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        type,
        quantity,
        locationCode: sourceCode,
        destinationCode: type === "PINDAH" ? destCode : undefined,
        reason,
      }),
    });
    const body = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      setError(body?.error ?? "Perubahan stok gagal disimpan.");
      return;
    }
    await onSaved();
    onClose();
  }

  return (
    <Modal
      title={type === "KELUAR" ? "Barang keluar" : "Pindah lokasi"}
      description={`${product.name} · total stok ${product.stock} ${product.unit}`}
      onClose={onClose}
      width="max-w-md"
    >
      {sourceOptions.length === 0 ? (
        <div className="mt-6 rounded-xl bg-[#fff8ea] p-4 text-xs leading-5 text-[#8a6a2f]">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={15} /> Stok tidak tersedia</p>
          <p className="mt-2">
            Barang ini belum punya stok di lokasi mana pun. Tambahkan lewat pembelian atau stock count terlebih dahulu.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <label>
            <span className="label">Lokasi asal</span>
            <select
              value={sourceCode}
              onChange={(event) => {
                const nextSource = event.target.value;
                setSourceCode(nextSource);
                setQuantity(1);
                setDestCode(locations.find((location) => location.code !== nextSource)?.code ?? "");
              }}
              className="input"
            >
              {sourceOptions.map((location) => (
                <option key={location.code} value={location.code}>
                  {location.name} — {formatNumber(location.quantity)} {product.unit}
                </option>
              ))}
            </select>
          </label>

          {type === "PINDAH" && (
            <label>
              <span className="label">Lokasi tujuan</span>
              <select value={destCode} onChange={(event) => setDestCode(event.target.value)} className="input" required>
                {destinationOptions.map((location) => (
                  <option key={location.code} value={location.code}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            <span className="label">Jumlah (maks. {formatNumber(maxQuantity)} {product.unit})</span>
            <input
              type="number"
              min={1}
              max={maxQuantity}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className="input"
              required
            />
          </label>

          <label>
            <span className="label">{type === "KELUAR" ? "Alasan" : "Catatan"}</span>
            <select value={reason} onChange={(event) => setReason(event.target.value)} className="input">
              {type === "KELUAR" ? (
                <>
                  <option>Terjual</option>
                  <option>Rusak</option>
                  <option>Hilang</option>
                  <option>Lainnya</option>
                </>
              ) : (
                <>
                  <option>Penyusunan ulang</option>
                  <option>Pengisian rak</option>
                  <option>Pemindahan gudang</option>
                </>
              )}
            </select>
          </label>

          {error && <p className="rounded-lg bg-[#fff0ee] p-3 text-xs text-[#c96c5e]">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-[#e1e6e8] px-4 py-2.5 text-xs font-semibold">
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#1f8f80] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {saving ? <Spinner label="Menyimpan..." /> : "Simpan"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
