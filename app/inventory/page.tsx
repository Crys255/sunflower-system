"use client";

import { useEffect, useState } from "react";
import { PageContainer } from "@/components/pagecontainer";
import { StatsCards } from "@/components/inventory/stats-cards";
import { InventoryTable } from "@/components/inventory/inventory-table";
import type { InventoryItem } from "@/lib/inventory-data";
import { fetchJson } from "@/lib/api-client";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    fetchJson<{ items: InventoryItem[] }>("/api/inventory")
      .then((data) => setItems(data.items))
      .catch(() => setItems([]));
  }, []);

  const total = items.length;
  const lowStock = items.filter((item) => item.status === "Low Stock").length;
  const outOfStock = items.filter((item) => item.qty === 0).length;

  return (
    <PageContainer
      title="Inventory"
      description="Pantau stok UMKM, prioritaskan restock, dan kelola barang masuk dengan tampilan yang lebih rapi."
    >
      <StatsCards total={total} lowStock={lowStock} outOfStock={outOfStock} />

      <InventoryTable onItemsChange={setItems} />
    </PageContainer>
  );
}
