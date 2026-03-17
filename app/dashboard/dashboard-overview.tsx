"use client";

import Link from "next/link";
import {
  PenSquare,
  Calendar,
  Inbox,
  ArrowRight,
  Clock,
  CheckCircle,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDatetime, formatRelativeDate, cn, getInitials } from "@/lib/utils";
import type { Platform } from "@/types";

const PLATFORM_ICONS = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
};

const PLATFORM_COLORS = {
  facebook: "#1877F2",
  instagram: "#E1306C",
  linkedin: "#0A66C2",
  youtube: "#FF0000",
};

interface DashboardProps {
  brands: Array<{
    id: string;
    name: string;
    color: string;
    slug: string;
    social_accounts: Array<{ platform: string; status: string }>;
  }>;
  upcomingPosts: Array<{
    id: string;
    platform: string;
    status: string;
    scheduled_at: string;
    content_item?: { caption?: string } | null;
  }>;
  recentPublished: Array<{
    id: string;
    platform: string;
    status: string;
    scheduled_at: string;
    content_item?: { caption?: string } | null;
  }>;
  unreadCount: number;
}

export function DashboardOverview({
  brands,
  upcomingPosts,
  recentPublished,
  unreadCount,
}: DashboardProps) {
  const stats = [
    {
      label: "Active Brands",
      value: brands.length,
      icon: <div className="w-4 h-4 bg-brand-500 rounded" />,
      href: "/dashboard/brands",
    },
    {
      label: "Scheduled Posts",
      value: upcomingPosts.length,
      icon: <Clock className="w-4 h-4 text-brand-500" />,
      href: "/dashboard/calendar",
    },
    {
      label: "Published Today",
      value: recentPublished.filter(
        (p) =>
          new Date(p.scheduled_at).toDateString() === new Date().toDateString()
      ).length,
      icon: <CheckCircle className="w-4 h-4 text-success-500" />,
      href: "/dashboard/analytics",
    },
    {
      label: "Unread Messages",
      value: unreadCount,
      icon: <Inbox className="w-4 h-4 text-warning-500" />,
      href: "/dashboard/inbox",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-surface-900">Dashboard</h2>
          <p className="text-sm text-surface-500 mt-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Link href="/dashboard/compose">
          <Button leftIcon={<PenSquare className="w-4 h-4" />}>
            Create Post
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <div className="bg-white border border-surface-200 rounded-lg p-4 hover:shadow-surface-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                {stat.icon}
                <ArrowRight className="w-3.5 h-3.5 text-surface-300" />
              </div>
              <p className="text-2xl font-semibold text-surface-900">{stat.value}</p>
              <p className="text-xs text-surface-500 mt-0.5">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Brands */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Brands</CardTitle>
            <Link href="/dashboard/brands">
              <Button variant="ghost" size="xs">
                View all
              </Button>
            </Link>
          </CardHeader>

          {brands.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-surface-400 mb-3">No brands yet</p>
              <Link href="/dashboard/brands">
                <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Create Brand
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {brands.slice(0, 5).map((brand) => {
                const activeAccounts = brand.social_accounts?.filter(
                  (a) => a.status === "active"
                ) || [];
                const platforms = [...new Set(activeAccounts.map((a) => a.platform))];

                return (
                  <Link
                    key={brand.id}
                    href={`/dashboard/brands/${brand.id}`}
                    className="flex items-center gap-3 p-2.5 rounded hover:bg-surface-50 transition-colors"
                  >
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: brand.color }}
                    >
                      {getInitials(brand.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-800 truncate">
                        {brand.name}
                      </p>
                      <p className="text-xs text-surface-400">
                        {platforms.length} platform{platforms.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {platforms.slice(0, 3).map((p) => {
                        const Icon = PLATFORM_ICONS[p as Platform];
                        return Icon ? (
                          <Icon
                            key={p}
                            className="w-3.5 h-3.5"
                            style={{ color: PLATFORM_COLORS[p as Platform] }}
                          />
                        ) : null;
                      })}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        {/* Upcoming Posts */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming Scheduled Posts</CardTitle>
            <Link href="/dashboard/calendar">
              <Button variant="ghost" size="xs">
                Calendar view
              </Button>
            </Link>
          </CardHeader>

          {upcomingPosts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-surface-400 mb-3">No upcoming posts</p>
              <Link href="/dashboard/compose">
                <Button size="sm" variant="outline" leftIcon={<PenSquare className="w-3.5 h-3.5" />}>
                  Schedule Post
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingPosts.slice(0, 6).map((post) => {
                const Icon = PLATFORM_ICONS[post.platform as Platform];
                return (
                  <div
                    key={post.id}
                    className="flex items-center gap-3 p-2.5 rounded hover:bg-surface-50"
                  >
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: PLATFORM_COLORS[post.platform as Platform] + "20" }}
                    >
                      {Icon && (
                        <Icon
                          className="w-4 h-4"
                          style={{ color: PLATFORM_COLORS[post.platform as Platform] }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-surface-700 truncate">
                        {post.content_item?.caption
                          ? post.content_item.caption.substring(0, 80) + "..."
                          : "No caption"}
                      </p>
                      <p className="text-xs text-surface-400 mt-0.5">
                        {formatDatetime(post.scheduled_at)}
                      </p>
                    </div>
                    <Badge variant="brand" size="sm">
                      Scheduled
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            href: "/dashboard/compose",
            icon: PenSquare,
            label: "Create Post",
            desc: "Write and schedule content",
          },
          {
            href: "/dashboard/inbox",
            icon: Inbox,
            label: "Inbox",
            desc: `${unreadCount} unread messages`,
          },
          {
            href: "/dashboard/analytics",
            icon: Calendar,
            label: "Analytics",
            desc: "View performance insights",
          },
        ].map((action) => (
          <Link key={action.href} href={action.href}>
            <div className="bg-white border border-surface-200 rounded-lg p-4 hover:shadow-surface-md transition-shadow flex items-center gap-3">
              <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600 flex-shrink-0">
                <action.icon className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-800">{action.label}</p>
                <p className="text-xs text-surface-400">{action.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
