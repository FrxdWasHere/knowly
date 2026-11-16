import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Check, Search, Sparkles, X } from "lucide-react";
import { EXAM_THEMES, THEME_PALETTES, type ExamPaletteId, type ExamTheme } from "@/lib/exam-print";
import {
  THEME_CATEGORIES,
  THEME_CONFIGS,
  type HeroLayout,
  type PrintDocumentType,
  type ThemeConfig,
} from "@/lib/print-themes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { luminance } from "@/lib/themes";
import { cn } from "@/lib/utils";

interface PreviewTheme {
  id: ExamTheme;
  accent: string;
  soft: string;
  border: string;
}

/**
 * The page wash for a theme, painted with CSS background layers on one HTML
 * element. These mirror the miniature versions of `.paper-skin.paper-theme-*`
 * in styles.css, so a card looks like the sheet the theme actually prints.
 */
function themePreviewWash(theme: PreviewTheme): CSSProperties {
  const { id, accent, soft, border } = theme;
  const tint = (pct: number) => `color-mix(in srgb, ${accent} ${pct}%, transparent)`;
  const rule = (pct: number) => `color-mix(in srgb, ${border} ${pct}%, transparent)`;
  const fade = `linear-gradient(180deg, ${soft}, #ffffff 62%)`;
  const dots = (color: string) => `radial-gradient(${color} 1px, transparent 1.2px)`;
  const hatch = (color: string, gap = 8) =>
    `repeating-linear-gradient(45deg, transparent 0 ${gap}px, ${color} ${gap}px ${gap + 1.5}px)`;

  switch (id) {
    case "classic":
    case "minimalist":
      return { backgroundImage: fade };

    case "module":
      return {
        backgroundImage: `radial-gradient(ellipse at 100% 0, ${tint(15)}, transparent 58%), ${fade}`,
      };

    case "field-notes":
      return {
        backgroundColor: soft,
        backgroundImage: `repeating-linear-gradient(180deg, transparent 0 9px, ${rule(34)} 9px 10px)`,
      };

    case "lab-report":
      return {
        backgroundImage: `linear-gradient(${rule(22)} 1px, transparent 1px), linear-gradient(90deg, ${rule(22)} 1px, transparent 1px), ${fade}`,
        backgroundSize: "9px 9px, 9px 9px, auto",
      };

    case "workbook":
      return { backgroundImage: `linear-gradient(90deg, ${soft}, #ffffff 36%)` };

    case "blueprint":
      return {
        backgroundImage: `linear-gradient(${tint(12)} 1px, transparent 1px), linear-gradient(90deg, ${tint(12)} 1px, transparent 1px), ${fade}`,
        backgroundSize: "6px 6px, 6px 6px, auto",
      };

    case "manuscript":
      return {
        backgroundColor: "#fdf8ec",
        backgroundImage: `radial-gradient(circle at 8% 4%, ${tint(18)}, transparent 42%), radial-gradient(circle at 94% 96%, ${tint(12)}, transparent 44%)`,
      };

    case "newspaper":
      return { backgroundImage: `linear-gradient(180deg, ${soft}, #ffffff 58%)` };

    case "comic":
      return {
        backgroundImage: `${dots(tint(22))}, ${fade}`,
        backgroundSize: "5px 5px, auto",
      };

    case "botanical":
      return {
        backgroundImage: `radial-gradient(ellipse at 0 0, ${tint(16)}, transparent 46%), radial-gradient(ellipse at 100% 100%, ${tint(10)}, transparent 48%), ${fade}`,
      };

    case "terminal":
      return {
        backgroundColor: soft,
        backgroundImage: `repeating-linear-gradient(0deg, ${tint(12)} 0 1px, transparent 1px 5px)`,
      };

    case "retro":
      return {
        backgroundImage: `${dots(rule(18))}, linear-gradient(96deg, ${soft}, #ffffff 62%)`,
        backgroundSize: "4px 4px, auto",
      };

    case "neon":
      return { backgroundImage: `linear-gradient(135deg, ${soft}, #1a1a2e)` };

    case "watercolor":
      return {
        backgroundColor: soft,
        backgroundImage: `radial-gradient(ellipse at 22% 16%, ${tint(12)}, transparent 52%), radial-gradient(ellipse at 84% 78%, ${tint(10)}, transparent 52%)`,
      };

    case "leather":
      return {
        backgroundImage: `repeating-linear-gradient(90deg, ${rule(12)} 0 1px, transparent 1px 4px), linear-gradient(165deg, ${soft}, #ddc7ae)`,
      };

    case "chalkboard":
      return {
        backgroundColor: soft,
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.04) 0 1px, transparent 1px 4px)",
      };

    case "denim":
      return {
        backgroundImage: `repeating-linear-gradient(0deg, ${rule(12)} 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, ${rule(10)} 0 1px, transparent 1px 3px), ${fade}`,
      };

    case "marble":
      return {
        backgroundImage: `radial-gradient(ellipse at 30% 38%, ${rule(18)}, transparent 62%), radial-gradient(ellipse at 72% 62%, ${rule(12)}, transparent 62%), linear-gradient(160deg, ${soft}, #ffffff)`,
      };

    case "vintage-map":
      return {
        backgroundImage: `repeating-linear-gradient(0deg, ${tint(16)} 0 1px, transparent 1px 7px), ${fade}`,
      };

    case "forest-green":
      return {
        backgroundImage: `repeating-linear-gradient(90deg, ${rule(14)} 0 1px, transparent 1px 5px), ${fade}`,
      };

    case "sunset":
      return { backgroundImage: `linear-gradient(140deg, ${soft}, ${accent} 58%, #4c1d95)` };

    case "ocean":
      return {
        backgroundImage: `repeating-linear-gradient(0deg, ${rule(20)} 0 1px, transparent 1px 6px), ${fade}`,
      };

    case "desert":
      return {
        backgroundImage: `repeating-linear-gradient(0deg, ${rule(18)} 0 1px, transparent 1px 8px), linear-gradient(180deg, ${soft}, #ffffff 64%)`,
      };

    case "arctic":
      return {
        backgroundColor: soft,
        backgroundImage: `${dots(tint(14))}, linear-gradient(180deg, #ffffff, ${soft})`,
        backgroundSize: "6px 6px, auto",
      };

    case "autumn":
      return {
        backgroundImage: `${dots(rule(18))}, linear-gradient(165deg, ${soft}, #ffffff)`,
        backgroundSize: "5px 5px, auto",
      };

    case "cherry-blossom":
      return {
        backgroundImage: `radial-gradient(ellipse at 16% 20%, ${tint(14)}, transparent 52%), radial-gradient(ellipse at 82% 76%, ${tint(10)}, transparent 54%), ${fade}`,
      };

    case "concrete":
      return {
        backgroundImage: `${dots(rule(18))}, ${fade}`,
        backgroundSize: "7px 7px, auto",
      };

    case "gold-leaf":
      return {
        backgroundImage: `radial-gradient(circle at 10% 10%, ${tint(18)}, transparent 46%), radial-gradient(circle at 90% 90%, ${tint(12)}, transparent 48%), ${fade}`,
      };

    case "indigo":
      return {
        backgroundImage: `${dots(rule(16))}, ${fade}`,
        backgroundSize: "6px 6px, auto",
      };

    case "coral":
      return {
        backgroundImage: `radial-gradient(circle at 22% 30%, ${rule(14)}, transparent 52%), radial-gradient(circle at 76% 70%, ${rule(10)}, transparent 52%), linear-gradient(165deg, ${soft}, #ffffff)`,
      };

    case "sage":
      return { backgroundImage: `${hatch(rule(16))}, ${fade}` };

    case "charcoal":
      return {
        backgroundImage: `repeating-linear-gradient(0deg, ${rule(12)} 0 1px, transparent 1px 3px), ${fade}`,
      };

    case "mint":
      return {
        backgroundImage: `radial-gradient(circle at 0 52%, ${tint(12)}, transparent 52%), radial-gradient(circle at 100% 28%, ${tint(10)}, transparent 50%), ${fade}`,
      };

    case "burnt-sienna":
      return {
        backgroundImage: `repeating-linear-gradient(90deg, ${rule(12)} 0 1px, transparent 1px 6px), linear-gradient(175deg, ${soft}, #ffffff)`,
      };

    default:
      return { backgroundImage: fade };
  }
}

