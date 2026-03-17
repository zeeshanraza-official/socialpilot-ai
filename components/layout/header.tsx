"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, ChevronDown, LogOut, User, HelpCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, getInitials } from "@/lib/utils";
import type { User as UserType } from "@/types";

interface HeaderProps {
  user: UserType;
  title?: string;
}

export function Header({ user, title }: HeaderProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="h-16 bg-white border-b border-surface-200 flex items-center justify-between px-6 flex-shrink-0">
      {/* Title */}
      <div>
        {title && (
          <h1 className="text-base font-semibold text-surface-900">{title}</h1>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded text-surface-500 hover:bg-surface-100 hover:text-surface-700 transition-colors">
          <Bell className="w-4 h-4" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 h-8 pl-1 pr-2 rounded hover:bg-surface-100 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-semibold overflow-hidden">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || ""}
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials(user.full_name || user.email)
              )}
            </div>
            <span className="text-sm font-medium text-surface-700 hidden sm:block">
              {user.full_name?.split(" ")[0] || user.email.split("@")[0]}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-surface-400" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-surface-200 rounded-lg shadow-surface-lg z-20 py-1 animate-fade-in">
                <div className="px-3 py-2 border-b border-surface-100">
                  <p className="text-sm font-medium text-surface-900">
                    {user.full_name || "User"}
                  </p>
                  <p className="text-xs text-surface-400 mt-0.5">{user.email}</p>
                </div>

                <div className="py-1">
                  <DropdownItem
                    href="/dashboard/settings"
                    icon={<User className="w-4 h-4" />}
                    onClick={() => setDropdownOpen(false)}
                  >
                    Profile Settings
                  </DropdownItem>
                  <DropdownItem
                    href="#"
                    icon={<HelpCircle className="w-4 h-4" />}
                    onClick={() => setDropdownOpen(false)}
                  >
                    Help & Support
                  </DropdownItem>
                </div>

                <div className="border-t border-surface-100 py-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function DropdownItem({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 transition-colors"
    >
      <span className="text-surface-400">{icon}</span>
      {children}
    </a>
  );
}
