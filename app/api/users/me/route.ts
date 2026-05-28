import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { createActivityLog, requireSessionUser } from "@/lib/server-data";

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

export async function PATCH(request: Request) {
  try {
    const actor = await requireSessionUser();
    if (!actor) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const password = String(body.password ?? "").trim();

    if (!name || !email) {
      return NextResponse.json({ message: "Nama dan email wajib diisi." }, { status: 400 });
    }

    const emailConflict = await sql<{ user_id: number }[]>`
      SELECT user_id FROM app_users
      WHERE email = ${email} AND user_id != ${actor.dbUserId} AND deleted_at IS NULL
      LIMIT 1
    `;

    if (emailConflict.length > 0) {
      return NextResponse.json({ message: "Email sudah digunakan akun lain." }, { status: 400 });
    }

    if (password) {
      const nextPasswordHash = await hashPassword(password);
      await sql`
        UPDATE app_users
        SET full_name = ${name}, email = ${email}, phone_number = ${phone}, password_hash = ${nextPasswordHash}
        WHERE user_id = ${actor.dbUserId}
      `;
    } else {
      await sql`
        UPDATE app_users
        SET full_name = ${name}, email = ${email}, phone_number = ${phone}
        WHERE user_id = ${actor.dbUserId}
      `;
    }

    await createActivityLog({
      actorUserId: actor.dbUserId,
      actorUsername: actor.username,
      actorName: actor.name,
      featureName: "USER",
      activityMessage: "Mengubah data profil sendiri",
      referenceTable: "app_users",
      referenceId: actor.dbUserId,
    });

    return NextResponse.json({
      user: {
        id: actor.id,
        name,
        username: actor.username,
        email,
        phone,
        role: actor.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal mengubah profil." },
      { status: 500 },
    );
  }
}
