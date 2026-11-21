"use client";

import { ArrowDownLeft, Boxes, Pencil, Trash2, Warehouse } from "lucide-react";
import { Product, formatRupiah } from "@/lib/ui";

type ProductTableProps = {
  products: Product[];
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onStock?: (product: Product, type: "KELUAR" | "PINDAH") => void;
};

function statusClasses(status: Product["status"]) {
  if (status === "Aman") return "text-[#32916f]";
  if (status === "Menipis") return "text-[#c5892b]";
  return "text-[#d97163]";
}

function statusBadgeClasses(status: Product["status"]) {
  if (status === "Aman") return "bg-[#e8f6f3] text-[#2c8e7a]";
  if (status === "Menipis") return "bg-[#fff5e3] text-[#c48624]";
  return "bg-[#fff0ee] text-[#d96f61]";
}

function locationLabel(product: Product) {
  const filled = product.locations.filter((location) => location.quantity > 0);
  return filled.length ? filled.map((location) => location.name).join(", ") : "Belum ditempatkan";
}

function RowActions({ product, onEdit, onDelete, onStock }: Omit<ProductTableProps, "products"> & { product: Product }) {
  if (!onEdit && !onDelete && !onStock) return null;
  return (
    <>
      {onStock && (
        <>
          <button
            type="button"
            title="Barang keluar"
            aria-label={`Barang keluar ${product.name}`}
            onClick={() => onStock(product, "KELUAR")}
            className="rounded-lg p-2 text-[#c48624] hover:bg-[#fff5e3]"
          >
            <ArrowDownLeft size={15} />
          </button>
          <button
            type="button"
            title="Pindahkan barang"
            aria-label={`Pindahkan ${product.name}`}
            onClick={() => onStock(product, "PINDAH")}
            className="rounded-lg p-2 text-[#5b83d4] hover:bg-[#edf3ff]"
          >
            <Warehouse size={15} />
          </button>
        </>
      )}
      {onEdit && (
        <button
          type="button"
          title="Edit barang"
          aria-label={`Edit ${product.name}`}
          onClick={() => onEdit(product)}
          className="rounded-lg p-2 text-[#70808c] hover:bg-[#f2f5f6]"
        >
          <Pencil size={15} />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          title="Hapus barang"
          aria-label={`Hapus ${product.name}`}
          onClick={() => onDelete(product)}
          className="rounded-lg p-2 text-[#d97163] hover:bg-[#fff0ee]"
        >
          <Trash2 size={15} />
        </button>
      )}
    </>
  );
}

export function ProductTable({ products, onEdit, onDelete, onStock }: ProductTableProps) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-b border-[#eef0f2] text-[10px] uppercase tracking-[0.1em] text-[#9aa3aa]">
              <th className="pb-3 font-semibold">Nama barang</th>
              <th className="pb-3 font-semibold">Kategori</th>
              <th className="pb-3 font-semibold">Stok</th>
              <th className="pb-3 font-semibold">Lokasi</th>
              <th className="pb-3 text-right font-semibold">Harga modal</th>
              {(onEdit || onDelete || onStock) && <th className="pb-3 text-right font-semibold">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const label = locationLabel(product);
              const filled = product.locations.filter((location) => location.quantity > 0);
              return (
                <tr key={product.id} className="border-b border-[#f1f2f3] last:border-0">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f1f7f6] text-[#328e82]">
                        <Boxes size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{product.name}</p>
                        <p className="mt-1 text-[10px] text-[#a0a8ae]">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-xs text-[#69757e]">{product.category}</td>
                  <td className="py-4 pr-4">
                    <p className="text-xs font-semibold">
                      {product.stock} <span className="font-normal text-[#9ca5ac]">{product.unit}</span>
                    </p>
                    <span className={`mt-1 inline-block text-[9px] font-semibold ${statusClasses(product.status)}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="max-w-[220px] py-4 pr-4">
                    <p className="truncate text-xs text-[#69757e]" title={label}>
                      {label}
                    </p>
                    {filled.length > 1 && <p className="mt-1 text-[10px] text-[#a0a8ae]">{filled.length} lokasi</p>}
                  </td>
                  <td className="py-4 pr-4 text-right text-xs font-semibold">
                    {product.avgCost > 0 ? formatRupiah(product.avgCost) : <span className="text-[#b3bac0]">—</span>}
                  </td>
                  {(onEdit || onDelete || onStock) && (
                    <td className="py-4">
                      <div className="flex justify-end gap-1">
                        <RowActions product={product} onEdit={onEdit} onDelete={onDelete} onStock={onStock} />
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {products.map((product) => {
          const label = locationLabel(product);
          return (
            <article key={product.id} className="rounded-xl border border-[#edf0f2] p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f1f7f6] text-[#328e82]">
                  <Boxes size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{product.name}</p>
                  <p className="mt-1 truncate text-[10px] text-[#a0a8ae]">
                    {product.sku} · {product.category}
                  </p>
                </div>
                <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${statusBadgeClasses(product.status)}`}>
                  {product.status}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <dt className="text-[#9aa3aa]">Stok</dt>
                  <dd className="mt-0.5 text-xs font-semibold">
                    {product.stock} <span className="font-normal text-[#9ca5ac]">{product.unit}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[#9aa3aa]">Harga modal</dt>
                  <dd className="mt-0.5 text-xs font-semibold">
                    {product.avgCost > 0 ? formatRupiah(product.avgCost) : <span className="text-[#b3bac0]">—</span>}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[#9aa3aa]">Lokasi</dt>
                  <dd className="mt-0.5 text-[11px] text-[#69757e]">{label}</dd>
                </div>
              </dl>
              {(onEdit || onDelete || onStock) && (
                <div className="mt-2 flex justify-end gap-1 border-t border-[#f1f2f3] pt-2">
                  <RowActions product={product} onEdit={onEdit} onDelete={onDelete} onStock={onStock} />
                </div>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
