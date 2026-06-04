"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Upload, List, Target, Wallet, LogOut, BarChart3 } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { clsx } from "clsx";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/transactions", label: "Transactions", icon: List },
  { href: "/budgets", label: "Budgets", icon: Target },
  { href: "/accounts", label: "Accounts", icon: Wallet },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const email = session?.user?.email ?? "";
  const initials = email
    ? email.slice(0, 2).toUpperCase()
    : "?";

  return (
    <aside className="w-60 shrink-0 bg-gray-950 text-white flex flex-col min-h-screen border-r border-gray-800">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <BarChart3 size={14} className="text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-white">StatementIQ</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-100 hover:bg-gray-800/70"
              )}
            >
              <Icon size={16} className={active ? "text-white" : "text-gray-500"} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User area */}
      <div className="px-3 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {initials}
          </div>
          <span className="text-xs text-gray-400 truncate flex-1">{email}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            className="text-gray-500 hover:text-white transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
