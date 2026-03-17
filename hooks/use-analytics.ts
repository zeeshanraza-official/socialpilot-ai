"use client";

import { useQuery } from "@tanstack/react-query";

interface AnalyticsFilter {
  brand_id: string;
  start_date?: string;
  end_date?: string;
  platform?: string;
}

async function fetchAnalytics(filter: AnalyticsFilter) {
  const params = new URLSearchParams({ brand_id: filter.brand_id });
  if (filter.start_date) params.set("start_date", filter.start_date);
  if (filter.end_date) params.set("end_date", filter.end_date);
  if (filter.platform) params.set("platform", filter.platform);

  const res = await fetch(`/api/analytics?${params}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export function useAnalytics(filter: AnalyticsFilter) {
  return useQuery({
    queryKey: ["analytics", filter],
    queryFn: () => fetchAnalytics(filter),
    enabled: !!filter.brand_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
