import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "brand" | "surface";
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  size = "sm",
  dot = false,
  className,
}: BadgeProps) {
  const variants = {
    default: "bg-surface-100 text-surface-700 border border-surface-200",
    success: "bg-success-50 text-success-600 border border-success-500/20",
    warning: "bg-warning-50 text-warning-600 border border-warning-500/20",
    danger: "bg-danger-50 text-danger-600 border border-danger-500/20",
    brand: "bg-brand-50 text-brand-700 border border-brand-200",
    surface: "bg-surface-100 text-surface-600 border border-surface-200",
  };

  const dotColors = {
    default: "bg-surface-400",
    success: "bg-success-500",
    warning: "bg-warning-500",
    danger: "bg-danger-500",
    brand: "bg-brand-500",
    surface: "bg-surface-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        variants[variant],
        className
      )}
    >
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotColors[variant])} />
      )}
      {children}
    </span>
  );
}
