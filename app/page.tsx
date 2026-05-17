"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, UserRound, X } from "lucide-react";
import { fetchJson } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<"request" | "verify" | "reset" | "success">("request");
  const [recoveryIdentifier, setRecoveryIdentifier] = useState("");
  const [recoveryRequestToken, setRecoveryRequestToken] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryOtp, setRecoveryOtp] = useState("");
  const [recoveryNewPassword, setRecoveryNewPassword] = useState("");
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState("");
  const [recoveryNotice, setRecoveryNotice] = useState("");
  const [recoveryDevOtp, setRecoveryDevOtp] = useState<string | null>(null);
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await fetchJson<{
        user: { username: string; role: "Owner" | "Staff" };
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: userId,
          password,
        }),
      });

      if (data.user) {
        router.push("/dashboard");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Login gagal.");
    } finally {
      setIsLoading(false);
    }
  };

  const openForgotPassword = () => {
    setForgotOpen(true);
    setRecoveryStep("request");
    setRecoveryIdentifier("");
    setRecoveryRequestToken("");
    setRecoveryEmail("");
    setRecoveryOtp("");
    setRecoveryNewPassword("");
    setRecoveryConfirmPassword("");
    setRecoveryNotice("");
    setRecoveryDevOtp(null);
    setShowRecoveryPassword(false);
  };

  const closeForgotPassword = () => {
    setForgotOpen(false);
    setForgotLoading(false);
    setRecoveryStep("request");
    setRecoveryIdentifier("");
    setRecoveryRequestToken("");
    setRecoveryEmail("");
    setRecoveryOtp("");
    setRecoveryNewPassword("");
    setRecoveryConfirmPassword("");
    setRecoveryNotice("");
    setRecoveryDevOtp(null);
    setShowRecoveryPassword(false);
  };

  const handleRequestOtp = async () => {
    if (!recoveryIdentifier) return;
    setForgotLoading(true);
    try {
      const data = await fetchJson<{
        message: string;
        requestToken?: string;
        email?: string;
        developmentOtp?: string | null;
      }>("/api/auth/forgot-password/request", {
        method: "POST",
        body: JSON.stringify({
          identifier: recoveryIdentifier,
        }),
      });

      setRecoveryNotice(data.message);
      setRecoveryRequestToken(data.requestToken ?? "");
      setRecoveryEmail(data.email ?? "");
      setRecoveryDevOtp(data.developmentOtp ?? null);
      if (data.requestToken) {
        setRecoveryStep("verify");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal mengirim OTP.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!recoveryRequestToken || !recoveryOtp) return;
    setForgotLoading(true);
    try {
      const data = await fetchJson<{ message: string }>("/api/auth/forgot-password/verify", {
        method: "POST",
        body: JSON.stringify({
          requestToken: recoveryRequestToken,
          otpCode: recoveryOtp,
        }),
      });

      setRecoveryNotice(data.message);
      setRecoveryStep("reset");
    } catch (error) {
      alert(error instanceof Error ? error.message : "OTP tidak valid.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!recoveryNewPassword || !recoveryConfirmPassword) return;
    if (recoveryNewPassword !== recoveryConfirmPassword) {
      alert("Konfirmasi password baru belum sama.");
      return;
    }

    setForgotLoading(true);
    try {
      const data = await fetchJson<{ message: string }>("/api/auth/forgot-password/reset", {
        method: "POST",
        body: JSON.stringify({
          requestToken: recoveryRequestToken,
          newPassword: recoveryNewPassword,
        }),
      });

      setRecoveryNotice(data.message);
      setRecoveryStep("success");
      setRecoveryOtp("");
      setRecoveryNewPassword("");
      setRecoveryConfirmPassword("");
      setRecoveryDevOtp(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal mereset password.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#fff8df_0%,#f6f8fb_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-120px] top-[-90px] h-80 w-80 rounded-full bg-[#ffd95a]/40 blur-3xl" />
        <div className="absolute bottom-[-140px] right-[-110px] h-96 w-96 rounded-full bg-[#f6bf2e]/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1280px] items-center justify-center px-5 py-8 lg:px-8">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[36px] border border-white/70 bg-white/55 shadow-[0_30px_100px_rgba(146,110,13,0.18)] backdrop-blur md:grid-cols-[1.08fr_0.92fr]">
          <section className="relative hidden min-h-[720px] overflow-hidden bg-[linear-gradient(160deg,#f8c83c_0%,#eeaa1b_55%,#db920e_100%)] p-8 md:flex md:flex-col md:justify-between lg:p-10">
            <div className="absolute inset-0">
              <div className="absolute right-[-70px] top-[-60px] h-64 w-64 rounded-full bg-white/18 blur-3xl" />
              <div className="absolute bottom-[-80px] left-[-50px] h-72 w-72 rounded-full bg-white/12 blur-3xl" />
            </div>

            <div className="relative">
              <div className="inline-flex items-center gap-3 rounded-full bg-white/18 px-5 py-3 text-sm font-medium text-slate-900 backdrop-blur">
                <span aria-hidden="true" className="text-xl leading-none">🌻</span>
                Sunflower System
              </div>
            </div>

            <div className="relative flex flex-1 items-center justify-center py-8">
              <div className="relative aspect-[4/5] w-full max-w-[460px] overflow-hidden rounded-[36px] border border-white/35 shadow-[0_25px_70px_rgba(94,67,0,0.22)]">
                <Image
                  src="/Sunflower.jpg"
                  alt="Sunflower"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
              </div>
            </div>
          </section>

          <section className="flex min-h-[720px] items-center justify-center bg-white/72 px-6 py-10 backdrop-blur lg:px-10">
            <div className="w-full max-w-md">
              <div className="mb-8 text-center">
                <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-[22px] bg-[#fff3cf] text-[38px] shadow-sm">
                  <span aria-hidden="true">🌻</span>
                </div>
                <p className="mt-5 text-xs font-medium uppercase tracking-[0.32em] text-[#b98600]">Sunflower System</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Login</h1>
                <p className="mt-2 text-sm text-slate-500">Masuk menggunakan username dan password Anda.</p>
              </div>

              <form onSubmit={handleLogin} className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Username</label>
                    <div className="relative">
                      <UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#efc14d] focus:bg-white focus:ring-4 focus:ring-[#ffd760]/25"
                        placeholder="Masukkan username"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">Password</label>
                      <button
                        type="button"
                        onClick={openForgotPassword}
                        className="text-sm font-medium text-[#b98600] transition hover:text-[#996e00]"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#efc14d] focus:bg-white focus:ring-4 focus:ring-[#ffd760]/25"
                        placeholder="Masukkan password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#f2c13f_0%,#e89f17_100%)] px-5 py-3.5 text-sm font-semibold text-slate-900 shadow-[0_18px_32px_rgba(232,159,23,0.24)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_38px_rgba(232,159,23,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-900/25 border-t-slate-900" />
                    ) : (
                      <>
                        Login
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>

      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-[30px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xl font-semibold text-slate-900">Forgot Password</p>
                <p className="mt-1 text-sm text-slate-500">
                  {recoveryStep === "request" && "Masukkan username atau email terdaftar untuk menerima OTP reset password."}
                  {recoveryStep === "verify" && "Masukkan kode OTP yang dikirim ke email terdaftar Anda."}
                  {recoveryStep === "reset" && "Setelah OTP valid, buat password baru untuk akun Anda."}
                  {recoveryStep === "success" && "Password baru sudah tersimpan. Anda bisa kembali login."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeForgotPassword}
                className="rounded-xl border border-slate-200 p-2 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {recoveryStep === "request" ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-[#fff7e3] px-4 py-3 text-sm text-slate-700">
                  Gunakan email yang sudah terdaftar di akun Sunflower System Anda.
                </div>
                {recoveryNotice && (
                  <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                    {recoveryNotice}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Username atau Email</label>
                  <input
                    type="text"
                    value={recoveryIdentifier}
                    onChange={(e) => setRecoveryIdentifier(e.target.value)}
                    placeholder="Masukkan username atau email terdaftar"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#efc14d] focus:bg-white focus:ring-4 focus:ring-[#ffd760]/25"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={forgotLoading}
                  className="w-full rounded-2xl bg-[linear-gradient(90deg,#f2c13f_0%,#e89f17_100%)] px-5 py-3 text-sm font-semibold text-slate-900"
                >
                  {forgotLoading ? "Mengirim OTP..." : "Kirim OTP ke Email"}
                </button>
              </div>
            ) : recoveryStep === "verify" ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-[#fff7e3] px-4 py-3 text-sm text-slate-700">
                  {recoveryNotice || (
                    <>
                      OTP dikirim ke email: <strong>{recoveryEmail}</strong>
                    </>
                  )}
                </div>
                {recoveryDevOtp && (
                  <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                    OTP development: <strong>{recoveryDevOtp}</strong>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">OTP Email</label>
                  <input
                    type="text"
                    value={recoveryOtp}
                    onChange={(e) => setRecoveryOtp(e.target.value)}
                    placeholder="Masukkan 6 digit OTP"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#efc14d] focus:bg-white focus:ring-4 focus:ring-[#ffd760]/25"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRecoveryStep("request")}
                    className="w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600"
                  >
                    Kembali
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={forgotLoading}
                    className="w-full rounded-2xl bg-[linear-gradient(90deg,#f2c13f_0%,#e89f17_100%)] px-5 py-3 text-sm font-semibold text-slate-900"
                  >
                    {forgotLoading ? "Memverifikasi..." : "Verifikasi OTP"}
                  </button>
                </div>
              </div>
            ) : recoveryStep === "reset" ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-[#fff7e3] px-4 py-3 text-sm text-slate-700">
                  {recoveryNotice || "Buat password baru setelah OTP berhasil diverifikasi."}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Password Baru</label>
                  <input
                    type={showRecoveryPassword ? "text" : "password"}
                    value={recoveryNewPassword}
                    onChange={(e) => setRecoveryNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#efc14d] focus:bg-white focus:ring-4 focus:ring-[#ffd760]/25"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Konfirmasi Password Baru</label>
                  <input
                    type={showRecoveryPassword ? "text" : "password"}
                    value={recoveryConfirmPassword}
                    onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#efc14d] focus:bg-white focus:ring-4 focus:ring-[#ffd760]/25"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecoveryPassword((value) => !value)}
                  className="text-sm font-medium text-[#b98600] transition hover:text-[#996e00]"
                >
                  {showRecoveryPassword ? "Sembunyikan password" : "Tampilkan password"}
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRecoveryStep("verify")}
                    className="w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600"
                  >
                    Kembali
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={forgotLoading}
                    className="w-full rounded-2xl bg-[linear-gradient(90deg,#f2c13f_0%,#e89f17_100%)] px-5 py-3 text-sm font-semibold text-slate-900"
                  >
                    {forgotLoading ? "Menyimpan..." : "Reset Password"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-[#ecfdf3] px-4 py-3 text-sm text-emerald-700">
                  {recoveryNotice || "Password berhasil diubah. Silakan login dengan password baru Anda."}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeForgotPassword}
                    className="w-full rounded-2xl bg-[linear-gradient(90deg,#f2c13f_0%,#e89f17_100%)] px-5 py-3 text-sm font-semibold text-slate-900"
                  >
                    Kembali ke Login
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
