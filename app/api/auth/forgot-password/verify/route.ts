import { NextResponse } from "next/server";
import {
  createActivityLog,
  verifyPasswordResetOtp,
} from "@/lib/server-data";

function mapError(reason: string) {
  switch (reason) {
    case "REQUEST_NOT_FOUND":
      return "Permintaan reset password tidak ditemukan.";
    case "REQUEST_CLOSED":
      return "Permintaan reset password sudah ditutup.";
    case "REQUEST_EXPIRED":
    case "OTP_EXPIRED":
      return "OTP sudah kedaluwarsa. Silakan minta OTP baru.";
    case "OTP_NOT_FOUND":
      return "OTP tidak ditemukan.";
    case "TOO_MANY_ATTEMPTS":
      return "Terlalu banyak percobaan OTP. Silakan minta OTP baru.";
    case "INVALID_OTP":
    default:
      return "Kode OTP tidak valid.";
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const requestToken = String(body.requestToken ?? "").trim();
    const otpCode = String(body.otpCode ?? "").trim();

    if (!requestToken || !otpCode) {
      return NextResponse.json({ message: "Request token dan OTP wajib diisi." }, { status: 400 });
    }

    const result = await verifyPasswordResetOtp(requestToken, otpCode);

    if (!result.ok) {
      return NextResponse.json({ message: mapError(result.reason) }, { status: 400 });
    }

    await createActivityLog({
      actorUserId: result.request.user_id,
      actorUsername: result.request.username,
      actorName: result.request.full_name,
      featureName: "LOGIN",
      activityMessage: "Berhasil memverifikasi OTP reset password",
      referenceTable: "password_reset_requests",
      referenceId: result.request.password_reset_request_id,
    });

    return NextResponse.json({
      message: "OTP berhasil diverifikasi. Silakan buat password baru.",
      requestToken,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal memverifikasi OTP." },
      { status: 500 },
    );
  }
}
