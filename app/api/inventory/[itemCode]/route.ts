import { NextResponse } from "next/server";
import sql from "@/lib/db";
import {
  createActivityLog,
  ensureInventoryCategory,
  ensureInventoryUnit,
  listInventoryItems,
  requireSessionUser,
  resolveDbStockStatus,
} from "@/lib/server-data";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ itemCode: string }> },
) {
  try {
    const { itemCode } = await context.params;
    const body = await request.json();
    const actor = await requireSessionUser();

    if (!actor || actor.role !== "Owner") {
      return NextResponse.json({ message: "Hanya owner yang dapat mengubah item." }, { status: 403 });
    }

    const name = String(body.name ?? "").trim();
    const category = String(body.category ?? "").trim();
    const unit = String(body.unit ?? "").trim();
    const qty = Number(body.qty ?? 0);
    const lowStock = Number(body.lowStock ?? 0);
    const idealStock = Number(body.idealStock ?? 0);

    if (!name || !category || !unit || Number.isNaN(qty) || Number.isNaN(lowStock) || Number.isNaN(idealStock)) {
      return NextResponse.json({ message: "Data item tidak lengkap." }, { status: 400 });
    }

    if (lowStock < 0 || idealStock < 0 || idealStock < lowStock) {
      return NextResponse.json({ message: "Threshold stock tidak valid." }, { status: 400 });
    }

    const categoryId = await ensureInventoryCategory(category);
    const unitId = await ensureInventoryUnit(unit);

    const existingRows = await sql<{ inventory_item_id: number }[]>`
      SELECT inventory_item_id FROM inventory_items
      WHERE item_code = ${itemCode} AND deleted_at IS NULL
      LIMIT 1
    `;

    if (existingRows.length === 0) {
      return NextResponse.json({ message: "Item tidak ditemukan." }, { status: 404 });
    }

    const inventoryItemId = Number(existingRows[0].inventory_item_id);

    await sql`
      UPDATE inventory_items
      SET
        item_name = ${name},
        inventory_category_id = ${categoryId},
        inventory_unit_id = ${unitId},
        quantity = ${qty},
        minimum_stock = ${lowStock},
        ideal_stock = ${idealStock},
        stock_status = ${resolveDbStockStatus(qty, lowStock, idealStock)},
        updated_by = ${actor.dbUserId},
        last_stock_update_at = NOW()
      WHERE inventory_item_id = ${inventoryItemId}
    `;

    await sql`
      INSERT INTO inventory_stock_movements (
        inventory_item_id, movement_type, quantity_after, remarks, acted_by
      ) VALUES (
        ${inventoryItemId}, 'EDIT_ITEM', ${qty}, ${`Edit item ${name}`}, ${actor.dbUserId}
      )
    `;

    await createActivityLog({
      actorUserId: actor.dbUserId,
      actorUsername: actor.username,
      actorName: actor.name,
      featureName: "INVENTORY",
      activityMessage: `Mengubah detail stock ${name}`,
      referenceTable: "inventory_items",
      referenceId: inventoryItemId,
    });

    return NextResponse.json({ items: await listInventoryItems() });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal mengubah item." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ itemCode: string }> },
) {
  try {
    const { itemCode } = await context.params;
    const actor = await requireSessionUser();

    if (!actor || actor.role !== "Owner") {
      return NextResponse.json({ message: "Hanya owner yang dapat menghapus item." }, { status: 403 });
    }

    const rows = await sql<{ inventory_item_id: number; item_name: string }[]>`
      SELECT inventory_item_id, item_name
      FROM inventory_items
      WHERE item_code = ${itemCode} AND deleted_at IS NULL
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ message: "Item tidak ditemukan." }, { status: 404 });
    }

    const row = rows[0];
    const itemId = Number(row.inventory_item_id);

    await sql`
      UPDATE inventory_items
      SET deleted_at = NOW(), updated_by = ${actor.dbUserId}
      WHERE inventory_item_id = ${itemId}
    `;

    await sql`
      INSERT INTO inventory_stock_movements (
        inventory_item_id, movement_type, remarks, acted_by
      ) VALUES (
        ${itemId}, 'DELETE_ITEM', ${`Delete item ${row.item_name}`}, ${actor.dbUserId}
      )
    `;

    await createActivityLog({
      actorUserId: actor.dbUserId,
      actorUsername: actor.username,
      actorName: actor.name,
      featureName: "INVENTORY",
      activityMessage: `Menghapus item stock ${row.item_name}`,
      referenceTable: "inventory_items",
      referenceId: itemId,
    });

    return NextResponse.json({ items: await listInventoryItems() });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal menghapus item." },
      { status: 500 },
    );
  }
}
