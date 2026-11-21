export type StockStatus = "Aman" | "Menipis" | "Habis";

export type StockLocation = {
  id: string;
  code: string;
  name: string;
  quantity: number;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  sku: string;
  unit: string;
  stock: number;
  minStock: number;
  avgCost: number;
  status: StockStatus;
  locations: StockLocation[];
};

export type Location = {
  id: string;
  code: string;
  name: string;
  type: string;
  productCount: number;
  unitCount: number;
};

/** Lokasi default saat menambah barang/pembelian: hindari "belum ditempatkan" bila ada rak/gudang. */
export function defaultLocationCode(locations: Location[]) {
  const usable = locations.find((location) => location.code !== "BELUM-DITEMPATKAN");
  return usable?.code ?? locations[0]?.code ?? "BELUM-DITEMPATKAN";
}

export type PurchaseRecord = {
  id: string;
  date: string;
  supplier: string;
  invoiceNo: string | null;
  items: number;
  itemLabel: string;
  total: number;
  status: string;
};

export type CategorySummary = {
  name: string;
  units: number;
  productCount: number;
};

export type DashboardSummary = {
  productCount: number;
  totalUnits: number;
  lowStock: number;
  inventoryValue: number;
  locationCount: number;
  categories: CategorySummary[];
  user: {
    name: string;
    email: string;
    role: string;
    createdAt: string;
  };
};

export type AccountInfo = {
  name: string;
  email: string;
  role: string;
  createdAt: string;
  workspaceName: string;
};

export type AiCard = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  category: string;
  stock: number;
  minStock: number;
  status: StockStatus;
  locations: { name: string; code: string; quantity: number }[];
};

export function stockStatus(stock: number, minStock: number): StockStatus {
  if (stock <= 0) return "Habis";
  if (stock <= minStock) return "Menipis";
  return "Aman";
}

export const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

export const formatNumber = (value: number) => new Intl.NumberFormat("id-ID").format(value);

export const formatDate = (value: string | Date) =>
  new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(
    typeof value === "string" ? new Date(value) : value,
  );

export const formatLongDate = (value: Date) =>
  new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);

export function initials(name: string) {  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "WF";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

type ApiProduct = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  minStock: number;
  avgCost: number;
  category: { name: string } | null;
  stockLevels: { quantity: number; location: { id: string; code: string; name: string } }[];
};

export function mapProduct(item: ApiProduct): Product {
  const locations = item.stockLevels.map((level) => ({
    id: level.location.id,
    code: level.location.code,
    name: level.location.name,
    quantity: level.quantity,
  }));
  const stock = locations.reduce((sum, location) => sum + location.quantity, 0);
  return {
    id: item.id,
    name: item.name,
    category: item.category?.name ?? "Umum",
    sku: item.sku ?? "—",
    unit: item.unit,
    stock,
    minStock: item.minStock,
    avgCost: item.avgCost ?? 0,
    status: stockStatus(stock, item.minStock),
    locations,
  };
}
