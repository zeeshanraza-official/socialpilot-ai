"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  PenSquare,
  Calendar,
  Inbox,
  BarChart2,
  Image,
  Settings,
  Zap,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Brands",
    href: "/dashboard/brands",
    icon: Layers,
  },
  {
    label: "Compose",
    href: "/dashboard/compose",
    icon: PenSquare,
  },
  {
    label: "Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
  },
  {
    label: "Inbox",
    href: "/dashboard/inbox",
    icon: Inbox,
    badge: true,
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart2,
  },
  {
    label: "Media",
    href: "/dashboard/media",
    icon: Image,
  },
];

const bottomItems = [
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  unreadCount?: number;
}

export function Sidebar({ unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex flex-col w-60 h-screen bg-white border-r border-surface-200 flex-shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-surface-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold text-surface-900">SocialPilot</span>
            <span className="block text-xs text-surface-400 leading-none">AI</span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 h-9 px-3 rounded text-sm font-medium transition-colors group",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-surface-600 hover:bg-surface-50 hover:text-surface-900"
              )}
            >
              <item.icon
                className={cn(
                  "w-4 h-4 flex-shrink-0",
                  active ? "text-brand-600" : "text-surface-400 group-hover:text-surface-600"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge && unreadCount > 0 && (
                <span className="flex-shrink-0 bg-danger-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-surface-100 py-4 px-3 space-y-0.5">
        {bottomItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 h-9 px-3 rounded text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-surface-600 hover:bg-surface-50 hover:text-surface-900"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0 text-surface-400" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
