import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { dbExecute } from "@/lib/mysql";
import { hashPassword } from "@/lib/auth";
import {
  createActivityLog,
  listUsers,
  requireSessionUser,
} from "@/lib/server-data";
import { dbQuery } from "@/lib/mysql";

export async function GET() {
  try {
    const currentUser = await requireSessionUser();

    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const users = currentUser.role === "Owner"
      ? await listUsers()
      : [{
          id: currentUser.id,
          name: currentUser.name,
          username: currentUser.username,
          email: currentUser.email,
          phone: currentUser.phone,
          role: currentUser.role,
        }];

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
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal mengambil user." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const actor = await requireSessionUser();

    if (!actor || actor.role !== "Owner") {
      return NextResponse.json({ message: "Hanya owner yang dapat menambah user." }, { status: 403 });
    }

    const roleCode = String(body.role ?? "Staff") === "Owner" ? "OWNER" : "STAFF";
    const password = String(body.password ?? "").trim();

    if (!password) {
      return NextResponse.json({ message: "Password wajib diisi untuk user baru." }, { status: 400 });
    }

    if (roleCode === "OWNER") {
      const ownerRows = await dbQuery<(RowDataPacket & { total_owner: number })[]>(
        `SELECT COUNT(*) AS total_owner FROM app_users WHERE role_code = 'OWNER' AND deleted_at IS NULL`,
      );

      if ((ownerRows[0]?.total_owner ?? 0) > 0) {
        return NextResponse.json({ message: "Hanya boleh ada satu akun owner." }, { status: 400 });
      }
    }

    const passwordHash = await hashPassword(password);

    const result = await dbExecute(
      `INSERT INTO app_users (
         full_name, username, email, phone_number, password_hash, role_code, is_active
       ) VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        String(body.name ?? ""),
        String(body.username ?? ""),
        String(body.email ?? ""),
        String(body.phone ?? ""),
        passwordHash,
        roleCode,
      ],
    ) as { insertId: number };

    await createActivityLog({
      actorUserId: actor.dbUserId,
      actorUsername: actor.username,
      actorName: actor.name,
      featureName: "USER",
      activityMessage: `Menambahkan akun ${String(body.name ?? "")}`,
      referenceTable: "app_users",
      referenceId: result.insertId,
    });

    return NextResponse.json({ users: await listUsers() });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal menambah user." },
      { status: 500 },
    );
  }
}
