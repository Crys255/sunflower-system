"use client";

import Link from "next/link"
import { LayoutDashboard, Package, DollarSign, User, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AppRole } from "@/lib/session";
import { fetchJson } from "@/lib/api-client";

export function Navbar() {
  const pathname = usePathname();
  const [currentRole, setCurrentRole] = useState<AppRole>("Owner");
  const [greetingName, setGreetingName] = useState("User");

  useEffect(() => {
    fetchJson<{ user: { name: string; role: AppRole } }>("/api/auth/session")
      .then((data) => {
        setCurrentRole(data.user.role);
        setGreetingName(data.user.name.split(" ")[0] ?? "User");
      })
      .catch(() => {
        setGreetingName("User");
      });
  }, []);

  const menuItems = useMemo(
    () =>
      [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["Owner", "Staff"] },
        { href: "/inventory", label: "Inventory", icon: Package, roles: ["Owner", "Staff"] },
        { href: "/financial", label: "Financial", icon: DollarSign, roles: ["Owner", "Staff"] },
        { href: "/user", label: "User", icon: User, roles: ["Owner", "Staff"] },
      ].filter((item) => item.roles.includes(currentRole)),
    [currentRole],
  );

  if (pathname === "/") {
    return null;
  }

  return (
    <nav className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col rounded-r-[30px] bg-[#f6c33b] px-6 py-8 text-slate-900 shadow-[0_24px_80px_rgba(160,114,0,0.18)]">
      <div className="mb-12">
        <Link href="/dashboard" className="mb-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/55 text-[28px] shadow-sm">
            <span aria-hidden="true">🌻</span>
          </div>
          <span className="text-2xl font-semibold tracking-tight">Sunflower</span>
        </Link>
        <p className="pl-[62px] text-sm font-medium text-[#7a5400]">Hi, {greetingName}.</p>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 transition
              ${pathname === item.href 
                ? "bg-white text-[#9a6b00] shadow-sm" 
                : "text-slate-800 hover:bg-[#ffd968] hover:text-slate-900"
              }`}
          >
            <item.icon size={20} />
            {item.label}
          </Link>
        ))}
      </div>

      <button
        onClick={async () => {
          await fetchJson("/api/auth/logout", { method: "POST" });
          window.location.href = "/";
        }}
        className="mt-auto w-full rounded-xl px-3 py-3 text-left transition hover:bg-[#ffd968] hover:text-slate-900"
      >
        <span className="flex items-center gap-3">
          <LogOut size={20} />
          LogOut
        </span>
      </button>
    </nav>
  );
}
