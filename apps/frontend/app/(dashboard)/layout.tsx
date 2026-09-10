"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  AlertTriangle,
  LogOut,
  Bot,
  User,
} from "lucide-react";
import { api } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/conversations", label: "Percakapan", icon: MessageSquare },
  { href: "/escalations", label: "Eskalasi", icon: AlertTriangle },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminEmail, setAdminEmail] = useState<string>("admin@tivask.local");
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("tivask_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    api
      .get<{ user: { email: string } }>("/api/auth/me")
      .then((res) => {
        setAdminEmail(res.user.email);
        setCheckingAuth(false);
      })
      .catch(() => {
        localStorage.removeItem("tivask_token");
        router.replace("/login");
      });
  }, [router]);

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (_) {}
    localStorage.removeItem("tivask_token");
    router.replace("/login");
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Memverifikasi sesi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col justify-between p-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-base leading-tight">TIVAsk Admin</div>
              <div className="text-xs text-slate-400">SMKN 1 Adiwerna</div>
            </div>
          </div>

          <nav className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2 text-xs text-slate-300">
            <User className="h-4 w-4 text-slate-400" />
            <span className="truncate">{adminEmail}</span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full mt-2 flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="text-sm font-medium text-slate-600">
            Portal Asisten SPMB SMKN 1 Adiwerna
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-medium text-slate-600">Sistem Aktif</span>
          </div>
        </header>

        <div className="p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</div>
      </main>
    </div>
  );
}
