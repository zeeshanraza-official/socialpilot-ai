import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

interface MetricsCardProps {
  label: string;
  value: number | string;
  change?: number;
  icon?: React.ReactNode;
  format?: "number" | "percentage" | "raw";
}

export function MetricsCard({
  label,
  value,
  change,
  icon,
  format = "number",
}: MetricsCardProps) {
  const displayValue =
    format === "number" ? formatNumber(Number(value))
    : format === "percentage" ? `${value}%`
    : String(value);

  const changeDirection =
    change === undefined ? null
    : change > 0 ? "up"
    : change < 0 ? "down"
    : "flat";

  return (
    <div className="bg-white border border-surface-200 rounded-lg p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-surface-500">{label}</p>
          <p className="text-2xl font-semibold text-surface-900 mt-1">{displayValue}</p>

          {changeDirection !== null && (
            <div
              className={cn(
                "flex items-center gap-1 mt-2 text-xs font-medium",
                changeDirection === "up" && "text-success-600",
                changeDirection === "down" && "text-danger-600",
                changeDirection === "flat" && "text-surface-400"
              )}
            >
              {changeDirection === "up" && <ArrowUp className="w-3 h-3" />}
              {changeDirection === "down" && <ArrowDown className="w-3 h-3" />}
              {changeDirection === "flat" && <Minus className="w-3 h-3" />}
              {Math.abs(change!).toFixed(1)}%
              <span className="text-surface-400 font-normal">vs last period</span>
            </div>
          )}
        </div>

        {icon && (
          <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
