import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Thin progress ring used across the spaced repetition UI. */
export function SrsRing({
  value,
  size = 44,
  stroke = 4,
  className,
  trackClassName,
  children,
  color = "var(--primary)",
}: {
  /** 0–100 */
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  trackClassName?: string;
  children?: ReactNode;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className={cn("stroke-secondary", trackClassName)}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: "stroke-dashoffset calc(0.7s / var(--speed, 1)) ease-out" }}
        />
      </svg>
      {children && (
        <span className="absolute inset-0 grid place-items-center text-[11px] font-semibold leading-none">
          {children}
        </span>
      )}
    </div>
  );
}
