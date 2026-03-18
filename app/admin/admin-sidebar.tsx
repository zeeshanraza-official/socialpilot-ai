"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Settings, Shield,
  Zap, ArrowLeft, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Settings & Keys", href: "/admin/settings", icon: Settings },
  { label: "Platform Guides", href: "/admin/platforms", icon: BookOpen },
];

interface AdminSidebarProps {
  adminEmail: string;
  adminName: string | null;
}

export function AdminSidebar({ adminEmail, adminName }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="flex flex-col w-60 h-screen bg-slate-900 border-r border-slate-800 flex-shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold text-white">SocialPilot</span>
            <span className="block text-xs text-slate-400 leading-none">Admin Panel</span>
          </div>
        </div>
        <div className="ml-auto">
          <Shield className="w-4 h-4 text-amber-400" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 h-9 px-3 rounded text-sm font-medium transition-colors",
                active
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              <item.icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-brand-400" : "")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: user + back link */}
      <div className="border-t border-slate-800 p-3 space-y-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 px-3 py-2 rounded hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to App
        </Link>
        <div className="px-3 py-2 rounded bg-slate-800">
          <p className="text-xs font-medium text-white truncate">{adminName || "Admin"}</p>
          <p className="text-xs text-slate-400 truncate">{adminEmail}</p>
        </div>
      </div>
    </aside>
  );
}
