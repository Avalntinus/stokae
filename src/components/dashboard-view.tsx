"use client";

import {
  AlertTriangle,
  BarChart3,
  Boxes,
  ChevronRight,
  PackagePlus,
  Plus,
  Sparkles,
} from "lucide-react";
import { DashboardSummary, Product, formatNumber, formatRupiah } from "@/lib/ui";
import { ProductTable } from "@/components/product-table";

export function DashboardView({
  summary,
  products,
  onAdd,
  onAi,
  onNavigate,
  onEdit,
  onDelete,
}: {
  summary: DashboardSummary;
  products: Product[];
  onAdd: () => void;
  onAi: () => void;
  onNavigate: (page: "barang" | "pembelian" | "stock-count") => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}) {
  const firstName = summary.user.name.split(/\s+/)[0] || "Pengguna";
  const attention = products.filter((product) => product.status !== "Aman").slice(0, 5);
  const maxUnits = Math.max(1, ...summary.categories.slice(0, 5).map((category) => category.units));
  const totalCategorized = summary.categories.reduce((sum, category) => sum + category.units, 0);

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-sm text-[#7e8993]">Selamat datang kembali, {firstName} 👋</p>
          <h2 className="text-[27px] font-bold tracking-[-0.03em]">Pantau stok inventaris hari ini.</h2>
          <p className="mt-2 text-sm text-[#89939c]">Berikut ringkasan kondisi stok Anda.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAi}
            className="flex h-11 items-center gap-2 rounded-xl border border-[#d5ebe6] bg-white px-4 text-xs font-semibold text-[#218678] hover:bg-[#f2faf8]"
          >
            <Sparkles size={16} /> Tanya Stok
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="flex h-11 items-center gap-2 rounded-xl bg-[#1f8f80] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#197d70]"
          >
            <Plus size={17} /> Tambah barang
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          label="Jenis barang aktif"
          value={String(summary.productCount)}
          helper={`${summary.categories.length} kategori terpakai`}
          icon={<Boxes size={19} />}
          tone="teal"
        />
        <KpiCard
          label="Total unit stok"
          value={formatNumber(summary.totalUnits)}
          helper={`${summary.locationCount} lokasi terisi`}
          icon={<PackagePlus size={19} />}
          tone="blue"
        />
        <KpiCard
          label="Nilai persediaan"
          value={formatRupiah(summary.inventoryValue)}
          helper="harga modal rata-rata"
          icon={<BarChart3 size={19} />}
          tone="purple"
        />
        <KpiCard
          label="Perlu perhatian"
          value={String(summary.lowStock)}
          helper="menipis atau habis"
          icon={<AlertTriangle size={19} />}
          tone="amber"
        />
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <section className="rounded-2xl border border-[#e6e9ed] bg-white p-5 md:p-6">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold">Stok berdasarkan kategori</h3>
              <p className="mt-1 text-[11px] text-[#929ba3]">Jumlah unit di seluruh lokasi</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("barang")}
              className="text-[11px] font-semibold text-[#1f8f80]"
            >
              Lihat barang <ChevronRight className="inline" size={13} />
            </button>
          </div>

          {summary.categories.length === 0 ? (
            <p className="rounded-xl bg-[#f7f9fa] px-4 py-8 text-center text-xs text-[#8b959d]">
              Belum ada barang untuk ditampilkan.
            </p>
          ) : (
            <div className="space-y-5">
              {summary.categories.slice(0, 5).map((category, index) => {
                const colors = ["#2a9d8f", "#5b8def", "#e7a54c", "#ab83d1", "#7aa6a0"];
                const share = totalCategorized ? Math.round((category.units / totalCategorized) * 100) : 0;
                return (
                  <div key={category.name}>
                    <div className="mb-2 flex justify-between text-xs">
                      <span className="font-medium">{category.name}</span>
                      <span className="text-[#8b959d]">
                        {formatNumber(category.units)} unit · {share}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#f0f2f3]">
                      <div
                        style={{
                          width: `${Math.max(category.units > 0 ? 3 : 0, Math.round((category.units / maxUnits) * 100))}%`,
                          backgroundColor: colors[index % colors.length],
                        }}
                        className="h-full rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-7 flex items-center justify-between border-t border-[#eef0f2] pt-5">
            <div className="flex items-center gap-2 text-[11px] text-[#818c95]">
              <span className="h-2 w-2 rounded-full bg-[#2a9d8f]" />
              Total {formatNumber(summary.totalUnits)} unit terdata
            </div>
            <button
              type="button"
              onClick={() => onNavigate("stock-count")}
              className="text-[11px] font-semibold text-[#1f8f80]"
            >
              Stock Count
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e6e9ed] bg-white p-5 md:p-6">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold">Perlu perhatian</h3>
              <p className="mt-1 text-[11px] text-[#929ba3]">Segera periksa barang berikut</p>
            </div>
            <button
              type="button"
              aria-label="Buka barang perlu perhatian"
              onClick={() => onNavigate("barang")}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f7f8f9] text-[#8b959d]"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {attention.length === 0 ? (
            <div className="rounded-xl border border-[#e4f1ed] bg-[#f4fbf9] px-4 py-8 text-center">
              <p className="text-xs font-semibold text-[#2b806f]">Semua stok dalam kondisi aman.</p>
              <p className="mt-1 text-[11px] text-[#7a9a93]">Tidak ada barang menipis atau habis.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attention.map((product) => (
                <div key={product.id} className="flex items-center gap-3 rounded-xl border border-[#f0f1f2] p-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      product.status === "Habis" ? "bg-[#fff0ee] text-[#df7566]" : "bg-[#fff5e3] text-[#d99532]"
                    }`}
                  >
                    <AlertTriangle size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{product.name}</p>
                    <p className="mt-1 text-[10px] text-[#929ba3]">
                      {product.locations.filter((location) => location.quantity > 0).map((location) => location.name).join(", ") ||
                        "Belum ditempatkan"}{" "}
                      · stok {product.stock} {product.unit}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-bold ${
                      product.status === "Habis" ? "bg-[#fff0ee] text-[#d96f61]" : "bg-[#fff5e3] text-[#c48624]"
                    }`}
                  >
                    {product.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => onNavigate("barang")}
            className="mt-5 w-full rounded-xl border border-[#e4e8ea] py-2.5 text-[11px] font-semibold text-[#69757e] hover:bg-[#f8fafb]"
          >
            Lihat semua perhatian
          </button>
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-[#e6e9ed] bg-white p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">Barang terbaru</h3>
            <p className="mt-1 text-[11px] text-[#929ba3]">Barang yang terakhir ditambahkan atau diperbarui</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("barang")}
            className="text-[11px] font-semibold text-[#1f8f80]"
          >
            Lihat semua <ChevronRight className="inline" size={13} />
          </button>
        </div>
        {products.length === 0 ? (
          <p className="rounded-xl bg-[#f7f9fa] px-4 py-8 text-center text-xs text-[#8b959d]">
            Belum ada barang. Tambahkan barang pertama untuk mulai memantau stok.
          </p>
        ) : (
          <ProductTable products={products.slice(0, 5)} onEdit={onEdit} onDelete={onDelete} />
        )}
      </section>
    </>
  );
}

function KpiCard({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  tone: "teal" | "blue" | "purple" | "amber";
}) {
  const tones: Record<string, string> = {
    teal: "bg-[#e8f6f3] text-[#218678]",
    blue: "bg-[#edf3ff] text-[#5b83d4]",
    purple: "bg-[#f3effb] text-[#946fc3]",
    amber: "bg-[#fff5e3] text-[#d29432]",
  };
  return (
    <div className="rounded-2xl border border-[#e6e9ed] bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
      </div>
      <p className="mt-4 text-[11px] text-[#89939c] sm:mt-5">{label}</p>
      <p className="mt-1 truncate text-[18px] font-bold tracking-tight sm:text-[23px]" title={value}>
        {value}
      </p>
      <p className="mt-1 flex items-center gap-1 text-[10px] leading-4 text-[#a0a8ae]">{helper}</p>
    </div>
  );
}
