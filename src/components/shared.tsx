"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================================
   PREMIUM SHARED COMPONENTS
   ============================================================ */

/**
 * GlassCard — glassmorphic container with soft blur + hairline border.
 * Use `hover` prop for the premium lift-on-hover effect.
 */
export function GlassCard({
  children,
  className,
  hover = false,
  strong = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean; strong?: boolean }) {
  return (
    <div
      className={cn(
        strong ? "glass-strong" : "glass",
        "rounded-2xl shadow-ambient",
        hover && "card-hover cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * ScoreRing — animated circular progress with premium gradient stroke.
 */
export function ScoreRing({
  value,
  size = 120,
  stroke = 10,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  const color =
    v >= 75
      ? "oklch(0.72 0.19 160)"
      : v >= 50
      ? "oklch(0.75 0.18 80)"
      : "oklch(0.65 0.20 25)";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tracking-tight tabular-nums" style={{ color }}>
          {Math.round(v)}
        </span>
        {label && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5 font-medium">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * ScoreBar — slim progress bar with smooth animation.
 */
export function ScoreBar({
  label,
  value,
  max = 100,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  const v = Math.max(0, Math.min(max, value));
  const pct = (v / max) * 100;
  const color =
    pct >= 75
      ? "from-emerald-500 to-teal-500"
      : pct >= 50
      ? "from-amber-500 to-orange-500"
      : "from-rose-500 to-red-500";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-semibold tabular-nums text-foreground">{Math.round(v)}<span className="text-muted-foreground">/{max}</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * SeverityBadge — refined pill badge for issue severity.
 */
export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { cls: string; label: string; dot: string }> = {
    critical: { cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20", label: "Critical", dot: "bg-rose-500" },
    warning: { cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", label: "Warning", dot: "bg-amber-500" },
    info: { cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20", label: "Info", dot: "bg-sky-500" },
  };
  const m = map[severity] || map.info;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider", m.cls)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

/**
 * CopyButton — premium ghost button with copy icon.
 */
export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          const { toast } = await import("sonner");
          toast.success("Copied to clipboard");
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // ignore
        }
      }}
      className={cn(
        "btn-press inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/50 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
        className
      )}
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/**
 * EmptyState — premium centered greeting with optional quick-start chips.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  chips,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  chips?: { label: string; onClick: () => void }[];
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 px-8 py-16 text-center animate-fade-in-up">
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 text-primary ring-1 ring-primary/10">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">{description}</p>
      )}
      {chips && chips.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {chips.map((chip, i) => (
            <button
              key={i}
              onClick={chip.onClick}
              className="btn-press rounded-full border border-border bg-background/50 px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground transition-all"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/**
 * ErrorState — elegant wrapper for API/fetch failures. Explains what happened
 * and offers a one-click retry so the user can re-invoke the agent/request.
 */
export function ErrorState({
  title = "Couldn't load this",
  description = "The request didn't go through. This is usually transient — give it another try.",
  onRetry,
  retrying = false,
  retryLabel = "Try again",
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retrying?: boolean;
  retryLabel?: string;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-8 py-14 text-center animate-fade-in-up"
      style={{
        borderColor: "color-mix(in oklch, var(--destructive) 30%, transparent)",
        background: "color-mix(in oklch, var(--destructive) 5%, transparent)",
      }}
    >
      <div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: "color-mix(in oklch, var(--destructive) 12%, transparent)", color: "var(--destructive)" }}
      >
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={retrying}
          className="btn-press mt-6 inline-flex items-center gap-2 rounded-xl border border-border bg-background/60 px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
        >
          {retrying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
          {retryLabel}
        </button>
      )}
    </div>
  );
}

/**
 * ShimmerSkeleton — premium shimmer loader (replaces basic Skeleton).
 */
export function ShimmerSkeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-lg", className)} />;
}

/**
 * StatCard — premium glass stat card with icon + value + label.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  bg: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="glass card-hover group w-full text-left rounded-2xl p-5 shadow-ambient"
    >
      <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110", bg, color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 text-3xl font-bold tracking-tight tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground font-medium mt-1">{label}</div>
    </button>
  );
}

/**
 * SectionHeading — consistent section title with optional action.
 */
export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * SectionLoader — premium staggered skeleton for section-level loading.
 * Shows shimmer cards that match the glassmorphic design.
 */
export function SectionLoader({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass rounded-2xl p-5 shadow-ambient">
          <div className="flex items-center gap-3">
            <ShimmerSkeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <ShimmerSkeleton className="h-4 w-1/3" />
              <ShimmerSkeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <ShimmerSkeleton className="h-3 w-full" />
            <ShimmerSkeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * QuickStartChips — clickable prompt chips for empty states.
 * Renders a row of chips that navigate to relevant sections.
 */
export function QuickStartChips({ chips }: { chips: { label: string; onClick: () => void; icon?: React.ElementType }[] }) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      {chips.map((chip, i) => {
        const Icon = chip.icon;
        return (
          <button
            key={i}
            onClick={chip.onClick}
            className="btn-press group inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-4 py-2 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground transition-all"
          >
            {Icon && <Icon className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />}
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * ProgressBar — animated progress bar with label + percentage.
 */
export function ProgressBar({ value, max = 100, label, color }: { value: number; max?: number; label?: string; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">{label}</span>
          <span className="font-semibold tabular-nums">{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-1000 ease-out", color || "bg-gradient-to-r from-primary to-emerald-400")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * IconButton — premium icon-only button with hover + press feedback.
 */
export function IconButton({
  icon: Icon,
  onClick,
  label,
  variant = "ghost",
  className,
  disabled,
}: {
  icon: React.ElementType;
  onClick?: () => void;
  label: string;
  variant?: "ghost" | "solid" | "outline";
  className?: string;
  disabled?: boolean;
}) {
  const variants = {
    ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
    solid: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-border bg-background/50 hover:bg-muted",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "btn-press inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/**
 * FadeIn — wrapper that adds a staggered fade-in-up entrance.
 */
export function FadeIn({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <div className={cn("animate-fade-in-up", className)} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
