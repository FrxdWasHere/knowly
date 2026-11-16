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
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
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
  onBrowseMarketplace,
}: {
  theme?: ExamTheme;
  palette?: ExamPaletteId | "theme";
  /** the course or module colour, shown for the unstyled option */
  baseAccent?: string;
  baseLabel?: string;
  onTheme: (theme: ExamTheme) => void;
  onPalette: (palette: ExamPaletteId | "theme") => void;
  onBrowseMarketplace?: () => void;
}) {
  const activeTheme = EXAM_THEMES.find((item) => item.id === theme) ?? EXAM_THEMES[0]!;
  const choices = EXAM_PALETTES.filter((item) => THEME_PALETTES[activeTheme.id].includes(item.id));
  const activePalette = choices.find((item) => item.id === palette);

  return (
    <div className="space-y-3">
      {/* Theme display with marketplace button */}
      <div className="flex items-center gap-2 anim-fade-in">
        <div className="flex-1 min-w-0 transition-all duration-200 hover:shadow-sm">
          <div className="px-3 py-2 rounded-lg border border-border bg-muted/30 transition-all duration-200 hover:bg-muted/50">
            <p className="text-xs font-medium text-foreground truncate">{activeTheme.label}</p>
            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
              {activeTheme.description}
            </p>
          </div>
        </div>
        {onBrowseMarketplace && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBrowseMarketplace}
            className="flex-shrink-0 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12" />
            Browse
          </Button>
        )}
      </div>

      <Select
        value={activePalette?.id ?? "theme"}
        onValueChange={(value) => onPalette(value as ExamPaletteId | "theme")}
      >
        <SelectTrigger className="h-8 text-xs transition-all duration-200 hover:shadow-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72 anim-fade-up">
          <SelectItem value="theme">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-full border border-border transition-transform duration-200"
                style={{ backgroundColor: baseAccent || "#3b5bdb" }}
              />
              {baseLabel}
            </span>
          </SelectItem>
          {choices.map((item, idx) => (
            <SelectItem key={item.id} value={item.id}>
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full border border-border transition-transform duration-200"
                  style={{ backgroundColor: item.accent }}
                />
                {item.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <p className="text-[11px] leading-4 text-muted-foreground anim-fade-in" style={{ animationDelay: '0.1s' }}>
        {activeTheme.description} · {choices.length} palettes suit this theme.
      </p>
    </div>
  );
}