/**
 * A miniature sheet drawn entirely with HTML elements: the theme's wash, a
 * masthead, three question rows and a footer rule. Dark themes print light ink,
 * so nothing turns invisible.
 */
function ThemePreview({ theme }: { theme: PreviewTheme }) {
  const dark = luminance(theme.soft) < 0.28;
  const ink = dark ? "rgba(248, 250, 252, 0.62)" : "rgba(24, 32, 42, 0.5)";
  const rule = dark ? "rgba(248, 250, 252, 0.32)" : "rgba(24, 32, 42, 0.22)";

  return (
    <span
      aria-hidden
      className="relative block h-full w-full overflow-hidden bg-white"
      style={themePreviewWash(theme)}
    >
      {/* the printed sheet's accent edge */}
      <span
        className="absolute inset-x-0 top-0 block"
        style={{ height: 3, backgroundColor: theme.accent }}
      />

      <span className="flex h-full w-full flex-col" style={{ padding: "10% 8% 8%" }}>
        {/* masthead */}
        <span
          className="block rounded-[1px]"
          style={{ height: 6, width: "74%", backgroundColor: theme.accent, opacity: 0.9 }}
        />
        <span
          className="block"
          style={{ marginTop: 4, height: 2, width: "46%", backgroundColor: rule }}
        />
        <span
          className="mt-[7px] block"
          style={{ height: 1, width: "100%", backgroundColor: rule }}
        />

        {/* question rows, spread down the sheet like a real page */}
        <span className="flex flex-1 flex-col justify-evenly">
          {[0, 1, 2].map((row) => (
            <span key={row} className="block">
              <span className="flex items-start gap-1">
                <span
                  className="block shrink-0 rounded-full"
                  style={{
                    marginTop: 1,
                    height: 3,
                    width: 3,
                    backgroundColor: theme.accent,
                    opacity: 0.85,
                  }}
                />
                <span
                  className="block"
                  style={{ height: 3, width: `${82 - row * 10}%`, backgroundColor: ink }}
                />
              </span>
              <span
                className="block"
                style={{
                  marginTop: 5,
                  height: 2,
                  width: `${94 - row * 8}%`,
                  backgroundColor: rule,
                }}
              />
              <span
                className="block"
                style={{
                  marginTop: 4,
                  height: 2,
                  width: `${64 - row * 6}%`,
                  backgroundColor: rule,
                }}
              />
            </span>
          ))}
        </span>

        {/* footer rule */}
        <span
          className="mt-auto block"
          style={{ height: 2, width: "32%", backgroundColor: rule }}
        />
      </span>
    </span>
  );
}

