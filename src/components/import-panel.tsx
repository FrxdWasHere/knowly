import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  Download,
  FileJson,
  Layers,
  NotebookText,
  Puzzle,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TYPE_LABELS } from "@/lib/answers";
import { validateCourseJson } from "@/lib/course-schema";
import { detectImportKind, type ImportKind } from "@/lib/import-detect";
import { closeImportPanel, useImportPanel } from "@/lib/import-panel";
import { validateModuleJson } from "@/lib/module-schema";
import { importNotebookBundle } from "@/lib/notes/db";
import { validateDeckJson, validateQuestionsJson } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useKnowly } from "@/store/knowly";

const KIND_LABELS: Record<ImportKind, string> = {
  deck: "Deck",
  questions: "Questions",
  course: "Course",
  module: "Module",
  notebook: "Notebook",
  backup: "Full backup",
};

const KIND_OPTIONS = [
  { id: "auto", label: "Auto-detect" },
  { id: "deck", label: "Deck" },
  { id: "questions", label: "Questions" },
  { id: "course", label: "Course" },
  { id: "module", label: "Module" },
  { id: "notebook", label: "Notebook" },
  { id: "backup", label: "Backup" },
] as const;

type KindChoice = (typeof KIND_OPTIONS)[number]["id"];

type Parsed = { ok: true; value: unknown } | { ok: false };

const EMPTY_WARNINGS: string[] = [];
const EMPTY_ERRORS: string[] = [];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
        {label}
      </span>
      {children}
    </label>
  );
}

