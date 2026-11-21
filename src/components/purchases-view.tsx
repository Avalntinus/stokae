"use client";

import { Plus, ReceiptText, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Location, Product, PurchaseRecord, defaultLocationCode, formatRupiah } from "@/lib/ui";
import { EmptyState, Modal, PageHeading, Spinner } from "@/components/ui";

type DraftItem = {
  key: string;
  productId: string;
  locationCode: string;
  quantity: number;
  unitCost: number;
};

function newItem(locations: Location[]): DraftItem {
  return {
    key: crypto.randomUUID(),
    productId: "",
    locationCode: defaultLocationCode(locations),
    quantity: 1,
    unitCost: 0,
  };
}

export function PurchasesView({
  purchases,
  products,
  locations,
  onSaved,
  notify,
}: {
  purchases: PurchaseRecord[];
  products: Product[];
  locations: Location[];
  onSaved: () => Promise<void>;
  notify: (kind: "success" | "error", message: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeading
        eyebrow="Catat barang masuk dan harga modal"
        title="Riwayat pembelian"
        action={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1f8f80] px-4 text-xs font-semibold text-white"
          >
            <Plus size={17} /> Tambah pembelian
          </button>
        }
      />

      <section className="rounded-2xl border border-[#e6e9ed] bg-white p-5 md:p-6">
        <div className="mb-5">
          <h3 className="text-sm font-bold">Pembelian terbaru</h3>
          <p className="mt-1 text-[11px] text-[#929ba3]">Semua transaksi yang menambah stok</p>
        </div>
        {purchases.length === 0 ? (
          <EmptyState
            icon={<ReceiptText size={22} />}
            title="Belum ada pembelian"
            description="Catat pembelian pertama untuk menambah stok dan menyimpan harga modal barang."
            actionLabel="Tambah pembelian"
            onAction={() => setOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="border-b border-[#eef0f2] text-[10px] uppercase tracking-[0.1em] text-[#9aa3aa]">
                  <th className="pb-3 font-semibold">Tanggal</th>
                  <th className="pb-3 font-semibold">Pemasok</th>
                  <th className="pb-3 font-semibold">Nota</th>
                  <th className="pb-3 font-semibold">Barang</th>
                  <th className="pb-3 text-right font-semibold">Total</th>
                  <th className="pb-3 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="border-b border-[#f1f2f3] last:border-0">
                    <td className="py-4 pr-4 text-xs text-[#69757e]">{purchase.date}</td>
                    <td className="py-4 pr-4 text-xs font-semibold">{purchase.supplier}</td>
                    <td className="py-4 pr-4 text-xs text-[#8a949d]">{purchase.invoiceNo || "—"}</td>
                    <td className="py-4 pr-4">
                      <p className="text-xs text-[#69757e]">{purchase.itemLabel}</p>
                      <p className="mt-1 text-[10px] text-[#a0a8ae]">{purchase.items} jenis barang</p>
                    </td>
                    <td className="py-4 pr-4 text-right text-xs font-semibold">{formatRupiah(purchase.total)}</td>
                    <td className="py-4 text-right">
                      <span
                        className={`rounded-md px-2 py-1 text-[9px] font-bold ${
                          purchase.status === "Dibatalkan"
                            ? "bg-[#fff0ee] text-[#d96f61]"
                            : "bg-[#e8f6f3] text-[#2c8e7a]"
                        }`}
                      >
                        {purchase.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {open && (
        <PurchaseModal
          products={products}
          locations={locations}
          onClose={() => setOpen(false)}
          onSaved={onSaved}
          notify={notify}
        />
      )}
    </>
  );
}

function PurchaseModal({
  products,
  locations,
  onClose,
  onSaved,
  notify,
}: {
  products: Product[];
  locations: Location[];
  onClose: () => void;
  onSaved: () => Promise<void>;
  notify: (kind: "success" | "error", message: string) => void;
}) {
  const [supplier, setSupplier] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<DraftItem[]>([newItem(locations)]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitCost || 0), 0),
    [items],
  );

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const validItems = items.filter((item) => item.productId && item.quantity > 0);
    if (!validItems.length) {
      setError("Pilih minimal satu barang dengan jumlah lebih dari 0.");
      return;
    }
    if (validItems.some((item) => !item.locationCode)) {
      setError("Lokasi tujuan wajib dipilih untuk setiap barang.");
      return;
    }
    setSaving(true);
    const response = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purchaseDate,
        supplier: supplier.trim() || undefined,
        invoiceNo: invoiceNo.trim() || undefined,
        items: validItems.map(({ productId, locationCode, quantity, unitCost }) => ({
          productId,
          locationCode,
          quantity,
          unitCost,
        })),
      }),
    });
    const body = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      setError(body?.error ?? "Pembelian gagal disimpan.");
      return;
    }
    await onSaved();
    notify("success", "Pembelian berhasil disimpan dan stok sudah diperbarui.");
    onClose();
  }

  return (
    <Modal
      title="Tambah pembelian"
      description="Catat barang masuk, lokasi tujuan, dan harga modalnya."
      onClose={onClose}
      width="max-w-3xl"
    >
      <form onSubmit={submit} className="mt-6 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <label>
            <span className="label">Tanggal</span>
            <input type="date" required value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} className="input" />
          </label>
          <label>
            <span className="label">Pemasok</span>
            <input value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder="Mitra Elektrik" className="input" />
          </label>
          <label>
            <span className="label">Nomor nota</span>
            <input value={invoiceNo} onChange={(event) => setInvoiceNo(event.target.value)} placeholder="Opsional" className="input" />
          </label>
        </div>

        <div className="rounded-xl border border-[#e8ebed]">
          <div className="hidden gap-2 border-b border-[#eef0f2] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9aa3aa] sm:grid sm:grid-cols-[1.6fr_1fr_70px_100px_32px]">
            <span>Barang</span>
            <span>Lokasi</span>
            <span className="text-right">Jumlah</span>
            <span className="text-right">Harga satuan</span>
            <span />
          </div>
          <div className="divide-y divide-[#f1f2f3]">
            {items.map((item) => (
              <div key={item.key} className="grid gap-2 p-3 sm:grid-cols-[1.6fr_1fr_70px_100px_32px] sm:items-center">
                <select
                  aria-label="Barang"
                  value={item.productId}
                  onChange={(event) => updateItem(item.key, { productId: event.target.value })}
                  className="input"
                  required
                >
                  <option value="">Pilih barang</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Lokasi tujuan"
                  value={item.locationCode}
                  onChange={(event) => updateItem(item.key, { locationCode: event.target.value })}
                  className="input"
                  required
                >
                  {locations.map((location) => (
                    <option key={location.code} value={location.code}>
                      {location.name}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Jumlah"
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(event) => updateItem(item.key, { quantity: Number(event.target.value) })}
                  className="input text-right"
                  required
                />
                <input
                  aria-label="Harga satuan"
                  type="number"
                  min="0"
                  value={item.unitCost}
                  onChange={(event) => updateItem(item.key, { unitCost: Number(event.target.value) })}
                  className="input text-right"
                  required
                />
                <button
                  type="button"
                  aria-label="Hapus baris"
                  onClick={() => setItems((current) => (current.length > 1 ? current.filter((entry) => entry.key !== item.key) : current))}
                  disabled={items.length === 1}
                  className="justify-self-end rounded-lg p-2 text-[#d97163] hover:bg-[#fff0ee] disabled:opacity-30 sm:justify-self-auto"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 border-t border-[#eef0f2] p-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setItems((current) => [...current, newItem(locations)])}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1f8f80]"
            >
              <Plus size={14} /> Tambah baris
            </button>
            <p className="text-xs text-[#69757e]">
              Total: <b className="text-sm text-[#27333c]">{formatRupiah(total)}</b>
            </p>
          </div>
        </div>

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
            {saving ? <Spinner label="Menyimpan..." /> : "Simpan pembelian"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
