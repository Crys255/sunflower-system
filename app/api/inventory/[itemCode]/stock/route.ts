import { NextResponse } from "next/server";
import sql from "@/lib/db";
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

    const rows = await sql<{
      inventory_item_id: number;
      item_name: string;
      quantity: string;
      unit_name: string;
      minimum_stock: string;
      ideal_stock: string;
    }[]>`
      SELECT ii.inventory_item_id, ii.item_name, ii.quantity, ii.minimum_stock, ii.ideal_stock, iu.unit_name
      FROM inventory_items ii
      INNER JOIN inventory_units iu ON iu.inventory_unit_id = ii.inventory_unit_id
      WHERE ii.item_code = ${itemCode} AND ii.deleted_at IS NULL
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ message: "Item tidak ditemukan." }, { status: 404 });
    }

    const current = rows[0];
    const currentQty = Number(current.quantity);
    const minStock = Number(current.minimum_stock);
    const idealStock = Number(current.ideal_stock);
    const nextQty = movementType === "add" ? currentQty + amount : Math.max(0, currentQty - amount);
    const itemId = Number(current.inventory_item_id);

    await sql`
      UPDATE inventory_items
      SET
        quantity = ${nextQty},
        stock_status = ${resolveDbStockStatus(nextQty, minStock, idealStock)},
        updated_by = ${actor.dbUserId},
        last_stock_update_at = NOW()
      WHERE inventory_item_id = ${itemId}
    `;

    await sql`
      INSERT INTO inventory_stock_movements (
        inventory_item_id, movement_type, quantity_before, quantity_change, quantity_after, remarks, acted_by
      ) VALUES (
        ${itemId},
        ${movementType === "add" ? "ADD_STOCK" : "REDUCE_STOCK"},
        ${currentQty},
        ${amount},
        ${nextQty},
        ${movementType === "add"
          ? `Add stock ${current.item_name}`
          : `Reduce stock ${current.item_name}`},
        ${actor.dbUserId}
      )
    `;

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
      referenceId: itemId,
    });

    return NextResponse.json({ items: await listInventoryItems() });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal memperbarui stock." },
      { status: 500 },
    );
  }
}
