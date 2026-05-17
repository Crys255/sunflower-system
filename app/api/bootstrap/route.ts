import { NextResponse } from "next/server";
import {
  requireSessionUser,
  listActivityLogs,
  listFinancialTransactions,
  listInventoryItems,
  listUsers,
} from "@/lib/server-data";

export async function GET(request: Request) {
  try {
    const currentUser = await requireSessionUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const [users, inventoryItems, transactions, activities] = await Promise.all([
      listUsers(),
      listInventoryItems(),
      listFinancialTransactions(),
      listActivityLogs(),
    ]);

    return NextResponse.json({
      currentUser: {
        id: currentUser.id,
        name: currentUser.name,
        username: currentUser.username,
        email: currentUser.email,
        phone: currentUser.phone,
        role: currentUser.role,
      },
      users,
      inventoryItems,
      transactions,
      activities,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal mengambil data bootstrap." },
      { status: 500 },
    );
  }
}
