import nodemailer from "nodemailer";

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user;
  const secure = process.env.SMTP_SECURE === "true";

  const isConfigured = Boolean(host && port && user && pass && from);

  return {
    host,
    port,
    user,
    pass,
    from,
    secure,
    isConfigured,
  };
}

export async function sendPasswordResetOtpEmail(params: {
  to: string;
  name: string;
  otpCode: string;
}) {
  const smtp = getSmtpConfig();

  if (!smtp.isConfigured) {
    console.log(
      `[SMTP DEBUG] host=${!!process.env.SMTP_HOST} port=${!!process.env.SMTP_PORT} user=${!!process.env.SMTP_USER} pass=${!!process.env.SMTP_PASS} from=${!!process.env.SMTP_FROM}`,
    );
    console.log(
      `[DEV OTP] Reset password for ${params.to} (${params.name}) with code: ${params.otpCode}`,
    );
    return {
      delivered: false,
      previewOtp: params.otpCode,
    };
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  await transporter.sendMail({
    from: smtp.from,
    to: params.to,
    subject: "Sunflower System - Reset Password OTP",
    text: [
      `Halo ${params.name},`,
      "",
      "Kami menerima permintaan reset password untuk akun Sunflower System Anda.",
      `Kode OTP Anda adalah: ${params.otpCode}`,
      "",
      "Kode ini berlaku selama 10 menit.",
      "Jika Anda tidak merasa meminta reset password, abaikan email ini.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="margin:0 0 12px">Sunflower System</h2>
        <p>Halo ${params.name},</p>
        <p>Kami menerima permintaan reset password untuk akun Anda.</p>
        <p style="margin:20px 0">
          <span style="display:inline-block;padding:12px 18px;border-radius:12px;background:#fff1c0;color:#9a6b00;font-size:24px;font-weight:700;letter-spacing:6px">
            ${params.otpCode}
          </span>
        </p>
        <p>Kode ini berlaku selama 10 menit.</p>
        <p>Jika Anda tidak merasa meminta reset password, abaikan email ini.</p>
      </div>
    `,
  });

  return {
    delivered: true,
    previewOtp: null,
  };
}
