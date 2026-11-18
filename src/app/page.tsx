"use client";

import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  Warehouse,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string | number;
  name: string;
  category: string;
  sku: string;
  stock: number;
  unit: string;
  location: string;
  cost: number;
  minStock: number;
  status: "Aman" | "Menipis" | "Habis";
};

type PurchaseRecord = {
  id: number | string;
  date: string;
  supplier: string;
  items: number;
  total: number;
  status: string;
};

const initialProducts: Product[] = [
  { id: 1, name: "Kabel HDMI 2M", category: "Kabel", sku: "KBL-HDMI-2M", stock: 24, unit: "pcs", location: "Rak 1", cost: 45000, minStock: 10, status: "Aman" },
  { id: 2, name: "Lampu LED 12W", category: "Lampu", sku: "LMP-LED-12", stock: 8, unit: "pcs", location: "Rak 2", cost: 28000, minStock: 10, status: "Menipis" },
  { id: 3, name: "Stop Kontak 4 Lubang", category: "Elektrikal", sku: "STK-4L", stock: 18, unit: "pcs", location: "Rak 3", cost: 65000, minStock: 8, status: "Aman" },
  { id: 4, name: "Charger Samsung Type-C", category: "Aksesoris", sku: "CHR-SAM-C", stock: 0, unit: "pcs", location: "Gudang", cost: 75000, minStock: 5, status: "Habis" },
  { id: 5, name: "Kabel LAN Cat 6", category: "Kabel", sku: "KBL-LAN-C6", stock: 42, unit: "meter", location: "Gudang", cost: 7000, minStock: 20, status: "Aman" },
];

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

const navItems = [
  { label: "Ringkasan", icon: LayoutDashboard },
  { label: "Barang", icon: Boxes },
  { label: "Pembelian", icon: ArrowDownLeft },
  { label: "Lokasi", icon: Warehouse },
  { label: "Import data", icon: FileSpreadsheet },
  { label: "Stock Count", icon: BarChart3 },
];

