import { NextResponse } from "next/server";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import {
  createActivityLog,
  createLoginLog,
  getUserByUsername,
  touchLastLogin,
} from "@/lib/server-data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username ?? "");
    const password = String(body.password ?? "");

    if (!username || !password) {
      return NextResponse.json({ message: "Username dan password wajib diisi." }, { status: 400 });
    }

    const user = await getUserByUsername(username);
    const isPasswordValid = user ? await verifyPassword(password, user.passwordHash) : false;

    if (!user || !user.isActive || !isPasswordValid) {
      await createLoginLog(user?.dbUserId ?? null, username, "FAILED");
      return NextResponse.json({ message: "Username atau password tidak valid." }, { status: 401 });
    }

    await setSessionCookie({
      userId: user.dbUserId,
      username: user.username,
      role: user.role,
      name: user.name,
    });

    await touchLastLogin(user.dbUserId);
    await createLoginLog(user.dbUserId, username, "SUCCESS");
    await createActivityLog({
      actorUserId: user.dbUserId,
      actorUsername: user.username,
      actorName: user.name,
      featureName: "LOGIN",
      activityMessage: "Login ke Sunflower System",
      referenceTable: "app_users",
      referenceId: user.dbUserId,
    });

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
      { message: error instanceof Error ? error.message : "Gagal login." },
      { status: 500 },
    );
  }
}
