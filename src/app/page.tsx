"use client";

import {
  BarChart3,
  Bell,
  Boxes,
  Camera,
  ChevronDown,
  CircleHelp,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  PackagePlus,
  Search,
  Settings,
  Sparkles,
  Warehouse,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AccountInfo,
  DashboardSummary,
  Location,
  Product,
  PurchaseRecord,
  formatDate,
  formatLongDate,
  initials,
  mapProduct,
} from "@/lib/ui";
import { Toast } from "@/components/ui";
import { DashboardView } from "@/components/dashboard-view";
import { ProductsView } from "@/components/products-view";
import { PurchasesView } from "@/components/purchases-view";
import { LocationsView } from "@/components/locations-view";
import { ImportView } from "@/components/import-view";
import { StockCountView } from "@/components/stock-count-view";
import { ScanReceiptView } from "@/components/scan-receipt-view";
import { SettingsView } from "@/components/settings-view";
import { HelpView } from "@/components/help-view";
import { AiPanel } from "@/components/ai-panel";
import { AddProductModal, ProductFormValues, StockActionModal } from "@/components/inventory-modals";

type PageKey =
  | "ringkasan"
  | "barang"
  | "pembelian"
  | "lokasi"
  | "import"
  | "stock-count"
  | "scan-nota"
  | "pengaturan"
  | "bantuan";

const mainNav: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "ringkasan", label: "Ringkasan", icon: LayoutDashboard },
  { key: "barang", label: "Barang", icon: Boxes },
  { key: "pembelian", label: "Pembelian", icon: PackagePlus },
  { key: "lokasi", label: "Lokasi", icon: Warehouse },
  { key: "import", label: "Import data", icon: FileSpreadsheet },
  { key: "stock-count", label: "Stock Count", icon: BarChart3 },
  { key: "scan-nota", label: "Scan Nota", icon: Camera },
];

const otherNav: { key: PageKey; label: string; icon: typeof Settings }[] = [
  { key: "pengaturan", label: "Pengaturan", icon: Settings },
  { key: "bantuan", label: "Bantuan", icon: CircleHelp },
];

const titles: Record<PageKey, string> = {
  ringkasan: "Ringkasan",
  barang: "Barang",
  pembelian: "Pembelian",
  lokasi: "Lokasi",
  import: "Import data",
  "stock-count": "Stock Count",
  "scan-nota": "Scan Nota",
  pengaturan: "Pengaturan",
  bantuan: "Bantuan",
};

type Notice = { kind: "success" | "error"; message: string };