export default function Home() {
  const router = useRouter();
  const [active, setActive] = useState("Ringkasan");
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAi, setShowAi] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([
    { id: 1, date: "16 Nov 2026", supplier: "Mitra Elektrik", items: 4, total: 1245000, status: "Tersimpan" },
    { id: 2, date: "12 Nov 2026", supplier: "Sinar Jaya", items: 2, total: 520000, status: "Tersimpan" },
  ]);
  const [locations, setLocations] = useState(["Rak 1", "Rak 2", "Rak 3", "Rak 4", "Rak 5", "Gudang", "Belum ditempatkan"]);
  const [stockAction, setStockAction] = useState<{ product: Product; type: "KELUAR" | "PINDAH" } | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<{ productCount?: number; totalUnits?: number; lowStock?: number; inventoryValue?: number }>({});

  useEffect(() => {
    fetch("/api/products")
      .then((response) => (response.ok ? response.json() : []))
      .then((items: { id: string; name: string; sku: string | null; unit: string; minStock: number; category?: { name: string } | null; stockLevels: { quantity: number; location: { name: string } }[] }[]) => {
        if (!items.length) return;
        setProducts(items.map((item) => {
          const stock = item.stockLevels.reduce((sum, level) => sum + level.quantity, 0);
          return { id: item.id, name: item.name, category: item.category?.name ?? "Umum", sku: item.sku ?? "—", stock, unit: item.unit, location: item.stockLevels[0]?.location.name ?? "Belum ditempatkan", cost: 0, minStock: item.minStock, status: stock === 0 ? "Habis" : stock <= item.minStock ? "Menipis" : "Aman" };
        }));
      })
      .catch(() => undefined);
    fetch("/api/purchases")
      .then((response) => response.ok ? response.json() : [])
      .then((items: { id: string; purchaseDate: string; supplier?: { name: string } | null; items: unknown[]; totalCost: number; cancelledAt?: string | null }[]) => {
        setPurchases(items.map((item) => ({
          id: item.id as never,
          date: new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(item.purchaseDate)),
          supplier: item.supplier?.name ?? "Tanpa pemasok",
          items: item.items.length,
          total: item.totalCost,
          status: item.cancelledAt ? "Dibatalkan" : "Tersimpan",
        })));
      })
      .catch(() => undefined);
    fetch("/api/locations")
      .then((response) => response.ok ? response.json() : [])
      .then((items: { name: string }[]) => {
        if (items.length) setLocations(items.map((item) => item.name));
      })
      .catch(() => undefined);
    fetch("/api/dashboard")
      .then((response) => response.ok ? response.json() : null)
      .then((summary: { productCount?: number; totalUnits?: number; lowStock?: number; inventoryValue?: number } | null) => {
        if (!summary) return;
        setDashboardSummary(summary);
      })
      .catch(() => undefined);
  }, []);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) =>
        [product.name, product.category, product.sku, product.location]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [products, query],
  );

  const totalUnits = products.reduce((sum, product) => sum + product.stock, 0);
  const inventoryValue = products.reduce((sum, product) => sum + product.stock * product.cost, 0);
  const lowStock = products.filter((product) => product.status !== "Aman").length;
  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  async function logout() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        notify("Logout gagal. Silakan coba lagi.");
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      notify("Logout gagal karena koneksi bermasalah.");
    }
  }

  async function addProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const stock = Number(form.get("stock") || 0);
    const minStock = Number(form.get("minStock") || 0);
    const cost = Number(form.get("cost") || 0);
    const response = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), category: form.get("category"), sku: form.get("sku"), stock, cost, minStock, unit: form.get("unit"), locationCode: "BELUM-DITEMPATKAN" }) });
    if (!response.ok) {
      alert((await response.json().catch(() => null))?.error ?? "Barang gagal disimpan.");
      return;
    }
    setProducts((current) => [{ id: Date.now(), name: String(form.get("name")), category: String(form.get("category")), sku: String(form.get("sku") || "—"), stock, unit: String(form.get("unit") || "pcs"), location: "Belum ditempatkan", cost, minStock, status: stock === 0 ? "Habis" : stock <= minStock ? "Menipis" : "Aman" }, ...current]);
    setShowAdd(false);
  }

  async function editProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProduct) return;
    const form = new FormData(event.currentTarget);
    const minStock = Number(form.get("minStock") || 0);
    const response = await fetch("/api/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingProduct.id,
        name: form.get("name"),
        category: form.get("category"),
        sku: form.get("sku"),
        unit: form.get("unit"),
        minStock,
      }),
    });
    if (!response.ok) {
      alert((await response.json().catch(() => null))?.error ?? "Perubahan barang gagal disimpan.");
      return;
    }
    const name = String(form.get("name"));
    const category = String(form.get("category"));
    const sku = String(form.get("sku") || "—");
    const unit = String(form.get("unit") || "pcs");
    setProducts((current) => current.map((product) => product.id === editingProduct.id ? { ...product, name, category, sku, unit, minStock, status: product.stock === 0 ? "Habis" : product.stock <= minStock ? "Menipis" : "Aman" } : product));
    setEditingProduct(null);
    notify(`${name} berhasil diperbarui.`);
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Hapus ${product.name}? Barang akan diarsipkan dan tidak tampil di daftar.`)) return;
    const response = await fetch("/api/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: product.id }),
    });
    if (!response.ok) {
      alert((await response.json().catch(() => null))?.error ?? "Barang gagal dihapus.");
      return;
    }
    setProducts((current) => current.filter((item) => item.id !== product.id));
    notify(`${product.name} berhasil dihapus.`);
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#17202a]">
      {sidebarOpen && <button aria-label="Tutup menu" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-[#061719]/45 backdrop-blur-md lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[min(84vw,300px)] flex-col border-r border-[#e6e9ed] bg-white px-5 py-6 transition-transform duration-300 ease-out lg:w-[260px] lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f8f80] text-lg font-bold text-white">AE</div>
            <div>
              <p className="truncate text-[17px] font-bold tracking-tight">Stok<span className="text-[#1f8f80]">AE</span></p>
              <p className="truncate text-[11px] text-[#8b949e]">Manajemen Inventaris</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden"><X size={18} /></button>
        </div>

        <div className="mt-10">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a2aab2]">Menu utama</p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const selected = active === item.label;
              return (
                <button key={item.label} onClick={() => { setActive(item.label); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium transition ${selected ? "bg-[#e9f6f3] text-[#197d70]" : "text-[#65717d] hover:bg-[#f5f7f8]"}`}>
                  <Icon size={18} strokeWidth={selected ? 2.4 : 1.8} />
                  {item.label}
                  {item.label === "Barang" && <span className="ml-auto rounded-full bg-[#f0f2f4] px-2 py-0.5 text-[10px] text-[#7b858d]">{products.length}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-9">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a2aab2]">Lainnya</p>
          <nav className="space-y-1">
            <button onClick={() => setShowAi(true)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium text-[#65717d] hover:bg-[#f5f7f8]"><Sparkles size={18} strokeWidth={1.8} /> Tanya Stok <span className="ml-auto rounded-md bg-[#fff4df] px-1.5 py-0.5 text-[9px] font-bold text-[#bd7b18]">AI</span></button>
            <button onClick={() => setActive("Pengaturan")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium text-[#65717d] hover:bg-[#f5f7f8]"><Settings size={18} strokeWidth={1.8} /> Pengaturan</button>
            <button onClick={() => setActive("Bantuan")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium text-[#65717d] hover:bg-[#f5f7f8]"><CircleHelp size={18} strokeWidth={1.8} /> Bantuan</button>
          </nav>
        </div>

        <div className="mt-auto rounded-2xl bg-[#f2faf8] p-4">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#d7f0eb] text-[#168272]"><Sparkles size={16} /></div>
          <p className="text-xs font-semibold text-[#2e554e]">Butuh bantuan cari barang?</p>
          <p className="mt-1 text-[11px] leading-5 text-[#6b8d86]">Tanyakan lokasi dan stok dengan bahasa sehari-hari.</p>
          <button onClick={() => setShowAi(true)} className="mt-3 text-[11px] font-bold text-[#168272]">Coba Tanya Stok <ChevronRight className="inline" size={13} /></button>
        </div>
      </aside>

      <main className="lg:ml-[260px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#e6e9ed] bg-[#f7f8fa]/95 px-4 backdrop-blur sm:px-5 md:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden"><Menu size={21} /></button>
            <div className="min-w-0">
              <p className="text-[11px] text-[#89939d]">Senin, 16 November 2026</p>
              <h1 className="mt-0.5 truncate text-[20px] font-bold tracking-tight">{active}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98a2aa]" size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari barang, SKU, lokasi..." className="h-10 w-[260px] rounded-xl border border-[#e2e6e9] bg-white pl-10 pr-4 text-xs outline-none transition focus:border-[#65b5a8] focus:ring-4 focus:ring-[#dff2ee]" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-[#e2e6e9] px-1.5 py-0.5 text-[9px] text-[#9aa3aa]">⌘ K</span>
            </div>
            <button aria-label="Notifikasi" onClick={() => notify(lowStock ? `${lowStock} barang perlu diperhatikan.` : "Tidak ada notifikasi baru.")} className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#e2e6e9] bg-white text-[#66717b]"><Bell size={17} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#e77b67]" /></button>
            <div className="flex items-center gap-2 border-l border-[#e2e6e9] pl-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0d7bd] text-xs font-bold text-[#8a5e3b]">PA</div>
              <div className="hidden sm:block"><p className="text-xs font-semibold">Pengguna</p><p className="text-[10px] text-[#8e979f]">Akun terverifikasi</p></div>
              <ChevronDown size={14} className="hidden text-[#9ba4ac] sm:block" />
              <button type="button" onClick={logout} aria-label="Keluar dari akun" title="Keluar" className="ml-1 flex h-9 w-9 items-center justify-center rounded-xl border border-[#e2e6e9] bg-white text-[#66717b] transition hover:border-[#f0c5bf] hover:bg-[#fff5f3] hover:text-[#c96c5e]">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <div className="dashboard-enter px-5 py-7 md:px-10 md:py-9">
          {active === "Ringkasan" ? (
            <Dashboard totalUnits={dashboardSummary.totalUnits ?? totalUnits} inventoryValue={dashboardSummary.inventoryValue ?? inventoryValue} lowStock={dashboardSummary.lowStock ?? lowStock} onAdd={() => setShowAdd(true)} onAi={() => setShowAi(true)} products={products} onNavigate={setActive} onNotify={notify} onEdit={setEditingProduct} onDelete={deleteProduct} />
          ) : active === "Barang" ? (
            <ProductsView products={filteredProducts} query={query} onAdd={() => setShowAdd(true)} onEdit={setEditingProduct} onDelete={deleteProduct} onStock={(product, type) => setStockAction({ product, type })} />
          ) : active === "Pembelian" ? (
            <PurchasesView purchases={purchases} products={products} locations={locations} onAdd={(purchase) => setPurchases((current) => [purchase, ...current])} />
          ) : active === "Lokasi" ? (
            <LocationsView locations={locations} onAdd={(location) => setLocations((current) => [...current, location])} />
          ) : active === "Import data" ? (
            <ImportView products={products} />
          ) : active === "Stock Count" ? (
            <StockCountView products={products} locations={locations} onSaved={async () => {
              const response = await fetch("/api/products");
              if (response.ok) {
                const items = await response.json();
                setProducts(items.map((item: { id: string; name: string; sku: string | null; unit: string; minStock: number; category?: { name: string } | null; stockLevels: { quantity: number; location: { name: string } }[] }) => {
                  const stock = item.stockLevels.reduce((sum, level) => sum + level.quantity, 0);
                  return { id: item.id, name: item.name, category: item.category?.name ?? "Umum", sku: item.sku ?? "—", stock, unit: item.unit, location: item.stockLevels[0]?.location.name ?? "Belum ditempatkan", cost: 0, minStock: item.minStock, status: stock === 0 ? "Habis" : stock <= item.minStock ? "Menipis" : "Aman" };
                }));
              }
            }} />
          ) : (
            <PlaceholderView title={active} onAdd={() => setShowAdd(true)} onNotify={notify} />
          )}
        </div>
      </main>

      {showAdd && <AddProductModal onClose={() => setShowAdd(false)} onSubmit={addProduct} />}
      {editingProduct && <AddProductModal product={editingProduct} onClose={() => setEditingProduct(null)} onSubmit={editProduct} />}
      {stockAction && <StockActionModal action={stockAction} locations={locations} onClose={() => setStockAction(null)} onSaved={() => {
        setStockAction(null);
        notify("Perubahan stok berhasil disimpan.");
      }} />}
      {showAi && <AiPanel products={products} onClose={() => setShowAi(false)} />}
      {notice && <div role="status" className="fixed bottom-5 right-5 z-[60] rounded-xl border border-[#cce8e1] bg-[#effaf7] px-4 py-3 text-xs font-semibold text-[#247e70] shadow-xl">{notice}</div>}
    </div>
  );
}

function Dashboard({ totalUnits, inventoryValue, lowStock, onAdd, onAi, products, onNavigate, onNotify, onEdit, onDelete }: { totalUnits: number; inventoryValue: number; lowStock: number; onAdd: () => void; onAi: () => void; products: Product[]; onNavigate: (page: string) => void; onNotify: (message: string) => void; onEdit: (product: Product) => void; onDelete: (product: Product) => void }) {
  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div><p className="mb-2 text-sm text-[#7e8993]">Selamat datang kembali 👋</p><h2 className="text-[27px] font-bold tracking-[-0.03em]">Pantau stok inventaris hari ini.</h2><p className="mt-2 text-sm text-[#89939c]">Berikut ringkasan kondisi stok Anda.</p></div>
        <div className="flex gap-2"><button onClick={onAi} className="flex h-11 items-center gap-2 rounded-xl border border-[#d5ebe6] bg-white px-4 text-xs font-semibold text-[#218678] hover:bg-[#f2faf8]"><Sparkles size={16} /> Tanya Stok</button><button onClick={onAdd} className="flex h-11 items-center gap-2 rounded-xl bg-[#1f8f80] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#197d70]"><Plus size={17} /> Tambah barang</button></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Jenis barang aktif" value={String(products.length)} helper="dari semua kategori" icon={<Boxes size={19} />} tone="teal" />
        <KpiCard label="Total unit stok" value={totalUnits.toLocaleString("id-ID")} helper="+12% dari bulan lalu" icon={<PackagePlus size={19} />} tone="blue" trend />
        <KpiCard label="Nilai persediaan" value={formatRupiah(inventoryValue)} helper="harga modal rata-rata" icon={<BarChart3 size={19} />} tone="purple" />
        <KpiCard label="Perlu perhatian" value={String(lowStock)} helper="barang menipis atau habis" icon={<AlertTriangle size={19} />} tone="amber" />
      </div>
      <div className="mt-7 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <section className="rounded-2xl border border-[#e6e9ed] bg-white p-5 md:p-6">
          <div className="mb-6 flex items-start justify-between"><div><h3 className="text-sm font-bold">Stok berdasarkan kategori</h3><p className="mt-1 text-[11px] text-[#929ba3]">Jumlah unit di seluruh lokasi</p></div><button onClick={() => onNavigate("Barang")} className="text-[11px] font-semibold text-[#1f8f80]">Lihat laporan <ChevronRight className="inline" size={13} /></button></div>
          <div className="space-y-5">{[["Kabel", 66, "#2a9d8f"], ["Elektrikal", 48, "#5b8def"], ["Lampu", 32, "#e7a54c"], ["Aksesoris", 18, "#ab83d1"]].map(([label, percent, color]) => <div key={String(label)}><div className="mb-2 flex justify-between text-xs"><span className="font-medium">{label}</span><span className="text-[#8b959d]">{Math.round(Number(percent) * 0.64)} unit</span></div><div className="h-2 rounded-full bg-[#f0f2f3]"><div style={{ width: `${percent}%`, backgroundColor: String(color) }} className="h-full rounded-full" /></div></div>)}</div>
          <div className="mt-7 flex items-center justify-between border-t border-[#eef0f2] pt-5"><div className="flex items-center gap-2 text-[11px] text-[#818c95]"><span className="h-2 w-2 rounded-full bg-[#2a9d8f]" /> Total 92 unit terdata</div><span className="text-[11px] font-semibold text-[#1f8f80]">+8.4% bulan ini</span></div>
        </section>
        <section className="rounded-2xl border border-[#e6e9ed] bg-white p-5 md:p-6">
          <div className="mb-5 flex items-start justify-between"><div><h3 className="text-sm font-bold">Perlu perhatian</h3><p className="mt-1 text-[11px] text-[#929ba3]">Segera periksa barang berikut</p></div><button aria-label="Buka barang perlu perhatian" onClick={() => onNavigate("Barang")} className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f7f8f9] text-[#8b959d]"><ChevronRight size={15} /></button></div>
          <div className="space-y-3">{products.filter((product) => product.status !== "Aman").map((product) => <div key={product.id} className="flex items-center gap-3 rounded-xl border border-[#f0f1f2] p-3"><div className={`flex h-9 w-9 items-center justify-center rounded-lg ${product.status === "Habis" ? "bg-[#fff0ee] text-[#df7566]" : "bg-[#fff5e3] text-[#d99532]"}`}><AlertTriangle size={16} /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{product.name}</p><p className="mt-1 text-[10px] text-[#929ba3]">{product.location} · stok {product.stock} {product.unit}</p></div><span className={`rounded-md px-2 py-1 text-[9px] font-bold ${product.status === "Habis" ? "bg-[#fff0ee] text-[#d96f61]" : "bg-[#fff5e3] text-[#c48624]"}`}>{product.status}</span></div>)}</div>
          <button onClick={() => onNavigate("Barang")} className="mt-5 w-full rounded-xl border border-[#e4e8ea] py-2.5 text-[11px] font-semibold text-[#69757e] hover:bg-[#f8fafb]">Lihat semua perhatian</button>
        </section>
      </div>
      <section className="mt-5 rounded-2xl border border-[#e6e9ed] bg-white p-5 md:p-6"><div className="mb-5 flex items-center justify-between"><div><h3 className="text-sm font-bold">Barang terbaru</h3><p className="mt-1 text-[11px] text-[#929ba3]">Barang yang terakhir ditambahkan atau diperbarui</p></div><button onClick={() => onNavigate("Barang")} className="text-[11px] font-semibold text-[#1f8f80]">Lihat semua <ChevronRight className="inline" size={13} /></button></div><ProductTable products={products.slice(0, 4)} onEdit={onEdit} onDelete={onDelete} onSelect={(product) => onNotify(`Detail ${product.name} siap dibuka.`)} /></section>
    </>
  );
}

function KpiCard({ label, value, helper, icon, tone, trend }: { label: string; value: string; helper: string; icon: React.ReactNode; tone: string; trend?: boolean }) {
  const tones: Record<string, string> = { teal: "bg-[#e8f6f3] text-[#218678]", blue: "bg-[#edf3ff] text-[#5b83d4]", purple: "bg-[#f3effb] text-[#946fc3]", amber: "bg-[#fff5e3] text-[#d29432]" };
  return <div className="rounded-2xl border border-[#e6e9ed] bg-white p-5"><div className="flex items-start justify-between"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>{trend && <span className="flex items-center gap-1 text-[10px] font-semibold text-[#2f9b72]"><ArrowUpRight size={13} /> 12%</span>}</div><p className="mt-5 text-[11px] text-[#89939c]">{label}</p><p className="mt-1 text-[23px] font-bold tracking-tight">{value}</p><p className="mt-1 text-[10px] text-[#a0a8ae]">{helper}</p></div>;
}

function ProductsView({ products, query, onAdd, onEdit, onDelete, onStock }: { products: Product[]; query: string; onAdd: () => void; onEdit: (product: Product) => void; onDelete: (product: Product) => void; onStock: (product: Product, type: "KELUAR" | "PINDAH") => void }) {
  const [filter, setFilter] = useState<"semua" | "menipis" | "habis">("semua");
  const visibleProducts = filter === "semua" ? products : products.filter((product) => filter === "habis" ? product.status === "Habis" : product.status === "Menipis");
  return <><div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="text-sm text-[#7e8993]">Kelola semua inventaris toko</p><h2 className="mt-1 text-[25px] font-bold">Daftar barang</h2></div><button onClick={onAdd} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1f8f80] px-4 text-xs font-semibold text-white"><Plus size={17} /> Tambah barang</button></div><div className="mb-4 flex flex-wrap gap-2"><button onClick={() => setFilter("semua")} className={`rounded-lg px-3 py-2 text-[11px] font-semibold ${filter === "semua" ? "bg-[#e9f6f3] text-[#1f8f80]" : "border border-[#e5e9eb] bg-white text-[#7e8993]"}`}>Semua barang ({products.length})</button><button onClick={() => setFilter("menipis")} className={`rounded-lg px-3 py-2 text-[11px] ${filter === "menipis" ? "bg-[#fff5e3] font-semibold text-[#c48624]" : "border border-[#e5e9eb] bg-white text-[#7e8993]"}`}>Stok menipis</button><button onClick={() => setFilter("habis")} className={`rounded-lg px-3 py-2 text-[11px] ${filter === "habis" ? "bg-[#fff0ee] font-semibold text-[#d96f61]" : "border border-[#e5e9eb] bg-white text-[#7e8993]"}`}>Habis</button></div><section className="rounded-2xl border border-[#e6e9ed] bg-white p-5 md:p-6">{query && <p className="mb-4 text-xs text-[#8a949d]">Menampilkan hasil untuk <b className="text-[#27333c]">&quot;{query}&quot;</b></p>}<ProductTable products={visibleProducts} onEdit={onEdit} onDelete={onDelete} onStock={onStock} /></section></>;
}

function ProductTable({ products, onSelect, onEdit, onDelete, onStock }: { products: Product[]; onSelect?: (product: Product) => void; onEdit?: (product: Product) => void; onDelete?: (product: Product) => void; onStock?: (product: Product, type: "KELUAR" | "PINDAH") => void }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead><tr className="border-b border-[#eef0f2] text-[10px] uppercase tracking-[0.1em] text-[#9aa3aa]"><th className="pb-3 font-semibold">Nama barang</th><th className="pb-3 font-semibold">Kategori</th><th className="pb-3 font-semibold">Stok</th><th className="pb-3 font-semibold">Lokasi</th><th className="pb-3 text-right font-semibold">Harga modal</th><th className="pb-3 text-right">Aksi</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-b border-[#f1f2f3] last:border-0"><td className="py-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f1f7f6] text-[#328e82]"><Boxes size={16} /></div><div><p className="text-xs font-semibold">{product.name}</p><p className="mt-1 text-[10px] text-[#a0a8ae]">{product.sku}</p></div></div></td><td className="py-4 text-xs text-[#69757e]">{product.category}</td><td className="py-4"><p className="text-xs font-semibold">{product.stock} <span className="font-normal text-[#9ca5ac]">{product.unit}</span></p><span className={`mt-1 inline-block text-[9px] font-semibold ${product.status === "Aman" ? "text-[#32916f]" : product.status === "Menipis" ? "text-[#c5892b]" : "text-[#d97163]"}`}>{product.status}</span></td><td className="py-4 text-xs text-[#69757e]">{product.location}</td><td className="py-4 text-right text-xs font-semibold">{formatRupiah(product.cost)}</td><td className="py-4"><div className="flex justify-end gap-1">{onStock && <><button title="Kurangi atau barang keluar" aria-label={`Barang keluar ${product.name}`} onClick={() => onStock(product, "KELUAR")} className="rounded-lg p-2 text-[#c48624] hover:bg-[#fff5e3]"><ArrowDownLeft size={15} /></button><button title="Pindahkan barang" aria-label={`Pindahkan ${product.name}`} onClick={() => onStock(product, "PINDAH")} className="rounded-lg p-2 text-[#5b83d4] hover:bg-[#edf3ff]"><Warehouse size={15} /></button></>}<button aria-label={`Edit ${product.name}`} onClick={() => (onEdit ?? onSelect)?.(product)} className="rounded-lg p-2 text-[#9ca5ac] hover:bg-[#f5f7f8]"><Pencil size={15} /></button>{onDelete && <button aria-label={`Hapus ${product.name}`} onClick={() => onDelete(product)} className="rounded-lg p-2 text-[#d47768] hover:bg-[#fff0ee]"><Trash2 size={15} /></button>}</div></td></tr>)}</tbody></table>{products.length === 0 && <div className="py-14 text-center text-sm text-[#8e989f]">Barang tidak ditemukan.</div>}</div>;
}

function PurchasesView({ purchases, products, locations, onAdd }: { purchases: { id: number | string; date: string; supplier: string; items: number; total: number; status: string }[]; products: Product[]; locations: string[]; onAdd: (purchase: { id: number | string; date: string; supplier: string; items: number; total: number; status: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const productId = String(form.get("productId"));
    const quantity = Number(form.get("quantity") || 0);
    const unitCost = Number(form.get("unitCost") || 0);
    const locationCode = String(form.get("locationCode"));
    const response = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purchaseDate: form.get("purchaseDate"),
        supplier: form.get("supplier"),
        invoiceNo: form.get("invoiceNo"),
        items: [{ productId, locationCode, quantity, unitCost }],
      }),
    });
    if (!response.ok) {
      setError((await response.json().catch(() => null))?.error ?? "Pembelian gagal disimpan.");
      return;
    }
    const product = products.find((item) => item.id === productId);
    onAdd({
      id: Date.now(),
      date: new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(String(form.get("purchaseDate")))),
      supplier: String(form.get("supplier") || "Tanpa pemasok"),
      items: 1,
      total: quantity * unitCost,
      status: `Tersimpan · ${product?.name ?? "Barang"}`,
    });
    setOpen(false);
  }
  return <><div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="text-sm text-[#7e8993]">Catat barang masuk dan harga modal</p><h2 className="mt-1 text-[25px] font-bold">Riwayat pembelian</h2></div><button onClick={() => setOpen(true)} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1f8f80] px-4 text-xs font-semibold text-white"><Plus size={17} /> Tambah pembelian</button></div><section className="rounded-2xl border border-[#e6e9ed] bg-white p-5 md:p-6"><div className="mb-5 flex items-center justify-between"><div><h3 className="text-sm font-bold">Pembelian terbaru</h3><p className="mt-1 text-[11px] text-[#929ba3]">Semua transaksi yang menambah stok</p></div></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left"><thead><tr className="border-b border-[#eef0f2] text-[10px] uppercase tracking-[0.1em] text-[#9aa3aa]"><th className="pb-3">Tanggal</th><th className="pb-3">Pemasok</th><th className="pb-3">Item</th><th className="pb-3 text-right">Total</th><th className="pb-3 text-right">Status</th></tr></thead><tbody>{purchases.map((purchase) => <tr key={purchase.id} className="border-b border-[#f1f2f3] last:border-0"><td className="py-4 text-xs text-[#69757e]">{purchase.date}</td><td className="py-4 text-xs font-semibold">{purchase.supplier}</td><td className="py-4 text-xs text-[#69757e]">{purchase.items} barang</td><td className="py-4 text-right text-xs font-semibold">{formatRupiah(purchase.total)}</td><td className="py-4 text-right"><span className="rounded-md bg-[#e8f6f3] px-2 py-1 text-[9px] font-bold text-[#2c8e7a]">{purchase.status}</span></td></tr>)}</tbody></table></div></section>{open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#16252b]/30 p-4 backdrop-blur-sm"><form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-lg font-bold">Tambah pembelian</h2><p className="mt-1 text-xs text-[#8c969d]">Catat barang masuk dan tambah stok.</p></div><button type="button" onClick={() => setOpen(false)}><X size={18} /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label><span className="label">Tanggal</span><input name="purchaseDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="input" /></label><label><span className="label">Pemasok</span><input name="supplier" placeholder="Mitra Elektrik" className="input" /></label><label><span className="label">Nomor nota</span><input name="invoiceNo" placeholder="Opsional" className="input" /></label><label><span className="label">Barang</span><select name="productId" required className="input"><option value="">Pilih barang</option>{products.map((product) => <option key={product.id} value={String(product.id)}>{product.name}</option>)}</select></label><label><span className="label">Jumlah</span><input name="quantity" type="number" min="1" defaultValue="1" required className="input" /></label><label><span className="label">Harga satuan</span><input name="unitCost" type="number" min="0" defaultValue="0" required className="input" /></label><label className="sm:col-span-2"><span className="label">Lokasi tujuan</span><select name="locationCode" required className="input">{locations.map((location) => <option key={location} value={location === "Rak 1" ? "RAK-1" : location === "Rak 2" ? "RAK-2" : location === "Rak 3" ? "RAK-3" : location === "Rak 4" ? "RAK-4" : location === "Rak 5" ? "RAK-5" : location === "Gudang" ? "GUDANG" : "BELUM-DITEMPATKAN"}>{location}</option>)}</select></label>{error && <p className="sm:col-span-2 rounded-lg bg-[#fff0ee] p-3 text-xs text-[#c96c5e]">{error}</p>}<div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-[#e1e6e8] px-4 py-2.5 text-xs font-semibold">Batal</button><button className="rounded-xl bg-[#1f8f80] px-4 py-2.5 text-xs font-semibold text-white">Simpan pembelian</button></div></div></form></div>}</>;
}

function LocationsView({ locations, onAdd }: { locations: string[]; onAdd: (location: string) => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  async function addLocation(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!name.trim() || !code.trim()) {
      setError("Nama dan kode lokasi wajib diisi.");
      return;
    }
    const response = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim().toUpperCase().replace(/\s+/g, "-"), name: name.trim(), type: "RAK" }),
    });
    if (!response.ok) {
      setError((await response.json().catch(() => null))?.error ?? "Lokasi gagal ditambahkan.");
      return;
    }
    onAdd(name.trim());
    setName("");
    setCode("");
  }
  return <><div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="text-sm text-[#7e8993]">Atur alamat penyimpanan barang</p><h2 className="mt-1 text-[25px] font-bold">Lokasi gudang & rak</h2></div><form onSubmit={addLocation} className="flex flex-wrap gap-2"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama lokasi" className="input w-40" /><input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Kode, mis. RAK-6" className="input w-40" /><button className="flex h-10 items-center gap-2 rounded-xl bg-[#1f8f80] px-3 text-xs font-semibold text-white"><Plus size={16} /> Tambah</button></form></div>{error && <p className="mb-4 rounded-xl bg-[#fff0ee] p-3 text-xs text-[#c96c5e]">{error}</p>}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{locations.map((location, index) => <div key={location} className="rounded-2xl border border-[#e6e9ed] bg-white p-5"><div className="flex items-start justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f6f3] text-[#20897b]"><Warehouse size={19} /></div><button onClick={() => alert(`${location} dipilih untuk melihat isinya.`)} className="rounded-lg p-2 text-[#98a2aa] hover:bg-[#f3f6f6]"><ChevronRight size={16} /></button></div><p className="mt-5 text-sm font-bold">{location}</p><p className="mt-1 text-[11px] text-[#929ba3]">{location === "Belum ditempatkan" ? "Lokasi sistem" : `${index * 7 + 4} barang tersimpan`}</p></div>)}</div></>;
}

