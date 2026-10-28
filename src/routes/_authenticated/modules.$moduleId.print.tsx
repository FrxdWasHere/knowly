import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  BookOpen,
  Columns2,
  Edit3,
  Heading1,
  MoveVertical,
  Palette,
  Printer,
  RotateCcw,
  Ruler,
  ScrollText,
  Type,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import {
  ModulePaper,
  STORAGE_KEY_MODULE_PRINT,
  defaultModulePrintOptions,
  FOOTER_OPTIONS,
  MARGIN_OPTIONS,
  PAPER_SIZE_OPTIONS,
  SPACING_OPTIONS,
  TYPEFACE_OPTIONS,
  FONT_SCALE_OPTIONS,
  type ModulePrintOptions,
} from "@/components/print/module-paper";
import { getPaperDims } from "@/components/print/course-paper";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { COLOR_THEMES, getColorTheme } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { useKnowly } from "@/store/knowly";

export const Route = createFileRoute("/_authenticated/modules/$moduleId/print")({
  head: () => ({ meta: [{ title: "Print Module · Study Sheet | Knowly" }] }),
  component: ModulePrintPage,
});

function Chip({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub?: string;
}) {
  return (
    <button
      type="button"
      title={sub}
      onClick={onClick}
      className={cn(
        "press rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/15 text-foreground"
          : "border-border text-muted-foreground hover:border-primary/40",
      )}
    >
      {label}
      {sub && <span className="ml-1.5 text-[10px] text-muted-foreground">{sub}</span>}
    </button>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[11px] leading-4 text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SliderRow({
  label,
  description,
  value,
  suffix,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  /** "down" for the header, "up" for the footer */
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium">{label}</p>
        <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
          {value === 0 ? "At the margin" : `${value.toFixed(1)}% ${suffix}`}
        </span>
      </div>
      <Slider
        className="mt-2.5"
        min={0}
        max={6}
        step={0.5}
        value={[value]}
        onValueChange={(values) => onChange(values[0] ?? 0)}
      />
      <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{description}</p>
    </div>
  );
}

function loadOptions(): ModulePrintOptions {
  if (typeof window === "undefined") return defaultModulePrintOptions;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_MODULE_PRINT);
    if (!raw) return defaultModulePrintOptions;
    return { ...defaultModulePrintOptions, ...(JSON.parse(raw) as ModulePrintOptions) };
  } catch {
    return defaultModulePrintOptions;
  }
}