interface PrintMarketplaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTheme: (themeId: ExamTheme, palette?: ExamPaletteId) => void;
  documentType?: PrintDocumentType;
  currentTheme?: ExamTheme;
  /** Hero size chosen in the studio; shown as information, never used to hide a theme. */
  heroLayout?: HeroLayout;
}

const DOCUMENT_LABELS: Record<PrintDocumentType, { singular: string; plural: string }> = {
  course: { singular: "course pack", plural: "Courses" },
  exam: { singular: "exam paper", plural: "Exams" },
  module: { singular: "study sheet", plural: "Modules" },
};

const LAYOUT_LABELS: Record<HeroLayout, string> = {
  page: "Full cover page",
  compact: "Compact hero",
};

const chipClass = (active: boolean) =>
  cn(
    "press flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
    active
      ? "border-primary bg-primary/15 text-foreground"
      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
  );

export function PrintMarketplace({
  open,
  onOpenChange,
  onSelectTheme,
  documentType = "exam",
  currentTheme,
  heroLayout,
}: PrintMarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ThemeConfig["category"] | null>(null);
  const [previewThemeId, setPreviewThemeId] = useState<ExamTheme | null>(null);

  // Every visit starts from a clean slate: stale filters used to reopen the
  // dialog on an empty grid.
  useEffect(() => {
    if (open) return;
    setSearchQuery("");
    setSelectedCategory(null);
    setPreviewThemeId(null);
  }, [open]);

  const themes = useMemo(() => Object.values(THEME_CONFIGS), []);

  const categoryCounts = useMemo(() => {
    const counts = new Map<ThemeConfig["category"], number>();
    for (const theme of themes) counts.set(theme.category, (counts.get(theme.category) ?? 0) + 1);
    return counts;
  }, [themes]);

  /**
   * Search and category are the only filters. A theme prints for every
   * document type and both hero sizes, so the studio's document and layout can
   * never remove themes from this list.
   */
  const filteredThemes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return themes.filter((theme) => {
      if (selectedCategory && theme.category !== selectedCategory) return false;
      if (!query) return true;
      return [theme.label, theme.description, theme.category, ...theme.mood].some((value) =>
        value.toLowerCase().includes(query),
      );
    });
  }, [themes, searchQuery, selectedCategory]);

  const previewTheme = previewThemeId ? THEME_CONFIGS[previewThemeId] : null;
  const previewExamTheme = previewThemeId
    ? (EXAM_THEMES.find((theme) => theme.id === previewThemeId) ?? null)
    : null;
  const isCurrent = previewTheme ? currentTheme === previewTheme.id : false;
  const hasFilters = Boolean(searchQuery.trim() || selectedCategory);
  const documentLabel = DOCUMENT_LABELS[documentType];

  const applyTheme = () => {
    if (!previewTheme) return;
    onSelectTheme(previewTheme.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92dvh] w-[calc(100vw-1.5rem)] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-3rem)]">
        <DialogHeader className="shrink-0 space-y-1 border-b-2 border-border/70 px-5 pb-3 pt-5 pr-12 text-left sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Design marketplace
          </DialogTitle>
          <DialogDescription>
            {filteredThemes.length} of {themes.length} themes for your {documentLabel.singular}.
            Every theme prints for exams, courses and study sheets.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 space-y-3 px-5 py-4 sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              aria-label="Search themes"
              placeholder="Search themes, moods, styles…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-9 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="press absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              aria-pressed={selectedCategory === null}
              className={chipClass(selectedCategory === null)}
            >
              All themes
              <span className="tabular-nums opacity-70">{themes.length}</span>
            </button>
            {THEME_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  setSelectedCategory((current) => (current === cat.id ? null : cat.id))
                }
                aria-pressed={selectedCategory === cat.id}
                title={cat.description}
                className={chipClass(selectedCategory === cat.id)}
              >
                <span aria-hidden>{cat.icon}</span>
                <span className="whitespace-nowrap">{cat.label}</span>
                <span className="tabular-nums opacity-70">{categoryCounts.get(cat.id) ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 border-t-2 border-border/70">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
            {filteredThemes.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filteredThemes.map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    theme={theme}
                    isCurrent={currentTheme === theme.id}
                    isSelected={previewThemeId === theme.id}
                    onSelect={() => setPreviewThemeId(theme.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
                <Search className="size-6 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">No themes match your search</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try another word, or browse a whole category.
                  </p>
                </div>
                {hasFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory(null);
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </div>

          <aside className="hidden w-[19rem] shrink-0 flex-col border-l-2 border-border/70 md:flex">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              {previewTheme && previewExamTheme ? (
                <ThemeDetails
                  theme={previewTheme}
                  examTheme={previewExamTheme}
                  isCurrent={isCurrent}
                  heroLayout={heroLayout}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <Sparkles className="size-5 text-muted-foreground" />
                  <p className="text-xs leading-5 text-muted-foreground">
                    Pick a theme to see its paper, ink and mood.
                  </p>
                </div>
              )}
            </div>
            {previewTheme && (
              <div className="shrink-0 border-t-2 border-border/70 p-4">
                <Button className="w-full" onClick={applyTheme} disabled={isCurrent}>
                  {isCurrent ? (
                    <>
                      <Check className="size-4" /> Current theme
                    </>
                  ) : (
                    "Apply theme"
                  )}
                </Button>
              </div>
            )}
          </aside>
        </div>

        {/* The detail aside is desktop-only, so small screens get the apply
            action in a bar that cannot be scrolled away. */}
        {previewTheme && (
          <div className="flex shrink-0 items-center gap-3 border-t-2 border-border/70 px-5 py-3 md:hidden">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{previewTheme.label}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {previewTheme.description}
              </p>
            </div>
            <Button size="sm" onClick={applyTheme} disabled={isCurrent}>
              {isCurrent ? (
                <>
                  <Check className="size-4" /> In use
                </>
              ) : (
                "Apply"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Detail panel for the theme picked in the grid.
 */
function ThemeDetails({
  theme,
  examTheme,
  isCurrent,
  heroLayout,
}: {
  theme: ThemeConfig;
  examTheme: PreviewTheme;
  isCurrent: boolean;
  heroLayout?: HeroLayout;
}) {
  const category = THEME_CATEGORIES.find((item) => item.id === theme.category);
  const paletteCount = THEME_PALETTES[theme.id]?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{theme.label}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{theme.description}</p>
        </div>
        {isCurrent && (
          <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            In use
          </span>
        )}
      </div>

      <div className="mx-auto w-28 overflow-hidden rounded-md border border-border bg-white shadow-sm">
        <div className="aspect-[3/4] w-full">
          <ThemePreview theme={examTheme} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Accent", value: examTheme.accent },
          { label: "Paper", value: examTheme.soft },
          { label: "Rule", value: examTheme.border },
        ].map((swatch) => (
          <div key={swatch.label}>
            <div
              className="h-8 rounded border border-border/70"
              style={{ backgroundColor: swatch.value }}
            />
            <p className="mt-1 text-[10px] font-medium">{swatch.label}</p>
            <p className="truncate text-[9px] uppercase text-muted-foreground">{swatch.value}</p>
          </div>
        ))}
      </div>

      <dl className="space-y-3 border-t-2 border-border/60 pt-3">
        <div>
          <dt className="text-[11px] font-medium text-muted-foreground">Category</dt>
          <dd className="mt-1">
            <span className="rounded bg-secondary px-2 py-1 text-[11px]">
              {category?.label ?? theme.category}
            </span>
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-medium text-muted-foreground">Moods</dt>
          <dd className="mt-1 flex flex-wrap gap-1">
            {theme.mood.map((mood) => (
              <span key={mood} className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">
                {mood}
              </span>
            ))}
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-medium text-muted-foreground">Prints for</dt>
          <dd className="mt-1 flex flex-wrap gap-1">
            {theme.suitableFor.map((type) => (
              <span key={type} className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">
                {DOCUMENT_LABELS[type].plural}
              </span>
            ))}
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-medium text-muted-foreground">Hero</dt>
          <dd className="mt-1 flex flex-wrap gap-1">
            {theme.heroLayouts.map((layout) => (
              <span
                key={layout}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px]",
                  layout === heroLayout
                    ? "bg-primary/15 font-medium text-foreground"
                    : "bg-secondary",
                )}
              >
                {LAYOUT_LABELS[layout]}
                {layout === heroLayout ? " · now" : ""}
              </span>
            ))}
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-medium text-muted-foreground">Ink</dt>
          <dd className="mt-1 text-[11px] leading-4 text-muted-foreground">
            {paletteCount} palettes pair with this theme.
          </dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * Individual theme card with the miniature sheet preview.
 */
function ThemeCard({
  theme,
  isCurrent,
  isSelected,
  onSelect,
}: {
  theme: ThemeConfig;
  isCurrent: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const examTheme = EXAM_THEMES.find((item) => item.id === theme.id);
  if (!examTheme) return null;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={cn(
        "group relative flex flex-col gap-2 rounded-xl border bg-card p-2.5 text-left transition duration-200",
        "hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isSelected && "border-primary ring-1 ring-primary/40",
        !isSelected && isCurrent && "border-primary/60",
      )}
    >
      <span className="relative block aspect-[3/4] w-full overflow-hidden rounded-md border border-border/70 bg-white">
        <ThemePreview theme={examTheme} />
        {isCurrent && (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground shadow-sm">
            In use
          </span>
        )}
      </span>

      <span className="block min-w-0">
        <span className="block truncate text-xs font-semibold transition-colors group-hover:text-primary">
          {theme.label}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-[10px] leading-4 text-muted-foreground">
          {theme.description}
        </span>
      </span>

      <span className="mt-auto flex flex-wrap gap-1">
        {theme.mood.slice(0, 2).map((mood) => (
          <span
            key={mood}
            className="rounded bg-secondary px-1.5 py-0.5 text-[9px] text-secondary-foreground"
          >
            {mood}
          </span>
        ))}
      </span>
    </button>
  );
}