function ImportView({ products }: { products: Product[] }) {
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);
  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFile(file);
    setFileName(file.name);
    setMessage("File berhasil dipilih. Pratinjau siap diproses.");
  }
  async function processImport() {
    if (!file) return;
    setImporting(true);
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/import", { method: "POST", body: form });
    const body = await response.json().catch(() => null);
    setImporting(false);
    if (!response.ok) {
      setMessage(body?.error ?? "Import gagal diproses.");
      return;
    }
    setMessage(`${body.successRows} baris berhasil diimport. ${body.failedRows} baris bermasalah.`);
  }
  function downloadTemplate() {
    const csv = "nama;sku;kategori;satuan;jumlah;harga_modal;lokasi_kode;stok_minimum\nLampu LED 12W;LMP-LED-12;Lampu;pcs;10;28000;RAK-2;5\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "template-wareflow.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return <><div className="mb-6"><p className="text-sm text-[#7e8993]">Masukkan banyak barang tanpa mengetik satu per satu</p><h2 className="mt-1 text-[25px] font-bold">Import data</h2></div><section className="mx-auto max-w-3xl rounded-2xl border border-[#e6e9ed] bg-white p-6 md:p-8"><div className="flex items-center gap-3 text-xs font-semibold text-[#20897b]"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#dff2ee]">1</span> Unggah <ChevronRight size={14} /><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f0f3f4] text-[#8b959d]">2</span> Pratinjau <ChevronRight size={14} /><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f0f3f4] text-[#8b959d]">3</span> Simpan</div><label className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#cfe6e1] bg-[#f5fbfa] px-6 py-14 text-center hover:bg-[#eef9f6]"><Upload className="text-[#2b9c8b]" size={28} /><p className="mt-4 text-sm font-bold">Pilih file Excel atau CSV</p><p className="mt-2 text-[11px] text-[#8c999e]">Maksimal 5 MB · .xlsx, .xls, .csv</p><input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" /></label>{fileName && <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#f3f7f7] p-3 text-xs"><FileSpreadsheet size={17} className="text-[#20897b]" /><span className="flex-1">{fileName}</span><span className="text-[#2d927f]">Siap diproses</span></div>}<div className="mt-6 flex flex-wrap justify-between gap-3"><button onClick={downloadTemplate} className="flex items-center gap-2 rounded-xl border border-[#e1e7e8] px-4 py-3 text-xs font-semibold text-[#65717d]"><Upload size={15} /> Unduh template CSV</button><button disabled={!file || importing} onClick={processImport} className="rounded-xl bg-[#1f8f80] px-4 py-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{importing ? "Memproses..." : "Proses import"}</button></div>{message && <p className="mt-4 rounded-xl bg-[#e8f6f3] p-3 text-xs text-[#2b806f]">{message}</p>}<p className="mt-6 text-[10px] text-[#9aa3aa]">Data saat ini berisi {products.length} barang aktif.</p></section></>;
}

