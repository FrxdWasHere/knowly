import {
  formatInterval,
  GRADE_META,
  previewInterval,
  type SrsCard,
  type SrsConfig,
  type SrsGrade,
} from "@/lib/srs";
import { cn } from "@/lib/utils";

/** The four spaced-repetition grade buttons, with next-interval previews. */
export function GradeButtons({
  card,
  onGrade,
  config,
  className,
}: {
  card: SrsCard | undefined;
  onGrade: (grade: SrsGrade) => void;
  /** scheduler tuning, so previews match what will be scheduled */
  config?: Partial<SrsConfig>;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2 sm:grid-cols-4", className)}>
      {GRADE_META.map((g) => (
        <button
          key={g.id}
          type="button"
          onClick={() => onGrade(g.id)}
          className={cn(
            "press group min-h-[44px] rounded-xl border px-3 py-3 text-left transition-all hover:-translate-y-0.5",
            g.className,
          )}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{g.label}</span>
            <kbd className="hidden rounded border border-current/30 px-1 text-[10px] opacity-60 sm:inline">
              {g.key}
            </kbd>
          </span>
          <span className="mt-1 block text-[11px] opacity-75">{g.hint}</span>
          <span className="mt-1 block font-mono text-[11px] font-semibold">
            {formatInterval(previewInterval(card, g.id, config))}
          </span>
        </button>
      ))}
    </div>
  );
}
