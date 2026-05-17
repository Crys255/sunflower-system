import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { dbExecute, dbQuery } from "@/lib/mysql";
import {
  createActivityLog,
  listInventoryItems,
  requireSessionUser,
  resolveDbStockStatus,
} from "@/lib/server-data";

export async function POST(
  request: Request,
  context: { params: Promise<{ itemCode: string }> },
) {
  try {
    const { itemCode } = await context.params;
    const body = await request.json();
    const actor = await requireSessionUser();
    const movementType = String(body.type ?? "");
    const amount = Number(body.amount ?? 0);

    if (!actor) {
      return NextResponse.json({ message: "User tidak valid." }, { status: 401 });
    }

    if (!["add", "reduce"].includes(movementType) || Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json({ message: "Perubahan stock tidak valid." }, { status: 400 });
    }

    const rows = await dbQuery<(RowDataPacket & { inventory_item_id: number; item_name: string; quantity: number; unit_name: string; minimum_stock: number; ideal_stock: number })[]>(
      `SELECT ii.inventory_item_id, ii.item_name, ii.quantity, ii.minimum_stock, ii.ideal_stock, iu.unit_name
       FROM inventory_items ii
       INNER JOIN inventory_units iu ON iu.inventory_unit_id = ii.inventory_unit_id
       WHERE ii.item_code = ? AND ii.deleted_at IS NULL
       LIMIT 1`,
      [itemCode],
    );

    if (rows.length === 0) {
      return NextResponse.json({ message: "Item tidak ditemukan." }, { status: 404 });
    }

    const current = rows[0];
    const nextQty = movementType === "add" ? Number(current.quantity) + amount : Math.max(0, Number(current.quantity) - amount);

    await dbExecute(
      `UPDATE inventory_items
       SET quantity = ?, stock_status = ?, updated_by = ?, last_stock_update_at = NOW()
       WHERE inventory_item_id = ?`,
      [nextQty, resolveDbStockStatus(nextQty, Number(current.minimum_stock), Number(current.ideal_stock)), actor.dbUserId, current.inventory_item_id],
    );

    await dbExecute(
      `INSERT INTO inventory_stock_movements (
         inventory_item_id, movement_type, quantity_before, quantity_change, quantity_after, remarks, acted_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        current.inventory_item_id,
        movementType === "add" ? "ADD_STOCK" : "REDUCE_STOCK",
        Number(current.quantity),
        amount,
        nextQty,
        `${movementType === "add" ? "Add" : "Reduce"} stock ${current.item_name}`,
        actor.dbUserId,
      ],
    );

    await createActivityLog({
      actorUserId: actor.dbUserId,
      actorUsername: actor.username,
      actorName: actor.name,
      featureName: "INVENTORY",
      activityMessage:
        movementType === "add"
          ? `Menambah stock ${current.item_name} sebanyak ${amount} ${current.unit_name}`
          : `Mengurangi stock ${current.item_name} sebanyak ${amount} ${current.unit_name}`,
      referenceTable: "inventory_items",
      referenceId: current.inventory_item_id,
    });

    return NextResponse.json({ items: await listInventoryItems() });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal memperbarui stock." },
      { status: 500 },
    );
  }
}