function StockActionModal({ action, locations, onClose, onSaved }: { action: { product: Product; type: "KELUAR" | "PINDAH" }; locations: string[]; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const locationName = String(form.get("locationCode"));
    const destinationName = String(form.get("destinationCode") || "");
    const codeOf = (name: string) => name === "Rak 1" ? "RAK-1" : name === "Rak 2" ? "RAK-2" : name === "Rak 3" ? "RAK-3" : name === "Rak 4" ? "RAK-4" : name === "Rak 5" ? "RAK-5" : name === "Gudang" ? "GUDANG" : "BELUM-DITEMPATKAN";
    const response = await fetch("/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: action.product.id,
        type: action.type,
        quantity: Number(form.get("quantity")),
        locationCode: codeOf(locationName),
        destinationCode: action.type === "PINDAH" ? codeOf(destinationName) : undefined,
        reason: form.get("reason"),
      }),
    });
    const body = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      setError(body?.error ?? "Perubahan stok gagal disimpan.");
      return;
    }
    onSaved();
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#16252b]/30 p-4 backdrop-blur-sm"><form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-lg font-bold">{action.type === "KELUAR" ? "Barang keluar" : "Pindah lokasi"}</h2><p className="mt-1 text-xs text-[#8c969d]">{action.product.name} · stok {action.product.stock} {action.product.unit}</p></div><button type="button" onClick={onClose}><X size={18} /></button></div><div className="mt-6 grid gap-4"><label><span className="label">Lokasi asal</span><select name="locationCode" required defaultValue={action.product.location} className="input">{locations.map((location) => <option key={location}>{location}</option>)}</select></label>{action.type === "PINDAH" && <label><span className="label">Lokasi tujuan</span><select name="destinationCode" required className="input">{locations.filter((location) => location !== action.product.location).map((location) => <option key={location}>{location}</option>)}</select></label>}<label><span className="label">Jumlah</span><input name="quantity" type="number" min="1" max={action.product.stock} defaultValue="1" required className="input" /></label><label><span className="label">{action.type === "KELUAR" ? "Alasan" : "Catatan"}</span><select name="reason" className="input">{action.type === "KELUAR" ? <><option>Terjual</option><option>Rusak</option><option>Hilang</option><option>Lainnya</option></> : <><option>Penyusunan ulang</option><option>Pengisian rak</option><option>Pemindahan gudang</option></>}</select></label>{error && <p className="rounded-lg bg-[#fff0ee] p-3 text-xs text-[#c96c5e]">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-[#e1e6e8] px-4 py-2.5 text-xs font-semibold">Batal</button><button disabled={saving} className="rounded-xl bg-[#1f8f80] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Memproses..." : "Simpan perubahan"}</button></div></div></form></div>;
}

