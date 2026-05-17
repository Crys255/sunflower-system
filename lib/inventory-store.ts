import { resolveInventoryStatus, type InventoryItem } from "@/lib/inventory-data";

export function buildUpdatedInventoryItem(item: InventoryItem, qty: number): InventoryItem {
  return {
    ...item,
    qty,
    status: resolveInventoryStatus(qty, item.lowStock, item.idealStock),
    updated: new Date().toLocaleDateString("en-GB"),
  };
}
