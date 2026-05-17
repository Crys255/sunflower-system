export type InventoryStatus = "Low Stock" | "Available" | "In Stock";

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  qty: number;
  lowStock: number;
  idealStock: number;
  status: InventoryStatus;
  updated: string;
};

export const inventoryItems: InventoryItem[] = [];

export function extractNumericQty(qty: number): number {
  return qty;
}

export function parseInventoryDate(dateStr: string) {
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(year, month - 1, day).getTime();
}

export function formatInventoryQty(qty: number, unit: string) {
  return `${qty} ${unit}`;
}

export function resolveInventoryStatus(qty: number, lowStock: number, idealStock: number): InventoryStatus {
  if (qty <= lowStock) return "Low Stock";
  if (qty >= idealStock) return "In Stock";
  return "Available";
}