export default function Home() {
  const router = useRouter();
  const [active, setActive] = useState<PageKey>("ringkasan");
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAi, setShowAi] = useState(false);
  const [stockAction, setStockAction] = useState<{ product: Product; type: "KELUAR" | "PINDAH" } | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [todayLabel, setTodayLabel] = useState("");
  const [todayShort, setTodayShort] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const notify = useCallback((kind: Notice["kind"], message: string) => {
    setNotice({ kind, message });
  }, []);

  const loadData = useCallback(async () => {
    try {
      const responses = await Promise.all([
        fetch("/api/products"),
        fetch("/api/locations"),
        fetch("/api/purchases"),
        fetch("/api/dashboard"),
        fetch("/api/account"),
      ]);
      if (responses.some((response) => response.status === 401)) {
        router.replace("/login");
        return;
      }
      if (!responses.every((response) => response.ok)) {
        setLoadError("Sebagian data gagal dimuat. Coba muat ulang.");
        return;
      }
      const [productData, locationData, purchaseData, dashboardData, accountData] = await Promise.all(
        responses.map((response) => response.json()),
      );

      setProducts((productData as Parameters<typeof mapProduct>[0][]).map(mapProduct));
      setLocations(locationData as Location[]);
      setPurchases(
        (purchaseData as {
          id: string;
          purchaseDate: string;
          supplier?: { name: string } | null;
          invoiceNo?: string | null;
          items: { product?: { name: string } | null }[];
          totalCost: number;
          cancelledAt?: string | null;
        }[]).map((item) => {
          const names = item.items.map((entry) => entry.product?.name).filter(Boolean) as string[];
          const label = names.slice(0, 2).join(", ") + (names.length > 2 ? ` +${names.length - 2}` : "");
          return {
            id: item.id,
            date: new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(
              new Date(item.purchaseDate),
            ),
            supplier: item.supplier?.name ?? "Tanpa pemasok",
            invoiceNo: item.invoiceNo ?? null,
            items: item.items.length,
            itemLabel: label || `${item.items.length} barang`,
            total: item.totalCost,
            status: item.cancelledAt ? "Dibatalkan" : "Tersimpan",
          };
        }),
      );
      setSummary(dashboardData as DashboardSummary);
      setAccount(accountData as AccountInfo);
      setLoadError("");
    } catch {
      setLoadError("Koneksi bermasalah saat memuat data.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Initial data fetch: state is filled once from the API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  useEffect(() => {
    // Client-only clock to avoid evaluating the current time during prerender.
    const now = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodayLabel(formatLongDate(now));
    setTodayShort(formatDate(now));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      [product.name, product.category, product.sku, product.locations.map((location) => location.name).join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [products, query]);

  const lowStockProducts = useMemo(() => products.filter((product) => product.status !== "Aman"), [products]);

  function openProductsForLocation(location: Location) {
    setQuery(location.name);
    setActive("barang");
  }

  async function logout() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        notify("error", "Logout gagal. Silakan coba lagi.");
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      notify("error", "Logout gagal karena koneksi bermasalah.");
    }
  }

  async function saveProduct(values: ProductFormValues, id?: string) {
    const response = await fetch("/api/products", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id, ...values } : values),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) return { ok: false as const, error: body?.error ?? "Barang gagal disimpan." };
    await loadData();
    notify("success", id ? `${values.name} berhasil diperbarui.` : `${values.name} berhasil ditambahkan.`);
    return { ok: true as const };
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Hapus ${product.name}? Barang akan diarsipkan dan tidak tampil di daftar.`)) return;
    const response = await fetch("/api/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: product.id }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      notify("error", body?.error ?? "Barang gagal dihapus.");
      return;
    }
    await loadData();
    notify("success", `${product.name} berhasil dihapus.`);
  }

  function renderView() {
    if (loading) return <DashboardSkeleton />;

    if (active === "ringkasan") {
      return summary ? (
        <DashboardView
          summary={summary}
          products={products}
          onAdd={() => setShowAdd(true)}
          onAi={() => setShowAi(true)}
          onNavigate={setActive}
          onEdit={setEditingProduct}
          onDelete={deleteProduct}
        />
      ) : (
        <div className="rounded-2xl border border-[#f0d6d1] bg-[#fff8f6] p-5 text-sm text-[#a45b4f]">
          Ringkasan gagal dimuat.{" "}
          <button type="button" onClick={() => void loadData()} className="font-semibold underline">
            Coba lagi
          </button>
        </div>
      );
    }

    if (active === "barang") {
      return (
        <ProductsView
          products={filteredProducts}
          query={query}
          onAdd={() => setShowAdd(true)}
          onEdit={setEditingProduct}
          onDelete={deleteProduct}
          onStock={(product, type) => setStockAction({ product, type })}
        />
      );
    }

    if (active === "pembelian") {
      return (
        <PurchasesView
          purchases={purchases}
          products={products}
          locations={locations}
          onSaved={loadData}
          notify={notify}
        />
      );
    }

    if (active === "lokasi") {
      return (
        <LocationsView locations={locations} onSaved={loadData} onOpenProducts={openProductsForLocation} notify={notify} />
      );
    }

    if (active === "import") return <ImportView onImported={loadData} notify={notify} />;

    if (active === "stock-count") {
      return <StockCountView products={products} locations={locations} onSaved={loadData} notify={notify} />;
    }

    if (active === "scan-nota") {
      return (
        <ScanReceiptView
          products={products}
          locations={locations}
          onSaved={loadData}
          onManual={() => setActive("pembelian")}
          notify={notify}
        />
      );
    }

    if (active === "pengaturan" && account) {
      return (
        <SettingsView
          account={account}
          onAccountUpdated={(updated) => {
            setAccount(updated);
            setSummary((current) => (current ? { ...current, user: { ...current.user, name: updated.name } } : current));
          }}
          onLogout={logout}
          notify={notify}
        />
      );
    }

    if (active === "bantuan") return <HelpView onNavigate={setActive} />;

    return <DashboardSkeleton />;
  }

  const displayName = account?.name ?? summary?.user.name ?? "Pengguna";
  const branchLabel = account?.role === "OWNER" ? "Pemilik" : "Akun terverifikasi";

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#17202a]">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-[#061719]/45 backdrop-blur-md lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(84vw,300px)] flex-col border-r border-[#e6e9ed] bg-white px-5 py-6 transition-transform duration-300 ease-out lg:w-[260px] lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f8f80] text-lg font-bold text-white">WF</div>
            <div>
              <p className="truncate text-[17px] font-bold tracking-tight">
                Ware<span className="text-[#1f8f80]">flow</span>
              </p>
              <p className="truncate text-[11px] text-[#8b949e]">Manajemen Inventaris</p>
            </div>
          </div>
          <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Tutup sidebar" className="lg:hidden">
            <X size={18} />
          </button>
        </div>

        <div className="mt-8">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a2aab2]">Menu utama</p>
          <nav className="space-y-1">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const selected = active === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setActive(item.key);
                    setSidebarOpen(false);
                    if (item.key !== "barang") setQuery("");
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${
                    selected ? "bg-[#e9f6f3] text-[#197d70]" : "text-[#65717d] hover:bg-[#f5f7f8]"
                  }`}
                >
                  <Icon size={18} strokeWidth={selected ? 2.4 : 1.8} />
                  {item.label}
                  {item.key === "barang" && (
                    <span className="ml-auto rounded-full bg-[#f0f2f4] px-2 py-0.5 text-[10px] text-[#7b858d]">
                      {products.length}
                    </span>
                  )}
                  {item.key === "scan-nota" && (
                    <span className="ml-auto rounded-md bg-[#eef3ff] px-1.5 py-0.5 text-[9px] font-bold text-[#5b83d4]">AI</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-7">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a2aab2]">Lainnya</p>
          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => {
                setShowAi(true);
                setSidebarOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#65717d] hover:bg-[#f5f7f8]"
            >
              <Sparkles size={18} strokeWidth={1.8} /> Tanya Stok
              <span className="ml-auto rounded-md bg-[#fff4df] px-1.5 py-0.5 text-[9px] font-bold text-[#bd7b18]">AI</span>
            </button>
            {otherNav.map((item) => {
              const Icon = item.icon;
              const selected = active === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setActive(item.key);
                    setSidebarOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${
                    selected ? "bg-[#e9f6f3] text-[#197d70]" : "text-[#65717d] hover:bg-[#f5f7f8]"
                  }`}
                >
                  <Icon size={18} strokeWidth={selected ? 2.4 : 1.8} /> {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto rounded-2xl bg-[#f2faf8] p-4">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#d7f0eb] text-[#168272]">
            <Sparkles size={16} />
          </div>
          <p className="text-xs font-semibold text-[#2e554e]">Butuh bantuan cari barang?</p>
          <p className="mt-1 text-[11px] leading-5 text-[#6b8d86]">Tanyakan lokasi dan stok dengan bahasa sehari-hari.</p>
          <button type="button" onClick={() => setShowAi(true)} className="mt-3 text-[11px] font-bold text-[#168272]">
            Coba Tanya Stok
          </button>
        </div>
      </aside>

      <main className="lg:ml-[260px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between gap-3 border-b border-[#e6e9ed] bg-[#f7f8fa]/95 px-4 backdrop-blur sm:px-5 md:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Buka menu" className="lg:hidden">
              <Menu size={21} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-[11px] text-[#89939d]">
                <span className="sm:hidden">{todayShort}</span>
                <span className="hidden sm:inline">{todayLabel}</span>
              </p>
              <h1 className="mt-0.5 truncate text-[20px] font-bold tracking-tight">{titles[active]}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="Cari barang"
              onClick={() => {
                setActive("barang");
                setMobileSearch(true);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e2e6e9] bg-white text-[#66717b] md:hidden"
            >
              <Search size={17} />
            </button>

            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98a2aa]" size={17} />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (event.target.value && active !== "barang") setActive("barang");
                }}
                placeholder="Cari barang, SKU, lokasi..."
                aria-label="Cari barang"
                className="h-10 w-[240px] rounded-xl border border-[#e2e6e9] bg-white pl-10 pr-4 text-xs outline-none transition focus:border-[#65b5a8] focus:ring-4 focus:ring-[#dff2ee] lg:w-[280px]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-[#e2e6e9] px-1.5 py-0.5 text-[9px] text-[#9aa3aa]">⌘K</span>
            </div>

            <div className="relative">
              <button
                type="button"
                aria-label="Notifikasi"
                aria-expanded={notifOpen}
                onClick={() => setNotifOpen((current) => !current)}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#e2e6e9] bg-white text-[#66717b]"
              >
                <Bell size={17} />
                {lowStockProducts.length > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#e77b67]" />}
              </button>
              {notifOpen && (
                <>
                  <button type="button" aria-label="Tutup notifikasi" onClick={() => setNotifOpen(false)} className="fixed inset-0 z-30 cursor-default" />
                  <div className="absolute right-0 top-12 z-40 w-[280px] rounded-2xl border border-[#e2e6e9] bg-white p-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold">Perlu perhatian</p>
                      <span className="text-[10px] text-[#8b959d]">{lowStockProducts.length} barang</span>
                    </div>
                    {lowStockProducts.length === 0 ? (
                      <p className="mt-3 rounded-lg bg-[#f4fbf9] p-3 text-[11px] text-[#2b806f]">Semua stok aman.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {lowStockProducts.slice(0, 4).map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                              setActive("barang");
                              setNotifOpen(false);
                            }}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[#f7f9fa]"
                          >
                            <span className="min-w-0 truncate text-[11px]">{product.name}</span>
                            <span className={`shrink-0 text-[9px] font-bold ${product.status === "Habis" ? "text-[#d97163]" : "text-[#c5892b]"}`}>
                              {product.status}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setActive("barang");
                        setNotifOpen(false);
                      }}
                      className="mt-3 w-full rounded-lg border border-[#eef0f2] py-2 text-[10px] font-semibold text-[#69757e] hover:bg-[#f8fafb]"
                    >
                      Lihat semua barang
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 border-l border-[#e2e6e9] pl-2 sm:pl-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0d7bd] text-xs font-bold text-[#8a5e3b]">
                {initials(displayName)}
              </div>
              <div className="hidden sm:block">
                <p className="max-w-[120px] truncate text-xs font-semibold">{displayName}</p>
                <p className="text-[10px] text-[#8e979f]">{branchLabel}</p>
              </div>
              <ChevronDown size={14} className="hidden text-[#9ba4ac] sm:block" />
              <button
                type="button"
                onClick={logout}
                aria-label="Keluar dari akun"
                title="Keluar"
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-xl border border-[#e2e6e9] bg-white text-[#66717b] transition hover:border-[#f0c5bf] hover:bg-[#fff5f3] hover:text-[#c96c5e]"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {mobileSearch && (
          <div className="border-b border-[#e6e9ed] bg-white px-4 py-3 md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98a2aa]" size={16} />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari barang, SKU, lokasi..."
                aria-label="Cari barang"
                className="h-10 w-full rounded-xl border border-[#e2e6e9] bg-white pl-9 pr-10 text-xs outline-none focus:border-[#65b5a8]"
              />
              <button
                type="button"
                aria-label="Tutup pencarian"
                onClick={() => {
                  setMobileSearch(false);
                  setQuery("");
                }}
                className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#8e989f] hover:bg-[#f4f6f7]"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        <div className="dashboard-enter px-5 py-7 md:px-10 md:py-9">
          {loadError && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#f0d6d1] bg-[#fff8f6] px-4 py-3 text-xs text-[#a45b4f]">
              <span>{loadError}</span>
              <button type="button" onClick={() => void loadData()} className="shrink-0 font-semibold underline">
                Muat ulang
              </button>
            </div>
          )}
          {renderView()}
        </div>
      </main>

      {showAdd && (
        <AddProductModal
          locations={locations}
          onClose={() => setShowAdd(false)}
          onSubmit={(values) => saveProduct(values)}
        />
      )}
      {editingProduct && (
        <AddProductModal
          product={editingProduct}
          locations={locations}
          onClose={() => setEditingProduct(null)}
          onSubmit={(values) => saveProduct(values, editingProduct.id)}
        />
      )}
      {stockAction && (
        <StockActionModal
          product={stockAction.product}
          type={stockAction.type}
          locations={locations}
          onClose={() => setStockAction(null)}
          onSaved={async () => {
            await loadData();
            notify("success", "Perubahan stok berhasil disimpan.");
          }}
        />
      )}
      {showAi && <AiPanel onClose={() => setShowAi(false)} />}
      {notice && <Toast kind={notice.kind} message={notice.message} onClose={() => setNotice(null)} />}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-8 w-64 rounded-lg bg-[#e9edf0]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="h-32 rounded-2xl border border-[#e6e9ed] bg-white p-5">
            <div className="h-9 w-9 rounded-xl bg-[#eef1f3]" />
            <div className="mt-4 h-3 w-24 rounded bg-[#eef1f3]" />
            <div className="mt-2 h-6 w-32 rounded bg-[#e9edf0]" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <div className="h-72 rounded-2xl border border-[#e6e9ed] bg-white" />
        <div className="h-72 rounded-2xl border border-[#e6e9ed] bg-white" />
      </div>
      <div className="h-64 rounded-2xl border border-[#e6e9ed] bg-white" />
    </div>
  );
}
