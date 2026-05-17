"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/";

  if (isAuthPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen md:ml-64">{children}</main>
    </>
  );
}
