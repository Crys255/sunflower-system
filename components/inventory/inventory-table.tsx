"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, ChevronDown, Filter, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import {
  formatInventoryQty,
  parseInventoryDate,
  type InventoryItem,
  type InventoryStatus,
} from "@/lib/inventory-data";
import type { AppRole } from "@/lib/session";
import { fetchJson } from "@/lib/api-client";

function getStatusStyle(status: InventoryStatus) {
  switch (status) {
    case "Low Stock":
      return {
        color: "bg-red-500",
        width: "30%",
        text: "text-red-700",
        bg: "bg-red-100",
      };
    case "Available":
      return {
        color: "bg-amber-500",
        width: "60%",
        text: "text-amber-700",
        bg: "bg-amber-100",
      };
    case "In Stock":
      return {
        color: "bg-emerald-500",
        width: "100%",
        text: "text-emerald-700",
        bg: "bg-emerald-100",
      };
  }
}

type ItemForm = {
  name: string;
  category: string;
  unit: string;
  qty: string;
  lowStock: string;
  idealStock: string;
};

const inventoryCategoryOptions = [
  "Vegetable",
  "Fruits",
  "Grains",
  "Sweeteners",
  "Spice",
  "Condiment",
] as const;

export function InventoryTable({
  onItemsChange,
}: {
  onItemsChange?: (items: InventoryItem[]) => void;
}) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("latest");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [categoryFilter, setCategoryFilter] = useState("All Category");
  const [activeMenuItem, setActiveMenuItem] = useState<InventoryItem | null>(null);
  const [currentRole, setCurrentRole] = useState<AppRole>("Owner");
  const [itemModalMode, setItemModalMode] = useState<"add" | "edit">("add");
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);
  const [stockModal, setStockModal] = useState<{ type: "add" | "reduce"; item: InventoryItem } | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm>({
    name: "",
    category: "",
    unit: "Pcs",
    qty: "",
    lowStock: "",
    idealStock: "",
  });
  const [stockValue, setStockValue] = useState("");

  const itemsPerPage = 8;

  useEffect(() => {
    Promise.all([
      fetchJson<{ user: { name: string; username: string; role: AppRole } }>("/api/auth/session"),
      fetchJson<{ items: InventoryItem[] }>("/api/inventory"),
    ])
      .then(([sessionData, inventoryData]) => {
        setCurrentRole(sessionData.user.role);
        setItems(inventoryData.items);
        onItemsChange?.(inventoryData.items);
      })
      .catch(() => {
        setItems([]);
        onItemsChange?.([]);
      });
  }, []);

  const categories = useMemo(
    () => ["All Category", ...new Set([...inventoryCategoryOptions, ...items.map((item) => item.category)])],
    [items],
  );

  const filteredData = useMemo(() => {
    const keyword = search.toLowerCase();

    return items.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword) ||
        item.id.includes(keyword);
      const matchStatus = statusFilter === "All Status" || item.status === statusFilter;
      const matchCategory = categoryFilter === "All Category" || item.category === categoryFilter;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [categoryFilter, items, search, statusFilter]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      switch (sortBy) {
        case "name":
        case "az":
          return a.name.localeCompare(b.name);
        case "za":
          return b.name.localeCompare(a.name);
        case "category":
          return a.category.localeCompare(b.category);
        case "qty":
          return a.qty - b.qty;
        case "status": {
          const statusOrder: Record<InventoryStatus, number> = {
            "Low Stock": 1,
            Available: 2,
            "In Stock": 3,
          };
          return statusOrder[a.status] - statusOrder[b.status];
        }
        case "latest":
        default:
          return parseInventoryDate(b.updated) - parseInventoryDate(a.updated);
      }
    });
  }, [filteredData, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortBy, statusFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  const persistItems = (nextItems: InventoryItem[]) => {
    setItems(nextItems);
    onItemsChange?.(nextItems);
  };

  const openAddItem = () => {
    setItemModalMode("add");
    setSelectedItem(null);
    setItemForm({
      name: "",
      category: "",
      unit: "Pcs",
      qty: "",
      lowStock: "",
      idealStock: "",
    });
    setItemModalOpen(true);
  };

  const openEditItem = (item: InventoryItem) => {
    setItemModalMode("edit");
    setSelectedItem(item);
    setItemForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      qty: String(item.qty),
      lowStock: String(item.lowStock),
      idealStock: String(item.idealStock),
    });
    setItemModalOpen(true);
  };

  const submitItemForm = () => {
    const qty = Number(itemForm.qty);
    const lowStock = Number(itemForm.lowStock);
    const idealStock = Number(itemForm.idealStock);
    if (!itemForm.name || !itemForm.category || !itemForm.unit || Number.isNaN(qty) || Number.isNaN(lowStock) || Number.isNaN(idealStock)) return;
    if (idealStock < lowStock) return;

    if (itemModalMode === "add") {
      fetchJson<{ items: InventoryItem[] }>("/api/inventory", {
        method: "POST",
        body: JSON.stringify({
          name: itemForm.name,
          category: itemForm.category,
          unit: itemForm.unit,
          qty,
          lowStock,
          idealStock,
        }),
      })
        .then((data) => {
          persistItems(data.items);
          setItemModalOpen(false);
        })
        .catch((error) => alert(error instanceof Error ? error.message : "Gagal menambah item."));
      return;
    } else if (selectedItem) {
      fetchJson<{ items: InventoryItem[] }>(`/api/inventory/${encodeURIComponent(selectedItem.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: itemForm.name,
          category: itemForm.category,
          unit: itemForm.unit,
          qty,
          lowStock,
          idealStock,
        }),
      })
        .then((data) => {
          persistItems(data.items);
          setItemModalOpen(false);
        })
        .catch((error) => alert(error instanceof Error ? error.message : "Gagal mengubah item."));
      return;
    }
  };

  const submitStockChange = () => {
    if (!stockModal) return;
    const amount = Number(stockValue);
    if (Number.isNaN(amount) || amount <= 0) return;

    fetchJson<{ items: InventoryItem[] }>(`/api/inventory/${encodeURIComponent(stockModal.item.id)}/stock`, {
      method: "POST",
      body: JSON.stringify({
        type: stockModal.type,
        amount,
      }),
    })
      .then((data) => {
        persistItems(data.items);
        setStockModal(null);
        setStockValue("");
      })
      .catch((error) => alert(error instanceof Error ? error.message : "Gagal memperbarui stock."));
  };

  const submitDelete = () => {
    if (!deleteItem) return;
    fetchJson<{ items: InventoryItem[] }>(
      `/api/inventory/${encodeURIComponent(deleteItem.id)}`,
      { method: "DELETE" },
    )
      .then((data) => {
        persistItems(data.items);
        setDeleteItem(null);
      })
      .catch((error) => alert(error instanceof Error ? error.message : "Gagal menghapus item."));
  };

  return (
    <section className="space-y-4 rounded-[28px] border border-[#efe7d4] bg-white p-5 shadow-sm lg:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">Stock Control Center</p>
          <p className="text-sm text-slate-500">
            Cari barang, filter stok, dan kelola pergerakan item sesuai hak akses user.
          </p>
        </div>

        {currentRole === "Owner" && (
          <button
            onClick={openAddItem}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f6c33b] px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-[#ebb019]"
          >
            <Plus size={16} />
            Add Item
          </button>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.8fr))]">
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Search size={18} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search item, category, or SID..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
          <Filter size={16} className="text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-700 outline-none"
          >
            <option>All Status</option>
            <option>Low Stock</option>
            <option>Available</option>
            <option>In Stock</option>
          </select>
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
          <ChevronDown size={16} className="text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-700 outline-none"
          >
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
          <SlidersHorizontal size={16} className="text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-700 outline-none"
          >
            <option value="latest">Latest Update</option>
            <option value="name">Name</option>
            <option value="category">Category</option>
            <option value="az">A-Z</option>
            <option value="za">Z-A</option>
            <option value="qty">Quantity</option>
            <option value="status">Stock Status</option>
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl bg-[#fff9e8] px-4 py-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <span>
          Showing {sortedData.length === 0 ? 0 : startIndex + 1} - {Math.min(startIndex + itemsPerPage, sortedData.length)} of {sortedData.length} items
        </span>
        <span className="inline-flex items-center gap-2 text-slate-500">
          <ArrowUpDown size={14} />
          Active sort: <strong className="font-semibold text-slate-700">{sortBy === "latest" ? "Latest Update" : sortBy.toUpperCase()}</strong>
        </span>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr className="text-left">
                <th className="px-4 py-3">SID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="bg-white">
              {currentData.length > 0 ? (
                currentData.map((item) => {
                  const style = getStatusStyle(item.status);

                  return (
                    <tr key={item.id} className="border-t border-slate-100 hover:bg-[#fffdf7]">
                      <td className="px-4 py-4 font-medium text-slate-700">{item.id}</td>
                      <td className="px-4 py-4">{item.name}</td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-4">{item.unit}</td>
                      <td className="px-4 py-4">{item.qty}</td>
                      <td className="px-4 py-4">
                        <div className="flex w-32 flex-col gap-1.5">
                          <span className={`${style.bg} ${style.text} rounded-full px-2.5 py-1 text-center text-xs font-medium`}>
                            {item.status}
                          </span>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div className={`${style.color} h-2 rounded-full transition-all`} style={{ width: style.width }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-500">{item.updated}</td>
                      <td className="px-4 py-4">
                        <div className="relative flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setStockModal({ type: "add", item });
                              setStockValue("");
                              setActiveMenuItem(null);
                            }}
                            className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
                          >
                            Add Stock
                          </button>
                          <button
                            onClick={() => {
                              setStockModal({ type: "reduce", item });
                              setStockValue("");
                              setActiveMenuItem(null);
                            }}
                            className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50"
                          >
                            Reduce Stock
                          </button>
                          {currentRole === "Owner" && (
                            <>
                              <button
                                onClick={() => setActiveMenuItem(item)}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                              >
                                More
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                    Tidak ada item yang cocok dengan pencarian atau filter saat ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between">
        <span className="text-slate-500">
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
            className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
            className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage === totalPages || sortedData.length === 0}
          >
            Next
          </button>
        </div>
      </div>

      {itemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {itemModalMode === "add" ? "Add New Item" : "Edit Item"}
                </h2>
                <p className="text-sm text-slate-500">
                  {itemModalMode === "add"
                    ? "Isi detail stok baru untuk memperbarui inventory UMKM."
                    : "Perbarui detail barang stock sesuai kondisi terbaru."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setItemModalOpen(false)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 text-sm md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-slate-600">Item Name</label>
                <input
                  value={itemForm.name}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter item name"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-slate-600">SID</label>
                <input
                  value={selectedItem?.id ?? String(items.length + 1).padStart(3, "0")}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-slate-600">Unit Type</label>
                <select
                  value={itemForm.unit}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, unit: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                >
                  <option>Pcs</option>
                  <option>Gram</option>
                  <option>Kg</option>
                  <option>Liter</option>
                  <option>Pack</option>
                  <option>Bottle</option>
                  <option>Tray</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-slate-600">Category</label>
                <select
                  value={itemForm.category}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                >
                  <option value="">Select category</option>
                  {inventoryCategoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-slate-600">Quantity</label>
                <input
                  value={itemForm.qty}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, qty: e.target.value }))}
                  placeholder="Enter quantity"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-slate-600">Low Stock</label>
                <input
                  value={itemForm.lowStock}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, lowStock: e.target.value }))}
                  placeholder="Enter low stock threshold"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-slate-600">Ideal Stock</label>
                <input
                  value={itemForm.idealStock}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, idealStock: e.target.value }))}
                  placeholder="Enter ideal stock threshold"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setItemModalOpen(false)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitItemForm}
                className="rounded-xl bg-[#f6c33b] px-6 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-[#ebb019]"
              >
                {itemModalMode === "add" ? "Add" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {stockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-2xl font-semibold text-slate-900">
                  {stockModal.type === "add" ? "Add Stock" : "Reduce Stock"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStockModal(null);
                  setStockValue("");
                }}
                className="rounded-xl border border-slate-200 p-2 text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <label className="mb-2 block text-sm text-slate-600">Item Name</label>
                <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700">
                  {stockModal.item.name}
                </div>
              </div>

              <p className="text-sm text-slate-600">
                Current Stock : [{formatInventoryQty(stockModal.item.qty, stockModal.item.unit)}]
              </p>

              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-700">
                  {stockModal.type === "add" ? "Add Quantity =" : "Reduce Quantity ="}
                </label>
                <input
                  value={stockValue}
                  onChange={(e) => setStockValue(e.target.value)}
                  placeholder="Enter Quantity"
                  className="w-full max-w-[180px] rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setStockModal(null);
                  setStockValue("");
                }}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitStockChange}
                className="rounded-xl bg-[#f6c33b] px-6 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-[#ebb019]"
              >
                {stockModal.type === "add" ? "Add" : "Reduce"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeMenuItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xl font-semibold text-slate-900">Item Actions</p>
                <p className="mt-1 text-sm text-slate-500">
                  Pilih aksi untuk item <strong>{activeMenuItem.name}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveMenuItem(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => {
                  openEditItem(activeMenuItem);
                  setActiveMenuItem(null);
                }}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Edit Item
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteItem(activeMenuItem);
                  setActiveMenuItem(null);
                }}
                className="w-full rounded-2xl border border-rose-200 px-4 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
              >
                Delete Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Delete Stock</h2>
                <p className="text-sm text-slate-500">Konfirmasi penghapusan item stock dari inventory.</p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteItem(null)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 text-sm md:grid-cols-2">
              <ReadOnlyField label="Item Name" value={deleteItem.name} className="md:col-span-2" />
              <ReadOnlyField label="SID" value={deleteItem.id} />
              <ReadOnlyField label="Unit Type" value={deleteItem.unit} />
              <ReadOnlyField label="Category" value={deleteItem.category} />
              <ReadOnlyField label="Quantity" value={formatInventoryQty(deleteItem.qty, deleteItem.unit)} />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteItem(null)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDelete}
                className="rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ReadOnlyField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-slate-600">{label}</label>
      <div className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700">
        {value}
      </div>
    </div>
  );
}