function ProblemList({ errors, warnings }: { errors: string[]; warnings: string[] }) {
  if (!errors.length && !warnings.length) return null;
  return (
    <div className="space-y-2">
      {errors.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
            <XCircle className="size-3.5" />
            {errors.length} thing{errors.length === 1 ? "" : "s"} to fix
          </p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-[11px] leading-5 text-destructive/90">
            {errors.slice(0, 12).map((error, index) => (
              <li key={index} className="rounded-md bg-background/40 px-2 py-1 font-mono">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-warning">
            <AlertTriangle className="size-3.5" />
            {warnings.length} warning{warnings.length === 1 ? "" : "s"}
          </p>
          <ul className="mt-2 max-h-32 space-y-1 overflow-auto text-[11px] leading-5 text-warning/90">
            {warnings.slice(0, 8).map((warning, index) => (
              <li key={index} className="rounded-md bg-background/40 px-2 py-1">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ImportPanel() {
  const request = useImportPanel();
  const { state, addDeck, addQuestions, addCourse, addModule, importState } = useKnowly();
  const navigate = useNavigate();

  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [choice, setChoice] = useState<KindChoice>("auto");
  const [targetDeckId, setTargetDeckId] = useState("");
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { open } = request;

  useEffect(() => {
    if (!open) return;
    setRaw("");
    setFileName(null);
    setChoice(request.kind ?? "auto");
    setTargetDeckId(request.deckId ?? "");
    setNewDeckTitle("");
    setDragging(false);
    setBusy(false);
  }, [open, request.kind, request.deckId]);

  const parsed = useMemo<Parsed>(() => {
    if (!raw.trim()) return { ok: false };
    try {
      return { ok: true, value: JSON.parse(raw) };
    } catch {
      return { ok: false };
    }
  }, [raw]);

  const detected = useMemo(() => (parsed.ok ? detectImportKind(parsed.value) : null), [parsed]);
  const kind: ImportKind | null = choice === "auto" ? detected : choice;

  const target = state.decks.find((deck) => deck.id === targetDeckId);

  const deckResult = useMemo(
    () => (kind === "deck" && raw.trim() ? validateDeckJson(raw) : null),
    [kind, raw],
  );
  const questionsResult = useMemo(
    () =>
      kind === "questions" && raw.trim() ? validateQuestionsJson(raw, target?.questions) : null,
    [kind, raw, target],
  );
  const courseResult = useMemo(
    () => (kind === "course" && raw.trim() ? validateCourseJson(raw) : null),
    [kind, raw],
  );
  const moduleResult = useMemo(
    () => (kind === "module" && raw.trim() ? validateModuleJson(raw) : null),
    [kind, raw],
  );

  const backupResult = useMemo(() => {
    if (kind !== "backup" || !parsed.ok) return null;
    const data = parsed.value as Record<string, unknown>;
    if (!Array.isArray(data.decks)) {
      return {
        ok: false,
        errors: ["This isn't a Knowly backup — it has no `decks` list."],
        warnings: EMPTY_WARNINGS,
        decks: 0,
        questions: 0,
        courses: 0,
        modules: 0,
        owner: "",
      };
    }
    const decks = data.decks.filter((deck): deck is { questions?: unknown[] } =>
      Boolean(deck && typeof deck === "object"),
    );
    const settings = data.settings as { displayName?: string } | undefined;
    return {
      ok: true,
      errors: EMPTY_ERRORS,
      warnings: [
        "A backup replaces your whole library — decks, courses, modules, progress and settings.",
      ],
      decks: decks.length,
      questions: decks.reduce(
        (sum, deck) => sum + (Array.isArray(deck.questions) ? deck.questions.length : 0),
        0,
      ),
      courses: Array.isArray(data.courses) ? data.courses.length : 0,
      modules: Array.isArray(data.modules) ? data.modules.length : 0,
      owner: settings?.displayName ?? "",
    };
  }, [kind, parsed]);

  const notebookResult = useMemo(() => {
    if (kind !== "notebook" || !parsed.ok) return null;
    const data = parsed.value as Record<string, unknown>;
    const notebook = data.notebook as { title?: string } | undefined;
    const pages = Array.isArray(data.pages) ? data.pages : [];
    const ok = Boolean(notebook) && Array.isArray(data.pages);
    return {
      ok,
      errors: ok ? EMPTY_ERRORS : ['Notebook files need a "notebook" object and a "pages" list.'],
      warnings: ok
        ? ["The copy is renamed “(imported)” so your original notebook stays untouched."]
        : EMPTY_WARNINGS,
      title: notebook?.title ?? "Notebook",
      pages: pages.length,
    };
  }, [kind, parsed]);

  const parseError = raw.trim() && !parsed.ok ? "That text isn't valid JSON yet." : null;

  const errors =
    parseError != null
      ? [parseError]
      : (deckResult?.errors ??
        questionsResult?.errors ??
        courseResult?.errors ??
        moduleResult?.errors ??
        backupResult?.errors ??
        notebookResult?.errors ??
        EMPTY_ERRORS);

  const warnings =
    deckResult?.warnings ??
    questionsResult?.warnings ??
    courseResult?.warnings ??
    moduleResult?.warnings ??
    backupResult?.warnings ??
    notebookResult?.warnings ??
    EMPTY_WARNINGS;

  const deck = deckResult?.deck;
  const questions = questionsResult?.questions;
  const course = courseResult?.course;
  const module = moduleResult?.module;

  const previewQuestions = deck?.questions ?? questions ?? [];
  const typeCounts = previewQuestions.reduce<Record<string, number>>((acc, question) => {
    acc[question.type] = (acc[question.type] ?? 0) + 1;
    return acc;
  }, {});

  const canImport =
    !busy &&
    !parseError &&
    Boolean(
      (kind === "deck" && deckResult?.ok && deck) ||
      (kind === "questions" && questionsResult?.ok && questions?.length) ||
      (kind === "course" && courseResult?.ok && course) ||
      (kind === "module" && moduleResult?.ok && module) ||
      (kind === "backup" && backupResult?.ok) ||
      (kind === "notebook" && notebookResult?.ok),
    );

  const actionLabel =
    kind === "questions"
      ? target
        ? `Add to “${target.title}”`
        : "Create a deck"
      : kind === "backup"
        ? "Replace my library"
        : kind === "notebook"
          ? "Import notebook"
          : kind === "course"
            ? "Import course"
            : kind === "module"
              ? "Import module"
              : kind === "deck"
                ? "Import deck"
                : "Import";

  const loadFile = async (file: File) => {
    const text = await file.text();
    setRaw(text);
    setFileName(file.name);
    setChoice("auto");
  };

  const doImport = async () => {
    if (!canImport) return;
    setBusy(true);
    try {
      if (kind === "deck" && deck) {
        addDeck(deck);
        toast.success(`Imported “${deck.title}”`, {
          description: `${deck.questions.length} questions added to your library.`,
        });
        closeImportPanel();
        navigate({ to: "/decks/$deckId", params: { deckId: deck.id } });
        return;
      }

      if (kind === "questions" && questions?.length) {
        if (target) {
          addQuestions(target.id, questions);
          toast.success(`Added ${questions.length} questions`, {
            description: `“${target.title}” now has ${target.questions.length + questions.length} questions.`,
          });
          closeImportPanel();
          navigate({ to: "/decks/$deckId", params: { deckId: target.id } });
          return;
        }
        const bundled = validateDeckJson(
          JSON.stringify({
            title:
              newDeckTitle.trim() || questionsResult?.deckTitle?.trim() || "Imported questions",
            subject: "General",
            questions,
          }),
        );
        if (!bundled.ok || !bundled.deck) {
          toast.error("Those questions couldn't be turned into a deck", {
            description: bundled.errors[0],
          });
          return;
        }
        addDeck(bundled.deck);
        toast.success(`Created “${bundled.deck.title}”`, {
          description: `${bundled.deck.questions.length} questions added to your library.`,
        });
        closeImportPanel();
        navigate({ to: "/decks/$deckId", params: { deckId: bundled.deck.id } });
        return;
      }

      if (kind === "course" && course) {
        addCourse(course);
        const lessons = course.modules.reduce((sum, item) => sum + item.lessons.length, 0);
        toast.success(`Imported ${course.title}`, {
          description: `${course.modules.length} modules · ${lessons} lessons`,
        });
        closeImportPanel();
        navigate({ to: "/courses/$courseId", params: { courseId: course.id } });
        return;
      }

      if (kind === "module" && module) {
        addModule(module);
        toast.success(`Imported ${module.title}`, {
          description: `${module.blocks.length} blocks · ${module.questions.length} checkpoints`,
        });
        closeImportPanel();
        navigate({ to: "/modules/$moduleId", params: { moduleId: module.id } });
        return;
      }

      if (kind === "backup") {
        const ok = importState(raw);
        if (!ok) {
          toast.error("That backup couldn't be read");
          return;
        }
        toast.success("Library restored", {
          description: "Your decks, courses and progress are back.",
        });
        closeImportPanel();
        navigate({ to: "/dashboard" });
        return;
      }

      if (kind === "notebook") {
        const notebook = await importNotebookBundle(raw);
        if (!notebook) {
          toast.error("That notebook couldn't be read");
          return;
        }
        toast.success(`Imported ${notebook.title}`);
        closeImportPanel();
        navigate({ to: "/notes/$notebookId", params: { notebookId: notebook.id } });
      }
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setRaw("");
    setFileName(null);
    setChoice("auto");
    setNewDeckTitle("");
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) closeImportPanel();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/75 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[560px] flex-col border-l border-border bg-surface shadow-[var(--shadow-panel)] outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-200"
        >
          <div className="flex shrink-0 items-start gap-3 border-b border-border px-5 py-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/12 text-primary">
              <Download className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="font-display text-base font-semibold leading-tight">
                Bring it into Knowly
              </DialogPrimitive.Title>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                One panel for every Knowly file — decks, question packs, courses, modules, notebooks
                and full backups. We work out the format for you.
              </p>
            </div>
            <DialogPrimitive.Close
              aria-label="Close the importer"
              className="press grid size-8 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const file = event.dataTransfer.files?.[0];
                if (file) void loadFile(file);
              }}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-background/40 p-5 text-center transition-colors",
                dragging && "border-primary bg-primary/5",
              )}
            >
              <UploadCloud className="size-6 text-primary" />
              <p className="text-sm font-medium">{fileName ?? "Drop a .json file here"}</p>
              <p className="max-w-xs text-[11px] leading-5 text-muted-foreground">
                Deck, questions, course, module, notebook or full backup — drop any of them.
              </p>
              <div className="mt-1 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <FileJson className="size-4" /> Choose a file
                </Button>
                {(raw || fileName) && (
                  <Button variant="ghost" size="sm" onClick={reset}>
                    Clear
                  </Button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void loadFile(file);
                }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {KIND_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setChoice(option.id)}
                  className={cn(
                    "press rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    choice === option.id
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {raw.trim() && (
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {kind ? (
                  <>
                    <CheckCircle2 className="size-3.5 text-success" />
                    Detected:{" "}
                    <span className="font-semibold text-foreground">{KIND_LABELS[kind]}</span>
                    {choice === "auto" && detected ? " (auto)" : ""}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="size-3.5 text-warning" />
                    We couldn't tell what this file is — pick a format above.
                  </>
                )}
              </p>
            )}

            <Field label="Or paste it">
              <Textarea
                value={raw}
                onChange={(event) => setRaw(event.target.value)}
                placeholder='{ "title": "…", "questions": [ … ] }  ·  { "modules": [ … ] }  ·  { "blocks": [ … ] }'
                className="min-h-40 font-mono text-xs leading-6"
                spellCheck={false}
              />
            </Field>

            {kind === "questions" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Add to deck">
                  <select
                    value={targetDeckId}
                    onChange={(event) => setTargetDeckId(event.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-surface-2/60 px-2 text-xs"
                  >
                    <option value="">Create a new deck</option>
                    {state.decks.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} ({item.questions.length})
                      </option>
                    ))}
                  </select>
                </Field>
                {!targetDeckId && (
                  <Field label="New deck name">
                    <input
                      value={newDeckTitle}
                      onChange={(event) => setNewDeckTitle(event.target.value)}
                      placeholder={questionsResult?.deckTitle ?? "Imported questions"}
                      className="h-9 w-full rounded-md border border-border bg-surface-2/60 px-2 text-xs"
                    />
                  </Field>
                )}
              </div>
            )}

            {(deck || questions || course || module || backupResult?.ok || notebookResult?.ok) && (
              <div className="rounded-2xl border border-border bg-background/40 p-4">
                {deck && (
                  <>
                    <p className="flex items-center gap-2 font-display text-sm font-semibold">
                      <Layers className="size-4 text-primary" /> {deck.title}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {deck.subject} · {deck.questions.length} questions
                    </p>
                    {deck.description && (
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {deck.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {Object.entries(typeCounts).map(([type, count]) => (
                        <Badge key={type} variant="secondary">
                          {TYPE_LABELS[type] ?? type}: {count}
                        </Badge>
                      ))}
                      {deck.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}

                {!deck && questions && (
                  <>
                    <p className="flex items-center gap-2 font-display text-sm font-semibold">
                      <Layers className="size-4 text-primary" />
                      {questionsResult?.deckTitle ||
                        `${questions.length} question${questions.length === 1 ? "" : "s"}`}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {target
                        ? `Appending to “${target.title}”`
                        : `Creates a new deck${newDeckTitle.trim() ? ` named “${newDeckTitle.trim()}”` : ""}`}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {Object.entries(typeCounts).map(([type, count]) => (
                        <Badge key={type} variant="secondary">
                          {TYPE_LABELS[type] ?? type}: {count}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}

                {course && (
                  <>
                    <p className="flex items-center gap-2 font-display text-sm font-semibold">
                      <BookOpenCheck className="size-4 text-primary" /> {course.title}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {course.subject}
                      {course.level ? ` · ${course.level}` : ""}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge variant="secondary">{course.modules.length} modules</Badge>
                      <Badge variant="secondary">
                        {course.modules.reduce((sum, item) => sum + item.lessons.length, 0)} lessons
                      </Badge>
                      <Badge variant="secondary">
                        {course.modules.reduce(
                          (sum, item) =>
                            sum +
                            item.lessons.reduce(
                              (count, lesson) => count + lesson.questions.length,
                              0,
                            ),
                          0,
                        )}{" "}
                        questions
                      </Badge>
                      {course.finalExam && <Badge variant="secondary">Final exam</Badge>}
                    </div>
                  </>
                )}

                {module && (
                  <>
                    <p className="flex items-center gap-2 font-display text-sm font-semibold">
                      <Puzzle className="size-4 text-primary" /> {module.title}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {module.subject} · about {module.estimatedMinutes ?? 15} min
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge variant="secondary">{module.blocks.length} blocks</Badge>
                      <Badge variant="secondary">{module.questions.length} checkpoints</Badge>
                      {module.objectives.length > 0 && (
                        <Badge variant="secondary">{module.objectives.length} goals</Badge>
                      )}
                    </div>
                  </>
                )}

                {backupResult?.ok && (
                  <>
                    <p className="flex items-center gap-2 font-display text-sm font-semibold">
                      <Download className="size-4 text-primary" />
                      {backupResult.owner ? `${backupResult.owner}'s library` : "Knowly backup"}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Replaces everything currently on this device.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge variant="secondary">{backupResult.decks} decks</Badge>
                      <Badge variant="secondary">{backupResult.questions} cards</Badge>
                      <Badge variant="secondary">{backupResult.courses} courses</Badge>
                      <Badge variant="secondary">{backupResult.modules} modules</Badge>
                    </div>
                  </>
                )}

                {notebookResult?.ok && (
                  <>
                    <p className="flex items-center gap-2 font-display text-sm font-semibold">
                      <NotebookText className="size-4 text-primary" /> {notebookResult.title}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {notebookResult.pages} page{notebookResult.pages === 1 ? "" : "s"} of notes
                    </p>
                  </>
                )}
              </div>
            )}

            <ProblemList errors={errors} warnings={warnings} />
          </div>

          <div className="shrink-0 border-t border-border bg-surface px-5 py-3">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <p className="mr-auto text-[11px] text-muted-foreground">
                Nothing is added until you press import.
              </p>
              <Button variant="ghost" onClick={closeImportPanel}>
                Cancel
              </Button>
              <Button onClick={() => void doImport()} disabled={!canImport}>
                <Download className="size-4" /> {busy ? "Importing…" : actionLabel}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
