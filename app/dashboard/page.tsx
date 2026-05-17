"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Box,
  CircleDollarSign,
  Package,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { PageContainer } from "@/components/pagecontainer";
import { formatActivityTime, type ActivityLog } from "@/lib/activity-store";
import type { AppRole } from "@/lib/session";
import type { InventoryItem } from "@/lib/inventory-data";
import type { FinancialTransaction } from "@/lib/financial-store";
import { fetchJson } from "@/lib/api-client";

const rangeConfig = {
  "7D": {
    chartLabels: ["D1", "D2", "D3", "D4", "D5"],
    periodLabel: "hari",
  },
  "30D": {
    chartLabels: ["W1", "W2", "W3", "W4"],
    periodLabel: "minggu",
  },
  "90D": {
    chartLabels: ["M1", "M2", "M3"],
    periodLabel: "bulan",
  },
} as const;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
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

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getReferenceDate(transactions: FinancialTransaction[]) {
  if (transactions.length === 0) return new Date();
  return transactions
    .map((item) => parseDateObject(item.date))
    .sort((a, b) => b.getTime() - a.getTime())[0];
}

export default function DashboardPage() {
  const [range, setRange] = useState<keyof typeof rangeConfig>("30D");
  const [currentRole, setCurrentRole] = useState<AppRole>("Owner");
  const [currentUsername, setCurrentUsername] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");
  const [teamCount, setTeamCount] = useState(0);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const current = rangeConfig[range];

  useEffect(() => {
    fetchJson<{
      currentUser: { name: string; username: string; role: AppRole };
      users: { id: string }[];
      inventoryItems: InventoryItem[];
      transactions: FinancialTransaction[];
      activities: ActivityLog[];
    }>("/api/bootstrap")
      .then((data) => {
        setCurrentRole(data.currentUser.role);
        setCurrentUsername(data.currentUser.username);
        setCurrentUserName(data.currentUser.name);
        setTeamCount(data.users.length);
        setItems(data.inventoryItems);
        setTransactions(data.transactions);
        setActivities(data.activities);
      })
      .catch(() => {
        setTeamCount(0);
        setItems([]);
        setTransactions([]);
        setActivities([]);
      });
  }, []);

  const totalProducts = items.length;
  const lowStock = items.filter((item) => item.status === "Low Stock").length;
  const outOfStock = items.filter((item) => item.qty === 0).length;
  const inventoryHealth = totalProducts === 0 ? 0 : Math.round(((totalProducts - lowStock) / totalProducts) * 100);

  const revenueTrend = useMemo(() => {
    const referenceDate = getReferenceDate(transactions);

    if (range === "7D") {
      const start = startOfWeek(referenceDate);
      return current.chartLabels.map((label, index) => {
        const bucketDate = new Date(start);
        bucketDate.setDate(start.getDate() + index);
        const amount = transactions
          .filter((item) => item.status === "Income" && sameDay(parseDateObject(item.date), bucketDate))
          .reduce((sum, item) => sum + item.amount, 0);
        return { label, amount };
      });
    }

    if (range === "30D") {
      const currentWeekStart = startOfWeek(referenceDate);
      return current.chartLabels.map((label, index) => {
        const weeksAgo = current.chartLabels.length - 1 - index;
        const start = new Date(currentWeekStart);
        start.setDate(currentWeekStart.getDate() - weeksAgo * 7);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const amount = transactions
          .filter((item) => {
            if (item.status !== "Income") return false;
            const date = parseDateObject(item.date);
            return date >= start && date <= end;
          })
          .reduce((sum, item) => sum + item.amount, 0);
        return { label, amount };
      });
    }

    return current.chartLabels.map((label, index) => {
      const monthsAgo = current.chartLabels.length - 1 - index;
      const bucketDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - monthsAgo, 1);
      const amount = transactions
        .filter((item) => {
          if (item.status !== "Income") return false;
          const date = parseDateObject(item.date);
          return date.getFullYear() === bucketDate.getFullYear() && date.getMonth() === bucketDate.getMonth();
        })
        .reduce((sum, item) => sum + item.amount, 0);
      return { label, amount };
    });
  }, [current.chartLabels, range, transactions]);

  const maxRevenueBucket = Math.max(...revenueTrend.map((item) => item.amount), 0);
  const currentRevenueValue = revenueTrend.reduce((sum, item) => sum + item.amount, 0);

  const operationalSummary = useMemo(() => {
    const lowStockItems = items.filter((item) => item.status === "Low Stock").slice(0, 3);
    const lowStockValue =
      lowStockItems.length > 0
        ? lowStockItems.map((item) => `${item.name} ${item.qty} ${item.unit}`).join(", ")
        : "Belum ada bahan yang masuk status low stock.";

    const bucketCount = revenueTrend.length || 1;
    const totalExpenses = transactions.filter((item) => item.status === "Expense").reduce((sum, item) => sum + item.amount, 0);
    const totalIncome = transactions.filter((item) => item.status === "Income").reduce((sum, item) => sum + item.amount, 0);

    return [
      {
        title: "Ingredients Often Running Out",
        value: lowStockValue,
        note: lowStockItems.length > 0
          ? "Daftar bahan diambil dari item inventory nyata yang saat ini berstatus low stock."
          : "Tambahkan item inventory dan gunakan stok nyata untuk memunculkan ringkasan ini.",
      },
      {
        title: "Cost Average Growth",
        value: transactions.length > 0 ? `${formatCurrency(totalExpenses / bucketCount)} / ${current.periodLabel}` : "Belum ada data biaya",
        note: transactions.length > 0
          ? "Rata-rata pengeluaran dihitung dari transaksi expense yang tercatat pada periode aktif."
          : "Nilai ini akan muncul setelah ada transaksi expense yang disimpan.",
      },
      {
        title: "Income Average Growth",
        value: transactions.length > 0 ? `${formatCurrency(totalIncome / bucketCount)} / ${current.periodLabel}` : "Belum ada data income",
        note: transactions.length > 0
          ? "Rata-rata pemasukan dihitung dari transaksi income yang tercatat pada periode aktif."
          : "Nilai ini akan muncul setelah ada transaksi income yang disimpan.",
      },
    ];
  }, [current.periodLabel, items, revenueTrend.length, transactions]);

  const averageRestockPace = useMemo(() => {
    if (activities.length === 0) return "Belum ada data";
    const inventoryActivityCount = activities.filter((item) => item.feature === "Inventory").length;
    return inventoryActivityCount > 0 ? `${inventoryActivityCount} activity` : "Belum ada data";
  }, [activities]);

  const stats = useMemo(() => {
    if (currentRole === "Staff") {
      return [
        {
          title: "Low Stock Alerts",
          value: `${lowStock}`,
          icon: AlertTriangle,
          accent: "bg-[#fff1db] text-[#ff7a00]",
          note: "Jumlah item inventory yang perlu diprioritaskan untuk restock.",
        },
        {
          title: "Out of Stock",
          value: `${outOfStock}`,
          icon: XCircle,
          accent: "bg-rose-100 text-rose-700",
          note: "Item yang sudah habis dan perlu segera ditindaklanjuti.",
        },
        {
          title: "Total Products",
          value: `${totalProducts}`,
          icon: Package,
          accent: "bg-amber-100 text-amber-700",
          note: "Semua produk atau bahan yang saat ini terdaftar di inventory.",
        },
      ];
    }

    return [
        {
          title: "Revenue",
          value: formatCurrency(currentRevenueValue),
          icon: CircleDollarSign,
          accent: "bg-emerald-100 text-emerald-700",
          note: transactions.length > 0 ? `Total income pada periode ${range} dari transaksi nyata.` : "Belum ada transaksi income yang tercatat.",
        },
      {
        title: "Low Stock Alerts",
        value: `${lowStock}`,
        icon: AlertTriangle,
        accent: "bg-[#fff1db] text-[#ff7a00]",
        note: "Jumlah item inventory yang perlu diprioritaskan untuk restock.",
      },
      {
        title: "Total Products",
        value: `${totalProducts}`,
        icon: Package,
        accent: "bg-amber-100 text-amber-700",
        note: "Semua produk atau bahan yang saat ini terdaftar di inventory.",
      },
      {
        title: "Team Activity",
        value: `${teamCount} Users`,
        icon: Users,
        accent: "bg-violet-100 text-violet-700",
        note: "Jumlah user aktif yang terdaftar di sistem.",
      },
    ];
  }, [currentRevenueValue, currentRole, lowStock, outOfStock, teamCount, totalProducts, transactions.length, range]);

  const visibleActivities = useMemo(() => {
    const filtered =
      currentRole === "Owner"
        ? activities
        : activities.filter((item) => item.actorUsername === currentUsername);

    return filtered.slice(0, 6);
  }, [activities, currentRole, currentUsername]);

  const myTransactions = useMemo(() => {
    return transactions
      .filter((item) => item.user === currentUserName)
      .sort((a, b) => parseDate(b.date) - parseDate(a.date))
      .slice(0, 4);
  }, [currentUserName, transactions]);

  return (
    <PageContainer
      title="Dashboard"
      description={
        currentRole === "Owner"
          ? "Pantau performa penjualan, kesehatan stok, dan aktivitas operasional UMKM dalam satu tampilan interaktif."
          : "Pantau stok, transaksi pribadi, dan aktivitas harian Anda dalam satu tampilan kerja."
      }
      actionButton={
        <div className="inline-flex rounded-2xl bg-slate-100 p-1">
          {(["7D", "30D", "90D"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRange(item)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                range === item ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      }
    >
      <div className={`grid gap-4 ${currentRole === "Owner" ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3"}`}>
        {stats.map((stat) => (
          <div key={stat.title} className="rounded-[24px] border border-[#efe7d4] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">{stat.title}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{stat.value}</p>
              </div>
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${stat.accent}`}>
                <stat.icon size={24} strokeWidth={2.1} />
              </div>
            </div>
            <p className="mt-4 max-w-[16rem] text-sm text-slate-500">{stat.note}</p>
          </div>
        ))}
      </div>

      {currentRole === "Owner" ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
            <section className="rounded-[28px] border border-[#efe7d4] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">Revenue Trend</p>
                  <p className="text-sm text-slate-500">Visual ringkas arus performa penjualan per periode aktif.</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  <TrendingUp size={14} />
                  {transactions.length > 0 ? "Actual Data" : "No Data"}
                </span>
              </div>

              <div className="mt-6 inline-grid items-end gap-3" style={{ gridTemplateColumns: `repeat(${revenueTrend.length}, minmax(92px, 108px))` }}>
                {revenueTrend.map((item, index) => (
                  <div key={`${range}-${index}`} className="flex flex-col items-center gap-3">
                    <div className="flex h-56 w-full items-end rounded-3xl bg-[#fff7e0] p-2">
                      <div
                        className="w-full rounded-2xl bg-[linear-gradient(180deg,#f6c33b_0%,#e79910_100%)] transition-all duration-300"
                        style={{ height: `${maxRevenueBucket > 0 ? Math.max((item.amount / maxRevenueBucket) * 100, 8) : 8}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <span className="block text-xs font-medium text-slate-400">{item.label}</span>
                      <span className="mt-1 block text-[11px] text-slate-500">{formatCurrency(item.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-[#efe7d4] bg-[#fff9e8] p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">Inventory Health</p>
                  <p className="text-sm text-slate-500">Cek kesiapan stok terhadap target operasional.</p>
                </div>
                <Box className="text-[#c98700]" size={20} />
              </div>

              <div className="mt-6 rounded-[24px] bg-white p-5">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Stock readiness</p>
                    <p className="mt-2 text-4xl font-semibold text-slate-900">{inventoryHealth}%</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    Healthy
                  </span>
                </div>
                <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-3 rounded-full bg-[linear-gradient(90deg,#f6c33b_0%,#e79910_100%)] transition-all duration-300"
                    style={{ width: `${inventoryHealth}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Low Stock Priority</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{lowStock} items</p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Average Restock Pace</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{averageRestockPace}</p>
                </div>
              </div>
            </section>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-[28px] border border-[#efe7d4] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">Operational Summary</p>
                  <p className="text-sm text-slate-500">Ringkasan ingredients dan pertumbuhan operasional untuk periode {range}.</p>
                </div>
                <Activity className="text-slate-400" size={18} />
              </div>

              <div className="mt-6 space-y-4">
                {operationalSummary.map((item) => (
                  <div key={item.title} className="rounded-[24px] bg-slate-50 p-5">
                    <p className="text-base font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-2 text-lg font-medium text-slate-800">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{item.note}</p>
                  </div>
                ))}
              </div>
            </section>

            <RecentActivityCard activities={visibleActivities} />
          </div>
        </>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[28px] border border-[#efe7d4] bg-[#fff9e8] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">Inventory Health</p>
                <p className="text-sm text-slate-500">Fokus pada stok yang perlu Anda tindak lanjuti hari ini.</p>
              </div>
              <Box className="text-[#c98700]" size={20} />
            </div>

            <div className="mt-6 rounded-[24px] bg-white p-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm text-slate-500">Stock readiness</p>
                  <p className="mt-2 text-4xl font-semibold text-slate-900">{inventoryHealth}%</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                  Monitor
                </span>
              </div>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-3 rounded-full bg-[linear-gradient(90deg,#f6c33b_0%,#e79910_100%)] transition-all duration-300"
                  style={{ width: `${inventoryHealth}%` }}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Low Stock Priority</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{lowStock} items</p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Items Out Of Stock</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{outOfStock} items</p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#efe7d4] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">My Transactions</p>
                <p className="text-sm text-slate-500">Transaksi yang Anda input pada sistem untuk periode kerja terbaru.</p>
              </div>
              <Activity className="text-slate-400" size={18} />
            </div>

            <div className="mt-6 space-y-4">
              {myTransactions.length > 0 ? (
                myTransactions.map((item) => (
                  <div key={item.id} className="rounded-[24px] bg-slate-50 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{item.notes}</p>
                        <p className="mt-2 text-lg font-medium text-slate-800">{formatCurrency(item.amount)}</p>
                        <p className="mt-2 text-sm text-slate-500">{item.date}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${item.status === "Income" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-500">
                  Belum ada transaksi pribadi yang tercatat untuk user ini.
                </div>
              )}
            </div>
          </section>

          <div className="xl:col-span-2">
            <RecentActivityCard activities={visibleActivities} />
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function RecentActivityCard({ activities }: { activities: ActivityLog[] }) {
  return (
    <section className="rounded-[28px] border border-[#efe7d4] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">Recent Activity</p>
          <p className="text-sm text-slate-500">Aktivitas terbaru yang benar-benar dilakukan pada website.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Live</span>
      </div>

      <div className="mt-6 space-y-4">
        {activities.length > 0 ? (
          activities.map((item) => (
            <div key={item.id} className="flex gap-4 rounded-[24px] bg-slate-50 p-4">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fff1db] text-xs font-semibold text-[#9a6b00]">
                {item.actorName.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{item.message}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {item.actorName} • {item.feature} • {formatActivityTime(item.createdAt)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-500">
            Belum ada aktivitas terbaru yang tercatat.
          </div>
        )}
      </div>
    </section>
  );
}
