"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Search, Trash2, TrendingDown, TrendingUp, Wallet, X } from "lucide-react";
import { PageContainer } from "@/components/pagecontainer";
import type { FinancialTransaction } from "@/lib/financial-store";
import type { AppRole } from "@/lib/session";
import { fetchJson } from "@/lib/api-client";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatAmountInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(digits)).replace(/,/g, ".");
}

function parseAmountInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

function formatDateForApi(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}

function parseDate(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  return new Date(year, month - 1, day).getTime();
}

function parseDateObject(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  return new Date(year, month - 1, day);
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getReferenceDate(transactions: FinancialTransaction[]) {
  if (transactions.length === 0) return new Date();
  return transactions
    .map((item) => parseDateObject(item.date))
    .sort((a, b) => b.getTime() - a.getTime())[0];
}

export default function FinancialPage() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("latest");
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<FinancialTransaction | null>(null);
  const [currentRole, setCurrentRole] = useState<AppRole>("Owner");
  const [cashflowTimeline, setCashflowTimeline] = useState<"day" | "week" | "month">("month");
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [currentUsername, setCurrentUsername] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    user: "",
    notes: "",
    status: "Income" as "Income" | "Expense",
    amount: "",
    date: "",
  });

  useEffect(() => {
    Promise.all([
      fetchJson<{ user: { name: string; username: string; role: AppRole } }>("/api/auth/session"),
      fetchJson<{ transactions: FinancialTransaction[] }>("/api/financial"),
    ])
      .then(([userData, transactionData]) => {
        setCurrentRole(userData.user.role);
        setCurrentUsername(userData.user.username);
        setTransactions(transactionData.transactions);
        setNewTransaction((prev) => ({
          ...prev,
          user: userData.user.name,
        }));
      })
      .catch(() => {
        setTransactions([]);
      });
  }, []);

  const filteredTransactions = useMemo(() => {
    const keyword = search.toLowerCase();

    return transactions.filter((item) => {
      const matchesSearch =
        item.id.toLowerCase().includes(keyword) ||
        item.user.toLowerCase().includes(keyword) ||
        item.notes.toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === "All" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, transactions]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      switch (sortBy) {
        case "amount-high":
          return b.amount - a.amount;
        case "amount-low":
          return a.amount - b.amount;
        case "name":
          return a.user.localeCompare(b.user);
        case "latest":
        default:
          return parseDate(b.date) - parseDate(a.date);
      }
    });
  }, [filteredTransactions, sortBy]);

  const totalRevenue = transactions.filter((item) => item.status === "Income").reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = transactions.filter((item) => item.status === "Expense").reduce((sum, item) => sum + item.amount, 0);
  const netIncome = totalRevenue - totalExpenses;

  const cashflowData = useMemo(() => {
    const referenceDate = getReferenceDate(transactions);

    const buildBucket = (label: string, start: Date, end: Date) => {
      const income = transactions
        .filter((item) => {
          const date = parseDateObject(item.date);
          return item.status === "Income" && date >= start && date <= end;
        })
        .reduce((sum, item) => sum + item.amount, 0);

      const expense = transactions
        .filter((item) => {
          const date = parseDateObject(item.date);
          return item.status === "Expense" && date >= start && date <= end;
        })
        .reduce((sum, item) => sum + item.amount, 0);

      return { label, income, expense };
    };

    if (cashflowTimeline === "day") {
      const weekStart = startOfWeek(referenceDate);
      return ["Mon", "Tue", "Wed", "Thu", "Fri"].map((label, index) => {
        const start = new Date(weekStart);
        start.setDate(weekStart.getDate() + index);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        return buildBucket(label, start, end);
      });
    }

    if (cashflowTimeline === "week") {
      const currentWeekStart = startOfWeek(referenceDate);
      return ["W1", "W2", "W3", "W4"].map((label, index) => {
        const weeksAgo = 3 - index;
        const start = new Date(currentWeekStart);
        start.setDate(currentWeekStart.getDate() - weeksAgo * 7);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return buildBucket(label, start, end);
      });
    }

    return ["Jan", "Feb", "Mar", "Apr"].map((label, index) => {
      const monthsAgo = 3 - index;
      const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - monthsAgo, 1);
      const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - monthsAgo + 1, 0);
      end.setHours(23, 59, 59, 999);
      return buildBucket(label, start, end);
    });
  }, [cashflowTimeline, transactions]);

  const maxCashflowValue = useMemo(() => {
    return Math.max(...cashflowData.flatMap((item) => [item.income, item.expense]), 0);
  }, [cashflowData]);

  const stats = [
    {
      title: "Total Revenue",
      value: formatCurrency(totalRevenue),
      icon: TrendingUp,
      color: "text-emerald-700",
      bg: "bg-emerald-100",
    },
    {
      title: "Total Expenses",
      value: formatCurrency(totalExpenses),
      icon: TrendingDown,
      color: "text-rose-700",
      bg: "bg-rose-100",
    },
    {
      title: "Net Income",
      value: formatCurrency(netIncome),
      icon: Wallet,
      color: "text-blue-700",
      bg: "bg-blue-100",
    },
  ];

  const handleDelete = (transaction: FinancialTransaction) => {
    fetchJson<{ transactions: FinancialTransaction[] }>(
      `/api/financial/${encodeURIComponent(transaction.id)}`,
      { method: "DELETE" },
    )
      .then((data) => {
        setTransactions(data.transactions);
        setPendingDelete(null);
      })
      .catch((error) => alert(error instanceof Error ? error.message : "Gagal menghapus transaksi."));
  };

  const handleAddTransaction = () => {
    if (!newTransaction.user || !newTransaction.notes || !newTransaction.amount || !newTransaction.date) return;

    fetchJson<{ transactions: FinancialTransaction[] }>("/api/financial", {
      method: "POST",
        body: JSON.stringify({
          targetUsername: currentUsername,
          notes: newTransaction.notes,
          status: newTransaction.status,
          amount: parseAmountInput(newTransaction.amount),
          date: formatDateForApi(newTransaction.date),
        }),
      })
      .then((data) => {
        setTransactions(data.transactions);
        setIsAddOpen(false);
        setNewTransaction((prev) => ({
          ...prev,
          notes: "",
          amount: "",
          date: "",
          status: "Income",
        }));
      })
      .catch((error) => alert(error instanceof Error ? error.message : "Gagal menambah transaksi."));
  };

  return (
    <PageContainer
      title="Financial Report"
      description={
        currentRole === "Owner"
          ? "Kelola arus kas, transaksi pemasukan-pengeluaran, dan laporan keuangan UMKM secara lebih terstruktur."
          : "Tambah dan lihat riwayat transaksi finansial milik Anda."
      }
      actionButton={
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="rounded-2xl bg-[#f6c33b] px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-[#ebb019]"
        >
          + Add Transaction
        </button>
      }
    >
      {currentRole === "Owner" && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.title} className="flex items-center justify-between rounded-[24px] border border-[#efe7d4] bg-white p-5 shadow-sm">
                <div>
                  <p className="text-sm text-slate-500">{stat.title}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">{stat.value}</h2>
                </div>

                <div className={`${stat.bg} rounded-2xl p-3`}>
                  <stat.icon className={stat.color} size={22} />
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[28px] border border-[#efe7d4] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">Cash Flow Overview</p>
                  <p className="text-sm text-slate-500">Perbandingan pemasukan dan pengeluaran berdasarkan timeline.</p>
                </div>
                <div className="inline-flex rounded-2xl bg-slate-100 p-1">
                  {([
                    { key: "day", label: "Per Day" },
                    { key: "week", label: "Per Week" },
                    { key: "month", label: "Per Month" },
                  ] as const).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setCashflowTimeline(item.key)}
                      className={`rounded-xl px-3 py-2 text-xs font-medium transition ${
                        cashflowTimeline === item.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`mt-6 grid gap-4 ${cashflowTimeline === "day" ? "grid-cols-5" : "grid-cols-4"}`}>
                {cashflowData.map((item) => (
                  <div key={item.label} className="rounded-[24px] bg-slate-50 p-4">
                    <div className="flex h-40 items-end justify-center gap-2">
                      <div
                        className="w-5 rounded-full bg-emerald-500"
                        style={{ height: `${maxCashflowValue > 0 ? Math.max((item.income / maxCashflowValue) * 100, item.income > 0 ? 8 : 0) : 0}%` }}
                      />
                      <div
                        className="w-5 rounded-full bg-rose-400"
                        style={{ height: `${maxCashflowValue > 0 ? Math.max((item.expense / maxCashflowValue) * 100, item.expense > 0 ? 8 : 0) : 0}%` }}
                      />
                    </div>
                    <p className="mt-4 text-center text-sm font-medium text-slate-600">{item.label}</p>
                    <div className="mt-2 space-y-1 text-center text-[11px] text-slate-500">
                      <p>Income: {formatCurrency(item.income)}</p>
                      <p>Expense: {formatCurrency(item.expense)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-[#efe7d4] bg-[#fff9e8] p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-900">Quick Summary</p>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-sm text-slate-500">Today Income</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-700">
                    {transactions.length > 0 ? formatCurrency(totalRevenue) : "Belum ada data"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-sm text-slate-500">Today Expense</p>
                  <p className="mt-1 text-lg font-semibold text-rose-700">
                    {transactions.length > 0 ? formatCurrency(totalExpenses) : "Belum ada data"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-sm text-slate-500">Cash Balance</p>
                  <p className="mt-1 text-lg font-semibold text-blue-700">
                    {transactions.length > 0 ? formatCurrency(netIncome) : "Belum ada data"}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </>
      )}

      <section className="rounded-[28px] border border-[#efe7d4] bg-white p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Transaction History</h3>
              <p className="text-sm text-slate-500">
                {currentRole === "Owner"
                  ? "Filter, cari, dan kelola transaksi sesuai hak akses owner."
                  : "Riwayat transaksi finansial milik Anda."}
              </p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,0.9fr))]">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Search size={18} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user, notes, or ID..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none"
            >
              <option value="All">All Status</option>
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none"
            >
              <option value="latest">Latest Date</option>
              <option value="amount-high">Amount High-Low</option>
              <option value="amount-low">Amount Low-High</option>
              <option value="name">User Name</option>
            </select>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
            <span>{sortedTransactions.length} transaksi ditemukan</span>
            <span className="inline-flex items-center gap-2">
              <ArrowUpDown size={14} />
              Sort aktif: <strong className="font-semibold text-slate-700">{sortBy}</strong>
            </span>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr className="text-left">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="bg-white">
                  {sortedTransactions.length > 0 ? (
                    sortedTransactions.map((item) => {
                      return (
                        <tr key={item.id} className="border-t border-slate-100 hover:bg-[#fffdf7]">
                          <td className="px-4 py-4 font-medium text-slate-700">{item.id}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff1c0] text-sm font-semibold text-[#9a6b00]">
                                {item.user.charAt(0)}
                              </div>
                              <span>{item.user}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">{item.notes}</td>
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                item.status === "Income" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-medium text-slate-700">{formatCurrency(item.amount)}</td>
                          <td className="px-4 py-4 text-slate-500">{item.date}</td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              {currentRole === "Owner" ? (
                                <button
                                  type="button"
                                  title="Delete"
                                  onClick={() => setPendingDelete(item)}
                                  className="rounded-lg border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50"
                                >
                                  <Trash2 size={16} />
                                </button>
                              ) : (
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                                  View Only
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                        Tidak ada transaksi yang cocok dengan filter saat ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-slate-900">Hapus transaksi?</p>
                <p className="mt-1 text-sm text-slate-500">
                  Apakah transaksi <strong>{pendingDelete.id}</strong> akan dihapus sekarang?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(pendingDelete)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-2xl font-semibold text-slate-900">Add Transaction</p>
                <p className="mt-1 text-sm text-slate-500">Isi data transaksi sesuai kolom yang ditampilkan pada tabel.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm text-slate-600">User</label>
                <input
                  value={newTransaction.user}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-slate-600">Status</label>
                <select
                  value={newTransaction.status}
                  onChange={(e) =>
                    setNewTransaction((prev) => ({
                      ...prev,
                      status: e.target.value as "Income" | "Expense",
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                >
                  <option value="Income">Income</option>
                  <option value="Expense">Expense</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm text-slate-600">Notes</label>
                <input
                  value={newTransaction.notes}
                  onChange={(e) => setNewTransaction((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Masukkan catatan transaksi"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-slate-600">Amount</label>
                <input
                  value={newTransaction.amount}
                  onChange={(e) =>
                    setNewTransaction((prev) => ({
                      ...prev,
                      amount: formatAmountInput(e.target.value),
                    }))
                  }
                  inputMode="numeric"
                  placeholder="Contoh: 50.000"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-slate-600">Date</label>
                <input
                  type="date"
                  value={newTransaction.date}
                  onChange={(e) => setNewTransaction((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddTransaction}
                className="rounded-xl bg-[#f6c33b] px-6 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-[#ebb019]"
              >
                Add Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
