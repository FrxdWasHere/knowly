import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  BookOpenCheck,
  Columns2,
  Copy,
  Loader2,
  Printer,
  RotateCcw,
  Ruler,
  ScrollText,
  Signature,
  Type,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import {
  BREAK_OPTIONS,
  COVER_OPTIONS,
  CoursePaper,
  FONT_SCALE_OPTIONS,
  FOOTER_OPTIONS,
  MARGIN_OPTIONS,
  PAPER_SIZE_OPTIONS,
  SPACING_OPTIONS,
  STORAGE_KEY_COURSE_PRINT,
  TYPEFACE_OPTIONS,
  defaultCoursePrintOptions,
  getPaperDims,
  type CoursePrintOptions,
} from "@/components/print/course-paper";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { courseDocxBlob } from "@/lib/course-docx";
import { decksForCourse } from "@/lib/courses";
import { cn } from "@/lib/utils";
import { useKnowly } from "@/store/knowly";

export const Route = createFileRoute("/_authenticated/courses/$courseId/print")({
  head: () => ({ meta: [{ title: "Print Course · Study Pack | Knowly" }] }),
  component: CoursePrintPage,
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

function loadOptions(): CoursePrintOptions {
  if (typeof window === "undefined") return defaultCoursePrintOptions;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_COURSE_PRINT);
    if (!raw) return defaultCoursePrintOptions;
    return { ...defaultCoursePrintOptions, ...(JSON.parse(raw) as CoursePrintOptions) };
  } catch {
    return defaultCoursePrintOptions;
  }
}

type ExportState =
  { kind: "idle" } | { kind: "working"; message: string } | { kind: "error"; log: string };

function buildErrorLog(error: unknown): string {
  const e = error as { name?: string; message?: string; stack?: string; cause?: unknown };
  const head = [e?.name ?? "Error", e?.message ?? String(error)].filter(Boolean).join(": ");
  const cause = e?.cause
    ? `\nCaused by: ${e.cause instanceof Error ? `${e.cause.name}: ${e.cause.message}` : String(e.cause)}`
    : "";
  const stack = e?.stack ? `\n\n${e.stack}` : "";
  return `${head}${cause}${stack}`;
}

