import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import {
  createActivityLog,
  listUsers,
  requireSessionUser,
} from "@/lib/server-data";

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
      const ownerRows = await sql<{ total_owner: string }[]>`
        SELECT COUNT(*)::TEXT AS total_owner FROM app_users WHERE role_code = 'OWNER' AND deleted_at IS NULL
      `;

      if (Number(ownerRows[0]?.total_owner ?? 0) > 0) {
        return NextResponse.json({ message: "Hanya boleh ada satu akun owner." }, { status: 400 });
      }
    }

    const passwordHash = await hashPassword(password);

    const [userRow] = await sql<{ user_id: number }[]>`
      INSERT INTO app_users (
        full_name, username, email, phone_number, password_hash, role_code, is_active
      ) VALUES (
        ${String(body.name ?? "")},
        ${String(body.username ?? "")},
        ${String(body.email ?? "")},
        ${String(body.phone ?? "")},
        ${passwordHash},
        ${roleCode},
        true
      )
      RETURNING user_id
    `;

    await createActivityLog({
      actorUserId: actor.dbUserId,
      actorUsername: actor.username,
      actorName: actor.name,
      featureName: "USER",
      activityMessage: `Menambahkan akun ${String(body.name ?? "")}`,
      referenceTable: "app_users",
      referenceId: Number(userRow.user_id),
    });

    return NextResponse.json({ users: await listUsers() });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal menambah user." },
      { status: 500 },
    );
  }
}
