import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* Paper buttons: an ink rule, a hard offset shadow, and a lift on hover.
 * No gradients and no glow — the shadow is the only depth cue.
 *
 * Sizes come from the shared control ladder in styles.css
 * (--control-h-* / --control-px-* / --control-fs-*). That keeps every button,
 * input and select on one rhythm, gives touch screens a taller target, and
 * lets Settings > Button size shift the whole ladder in one place. */
const buttonVariants = cva(
  "inline-flex min-w-0 max-w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-border text-center font-bold leading-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:border-[3px] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--shadow-ink)] hover:bg-primary-hover hover:shadow-[4px_4px_0_0_var(--shadow-ink)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none sm:shadow-[3px_3px_0_0_var(--shadow-ink)] sm:hover:-translate-x-0.5 sm:hover:-translate-y-0.5 sm:hover:shadow-[5px_5px_0_0_var(--shadow-ink)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[2px_2px_0_0_var(--shadow-ink)] hover:bg-destructive-hover hover:shadow-[4px_4px_0_0_var(--shadow-ink)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none sm:shadow-[3px_3px_0_0_var(--shadow-ink)] sm:hover:-translate-x-0.5 sm:hover:-translate-y-0.5 sm:hover:shadow-[5px_5px_0_0_var(--shadow-ink)]",
        outline:
          "bg-surface text-foreground shadow-[2px_2px_0_0_var(--shadow-ink)] hover:shadow-[4px_4px_0_0_var(--shadow-ink)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 sm:shadow-[3px_3px_0_0_var(--shadow-ink)] sm:hover:-translate-x-0.5 sm:hover:-translate-y-0.5 sm:hover:shadow-[5px_5px_0_0_var(--shadow-ink)] hover:bg-block-lemon hover:text-ink hover:border-ink",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-surface-hover hover:text-foreground",
        ghost:
          "border-transparent bg-transparent text-foreground hover:border-border hover:bg-surface-hover",
        link: "border-transparent text-primary underline-offset-4 hover:text-primary-hover hover:underline",
      },
      size: {
        default:
          "min-h-[var(--control-h)] px-[var(--control-px)] py-2 [font-size:var(--control-fs)]",
        sm: "min-h-[var(--control-h-sm)] rounded-lg px-[var(--control-px-sm)] py-1.5 [font-size:var(--control-fs-sm)]",
        lg: "min-h-[var(--control-h-lg)] px-[var(--control-px-lg)] py-2.5 [font-size:var(--control-fs-lg)]",
        icon: "size-[var(--control-icon)] shrink-0 p-0",
      },
      defaultVariants: {
        variant: "default",
        size: "default",
      },
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  // Explicit defaults: a missing `size`/`variant` must never mean "no classes"
  // (an unstyled button has no fill, no padding and no hover state).
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        data-knowly-btn=""
        data-size={size ?? "default"}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
