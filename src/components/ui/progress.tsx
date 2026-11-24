import * as React from "react";

import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

/** A simple paper-style progress bar. */
const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const safeMax = max > 0 ? max : 100;
    const pct = Math.min(100, Math.max(0, (value / safeMax) * 100));
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={value}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full border border-border bg-surface-2",
          className,
        )}
        {...props}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  },
);
Progress.displayName = "Progress";

export { Progress };
