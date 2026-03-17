"use client";

import Link from "next/link";
import { MoreHorizontal, Facebook, Instagram, Linkedin, Youtube, Plus } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn, getInitials } from "@/lib/utils";
import type { Brand } from "@/types";

const PLATFORM_ICONS = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
};

const PLATFORM_COLORS = {
  facebook: "text-platform-facebook",
  instagram: "text-platform-instagram",
  linkedin: "text-platform-linkedin",
  youtube: "text-platform-youtube",
};

interface BrandCardProps {
  brand: Brand;
  onDelete?: (id: string) => void;
}

export function BrandCard({ brand, onDelete }: BrandCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const accounts = (brand.social_accounts || []).filter((a) => a.status === "active");
  const connectedPlatforms = [...new Set(accounts.map((a) => a.platform))];

  return (
    <div className="bg-white border border-surface-200 rounded-lg shadow-surface-sm hover:shadow-surface-md transition-shadow">
      {/* Card Header */}
      <div className="flex items-center gap-3 p-4 border-b border-surface-100">
        {/* Brand Logo/Avatar */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: brand.color }}
        >
          {brand.logo_url ? (
            <img
              src={brand.logo_url}
              alt={brand.name}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            getInitials(brand.name)
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-surface-900 truncate">
            {brand.name}
          </h3>
          {brand.industry && (
            <p className="text-xs text-surface-400 mt-0.5">{brand.industry}</p>
          )}
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-7 h-7 flex items-center justify-center rounded text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-surface-200 rounded-lg shadow-surface-lg z-20 py-1 animate-fade-in">
                <Link
                  href={`/dashboard/brands/${brand.id}`}
                  className="block px-3 py-2 text-sm text-surface-700 hover:bg-surface-50"
                  onClick={() => setMenuOpen(false)}
                >
                  View Brand
                </Link>
                <Link
                  href={`/dashboard/brands/${brand.id}/settings`}
                  className="block px-3 py-2 text-sm text-surface-700 hover:bg-surface-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Settings
                </Link>
                <Link
                  href={`/dashboard/compose?brand_id=${brand.id}`}
                  className="block px-3 py-2 text-sm text-surface-700 hover:bg-surface-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Create Post
                </Link>
                <div className="border-t border-surface-100 mt-1 pt-1">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete?.(brand.id);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
                  >
                    Delete Brand
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Social Accounts */}
      <div className="px-4 py-3">
        <p className="text-xs font-medium text-surface-500 mb-2">Connected</p>
        {connectedPlatforms.length > 0 ? (
          <div className="flex items-center gap-2">
            {connectedPlatforms.map((platform) => {
              const Icon = PLATFORM_ICONS[platform];
              return (
                <div
                  key={platform}
                  className="w-7 h-7 rounded-full bg-surface-100 flex items-center justify-center"
                  title={platform}
                >
                  <Icon className={cn("w-3.5 h-3.5", PLATFORM_COLORS[platform])} />
                </div>
              );
            })}
          </div>
        ) : (
          <Link
            href={`/dashboard/brands/${brand.id}`}
            className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Connect accounts
          </Link>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-surface-100 flex items-center justify-between">
        <Badge variant={brand.is_active ? "success" : "default"} dot>
          {brand.is_active ? "Active" : "Inactive"}
        </Badge>
        <Link
          href={`/dashboard/compose?brand_id=${brand.id}`}
          className="text-xs text-brand-600 hover:text-brand-700 font-medium"
        >
          Create Post
        </Link>
      </div>
    </div>
  );
}
