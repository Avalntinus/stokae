"use client";

import { AlertTriangle, Camera, CheckCircle2, FileText, Sparkles, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Location, Product, defaultLocationCode, formatRupiah } from "@/lib/ui";
import { EmptyState, PageHeading, Spinner } from "@/components/ui";

type ExtractedItem = {
  name?: string;
  quantity?: number;
  unit?: string;
  unitCost?: number;
  subtotal?: number;
  confidence?: number;
};

type ExtractedReceipt = {
  supplier?: string;
  date?: string;
  invoiceNo?: string;
  items?: ExtractedItem[];
  total?: number;
};

type DraftRow = {
  key: string;
  name: string;
  productId: string;
  quantity: number;
  unitCost: number;
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function matchProduct(name: string, products: Product[]) {
  const target = normalize(name);
  if (!target) return "";
  const exact = products.find((product) => normalize(product.name) === target);
  if (exact) return exact.id;
  const tokens = target.split(" ").filter((token) => token.length > 2);
  let best = { id: "", score: 0 };
  for (const product of products) {
    const candidate = normalize(`${product.name} ${product.sku}`);
    const score = tokens.reduce((sum, token) => sum + (candidate.includes(token) ? 1 : 0), 0);
    if (score > best.score) best = { id: product.id, score };
  }
  return best.score > 0 ? best.id : "";
}

function toDateInput(value?: string) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime())) return iso.toISOString().slice(0, 10);
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return new Date().toISOString().slice(0, 10);
}

