import { Package, AlertTriangle, XCircle } from "lucide-react";

export function StatsCards({
  total,
  lowStock,
  outOfStock,
}: {
  total: number;
  lowStock: number;
  outOfStock: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

      {/* Total Products */}
      <div className="flex items-center justify-between rounded-[24px] border border-[#dbe8ff] bg-white p-5 shadow-sm">
        <div>
          <p className="text-sm text-gray-500">Total Products</p>
          <h2 className="text-2xl font-semibold text-slate-900">{total}</h2>
        </div>
        <div className="rounded-2xl bg-blue-100 p-3">
          <Package className="text-blue-600" size={22} />
        </div>
      </div>

      {/* Low Stock */}
      <div className="flex items-center justify-between rounded-[24px] border border-[#ffe2c2] bg-white p-5 shadow-sm">
        <div>
          <p className="text-sm text-gray-500">Low Stock Alerts</p>
          <h2 className="text-2xl font-semibold text-slate-900">{lowStock}</h2>
        </div>
        <div className="rounded-2xl bg-[#fff1db] p-3">
          <AlertTriangle className="text-[#ff7a00]" size={22} />
        </div>
      </div>

      {/* Out of Stock */}
      <div className="flex items-center justify-between rounded-[24px] border border-[#ffd0d0] bg-white p-5 shadow-sm">
        <div>
          <p className="text-sm text-gray-500">Out of Stock</p>
          <h2 className="text-2xl font-semibold text-slate-900">{outOfStock}</h2>
        </div>
        <div className="rounded-2xl bg-red-100 p-3">
          <XCircle className="text-red-500" size={22} />
        </div>
      </div>

    </div>
  );
}
