"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Item = { href: string; label: string };
export default function Shell({ title, subtitle, items, children }: { title: string; subtitle?: string; items: Item[]; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }
  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-white border-r flex flex-col">
        <div className="px-5 py-4 border-b">
          <div className="font-bold text-brand-700">{title}</div>
          {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((i) => (
            <Link key={i.href} href={i.href}
              className={`block rounded-lg px-3 py-2 text-sm ${path === i.href ? "bg-brand-50 text-brand-700 font-medium" : "text-slate-600 hover:bg-slate-100"}`}>
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t">
          <button onClick={logout} className="btn-ghost w-full text-sm">Logout</button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
