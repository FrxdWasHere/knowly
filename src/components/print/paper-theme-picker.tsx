import {
  EXAM_PALETTES,
  EXAM_THEMES,
  THEME_PALETTES,
  type ExamPaletteId,
  type ExamTheme,
} from "@/lib/exam-print";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Same document themes and palettes as the exam builder, shared with the
 * module and course print panels. A theme changes the paper, a palette changes
 * the ink; "theme" keeps the pack's own course/module colour.
 */
export function PaperThemePicker({
  theme,
  palette,
  baseAccent,
  baseLabel = "Theme default",
  onTheme,
  onPalette,
}: {
  theme?: ExamTheme;
  palette?: ExamPaletteId | "theme";
  /** the course or module colour, shown for the unstyled option */
  baseAccent?: string;
  baseLabel?: string;
  onTheme: (theme: ExamTheme) => void;
  onPalette: (palette: ExamPaletteId | "theme") => void;
}) {
  const activeTheme = EXAM_THEMES.find((item) => item.id === theme) ?? EXAM_THEMES[0]!;
  const choices = EXAM_PALETTES.filter((item) => THEME_PALETTES[activeTheme.id].includes(item.id));
  const activePalette = choices.find((item) => item.id === palette);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {EXAM_THEMES.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.description}
            aria-pressed={item.id === activeTheme.id}
            onClick={() => {
              const keep =
                palette && palette !== "theme" && THEME_PALETTES[item.id].includes(palette);
              onTheme(item.id);
              if (!keep) onPalette("theme");
            }}
            className={cn(
              "press flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] font-medium transition-colors",
              item.id === activeTheme.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            <span
              aria-hidden
              className="size-3.5 shrink-0 rounded-full border"
              style={{
                backgroundImage: `linear-gradient(135deg, ${item.soft}, ${item.accent})`,
                borderColor: item.border,
              }}
            />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>

      <Select
        value={activePalette?.id ?? "theme"}
        onValueChange={(value) => onPalette(value as ExamPaletteId | "theme")}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value="theme">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-full border border-border"
                style={{ backgroundColor: baseAccent || "#3b5bdb" }}
              />
              {baseLabel}
            </span>
          </SelectItem>
          {choices.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: item.accent }}
                />
                {item.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <p className="text-[11px] leading-4 text-muted-foreground">
        {activeTheme.description} · {choices.length} palettes suit this theme.
      </p>
    </div>
  );
}
