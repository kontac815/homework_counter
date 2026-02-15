import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getAuthSession } from "@/lib/auth";
import LogoutButton from "@/components/logout-button";

export const metadata: Metadata = {
  title: "提出物ポイント管理",
  description: "提出物ポイント管理アプリ"
};

const navItems = [
  { href: "/scan", label: "スキャン" },
  { href: "/today", label: "今日の提出状況" },
  { href: "/leaderboard", label: "ランキング" },
  { href: "/tv", label: "TV表示" },
  { href: "/admin", label: "管理" }
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();

  return (
    <html lang="ja">
      <body>
        {session?.user ? (
          <div className="min-h-screen">
            <header className="border-b bg-white">
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
                <div className="flex items-center gap-4">
                  <h1 className="text-lg font-bold">提出物ポイント管理</h1>
                  <nav className="hidden gap-2 md:flex">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="rounded-md px-3 py-1.5 text-sm hover:bg-slate-100"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </nav>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <span>{session.user.loginId}</span>
                  <LogoutButton />
                </div>
              </div>
            </header>
            <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
          </div>
        ) : (
          <main className="min-h-screen">{children}</main>
        )}
      </body>
    </html>
  );
}
