import { NextResponse } from "next/server";
import sql from "@/lib/db";
import {
  createActivityLog,
  listFinancialTransactions,
  requireSessionUser,
} from "@/lib/server-data";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ transactionCode: string }> },
) {
  try {
    const { transactionCode } = await context.params;
    const actor = await requireSessionUser();

    if (!actor || actor.role !== "Owner") {
      return NextResponse.json({ message: "Hanya owner yang dapat menghapus transaksi." }, { status: 403 });
    }

    const rows = await sql<{ financial_transaction_id: number }[]>`
      SELECT financial_transaction_id
      FROM financial_transactions
      WHERE transaction_code = ${transactionCode} AND deleted_at IS NULL
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ message: "Transaksi tidak ditemukan." }, { status: 404 });
    }

    const txId = Number(rows[0].financial_transaction_id);

    await sql`
      UPDATE financial_transactions
      SET deleted_at = NOW(), updated_by = ${actor.dbUserId}
      WHERE financial_transaction_id = ${txId}
    `;

    await createActivityLog({
      actorUserId: actor.dbUserId,
      actorUsername: actor.username,
      actorName: actor.name,
      featureName: "FINANCIAL",
      activityMessage: `Menghapus transaksi ${transactionCode}`,
      referenceTable: "financial_transactions",
      referenceId: txId,
    });

    return NextResponse.json({ transactions: await listFinancialTransactions() });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal menghapus transaksi." },
      { status: 500 },
    );
  }
}
