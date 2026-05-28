import { NextResponse } from "next/server";
import sql from "@/lib/db";
import {
  createActivityLog,
  getUserByUsername,
  listFinancialTransactions,
  requireSessionUser,
} from "@/lib/server-data";

export async function GET() {
  try {
    const actor = await requireSessionUser();
    if (!actor) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const transactions = await listFinancialTransactions(
      actor.role === "Staff" ? actor.dbUserId : undefined,
    );
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

    if (!actor) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const targetUser =
      actor.role === "Owner"
        ? await getUserByUsername(String(body.targetUsername ?? actor.username))
        : actor;

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

    const codeRows = await sql<{ next_code: string }[]>`
      SELECT CONCAT('T-', LPAD(CAST(COALESCE(MAX(financial_transaction_id), 0) + 1 AS TEXT), 3, '0')) AS next_code
      FROM financial_transactions
    `;

    const nextCode = codeRows[0]?.next_code;
    if (!nextCode) {
      return NextResponse.json({ message: "Gagal membuat kode transaksi." }, { status: 500 });
    }

    const [txRow] = await sql<{ financial_transaction_id: number }[]>`
      INSERT INTO financial_transactions (
        transaction_code, user_id, notes, transaction_type, amount, transaction_date, created_by, updated_by
      ) VALUES (
        ${nextCode},
        ${targetUser.dbUserId},
        ${notes},
        ${status},
        ${amount},
        TO_DATE(${date}, 'DD/MM/YYYY'),
        ${actor.dbUserId},
        ${actor.dbUserId}
      )
      RETURNING financial_transaction_id
    `;

    await createActivityLog({
      actorUserId: actor.dbUserId,
      actorUsername: actor.username,
      actorName: actor.name,
      featureName: "FINANCIAL",
      activityMessage: `Menambahkan transaksi baru`,
      referenceTable: "financial_transactions",
      referenceId: Number(txRow.financial_transaction_id),
    });

    const transactions = await listFinancialTransactions(
      actor.role === "Staff" ? actor.dbUserId : undefined,
    );
    return NextResponse.json({ transactions });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal menambah transaksi." },
      { status: 500 },
    );
  }
}