function CoursePrintPage() {
  const { courseId } = Route.useParams();
  const { state } = useKnowly();
  const course = state.courses.find((course) => course.id === courseId);
  const [options, setOptions] = useState<CoursePrintOptions>(loadOptions);
  const [exportState, setExportState] = useState<ExportState>({ kind: "idle" });
  const docxWorking = exportState.kind === "working";
  const dims = getPaperDims(options.paper, options.orientation);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY_COURSE_PRINT, JSON.stringify(options));
    } catch {
      // storage may be unavailable; options simply don't persist
    }
  }, [options]);

  if (!course) {
    return (
      <AppPage>
        <div className="panel mx-auto max-w-lg p-8 text-center">
          <BookOpenCheck className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-4 font-display text-xl font-semibold">Course not found</h1>
          <Button asChild className="mt-5">
            <Link to="/courses">Back to courses</Link>
          </Button>
        </div>
      </AppPage>
    );
  }

  const linkedDecks = decksForCourse(course, state.decks);
  const progress = state.courseProgress[course.id];
  const patch = (changes: Partial<CoursePrintOptions>) =>
    setOptions((current) => ({ ...current, ...changes }));

  const handleExportDocx = async () => {
    setExportState({ kind: "working", message: "Preparing the export…" });
    try {
      const blob = await courseDocxBlob(course, progress, linkedDecks, options, (message) =>
        setExportState({ kind: "working", message }),
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${course.title.replace(/[\\/:*?"<>|]+/g, "-").trim() || "course"} — study pack.docx`;
      anchor.click();
      URL.revokeObjectURL(url);
      setExportState({ kind: "idle" });
      toast.success("Word document downloaded");
    } catch (error) {
      console.error("DOCX export failed:", error);
      setExportState({ kind: "error", log: buildErrorLog(error) });
      const message = error instanceof Error ? error.message : String(error);
      toast.error("The Word file didn't download", { description: message.slice(0, 200) });
    }
  };

  return (
    <AppPage>
      <div className="mx-auto w-full">
        <div className="print-hide">
          <PageHeader
            title="Course publishing studio"
            description="Assemble the whole course into a book set — cover, contents, lessons, assessments, practice and answers — then print it or export it as a Word document."
            action={
              <div className="flex flex-wrap items-center gap-2.5">
                <Button variant="outline" onClick={handleExportDocx} disabled={docxWorking}>
                  <ArrowDownToLine /> Save as Word file
                </Button>
                <Button onClick={() => window.print()}>
                  <Printer /> Print / Save as PDF
                </Button>
              </div>
            }
          />
        </div>

        {exportState.kind === "error" && (
          <div className="print-hide mb-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-destructive">
                  The Word file didn't download
                </p>
                <p className="text-[11px] text-muted-foreground">
                  The technical details are below — copy them if you want to tell someone what
                  happened.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportDocx}>
                  <RotateCcw /> Retry export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(exportState.log)
                      .then(() => toast.success("Details copied"));
                  }}
                >
                  <Copy /> Copy details
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setExportState({ kind: "idle" })}>
                  Dismiss
                </Button>
              </div>
            </div>
            <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-destructive/25 bg-background/60 p-3 text-left text-[11px] leading-4 text-muted-foreground">
              {exportState.log}
            </pre>
          </div>
        )}

        {exportState.kind === "working" && (
          <div
            role="status"
            aria-live="polite"
            className="print-hide fixed inset-0 z-[80] grid place-items-center bg-background/70 p-6 backdrop-blur-sm"
          >
            <div className="panel w-full max-w-sm p-7 text-center">
              <BookOpenCheck className="mx-auto size-8 animate-pulse text-primary" />
              <h2 className="mt-4 font-display text-lg font-semibold">Building your book set…</h2>
              <p className="mt-1.5 truncate text-sm text-muted-foreground">{course.title}</p>
              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border bg-surface/50 px-4 py-3 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
                <span className="min-w-0 truncate">{exportState.message}</span>
              </div>
              <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
                Everything is created on this device — larger courses take a few seconds.
              </p>
            </div>
          </div>
        )}

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

            <OptionGroup icon={<Columns2 className="size-4 text-primary" />} label="Sections">
              <div className="flex flex-wrap gap-1.5">
                {BREAK_OPTIONS.map((breakOption) => (
                  <Chip
                    key={breakOption.id}
                    active={options.breaks === breakOption.id}
                    onClick={() => patch({ breaks: breakOption.id })}
                    label={breakOption.label}
                  />
                ))}
              </div>
            </OptionGroup>

            <OptionGroup icon={<BookOpenCheck className="size-4 text-primary" />} label="Cover">
              <div className="flex flex-wrap gap-1.5">
                {COVER_OPTIONS.map((cover) => (
                  <Chip
                    key={cover.id}
                    active={options.coverStyle === cover.id}
                    onClick={() => patch({ coverStyle: cover.id })}
                    label={cover.label}
                    sub={cover.sub}
                  />
                ))}
              </div>
            </OptionGroup>

            <OptionGroup
              icon={<Signature className="size-4 text-primary" />}
              label="Page furniture"
            >
              <div className="flex flex-wrap gap-1.5">
                {FOOTER_OPTIONS.map((footer) => (
                  <Chip
                    key={footer.id}
                    active={options.footerStyle === footer.id}
                    onClick={() => patch({ footerStyle: footer.id })}
                    label={footer.label}
                  />
                ))}
              </div>
              <div className="mt-3 space-y-3">
                <ToggleRow
                  label="Running header"
                  description="Course name in small caps at the top of each page."
                  checked={options.runningHeader}
                  onChange={(value) => patch({ runningHeader: value })}
                />
                <ToggleRow
                  label="Table of contents"
                  description="Contents page with real page numbers."
                  checked={options.includeToc}
                  onChange={(value) => patch({ includeToc: value })}
                />
                <ToggleRow
                  label="Cover page"
                  description="Drop the cover to start straight at the contents."
                  checked={options.includeCover}
                  onChange={(value) => patch({ includeCover: value })}
                />
              </div>
            </OptionGroup>

            <OptionGroup icon={<ScrollText className="size-4 text-primary" />} label="Study pack">
              <div className="space-y-3">
                <ToggleRow
                  label="Answer key"
                  description="Every checkpoint, quiz, deck and exam answer, printed at the end."
                  checked={options.includeAnswerKey}
                  onChange={(value) => patch({ includeAnswerKey: value })}
                />
                <ToggleRow
                  label="Lesson notes"
                  description="Include your personal notes under each lesson."
                  checked={options.includeNotes}
                  onChange={(value) => patch({ includeNotes: value })}
                />
              </div>
            </OptionGroup>

            <div className="flex items-center justify-between rounded-xl border border-border bg-surface/50 p-3 text-[11px] leading-5 text-muted-foreground">
              <span>
                {PAPER_SIZE_OPTIONS.find((s) => s.id === options.paper)?.label} ·{" "}
                {Math.round((dims.width / 96) * 10) / 10}" ×{" "}
                {Math.round((dims.height / 96) * 10) / 10}" — footer numbers match the printed
                pages.
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOptions(defaultCoursePrintOptions)}
                title="Reset all options"
              >
                <RotateCcw /> Reset
              </Button>
            </div>
          </div>

          <div className="preview-stage min-w-0 rounded-3xl bg-surface2/40 p-6 sm:p-8">
            <CoursePaper
              course={course}
              progress={progress}
              decks={linkedDecks}
              options={options}
            />
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
