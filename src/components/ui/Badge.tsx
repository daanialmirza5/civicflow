import { cn } from "@/lib/utils";

const VARIANTS = {
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  danger: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  info: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
} as const;

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", VARIANTS[variant], className)}>
      {children}
    </span>
  );
}
