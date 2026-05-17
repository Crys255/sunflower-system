import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { dbExecute } from "@/lib/mysql";
import { hashPassword } from "@/lib/auth";
import {
  createActivityLog,
  getUserByUsername,
  listUsers,
  requireSessionUser,
} from "@/lib/server-data";
import { dbQuery } from "@/lib/mysql";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await context.params;
    const body = await request.json();
    const actor = await requireSessionUser();
    const targetUser = await getUserByUsername(username);

    if (!actor || actor.role !== "Owner") {
      return NextResponse.json({ message: "Hanya owner yang dapat mengubah user." }, { status: 403 });
    }

    if (!targetUser) {
      return NextResponse.json({ message: "User target tidak ditemukan." }, { status: 404 });
    }

    const password = String(body.password ?? "").trim();
    const nextPasswordHash = password ? await hashPassword(password) : targetUser.passwordHash;
    const nextRoleCode = String(body.role ?? "Staff") === "Owner" ? "OWNER" : "STAFF";

    if (nextRoleCode === "OWNER" && targetUser.role !== "Owner") {
      const ownerRows = await dbQuery<(RowDataPacket & { total_owner: number })[]>(
        `SELECT COUNT(*) AS total_owner FROM app_users WHERE role_code = 'OWNER' AND deleted_at IS NULL`,
      );

      if ((ownerRows[0]?.total_owner ?? 0) > 0) {
        return NextResponse.json({ message: "Hanya boleh ada satu akun owner." }, { status: 400 });
      }
    }

    await dbExecute(
      `UPDATE app_users
       SET full_name = ?, username = ?, email = ?, phone_number = ?, password_hash = ?, role_code = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [
        String(body.name ?? ""),
        String(body.username ?? ""),
        String(body.email ?? ""),
        String(body.phone ?? ""),
        nextPasswordHash,
        nextRoleCode,
        targetUser.dbUserId,
      ],
    );

    await createActivityLog({
      actorUserId: actor.dbUserId,
      actorUsername: actor.username,
      actorName: actor.name,
      featureName: "USER",
      activityMessage: `Mengubah akun ${String(body.name ?? targetUser.name)}`,
      referenceTable: "app_users",
      referenceId: targetUser.dbUserId,
    });

    return NextResponse.json({ users: await listUsers() });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal mengubah user." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await context.params;
    const actor = await requireSessionUser();
    const targetUser = await getUserByUsername(username);

    if (!actor || actor.role !== "Owner") {
      return NextResponse.json({ message: "Hanya owner yang dapat menghapus user." }, { status: 403 });
    }

    if (!targetUser) {
      return NextResponse.json({ message: "User target tidak ditemukan." }, { status: 404 });
    }

    if (targetUser.role === "Owner") {
      return NextResponse.json({ message: "Akun owner tidak dapat dihapus." }, { status: 400 });
    }

    await dbExecute(
      `UPDATE app_users SET deleted_at = NOW(), is_active = 0 WHERE user_id = ?`,
      [targetUser.dbUserId],
    );

    await createActivityLog({
      actorUserId: actor.dbUserId,
      actorUsername: actor.username,
      actorName: actor.name,
      featureName: "USER",
      activityMessage: `Menghapus akun ${targetUser.name}`,
      referenceTable: "app_users",
      referenceId: targetUser.dbUserId,
    });

    return NextResponse.json({ users: await listUsers() });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal menghapus user." },
      { status: 500 },
    );
  }
}