function StockCountView({ products, locations, onSaved }: { products: Product[]; locations: string[]; onSaved: () => void }) {
  const [locationCode, setLocationCode] = useState("GUDANG");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const items = products.map((product) => ({ productId: String(product.id), countedQty: counts[String(product.id)] ?? product.stock }));
    const response = await fetch("/api/stock-count", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationCode, items }),
    });
    const body = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      setMessage(body?.error ?? "Stock Count gagal disimpan.");
      return;
    }
    setMessage("Stock Count berhasil disimpan dan koreksi stok telah diterapkan.");
    onSaved();
  }
  return <><div className="mb-6"><p className="text-sm text-[#7e8993]">Cocokkan stok sistem dengan jumlah fisik</p><h2 className="mt-1 text-[25px] font-bold">Stock Count</h2></div><form onSubmit={save}><section className="rounded-2xl border border-[#e6e9ed] bg-white p-5 md:p-6"><div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end"><label className="w-full sm:w-64"><span className="label">Lokasi hitung</span><select value={locationCode} onChange={(event) => setLocationCode(event.target.value)} className="input"><option value="RAK-1">Rak 1</option><option value="RAK-2">Rak 2</option><option value="RAK-3">Rak 3</option><option value="RAK-4">Rak 4</option><option value="RAK-5">Rak 5</option><option value="GUDANG">Gudang</option>{locations.filter((location) => location.startsWith("Rak ") || location === "Gudang").length === 0 && <option value="BELUM-DITEMPATKAN">Belum ditempatkan</option>}</select></label><span className="text-[11px] text-[#929ba3]">Isi jumlah fisik. Kolom kosong memakai stok sistem.</span></div><div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left"><thead><tr className="border-b border-[#edf0f2] text-[10px] uppercase tracking-[0.1em] text-[#9aa3aa]"><th className="pb-3">Barang</th><th className="pb-3 text-right">Stok sistem</th><th className="pb-3 text-right">Jumlah fisik</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-b border-[#f1f2f3] last:border-0"><td className="py-3 text-xs font-semibold">{product.name}</td><td className="py-3 text-right text-xs">{product.stock} {product.unit}</td><td className="py-3 text-right"><input type="number" min="0" value={counts[String(product.id)] ?? ""} placeholder={String(product.stock)} onChange={(event) => setCounts((current) => ({ ...current, [String(product.id)]: Number(event.target.value) }))} className="input ml-auto w-24 text-right" /></td></tr>)}</tbody></table></div>{message && <p className="mt-4 rounded-xl bg-[#eef7f5] p-3 text-xs text-[#2b806f]">{message}</p>}<div className="mt-5 flex justify-end"><button disabled={saving} className="rounded-xl bg-[#1f8f80] px-4 py-3 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Menyimpan..." : "Simpan & terapkan koreksi"}</button></div></section></form></>;
}

