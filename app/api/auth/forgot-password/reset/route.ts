import { NextResponse } from "next/server";
import {
  createActivityLog,
  resetPasswordWithVerifiedRequest,
} from "@/lib/server-data";

function mapError(reason: string) {
  switch (reason) {
    case "REQUEST_NOT_FOUND":
      return "Permintaan reset password tidak ditemukan.";
    case "OTP_NOT_VERIFIED":
      return "OTP belum diverifikasi.";
    case "REQUEST_EXPIRED":
      return "Permintaan reset password sudah kedaluwarsa.";
    default:
      return "Gagal mengubah password.";
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const requestToken = String(body.requestToken ?? "").trim();
    const newPassword = String(body.newPassword ?? "");

    if (!requestToken || !newPassword) {
      return NextResponse.json({ message: "Request token dan password baru wajib diisi." }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ message: "Password baru minimal 6 karakter." }, { status: 400 });
    }

    const result = await resetPasswordWithVerifiedRequest(requestToken, newPassword);

    if (!result.ok) {
      return NextResponse.json({ message: mapError(result.reason) }, { status: 400 });
    }

    await createActivityLog({
      actorUserId: result.request.user_id,
      actorUsername: result.request.username,
      actorName: result.request.full_name,
      featureName: "LOGIN",
      activityMessage: "Berhasil mengganti password melalui reset email OTP",
      referenceTable: "app_users",
      referenceId: result.request.user_id,
    });

    return NextResponse.json({
      message: "Password berhasil diubah. Silakan login dengan password baru.",
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal mereset password." },
      { status: 500 },
    );
  }
}