function ModulePrintPage() {
  const { moduleId } = Route.useParams();
  const { state } = useKnowly();
  const module = state.modules.find((m) => m.id === moduleId);
  const [options, setOptions] = useState<ModulePrintOptions>(loadOptions);
  const dims = getPaperDims(options.paper, options.orientation);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY_MODULE_PRINT, JSON.stringify(options));
    } catch {
      // storage may be unavailable; options simply don't persist
    }
  }, [options]);

  if (!module) {
    return (
      <AppPage>
        <div className="panel mx-auto max-w-lg p-8 text-center">
          <BookOpen className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-4 font-display text-xl font-semibold">Module not found</h1>
          <Button asChild className="mt-5">
            <Link to="/modules">Back to modules</Link>
          </Button>
        </div>
      </AppPage>
    );
  }

  const patch = (changes: Partial<ModulePrintOptions>) =>
    setOptions((current) => ({ ...current, ...changes }));
  const handleSavePdf = () => {
    // Browsers offer "Save as PDF" in the print dialog; title sets the filename.
    const previousTitle = document.title;
    document.title = `${module.title} — knowly module`;
    window.print();
    window.setTimeout(() => {
      document.title = previousTitle;
    }, 600);
    toast.info('Choose "Save as PDF" in the print dialog');
  };

  return (
    <AppPage>
      <div className="mx-auto w-full">
        <div className="print-hide">
          <PageHeader
            title="Module print studio"
            description="The whole module as one colorful study sheet — a full-page title sheet, then the lesson, notes and answer key."
            action={
              <div className="flex flex-wrap items-center gap-2.5">
                <Button variant="outline" onClick={handleSavePdf}>
                  <ArrowDownToLine /> Save as PDF
                </Button>
                <Button onClick={() => window.print()}>
                  <Printer /> Print
                </Button>
              </div>
            }
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <div className="panel print-hide space-y-5 self-start p-5">
            <OptionGroup icon={<Ruler className="size-4 text-primary" />} label="Paper">
              <div className="flex flex-wrap gap-1.5">
                {PAPER_SIZE_OPTIONS.map((size) => (
                  <Chip
                    key={size.id}
                    active={options.paper === size.id}
                    onClick={() => patch({ paper: size.id })}
                    label={size.label}
                    sub={size.sub}
                  />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Chip
                  active={options.orientation === "portrait"}
                  onClick={() => patch({ orientation: "portrait" })}
                  label="Portrait"
                />
                <Chip
                  active={options.orientation === "landscape"}
                  onClick={() => patch({ orientation: "landscape" })}
                  label="Landscape"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {MARGIN_OPTIONS.map((margin) => (
                  <Chip
                    key={margin.id}
                    active={options.margins === margin.id}
                    onClick={() => patch({ margins: margin.id })}
                    label={margin.label}
                    sub={margin.sub}
                  />
                ))}
              </div>
            </OptionGroup>

            <OptionGroup icon={<Type className="size-4 text-primary" />} label="Typography">
              <div className="flex flex-wrap gap-1.5">
                {TYPEFACE_OPTIONS.map((typeface) => (
                  <Chip
                    key={typeface.id}
                    active={options.typeface === typeface.id}
                    onClick={() => patch({ typeface: typeface.id })}
                    label={typeface.label}
                    sub={typeface.sub}
                  />
                ))}
                {FONT_SCALE_OPTIONS.map((scale) => (
                  <Chip
                    key={scale.id}
                    active={options.fontScale === scale.id}
                    onClick={() => patch({ fontScale: scale.id })}
                    label={scale.label}
                  />
                ))}
                {SPACING_OPTIONS.map((spacing) => (
                  <Chip
                    key={spacing.id}
                    active={options.spacing === spacing.id}
                    onClick={() => patch({ spacing: spacing.id })}
                    label={spacing.label}
                  />
                ))}
              </div>
            </OptionGroup>

            <OptionGroup icon={<Heading1 className="size-4 text-primary" />} label="Header">
              <div className="space-y-3">
                <ToggleRow
                  label="Title page"
                  description="Full-page hero on sheet 1; the lesson proper starts on page 2."
                  checked={options.includeTitlePage}
                  onChange={(value) => patch({ includeTitlePage: value })}
                />
                <ToggleRow
                  label="Page header"
                  description="Quick switch: module name in small caps on later pages."
                  checked={options.runningHeader}
                  onChange={(value) => patch({ runningHeader: value })}
                />
              </div>
            </OptionGroup>

            <OptionGroup icon={<Palette className="size-4 text-primary" />} label="Cover theme">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  title="Module color"
                  aria-label="Module color"
                  onClick={() => patch({ coverTheme: "module" })}
                  aria-pressed={options.coverTheme === "module"}
                  className={cn(
                    "press flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-colors",
                    options.coverTheme === "module"
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  <span
                    aria-hidden
                    className="size-3.5 rounded-full"
                    style={{ background: module.color || "#3b5bdb" }}
                  />
                  Module color
                </button>
                {COLOR_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    title={`${theme.label} — ${theme.blurb}`}
                    aria-label={theme.label}
                    aria-pressed={options.coverTheme === theme.id}
                    onClick={() => patch({ coverTheme: theme.id })}
                    className={cn(
                      "press size-7 rounded-full border-2 transition-transform",
                      options.coverTheme === theme.id
                        ? "scale-110 border-foreground"
                        : "border-transparent hover:scale-105",
                    )}
                    style={{
                      background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent})`,
                    }}
                  />
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                {options.coverTheme === "module"
                  ? "The cover follows the module's own accent color."
                  : `${getColorTheme(options.coverTheme)?.label ?? "Palette"} — the title sheet takes this Knowly palette.`}
              </p>
            </OptionGroup>

            <OptionGroup icon={<Columns2 className="size-4 text-primary" />} label="Page furniture">
              <div className="flex flex-wrap gap-1.5">
                {FOOTER_OPTIONS.map((footer) => (
                  <Chip
                    key={footer.id}
                    active={options.footerStyle === footer.id}
                    onClick={() => patch({ footerStyle: footer.id })}
                    label={footer.label}
                    sub={footer.sub}
                  />
                ))}
              </div>
            </OptionGroup>

            <OptionGroup
              icon={<MoveVertical className="size-4 text-primary" />}
              label="Header & footer position"
            >
              <div className="space-y-4">
                <SliderRow
                  label="Header"
                  description="Push the running header down from the top margin. The page content makes room automatically."
                  value={options.headerInset ?? 0}
                  suffix="down"
                  onChange={(value) => patch({ headerInset: value })}
                />
                <SliderRow
                  label="Footer"
                  description="Lift the footer up from the bottom margin. The page content makes room automatically."
                  value={options.footerInset ?? 0}
                  suffix="up"
                  onChange={(value) => patch({ footerInset: value })}
                />
              </div>
            </OptionGroup>

            <OptionGroup icon={<ScrollText className="size-4 text-primary" />} label="Study sheet">
              <div className="space-y-3">
                <ToggleRow
                  label="Answer key"
                  description="Every checkpoint answer, printed at the end."
                  checked={options.includeAnswerKey}
                  onChange={(value) => patch({ includeAnswerKey: value })}
                />
                <ToggleRow
                  label="My notes"
                  description="Include your personal notes under the lesson."
                  checked={options.includeNotes}
                  onChange={(value) => patch({ includeNotes: value })}
                />
              </div>
            </OptionGroup>

            <OptionGroup icon={<Edit3 className="size-4 text-primary" />} label="Edit">
              <ToggleRow
                label="Live edit"
                description="Edit right on the preview. Press Enter to start a new page or Shift+Enter for a line break. Changes are kept in this browser for this module."
                checked={options.editMode === true}
                onChange={(value) => patch({ editMode: value })}
              />
            </OptionGroup>

            <div className="flex items-center justify-between rounded-xl border border-border bg-surface/50 p-3 text-[11px] leading-5 text-muted-foreground">
              <span>
                {PAPER_SIZE_OPTIONS.find((s) => s.id === options.paper)?.label} ·{" "}
                {Math.round((dims.width / 96) * 10) / 10}" ×{" "}
                {Math.round((dims.height / 96) * 10) / 10}" — full-page title sheet, then the lesson
                flow.
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOptions(defaultModulePrintOptions)}
                title="Reset all options"
              >
                <RotateCcw /> Reset
              </Button>
            </div>
          </div>

          <div className="preview-stage min-w-0 rounded-3xl bg-surface2/40 p-6 sm:p-8">
            <ModulePaper module={module} decks={state.decks} options={options} />
          </div>
        </div>
      </div>
    </AppPage>
  );
}

function OptionGroup({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
