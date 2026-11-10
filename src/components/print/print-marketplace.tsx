import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { EXAM_THEMES, type ExamTheme, type ExamPaletteId } from "@/lib/exam-print";
import {
  THEME_CATEGORIES,
  THEME_CONFIGS,
  type ThemeConfig,
  type HeroLayout,
} from "@/lib/print-themes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface PrintMarketplaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTheme: (themeId: ExamTheme, palette?: ExamPaletteId) => void;
  documentType?: "course" | "exam" | "module";
  currentTheme?: ExamTheme;
  heroLayout?: HeroLayout;
}

export function PrintMarketplace({
  open,
  onOpenChange,
  onSelectTheme,
  documentType = "exam",
  currentTheme,
  heroLayout = "compact",
}: PrintMarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [previewThemeId, setPreviewThemeId] = useState<ExamTheme | null>(null);

  const filteredThemes = useMemo(() => {
    return Object.values(THEME_CONFIGS).filter((theme) => {
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !theme.label.toLowerCase().includes(query) &&
          !theme.description.toLowerCase().includes(query) &&
          !theme.mood.some((m) => m.toLowerCase().includes(query))
        ) {
          return false;
        }
      }

      // Filter by category
      if (selectedCategory && theme.category !== selectedCategory) {
        return false;
      }

      // Filter by document type suitability
      if (documentType && !theme.suitableFor.includes(documentType)) {
        return false;
      }

      // Filter by hero layout if needed
      if (heroLayout && !theme.heroLayouts.includes(heroLayout)) {
        return false;
      }

      return true;
    });
  }, [searchQuery, selectedCategory, documentType, heroLayout]);

  const previewTheme = previewThemeId ? THEME_CONFIGS[previewThemeId] : null;
  const previewExamTheme = previewThemeId
    ? EXAM_THEMES.find((t) => t.id === previewThemeId)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Design marketplace</DialogTitle>
          <DialogDescription>
            Browse {filteredThemes.length} themes for your {documentType}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Search bar */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search themes, moods, styles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-background"
            />
          </div>

          {/* Category filters */}
          <div className="flex-shrink-0 flex gap-2 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "press px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0 border",
                selectedCategory === null
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              All themes
            </button>
            {THEME_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "press px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0 border whitespace-nowrap",
                  selectedCategory === cat.id
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
                title={cat.description}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
            {/* Themes grid */}
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-3">
                {filteredThemes.map((theme) => (
                  <div
                    key={theme.id}
                    className="group cursor-pointer"
                    onClick={() => setPreviewThemeId(theme.id)}
                  >
                    <ThemeCard theme={theme} isActive={currentTheme === theme.id} />
                  </div>
                ))}
              </div>

              {filteredThemes.length === 0 && (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  No themes match your filters
                </div>
              )}
            </div>

            {/* Preview panel */}
            {previewTheme && previewExamTheme && (
              <div className="w-80 border-l pl-6 flex flex-col gap-4 py-2">
                <div className="flex-shrink-0">
                  <h3 className="font-semibold text-sm">{previewTheme.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {previewTheme.description}
                  </p>
                </div>

                {/* Color preview */}
                <div className="flex-shrink-0">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Colors</p>
                  <div className="space-y-2">
                    <div className="flex gap-2 items-center">
                      <div
                        className="w-12 h-12 rounded border"
                        style={{ backgroundColor: previewExamTheme.accent }}
                        title="Accent"
                      />
                      <div>
                        <p className="text-xs font-medium">Accent</p>
                        <p className="text-[10px] text-muted-foreground">
                          {previewExamTheme.accent}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div
                        className="w-12 h-12 rounded border border-border"
                        style={{ backgroundColor: previewExamTheme.soft }}
                        title="Paper"
                      />
                      <div>
                        <p className="text-xs font-medium">Paper</p>
                        <p className="text-[10px] text-muted-foreground">
                          {previewExamTheme.soft}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex-shrink-0 space-y-3 pt-2 border-t">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Category</p>
                    <span className="inline-block px-2 py-1 rounded text-xs bg-secondary">
                      {THEME_CATEGORIES.find((c) => c.id === previewTheme.category)?.label}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Hero layouts</p>
                    <div className="flex gap-1">
                      {previewTheme.heroLayouts.map((layout) => (
                        <span
                          key={layout}
                          className="px-2 py-1 rounded text-xs bg-secondary"
                        >
                          {layout === "full" ? "Full page" : "Compact"}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Best for</p>
                    <div className="flex flex-wrap gap-1">
                      {previewTheme.suitableFor.map((type) => (
                        <span key={type} className="px-2 py-1 rounded text-xs bg-secondary">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Moods</p>
                    <div className="flex flex-wrap gap-1">
                      {previewTheme.mood.map((m) => (
                        <span key={m} className="px-2 py-1 rounded text-xs bg-secondary">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      onSelectTheme(previewTheme.id);
                      onOpenChange(false);
                    }}
                    className="w-full mt-4"
                  >
                    Apply theme
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Individual theme card with color preview
 */
function ThemeCard({
  theme,
  isActive,
}: {
  theme: ThemeConfig;
  isActive?: boolean;
}) {
  const examTheme = EXAM_THEMES.find((t) => t.id === theme.id);

  if (!examTheme) return null;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-all hover:shadow-md group",
        isActive && "ring-2 ring-primary bg-primary/5",
      )}
    >
      {/* Color preview bars */}
      <div className="flex gap-1 mb-3 h-10 rounded overflow-hidden border border-border">
        <div
          className="flex-1"
          style={{ backgroundColor: examTheme.accent }}
          title={`Accent: ${examTheme.accent}`}
        />
        <div
          className="flex-1"
          style={{ backgroundColor: examTheme.soft }}
          title={`Paper: ${examTheme.soft}`}
        />
      </div>

      {/* Text info */}
      <div className="min-w-0">
        <h4 className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
          {theme.label}
        </h4>
        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
          {theme.description}
        </p>
        <div className="flex gap-1 mt-2 flex-wrap">
          {theme.mood.slice(0, 2).map((m) => (
            <span key={m} className="inline-block px-1.5 py-0.5 rounded text-[9px] bg-secondary">
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