function PlaceholderView({ title, onAdd, onNotify }: { title: string; onAdd: () => void; onNotify: (message: string) => void }) {
  return <div className="flex min-h-[520px] items-center justify-center"><div className="max-w-sm text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e9f6f3] text-[#20897b]"><Warehouse size={28} /></div><h2 className="mt-5 text-xl font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-[#89939c]">Modul {title.toLowerCase()} siap dikembangkan. Tambahkan data pertama untuk mulai mengelola stok.</p><button onClick={title === "Bantuan" ? () => onNotify("Bantuan: gunakan menu Tanya Stok atau cari barang dari header.") : onAdd} className="mt-5 rounded-xl bg-[#1f8f80] px-4 py-3 text-xs font-semibold text-white"><Plus className="mr-1 inline" size={15} /> {title === "Bantuan" ? "Lihat petunjuk" : "Tambah data"}</button></div></div>;
}

function AddProductModal({ product, onClose, onSubmit }: { product?: Product; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const editing = Boolean(product);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#16252b]/30 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-lg font-bold">{editing ? "Edit barang" : "Tambah barang baru"}</h2><p className="mt-1 text-xs text-[#8c969d]">{editing ? "Perbarui informasi barang tanpa mengubah riwayat stok." : "Isi informasi dasar barang yang ingin dicatat."}</p></div><button type="button" onClick={onClose} className="rounded-lg p-1 text-[#8e989f] hover:bg-[#f4f6f7]"><X size={18} /></button></div><form onSubmit={onSubmit} className="mt-6 grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="label">Nama barang</span><input name="name" required defaultValue={product?.name} placeholder="Contoh: Kabel HDMI 3M" className="input" /></label><label><span className="label">Kategori</span><input name="category" required defaultValue={product?.category} placeholder="Kabel" className="input" /></label><label><span className="label">SKU <small>(opsional)</small></span><input name="sku" defaultValue={product?.sku === "—" ? "" : product?.sku} placeholder="KBL-001" className="input" /></label><label><span className="label">Stok saat ini</span><input value={product?.stock ?? 0} readOnly className="input bg-[#f7f9fa] text-[#7d8991]" /></label><label><span className="label">Stok minimum</span><input name="minStock" type="number" min="0" defaultValue={product?.minStock ?? 5} className="input" /></label><label><span className="label">Satuan</span><select name="unit" defaultValue={product?.unit ?? "pcs"} className="input"><option>pcs</option><option>unit</option><option>meter</option><option>box</option></select></label>{!editing && <label><span className="label">Harga modal</span><input name="cost" type="number" min="0" placeholder="0" className="input" /></label>}<div className="mt-2 flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={onClose} className="rounded-xl border border-[#e1e6e8] px-4 py-2.5 text-xs font-semibold text-[#6d7880]">Batal</button><button className="rounded-xl bg-[#1f8f80] px-4 py-2.5 text-xs font-semibold text-white">{editing ? "Simpan perubahan" : "Simpan barang"}</button></div></form></div></div>;
}

function AiPanel({ products, onClose }: { products: Product[]; onClose: () => void }) {
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const answer = asked ? products.filter((product) => product.name.toLowerCase().includes(asked.toLowerCase()) || product.category.toLowerCase().includes(asked.toLowerCase())).slice(0, 2) : [];
  return <div className="fixed inset-0 z-50 flex justify-end bg-[#16252b]/25 backdrop-blur-[2px]"><div className="flex h-full w-full max-w-[430px] flex-col bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-[#e8ebed] px-5 py-5"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e4f5f1] text-[#208a7b]"><Sparkles size={17} /></div><div><h2 className="text-sm font-bold">Tanya Stok</h2><p className="text-[10px] text-[#89939c]">Asisten pencarian Wareflow</p></div></div><button onClick={onClose} className="rounded-lg p-1 text-[#8e989f] hover:bg-[#f4f6f7]"><X size={18} /></button></div><div className="flex-1 overflow-y-auto p-5"><div className="rounded-2xl bg-[#f2faf8] p-4"><p className="text-xs font-semibold text-[#356d65]">Halo 👋</p><p className="mt-1 text-xs leading-5 text-[#6e918a]">Saya bisa membantu menemukan lokasi dan jumlah stok barang.</p></div><p className="mb-3 mt-6 text-[10px] font-bold uppercase tracking-[0.12em] text-[#a0a8ae]">Coba tanyakan</p><div className="flex flex-wrap gap-2">{["Kabel HDMI ada di mana?", "Stok lampu", "Barang di gudang"].map((item) => <button key={item} onClick={() => { setQuestion(item); setAsked(item.replace(" ada di mana?", "").replace("Stok ", "").replace("Barang di ", "")); }} className="rounded-full border border-[#e0e8e6] px-3 py-2 text-[10px] text-[#5c7772] hover:bg-[#f2faf8]">{item}</button>)}</div>{asked && <div className="mt-8"><div className="ml-8 rounded-2xl rounded-tr-sm bg-[#f4f5f6] p-3 text-xs text-[#4d5962]">{question}</div><div className="mt-3 flex gap-2"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e4f5f1] text-[#208a7b]"><Sparkles size={13} /></div><div className="rounded-2xl rounded-tl-sm bg-[#f2faf8] p-3 text-xs leading-5 text-[#466b64]">{answer.length ? "Saya menemukan barang yang sesuai:" : "Barang belum ditemukan. Coba gunakan nama atau kategori lain."}{answer.map((product) => <div key={product.id} className="mt-2 rounded-xl border border-[#d9ece8] bg-white p-3"><p className="font-semibold text-[#294c46]">{product.name}</p><p className="mt-1 text-[10px] text-[#6e8e88]">Lokasi: <b className="text-[#1f8f80]">{product.location}</b> · Stok: <b>{product.stock} {product.unit}</b></p></div>)}</div></div></div>}</div><form onSubmit={(event) => { event.preventDefault(); setAsked(question); }} className="border-t border-[#e8ebed] p-5"><div className="flex items-center gap-2 rounded-xl border border-[#dfe5e6] bg-white p-2 focus-within:border-[#78bdb2]"><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Tulis pertanyaan..." className="min-w-0 flex-1 px-2 text-xs outline-none" /><button className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1f8f80] text-white"><ArrowUpRight size={15} /></button></div><p className="mt-2 text-center text-[9px] text-[#a2aab0]">AI membantu mencari. Periksa kembali informasi sebelum bertindak.</p></form></div></div>;
}
