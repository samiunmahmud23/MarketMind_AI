"use client";

import { cn } from "@/lib/utils";

/**
 * BrandLogo — renders the brand logo.
 *
 * Sizes:
 * - "sm"  → 28px height (sidebar, mobile header)
 * - "md"  → 36px height (auth modal, landing nav)
 * - "lg"  → 48px height (landing hero)
 * - "xl"  → 64px height (welcome overlay, large displays)
 */
export function BrandLogo({
  size = "sm",
  className,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "h-7",
    md: "h-9",
    lg: "h-12",
    xl: "h-16",
  };

  return (
    <img
      src="/brand-logo.png"
      alt="MarketMind AI logo"
      className={cn("w-auto object-contain", sizes[size], className)}
      draggable={false}
    />
  );
}

/**
 * BrandLogoWithText — logo + brand text next to it.
 * Used in sidebar, nav bar, auth modal header.
 */
export function BrandLogoWithText({
  size = "sm",
  showText = true,
  subtitle,
  className,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  subtitle?: string;
  className?: string;
}) {
  const textSizes = {
    sm: "text-[14px]",
    md: "text-[15px]",
    lg: "text-lg",
    xl: "text-xl",
  };

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandLogo size={size} />
      {showText && (
        <div className="leading-tight">
          <div className={cn("font-semibold tracking-tight", textSizes[size])}>
            MarketMind AI
          </div>
          {subtitle && (
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium">
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
