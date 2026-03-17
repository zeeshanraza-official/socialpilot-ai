"use client";

import { useState, useEffect } from "react";
import {
  Eye, Users, Heart, MessageCircle, Share2, Bookmark,
  BarChart2, TrendingUp, TrendingDown, Facebook, Instagram,
  Linkedin, Youtube,
} from "lucide-react";
import { MetricsCard } from "@/components/analytics/metrics-card";
import { EngagementChart } from "@/components/analytics/engagement-chart";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

interface Brand {
  id: string;
  name: string;
  color: string;
}

interface AnalyticsData {
  summary: {
    impressions: number;
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    clicks: number;
    video_views: number;
    follower_change: number;
    posts_count: number;
    engagement_rate: number;
  };
  timeline: Array<{
    date: string;
    impressions: number;
    reach: number;
    engagement: number;
    likes: number;
    comments: number;
  }>;
  platform_breakdown: Record<string, {
    impressions: number;
    reach: number;
    engagement: number;
    posts: number;
  }>;
  top_posts: Array<{
    id: string;
    platform: string;
    impressions: number;
    scheduled_post?: {
      platform_post_url?: string;
      content_item?: { caption?: string; title?: string };
    };
  }>;
}

interface AnalyticsPageClientProps {
  brands: Brand[];
  initialBrandId?: string;
}

const DATE_RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
};

export function AnalyticsPageClient({ brands, initialBrandId }: AnalyticsPageClientProps) {
  const [selectedBrand, setSelectedBrand] = useState(initialBrandId || brands[0]?.id || "");
  const [dateRange, setDateRange] = useState(30);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAnalytics = async () => {
    if (!selectedBrand) return;
    setLoading(true);
    try {
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const res = await fetch(
        `/api/analytics?brand_id=${selectedBrand}&start_date=${startDate}&end_date=${endDate}`
      );
      const json = await res.json();
      if (res.ok) setAnalytics(json.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [selectedBrand, dateRange]);

  const summary = analytics?.summary;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-surface-900">Analytics</h2>
          <p className="text-sm text-surface-500 mt-0.5">
            Performance insights for your content
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Brand */}
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="h-9 px-3 rounded border border-surface-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {/* Date Range */}
          <div className="flex gap-0.5 bg-surface-100 rounded p-0.5">
            {DATE_RANGES.map((range) => (
              <button
                key={range.label}
                onClick={() => setDateRange(range.days)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  dateRange === range.days
                    ? "bg-white text-surface-900 shadow-surface-sm"
                    : "text-surface-500 hover:text-surface-700"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricsCard
          label="Impressions"
          value={summary?.impressions || 0}
          icon={<Eye className="w-5 h-5" />}
        />
        <MetricsCard
          label="Reach"
          value={summary?.reach || 0}
          icon={<Users className="w-5 h-5" />}
        />
        <MetricsCard
          label="Engagement Rate"
          value={`${summary?.engagement_rate?.toFixed(2) || 0}%`}
          format="raw"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <MetricsCard
          label="Follower Change"
          value={summary?.follower_change || 0}
          icon={
            (summary?.follower_change || 0) >= 0
              ? <TrendingUp className="w-5 h-5" />
              : <TrendingDown className="w-5 h-5" />
          }
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricsCard label="Likes" value={summary?.likes || 0} icon={<Heart className="w-5 h-5" />} />
        <MetricsCard label="Comments" value={summary?.comments || 0} icon={<MessageCircle className="w-5 h-5" />} />
        <MetricsCard label="Shares" value={summary?.shares || 0} icon={<Share2 className="w-5 h-5" />} />
        <MetricsCard label="Saves" value={summary?.saves || 0} icon={<Bookmark className="w-5 h-5" />} />
      </div>

      {/* Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Over Time</CardTitle>
        </CardHeader>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full" />
          </div>
        ) : analytics?.timeline && analytics.timeline.length > 0 ? (
          <EngagementChart data={analytics.timeline} />
        ) : (
          <div className="h-64 flex items-center justify-center text-sm text-surface-400">
            No data for selected period
          </div>
        )}
      </Card>

      {/* Platform Breakdown */}
      {analytics?.platform_breakdown && (
        <Card>
          <CardHeader>
            <CardTitle>Platform Breakdown</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(analytics.platform_breakdown).map(([platform, data]) => {
              const Icon = PLATFORM_ICONS[platform];
              return (
                <div key={platform} className="p-4 border border-surface-100 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    {Icon && <Icon className="w-4 h-4 text-surface-500" />}
                    <span className="text-sm font-medium text-surface-700 capitalize">
                      {platform}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-surface-500">Impressions</span>
                      <span className="font-medium">{formatNumber(data.impressions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-500">Reach</span>
                      <span className="font-medium">{formatNumber(data.reach)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-500">Engagement</span>
                      <span className="font-medium">{formatNumber(data.engagement)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-500">Posts</span>
                      <span className="font-medium">{data.posts}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
