"use client";

import { Boxes, Download, Plus, SearchX } from "lucide-react";
import { useState } from "react";
import { Product } from "@/lib/ui";
import { EmptyState, PageHeading } from "@/components/ui";
import { ProductTable } from "@/components/product-table";

type Filter = "semua" | "menipis" | "habis";

export function ProductsView({
  products,
  query,
  onAdd,
  onEdit,
  onDelete,
  onStock,
}: {
  products: Product[];
  query: string;
  onAdd: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onStock: (product: Product, type: "KELUAR" | "PINDAH") => void;
}) {
  const [filter, setFilter] = useState<Filter>("semua");
  const counts = {
    semua: products.length,
    menipis: products.filter((product) => product.status === "Menipis").length,
    habis: products.filter((product) => product.status === "Habis").length,
  };
  const visibleProducts =
    filter === "semua"
      ? products
      : products.filter((product) => (filter === "habis" ? product.status === "Habis" : product.status === "Menipis"));

  return (
    <>
      <PageHeading
        eyebrow="Kelola semua inventaris toko"
        title="Daftar barang"
        action={
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/export/products"
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#dfe5e8] bg-white px-4 text-xs font-semibold text-[#5f6c76] hover:bg-[#f8fafb]"
            >
              <Download size={16} /> Ekspor CSV
            </a>
            <button
              type="button"
              onClick={onAdd}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1f8f80] px-4 text-xs font-semibold text-white"
            >
              <Plus size={17} /> Tambah barang
            </button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["semua", `Semua barang (${counts.semua})`],
            ["menipis", `Stok menipis (${counts.menipis})`],
            ["habis", `Habis (${counts.habis})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-lg px-3 py-2 text-[11px] ${
              filter === key
                ? key === "menipis"
                  ? "bg-[#fff5e3] font-semibold text-[#c48624]"
                  : key === "habis"
                    ? "bg-[#fff0ee] font-semibold text-[#d96f61]"
                    : "bg-[#e9f6f3] font-semibold text-[#1f8f80]"
                : "border border-[#e5e9eb] bg-white text-[#7e8993]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-[#e6e9ed] bg-white p-5 md:p-6">
        {query && (
          <p className="mb-4 text-xs text-[#8a949d]">
            Menampilkan hasil untuk <b className="text-[#27333c]">&quot;{query}&quot;</b>
          </p>
        )}
        {visibleProducts.length === 0 ? (
          query ? (
            <EmptyState
              icon={<SearchX size={22} />}
              title="Barang tidak ditemukan"
              description={`Tidak ada barang yang cocok dengan "${query}". Coba kata kunci lain atau hapus filter.`}
            />
          ) : (
            <EmptyState
              icon={<Boxes size={22} />}
              title={filter === "semua" ? "Belum ada barang" : "Tidak ada barang di filter ini"}
              description={
                filter === "semua"
                  ? "Tambahkan barang pertama, lalu catat pembelian untuk mengisi stok dan harga modal."
                  : "Semua barang di kategori ini sedang dalam kondisi aman."
              }
              actionLabel={filter === "semua" ? "Tambah barang" : undefined}
              onAction={filter === "semua" ? onAdd : undefined}
            />
          )
        ) : (
          <ProductTable products={visibleProducts} onEdit={onEdit} onDelete={onDelete} onStock={onStock} />
        )}
      </section>
    </>
  );
}