export function ScanReceiptView({
  products,
  locations,
  onSaved,
  onManual,
  notify,
}: {
  products: Product[];
  locations: Location[];
  onSaved: () => Promise<void>;
  onManual: () => void;
  notify: (kind: "success" | "error", message: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [extracted, setExtracted] = useState<ExtractedReceipt | null>(null);
  const [supplier, setSupplier] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [locationCode, setLocationCode] = useState(defaultLocationCode(locations));
  const [rows, setRows] = useState<DraftRow[]>([]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const total = useMemo(() => rows.reduce((sum, row) => sum + row.quantity * row.unitCost, 0), [rows]);

  function reset() {
    setFile(null);
    setPreviewUrl("");
    setExtracted(null);
    setRows([]);
    setError("");
    setNotice("");
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (selected.size > 1_500_000) {
      setError("Ukuran nota maksimal 1,5 MB. Kompres foto terlebih dahulu.");
      return;
    }
    setFile(selected);
    setPreviewUrl(selected.type.startsWith("image/") ? URL.createObjectURL(selected) : "");
    setError("");
    setNotice("");
    setExtracted(null);
    setRows([]);
  }

  async function extract() {
    if (!file) return;
    setExtracting(true);
    setError("");
    setNotice("");
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/ai/scan-receipt", { method: "POST", body: form });
    const body = await response.json().catch(() => null);
    setExtracting(false);
    if (!response.ok) {
      setError(body?.error ?? "Nota belum bisa dibaca.");
      return;
    }
    const data = (body?.extracted ?? {}) as ExtractedReceipt;
    const items = Array.isArray(data.items) ? data.items : [];
    const draft = items.map((item, index) => ({
      key: `${index}-${normalize(String(item.name ?? ""))}`,
      name: String(item.name ?? "Barang tanpa nama"),
      productId: matchProduct(String(item.name ?? ""), products),
      quantity: Math.max(1, Math.round(Number(item.quantity ?? 1))),
      unitCost: Math.max(0, Math.round(Number(item.unitCost ?? item.subtotal ?? 0))),
    }));
    setExtracted(data);
    setRows(draft);
    setSupplier(String(data.supplier ?? ""));
    setInvoiceNo(String(data.invoiceNo ?? ""));
    setPurchaseDate(toDateInput(data.date));
    setNotice(
      draft.length
        ? "Nota berhasil dibaca. Periksa dan cocokkan setiap barang sebelum menyimpan."
        : "Nota terbaca, tetapi tidak ada item yang dikenali. Coba foto yang lebih jelas atau input manual.",
    );
  }

  async function save() {
    setError("");
    if (!rows.length) {
      setError("Tidak ada item untuk disimpan.");
      return;
    }
    const unmatched = rows.filter((row) => !row.productId);
    if (unmatched.length) {
      setError(`Cocokkan barang terlebih dahulu: ${unmatched.map((row) => row.name).join(", ")}.`);
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
        items: rows.map((row) => ({
          productId: row.productId,
          locationCode,
          quantity: row.quantity,
          unitCost: row.unitCost,
        })),
      }),
    });
    const body = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      setError(body?.error ?? "Pembelian dari nota gagal disimpan.");
      return;
    }
    await onSaved();
    notify("success", "Pembelian dari nota berhasil disimpan.");
    reset();
  }

  return (
    <>
      <PageHeading eyebrow="Foto nota menjadi data pembelian" title="Scan Nota" />

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.4fr]">
        <section className="rounded-2xl border border-[#e6e9ed] bg-white p-5 md:p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#20897b]">
            <Camera size={16} /> 1. Unggah nota
          </div>
          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#cfe6e1] bg-[#f5fbfa] px-5 py-10 text-center hover:bg-[#eef9f6]">
            <Upload className="text-[#2b9c8b]" size={26} />
            <p className="mt-3 text-sm font-bold">Pilih foto atau PDF nota</p>
            <p className="mt-1 text-[11px] text-[#8c999e]">Maksimal 1,5 MB · JPG, PNG, PDF</p>
            <input type="file" accept="image/*,application/pdf" onChange={handleFile} className="hidden" />
          </label>

          {file && (
            <div className="mt-4 rounded-xl border border-[#eef0f2] p-3">
              <div className="flex items-center gap-2 text-xs">
                <FileText size={16} className="text-[#20897b]" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <button type="button" onClick={reset} className="text-[11px] font-semibold text-[#8b959d] hover:text-[#5f6c76]">
                  Ganti
                </button>
              </div>
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Pratinjau nota" className="mt-3 max-h-64 w-full rounded-lg object-contain" />
              )}
              <button
                type="button"
                onClick={extract}
                disabled={extracting}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f8f80] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {extracting ? <Spinner label="Membaca nota..." /> : <><Sparkles size={15} /> Baca nota</>}
              </button>
            </div>
          )}

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#fff9ec] p-3 text-[11px] leading-5 text-[#8a6a2f]">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            Hasil AI bisa keliru. Periksa nama barang, jumlah, dan harga sebelum menyimpan.
          </div>
        </section>

        <section className="rounded-2xl border border-[#e6e9ed] bg-white p-5 md:p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#20897b]">
            <CheckCircle2 size={16} /> 2. Periksa hasil
          </div>

          {error && <p className="mt-4 rounded-xl bg-[#fff0ee] p-3 text-xs text-[#c96c5e]">{error}</p>}
          {notice && <p className="mt-4 rounded-xl bg-[#eef7f5] p-3 text-xs text-[#2b806f]">{notice}</p>}

          {!extracted ? (
            <div className="mt-4">
              <EmptyState
                icon={<FileText size={22} />}
                title="Belum ada hasil"
                description="Unggah nota, lalu klik Baca nota. Kalau AI belum aktif, gunakan input pembelian manual."
                actionLabel="Input pembelian manual"
                onAction={onManual}
              />
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <label>
                  <span className="label">Pemasok</span>
                  <input value={supplier} onChange={(event) => setSupplier(event.target.value)} className="input" placeholder="Nama pemasok" />
                </label>
                <label>
                  <span className="label">Tanggal</span>
                  <input type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} className="input" />
                </label>
                <label>
                  <span className="label">Nomor nota</span>
                  <input value={invoiceNo} onChange={(event) => setInvoiceNo(event.target.value)} className="input" placeholder="Opsional" />
                </label>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#e8ebed]">
                <table className="w-full min-w-[620px] text-left">
                  <thead className="bg-[#f8fafb] text-[10px] uppercase tracking-[0.08em] text-[#9aa3aa]">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Nama di nota</th>
                      <th className="px-3 py-2 font-semibold">Cocokkan barang</th>
                      <th className="px-3 py-2 text-right font-semibold">Qty</th>
                      <th className="px-3 py-2 text-right font-semibold">Harga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.key} className="border-t border-[#f1f2f3]">
                        <td className="px-3 py-2 text-xs">
                          <p className="max-w-[180px] truncate font-medium" title={row.name}>{row.name}</p>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            aria-label={`Cocokkan ${row.name}`}
                            value={row.productId}
                            onChange={(event) =>
                              setRows((current) =>
                                current.map((entry) => (entry.key === row.key ? { ...entry, productId: event.target.value } : entry)),
                              )
                            }
                            className="input h-9 min-w-[170px]"
                          >
                            <option value="">Pilih barang</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            aria-label={`Jumlah ${row.name}`}
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(event) =>
                              setRows((current) =>
                                current.map((entry) => (entry.key === row.key ? { ...entry, quantity: Number(event.target.value) } : entry)),
                              )
                            }
                            className="input h-9 w-20 text-right"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            aria-label={`Harga ${row.name}`}
                            type="number"
                            min="0"
                            value={row.unitCost}
                            onChange={(event) =>
                              setRows((current) =>
                                current.map((entry) => (entry.key === row.key ? { ...entry, unitCost: Number(event.target.value) } : entry)),
                              )
                            }
                            className="input h-9 w-28 text-right"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <label className="w-full sm:w-60">
                  <span className="label">Lokasi tujuan</span>
                  <select value={locationCode} onChange={(event) => setLocationCode(event.target.value)} className="input">
                    {locations.map((location) => (
                      <option key={location.code} value={location.code}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-xs text-[#69757e]">
                  Total: <b className="text-sm text-[#27333c]">{formatRupiah(total)}</b>
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={reset} className="rounded-xl border border-[#e1e6e8] px-4 py-2.5 text-xs font-semibold">
                  Mulai ulang
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || !rows.length}
                  className="rounded-xl bg-[#1f8f80] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {saving ? <Spinner label="Menyimpan..." /> : "Simpan sebagai pembelian"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
