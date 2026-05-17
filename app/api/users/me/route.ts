import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/server-data";

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal mengambil user." },
      { status: 500 },
    );
  }
}
