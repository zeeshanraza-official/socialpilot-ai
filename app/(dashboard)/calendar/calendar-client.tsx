"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Facebook, Instagram, Linkedin, Youtube } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, PLATFORM_CONFIG } from "@/lib/utils";
import type { Platform } from "@/types";

interface ScheduledPost {
  id: string;
  platform: string;
  status: string;
  scheduled_at: string;
  content_item?: {
    id: string;
    caption?: string;
    title?: string;
    brand_id?: string;
  } | null;
}

interface Brand {
  id: string;
  name: string;
  color: string;
}

interface CalendarPageClientProps {
  brands: Brand[];
  scheduledPosts: ScheduledPost[];
  initialBrandId?: string;
}

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-brand-100 border-brand-300 text-brand-700",
  published: "bg-success-50 border-success-500/30 text-success-700",
  failed: "bg-danger-50 border-danger-300 text-danger-700",
  cancelled: "bg-surface-100 border-surface-200 text-surface-500",
};

export function CalendarPageClient({
  brands,
  scheduledPosts,
  initialBrandId,
}: CalendarPageClientProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedBrand, setSelectedBrand] = useState(initialBrandId || "all");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [view, setView] = useState<"month" | "week">("month");

  const filteredPosts = useMemo(() => {
    if (selectedBrand === "all") return scheduledPosts;
    return scheduledPosts.filter(
      (p) => p.content_item?.brand_id === selectedBrand
    );
  }, [scheduledPosts, selectedBrand]);

  const postsByDate = useMemo(() => {
    const map: Record<string, ScheduledPost[]> = {};
    for (const post of filteredPosts) {
      const dateKey = format(new Date(post.scheduled_at), "yyyy-MM-dd");
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(post);
    }
    return map;
  }, [filteredPosts]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const selectedDayPosts = selectedDay
    ? postsByDate[format(selectedDay, "yyyy-MM-dd")] || []
    : [];

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-surface-900">Calendar</h2>
          <p className="text-sm text-surface-500 mt-0.5">
            View and manage your scheduled content
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="h-9 px-3 rounded border border-surface-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <Link href="/dashboard/compose">
            <Button leftIcon={<Plus className="w-4 h-4" />}>
              Schedule Post
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-5 flex-1 min-h-0">
        {/* Calendar */}
        <div className="flex-1 bg-white border border-surface-200 rounded-lg flex flex-col">
          {/* Month Navigation */}
          <div className="flex items-center justify-between p-4 border-b border-surface-100">
            <h3 className="text-base font-semibold text-surface-900">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-100 text-surface-500 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 h-8 rounded hover:bg-surface-100 text-xs font-medium text-surface-600 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-100 text-surface-500 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-surface-100">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="py-2 text-center text-xs font-medium text-surface-400">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 flex-1 overflow-y-auto">
            {calendarDays.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayPosts = postsByDate[dateKey] || [];
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDay && isSameDay(day, selectedDay);

              return (
                <div
                  key={dateKey}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "min-h-[80px] p-1.5 border-b border-r border-surface-100 cursor-pointer transition-colors",
                    !isCurrentMonth && "bg-surface-50",
                    isSelected && "bg-brand-50",
                    isCurrentMonth && !isSelected && "hover:bg-surface-50"
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1",
                      isToday ? "bg-brand-600 text-white" : "text-surface-700",
                      !isCurrentMonth && "text-surface-300"
                    )}
                  >
                    {format(day, "d")}
                  </div>

                  {/* Posts indicators */}
                  <div className="space-y-0.5">
                    {dayPosts.slice(0, 3).map((post) => {
                      const Icon = PLATFORM_ICONS[post.platform];
                      return (
                        <div
                          key={post.id}
                          className={cn(
                            "flex items-center gap-1 px-1 py-0.5 rounded border text-2xs",
                            STATUS_COLORS[post.status] || STATUS_COLORS.pending
                          )}
                        >
                          {Icon && <Icon className="w-2.5 h-2.5 flex-shrink-0" />}
                          <span className="truncate">
                            {format(new Date(post.scheduled_at), "h:mm a")}
                          </span>
                        </div>
                      );
                    })}
                    {dayPosts.length > 3 && (
                      <div className="text-2xs text-surface-400 px-1">
                        +{dayPosts.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Detail */}
        {selectedDay && (
          <div className="w-72 flex-shrink-0 bg-white border border-surface-200 rounded-lg flex flex-col">
            <div className="p-4 border-b border-surface-100">
              <p className="text-sm font-semibold text-surface-900">
                {format(selectedDay, "EEEE, MMMM d")}
              </p>
              <p className="text-xs text-surface-400 mt-0.5">
                {selectedDayPosts.length} post{selectedDayPosts.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {selectedDayPosts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-surface-400 mb-3">No posts scheduled</p>
                  <Link href={`/dashboard/compose?brand_id=${selectedBrand !== "all" ? selectedBrand : ""}`}>
                    <Button size="xs" variant="outline" leftIcon={<Plus className="w-3 h-3" />}>
                      Add Post
                    </Button>
                  </Link>
                </div>
              ) : (
                selectedDayPosts.map((post) => {
                  const Icon = PLATFORM_ICONS[post.platform];
                  const config = PLATFORM_CONFIG[post.platform as Platform];
                  return (
                    <div
                      key={post.id}
                      className="p-3 border border-surface-200 rounded-lg"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center"
                          style={{ backgroundColor: config?.color + "20" }}
                        >
                          {Icon && (
                            <Icon
                              className="w-3.5 h-3.5"
                              style={{ color: config?.color }}
                            />
                          )}
                        </div>
                        <span className="text-xs font-medium text-surface-700 capitalize">
                          {post.platform}
                        </span>
                        <span className="ml-auto text-xs text-surface-400">
                          {format(new Date(post.scheduled_at), "h:mm a")}
                        </span>
                      </div>
                      {post.content_item?.caption && (
                        <p className="text-xs text-surface-600 line-clamp-3">
                          {post.content_item.caption}
                        </p>
                      )}
                      <div className="mt-2">
                        <Badge
                          variant={
                            post.status === "published"
                              ? "success"
                              : post.status === "failed"
                              ? "danger"
                              : "brand"
                          }
                          size="sm"
                          dot
                        >
                          {post.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
