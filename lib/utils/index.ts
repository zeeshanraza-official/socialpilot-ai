import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import type { Platform } from "@/types";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string, fmt = "MMM d, yyyy"): string {
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return dateStr;
  }
}

export function formatRelativeDate(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function formatDatetime(dateStr: string): string {
  return formatDate(dateStr, "MMM d, yyyy 'at' h:mm a");
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatEngagementRate(rate: number | null): string {
  if (rate === null || rate === undefined) return "N/A";
  return `${(rate * 100).toFixed(2)}%`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + "...";
}

export const PLATFORM_CONFIG: Record<
  Platform,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: string;
    maxCaption: number;
    maxHashtags: number;
    supportsImages: boolean;
    supportsVideos: boolean;
    supportsCarousel: boolean;
  }
> = {
  facebook: {
    label: "Facebook",
    color: "#1877F2",
    bgColor: "#EBF3FF",
    icon: "facebook",
    maxCaption: 63206,
    maxHashtags: 30,
    supportsImages: true,
    supportsVideos: true,
    supportsCarousel: false,
  },
  instagram: {
    label: "Instagram",
    color: "#E1306C",
    bgColor: "#FFF0F5",
    icon: "instagram",
    maxCaption: 2200,
    maxHashtags: 30,
    supportsImages: true,
    supportsVideos: true,
    supportsCarousel: true,
  },
  linkedin: {
    label: "LinkedIn",
    color: "#0A66C2",
    bgColor: "#EEF4FB",
    icon: "linkedin",
    maxCaption: 3000,
    maxHashtags: 5,
    supportsImages: true,
    supportsVideos: true,
    supportsCarousel: false,
  },
  youtube: {
    label: "YouTube",
    color: "#FF0000",
    bgColor: "#FFF5F5",
    icon: "youtube",
    maxCaption: 5000,
    maxHashtags: 15,
    supportsImages: false,
    supportsVideos: true,
    supportsCarousel: false,
  },
};

export const CONTENT_STATUS_CONFIG = {
  draft: { label: "Draft", color: "surface" },
  pending_review: { label: "Pending Review", color: "warning" },
  approved: { label: "Approved", color: "success" },
  rejected: { label: "Rejected", color: "danger" },
  scheduled: { label: "Scheduled", color: "brand" },
  publishing: { label: "Publishing", color: "brand" },
  published: { label: "Published", color: "success" },
  failed: { label: "Failed", color: "danger" },
  paused: { label: "Paused", color: "warning" },
} as const;

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseHashtags(text: string): string[] {
  const matches = text.match(/#(\w+)/g);
  if (!matches) return [];
  return matches.map((h) => h.substring(1));
}

export function buildCaptionWithHashtags(
  caption: string,
  hashtags: string[]
): string {
  if (hashtags.length === 0) return caption;
  return `${caption}\n\n${hashtags.map((h) => `#${h}`).join(" ")}`;
}
