"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatDate, formatNumber } from "@/lib/utils";

interface DataPoint {
  date: string;
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
}

interface EngagementChartProps {
  data: DataPoint[];
  metrics?: Array<"impressions" | "reach" | "engagement" | "likes" | "comments">;
}

const METRIC_CONFIG = {
  impressions: { color: "#3b82f6", label: "Impressions" },
  reach: { color: "#8b5cf6", label: "Reach" },
  engagement: { color: "#22c55e", label: "Engagement" },
  likes: { color: "#f59e0b", label: "Likes" },
  comments: { color: "#ef4444", label: "Comments" },
};

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white border border-surface-200 rounded-lg shadow-surface-md p-3 text-xs">
      <p className="font-medium text-surface-700 mb-2">
        {label ? formatDate(label, "MMM d, yyyy") : ""}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-surface-500">{entry.name}:</span>
          <span className="font-semibold text-surface-800">{formatNumber(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

export function EngagementChart({
  data,
  metrics = ["impressions", "reach", "engagement"],
}: EngagementChartProps) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            {metrics.map((metric) => (
              <linearGradient
                key={metric}
                id={`gradient-${metric}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={METRIC_CONFIG[metric].color}
                  stopOpacity={0.15}
                />
                <stop
                  offset="95%"
                  stopColor={METRIC_CONFIG[metric].color}
                  stopOpacity={0}
                />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => formatDate(d, "MMM d")}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatNumber}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "11px", color: "#64748b", paddingTop: "8px" }}
          />

          {metrics.map((metric) => (
            <Area
              key={metric}
              type="monotone"
              dataKey={metric}
              name={METRIC_CONFIG[metric].label}
              stroke={METRIC_CONFIG[metric].color}
              fill={`url(#gradient-${metric})`}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
