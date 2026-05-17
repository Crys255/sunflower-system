import {Navbar} from "@/components/navbar";

export default function SharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffaf0_0%,#fffdf7_34%,#f7f7f2_100%)]">
      <Navbar />
      <main className="min-h-screen flex-1 p-4 md:ml-64 md:p-8">
        {children}
      </main>
    </div>
  );
}
