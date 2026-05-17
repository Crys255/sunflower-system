import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { dbExecute, dbQuery } from "@/lib/mysql";
import {
  createActivityLog,
  getUserByUsername,
  listFinancialTransactions,
  requireSessionUser,
} from "@/lib/server-data";

export async function GET() {
  try {
    const transactions = await listFinancialTransactions();
    return NextResponse.json({ transactions });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal mengambil transaksi." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const actor = await requireSessionUser();

    if (!actor || actor.role !== "Owner") {
      return NextResponse.json({ message: "Hanya owner yang dapat menambah transaksi." }, { status: 403 });
    }

    const targetUser = await getUserByUsername(String(body.targetUsername ?? actor.username));
    if (!targetUser) {
      return NextResponse.json({ message: "User transaksi tidak ditemukan." }, { status: 404 });
    }

    const notes = String(body.notes ?? "").trim();
    const status = String(body.status ?? "").toUpperCase();
    const amount = Number(body.amount ?? 0);
    const date = String(body.date ?? "").trim();

    if (!notes || !["INCOME", "EXPENSE"].includes(status) || Number.isNaN(amount) || !date) {
      return NextResponse.json({ message: "Data transaksi tidak lengkap." }, { status: 400 });
    }

    const codeRows = await dbQuery<Array<RowDataPacket & { next_code: string }>>(
      `SELECT CONCAT('T-', LPAD(COALESCE(MAX(financial_transaction_id), 0) + 1, 3, '0')) AS next_code
       FROM financial_transactions`,
    );

    const nextCode = codeRows[0]?.next_code;
    if (!nextCode) {
      return NextResponse.json({ message: "Gagal membuat kode transaksi." }, { status: 500 });
    }

    const result = await dbExecute(
      `INSERT INTO financial_transactions (
         transaction_code, user_id, notes, transaction_type, amount, transaction_date, created_by, updated_by
       )
       VALUES (?, ?, ?, ?, ?, STR_TO_DATE(?, '%d/%m/%Y'), ?, ?)`,
      [nextCode, targetUser.dbUserId, notes, status, amount, date, actor.dbUserId, actor.dbUserId],
    ) as { insertId: number };

    await createActivityLog({
      actorUserId: actor.dbUserId,
      actorUsername: actor.username,
      actorName: actor.name,
      featureName: "FINANCIAL",
      activityMessage: `Menambahkan transaksi baru`,
      referenceTable: "financial_transactions",
      referenceId: result.insertId,
    });

    return NextResponse.json({ transactions: await listFinancialTransactions() });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal menambah transaksi." },
      { status: 500 },
    );
  }
}
