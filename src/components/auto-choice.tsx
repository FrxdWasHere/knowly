import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The "let the AI choose" choice offered by every prompt-forge option.
 *
 * When it is active the forge drops that option's fixed value from the
 * instructions and asks the AI to pick whatever suits the material instead.
 */
export function AutoChoice({
  active,
  onToggle,
  className,
}: {
  active: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground",
        className,
      )}
    >
      <Sparkles className="size-3.5" aria-hidden />
      Whatever you see fit
    </button>
  );
}
