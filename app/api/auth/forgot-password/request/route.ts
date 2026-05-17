import { NextResponse } from "next/server";
import { sendPasswordResetOtpEmail } from "@/lib/mailer";
import {
  createActivityLog,
  createEmailPasswordResetRequest,
  getUserByIdentifier,
} from "@/lib/server-data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = String(body.identifier ?? "").trim();

    if (!identifier) {
      return NextResponse.json({ message: "Username atau email wajib diisi." }, { status: 400 });
    }

    const user = await getUserByIdentifier(identifier);

    if (!user || !user.isActive) {
      return NextResponse.json({
        message: "Jika akun terdaftar, OTP reset password akan dikirim ke email yang terhubung.",
      });
    }

    const resetData = await createEmailPasswordResetRequest(user);
    const mailResult = await sendPasswordResetOtpEmail({
      to: user.email,
      name: user.name,
      otpCode: resetData.otpCode,
    });

    await createActivityLog({
      actorUserId: user.dbUserId,
      actorUsername: user.username,
      actorName: user.name,
      featureName: "LOGIN",
      activityMessage: "Meminta OTP reset password via email",
      referenceTable: "password_reset_requests",
      referenceId: null,
    });

    return NextResponse.json({
      message: `OTP reset password telah dikirim ke email terdaftar (${user.email}).`,
      requestToken: resetData.requestToken,
      email: user.email,
      developmentOtp: process.env.NODE_ENV !== "production" ? mailResult.previewOtp : null,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal meminta OTP reset password." },
      { status: 500 },
    );
  }
}
