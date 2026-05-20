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

export async function GET() {
  try {
    const items = await listInventoryItems();
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal mengambil inventory." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const actor = await requireSessionUser();

    if (!actor || actor.role !== "Owner") {
      return NextResponse.json({ message: "Hanya owner yang dapat menambah item." }, { status: 403 });
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

    const codeRows = await sql<{ next_code: string | null }[]>`
      SELECT (MAX(item_code::INTEGER) + 1)::TEXT AS next_code FROM inventory_items
    `;
    const nextCode = String(codeRows[0]?.next_code ?? 1).padStart(3, "0");

    const [itemRow] = await sql<{ inventory_item_id: number }[]>`
      INSERT INTO inventory_items (
        item_code, item_name, inventory_category_id, inventory_unit_id,
        quantity, minimum_stock, ideal_stock, stock_status, created_by, updated_by, last_stock_update_at
      ) VALUES (
        ${nextCode}, ${name}, ${categoryId}, ${unitId},
        ${qty}, ${lowStock}, ${idealStock}, ${resolveDbStockStatus(qty, lowStock, idealStock)},
        ${actor.dbUserId}, ${actor.dbUserId}, NOW()
      )
      RETURNING inventory_item_id
    `;

    const itemId = Number(itemRow.inventory_item_id);

    await sql`
      INSERT INTO inventory_stock_movements (
        inventory_item_id, movement_type, quantity_before, quantity_change, quantity_after, remarks, acted_by
      ) VALUES (
        ${itemId}, 'ADD_ITEM', 0, ${qty}, ${qty}, ${`Add item ${name}`}, ${actor.dbUserId}
      )
    `;

    await createActivityLog({
      actorUserId: actor.dbUserId,
      actorUsername: actor.username,
      actorName: actor.name,
      featureName: "INVENTORY",
      activityMessage: `Menambahkan item baru ${name}`,
      referenceTable: "inventory_items",
      referenceId: itemId,
    });

    return NextResponse.json({ items: await listInventoryItems() });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal menambah item." },
      { status: 500 },
    );
  }
}
