import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  Compass,
  FileText,
  FolderOpen,
  Heart,
  NotebookPen,
  PenLine,
  Plus,
  Search,
  Sparkles,
  Star,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app-page";
import { FeatureTour, useFeatureTour, type TourStep } from "@/components/feature-tour";
import { PageHeader } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { MathText } from "@/components/math/math-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createId } from "@/lib/id";
import { useKnowly } from "@/store/knowly";
import {
  deleteNotebook,
  importNotebookBundle,
  listNotebooks,
  putNotebook,
  putPage,
  searchNotes,
  storageEstimate,
  type NoteSearchHit,
} from "@/lib/notes/db";
import { importPdfPages } from "@/lib/notes/pdf";
import {
  emptyPage,
  NOTE_COLORS,
  PAGE_SIZES,
  PAGE_TEMPLATES,
  type NotebookMeta,
  type PageTemplate,
} from "@/lib/notes/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notes/")({
  head: () => ({
    meta: [
      { title: "Notebooks — Handwritten Notes, PDFs & Study Pages | Knowly" },
      {
        name: "description",
        content:
          "A local-first notebook workspace: pages, handwriting, highlights, text, images, study tape, PDF annotation, search and course links.",
      },
    ],
  }),
  component: NotesLibraryPage,
});

const NOTES_TOUR_STEPS: TourStep[] = [
  {
    eyebrow: "Welcome to Notebooks",
    title: "A paper workspace that lives on your device",
    description:
      "Notebooks are for thinking on the page: handwriting, highlights, typed notes, PDFs, images and study tape. Everything is saved on this device.",
    icon: NotebookPen,
    bullets: [
      "Unlimited pages with A4, Letter, square and wide sizes",
      "Automatic saving while you write",
      "Save one page, the whole notebook, or a copy you can move to another device",
    ],
  },
  {
    eyebrow: "Natural tools",
    title: "Write the way you already do",
    description:
      "Choose pen, pencil or highlighter, then adjust ink size in a proper horizontal control. Select, move and duplicate anything on the page.",
    icon: PenLine,
    bullets: [
      "Pressure-aware ink and a clean size picker",
      "Shapes, text, sticky notes, images and audio",
      "Study tape hides answers until you double-click",
    ],
  },
  {
    eyebrow: "Bring your material",
    title: "Annotate PDFs and control the page",
    description:
      "Import a PDF and each page becomes a canvas with searchable extracted text. Change the paper template or add a black page shade for focused night writing.",
    icon: FileText,
    bullets: [
      "PDF pages render locally, ready for annotation",
      "Page shade runs from completely off to deep black",
      "Search typed notes and extracted PDF text from the library",
    ],
  },
  {
    eyebrow: "Study from your notes",
    title: "Turn pages into active recall",
    description:
      "Get ready-made AI instructions from what you've written, and link notebooks to courses or decks — keeping your thinking close to your study plan.",
    icon: Sparkles,
    bullets: [
      "Get a summary, flashcards or a quiz from your own notes",
      "Link a notebook to a course lesson or practice deck",
      "Open notebook copies on any device",
    ],
  },
];

function NotesLibraryPage() {
  const { state } = useKnowly();
  const navigate = useNavigate();
  const tour = useFeatureTour("knowly.notes.tour.v1");
  const [notebooks, setNotebooks] = useState<NotebookMeta[]>([]);
  const [hits, setHits] = useState<NoteSearchHit[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NotebookMeta | null>(null);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    setNotebooks(await listNotebooks());
    setStorage(await storageEstimate());
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void searchNotes(query).then((results) => {
        if (!cancelled) setHits(results);
      });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return notebooks;
    return notebooks.filter((notebook) =>
      [notebook.title, notebook.subject, notebook.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [notebooks, query]);

  const toggleFavorite = async (notebook: NotebookMeta) => {
    const next = { ...notebook, favorite: !notebook.favorite, updatedAt: Date.now() };
    await putNotebook(next);
    setNotebooks((items) => items.map((item) => (item.id === notebook.id ? next : item)));
  };

  const importJson = async (file: File) => {
    try {
      const raw = await file.text();
      const notebook = await importNotebookBundle(raw);
      if (!notebook) {
        toast.error("That file doesn't look like a Knowly notebook");
        return;
      }
      toast.success("Notebook imported");
      navigate({ to: "/notes/$notebookId", params: { notebookId: notebook.id } });
    } catch (error) {
      toast.error("Couldn't import that notebook", {
        description: error instanceof Error ? error.message : "Knowly may be out of room to save.",
      });
    }
  };

  const importPdf = async (file: File) => {
    toast.info("Importing PDF pages…", { description: "Rendering each page for annotation." });
    try {
      const notebookId = createId();
      const pages = await importPdfPages(file, notebookId);
      if (!pages.length) {
        toast.error("No pages could be read from that PDF");
        return;
      }
      const now = Date.now();
      const notebook: NotebookMeta = {
        id: notebookId,
        title: file.name.replace(/\.pdf$/i, ""),
        subject: "Imported PDF",
        color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
        emoji: "📄",
        tags: ["pdf"],
        favorite: false,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
        pageIds: pages.map((page) => page.id),
        bookmarkedPageIds: [],
        defaultTemplate: "blank",
        width: pages[0].width,
        height: pages[0].height,
      };
      await putNotebook(notebook);
      for (const page of pages) await putPage(page);
      toast.success("PDF imported", { description: `${pages.length} pages ready to annotate` });
      navigate({ to: "/notes/$notebookId", params: { notebookId } });
    } catch (error) {
      toast.error("Couldn't import that PDF", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <AppPage>
      <PageHeader
        title="Notebooks"
        description="Handwritten pages, typed notes, PDFs and study tape — stored on this device. Link a notebook to a course or deck whenever you want."
        action={
          <>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void importJson(file);
              }}
            />
            <input
              ref={pdfRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void importPdf(file);
              }}
            />
            <Button variant="outline" onClick={() => importRef.current?.click()}>
              <UploadCloud className="size-4" /> Import notebook
            </Button>
            <Button variant="outline" onClick={() => pdfRef.current?.click()}>
              <FileText className="size-4" /> Import PDF
            </Button>
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="size-4" /> New notebook
            </Button>
            <Button variant="ghost" size="icon" onClick={tour.replay} aria-label="Replay tour">
              <Compass className="size-4" />
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notebooks and typed note text…"
            className="pl-9"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <Badge variant="outline">{notebooks.length} notebooks</Badge>
        {storage && storage.quota > 0 && (
          <Badge variant="outline">{(storage.usage / 1024 / 1024).toFixed(1)} MB used</Badge>
        )}
      </div>

      {newOpen && (
        <NewNotebookPanel
          onClose={() => setNewOpen(false)}
          onCreated={async (notebook) => {
            setNewOpen(false);
            await putNotebook(notebook);
            const page = emptyPage(
              notebook.id,
              notebook.defaultTemplate,
              notebook.width,
              notebook.height,
            );
            await putPage(page);
            await putNotebook({ ...notebook, pageIds: [page.id] });
            navigate({ to: "/notes/$notebookId", params: { notebookId: notebook.id } });
          }}
        />
      )}

      {loading ? (
        <div className="grid min-h-48 place-items-center">
          <div className="size-7 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : notebooks.length === 0 ? (
        <EmptyNotebooks
          onCreate={() => setNewOpen(true)}
          onImport={() => pdfRef.current?.click()}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((notebook) => (
              <NotebookCard
                key={notebook.id}
                notebook={notebook}
                onFavorite={() => toggleFavorite(notebook)}
                onDelete={() => setDeleteTarget(notebook)}
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="panel mt-4 p-8 text-center text-sm text-muted-foreground">
              No notebook titles match that search.
            </div>
          )}
        </>
      )}

      {query.trim() && hits.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-xl font-semibold">Inside your notes</h2>
          <div className="space-y-2">
            {hits.map((hit) => (
              <Link
                key={`${hit.page.id}-${hit.snippet.slice(0, 12)}`}
                to="/notes/$notebookId"
                params={{ notebookId: hit.notebook.id }}
                search={{ page: hit.page.id }}
                className="panel flex flex-wrap items-center gap-3 p-3 text-sm transition-colors hover:border-primary/30"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface2 text-sm">
                  {hit.notebook.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{hit.notebook.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {hit.snippet}
                  </span>
                </span>
                <Badge variant="outline">Open page</Badge>
              </Link>
            ))}
          </div>
        </section>
      )}

      <FeatureTour
        open={tour.open}
        onOpenChange={tour.setOpen}
        onDismiss={tour.dismiss}
        steps={NOTES_TOUR_STEPS}
        product="Knowly Notebooks"
        finishLabel="Start writing"
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this notebook?"
        description={
          deleteTarget
            ? `“${deleteTarget.title}” and all of its pages will be removed from this device.`
            : undefined
        }
        confirmLabel="Delete notebook"
        destructive
        onConfirm={() => {
          if (!deleteTarget) return;
          void deleteNotebook(deleteTarget.id).then(() => {
            setNotebooks((items) => items.filter((item) => item.id !== deleteTarget.id));
            setDeleteTarget(null);
            toast.success("Notebook deleted");
          });
        }}
      />
    </AppPage>
  );
}

function NotebookCard({
  notebook,
  onFavorite,
  onDelete,
}: {
  notebook: NotebookMeta;
  onFavorite: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="panel group flex min-w-0 flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-primary/30">
      <Link
        to="/notes/$notebookId"
        params={{ notebookId: notebook.id }}
        className="relative block aspect-[4/3] overflow-hidden"
        style={{ background: `linear-gradient(140deg, ${notebook.color}, ${notebook.color}55)` }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_oklab,var(--foreground)_14%,transparent),transparent_45%)]" />
        <div className="absolute inset-x-5 bottom-5 top-8 rounded-xl border border-border bg-card/90 p-4 shadow-xl">
          <p className="line-clamp-2 font-display text-lg font-semibold text-foreground">
            {notebook.emoji} {notebook.title}
          </p>
          <div className="mt-3 space-y-1.5">
            <div className="h-1.5 rounded bg-muted-foreground/30" />
            <div className="h-1.5 w-4/5 rounded bg-muted-foreground/25" />
            <div className="h-1.5 w-3/5 rounded bg-muted-foreground/20" />
          </div>
          <p className="absolute bottom-3 right-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {notebook.pageIds.length} pages
          </p>
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate font-display text-base font-semibold">{notebook.title}</h2>
            <p className="truncate text-xs text-muted-foreground">
              {notebook.subject} · edited {new Date(notebook.updatedAt).toLocaleDateString()}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {notebook.pageIds.length} pages
              {notebook.sections && notebook.sections.length > 1
                ? ` · ${notebook.sections.length} sections`
                : ""}
            </p>
          </div>
          <button
            type="button"
            aria-label={notebook.favorite ? "Remove favourite" : "Favourite notebook"}
            onClick={onFavorite}
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-surface2",
              notebook.favorite && "text-warning",
            )}
          >
            <Heart className={cn("size-4", notebook.favorite && "fill-current")} />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {notebook.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline">
              <MathText text={tag} />
            </Badge>
          ))}
          {notebook.linkedCourseId && <Badge variant="outline">course</Badge>}
          {notebook.linkedDeckId && <Badge variant="outline">deck</Badge>}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <Link
            to="/notes/$notebookId"
            params={{ notebookId: notebook.id }}
            className="text-sm font-medium text-primary"
          >
            Open notebook
          </Link>
          <button
            type="button"
            onClick={onDelete}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyNotebooks({ onCreate, onImport }: { onCreate: () => void; onImport: () => void }) {
  return (
    <div className="panel flex flex-col items-center px-6 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
        <NotebookPen className="size-7" />
      </span>
      <h2 className="mt-4 font-display text-xl font-semibold">A blank page is waiting</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Create a notebook for lectures, annotate a PDF, or turn a course lesson into a linked
        notebook. Everything stays on this device.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={onCreate}>
          <Plus className="size-4" /> New notebook
        </Button>
        <Button variant="outline" onClick={onImport}>
          <FileText className="size-4" /> Import PDF
        </Button>
      </div>
    </div>
  );
}

function NewNotebookPanel({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (notebook: NotebookMeta) => void;
}) {
  const { state } = useKnowly();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [template, setTemplate] = useState<PageTemplate>("lined");
  const [size, setSize] = useState<keyof typeof PAGE_SIZES>("a4");
  const [color, setColor] = useState(NOTE_COLORS[0]);
  const [emoji, setEmoji] = useState("📝");
  const [courseId, setCourseId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [deckId, setDeckId] = useState("");

  const selectedCourse = state.courses.find((course) => course.id === courseId);
  const lessons = selectedCourse?.modules.flatMap((module) => module.lessons) ?? [];

  const create = () => {
    const now = Date.now();
    const pageSize = PAGE_SIZES[size];
    onCreated({
      id: createId(),
      title: title.trim() || "Untitled notebook",
      subject: subject.trim() || "General",
      color,
      emoji,
      tags: [],
      favorite: false,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      pageIds: [],
      bookmarkedPageIds: [],
      defaultTemplate: template,
      width: pageSize.width,
      height: pageSize.height,
      linkedCourseId: courseId || undefined,
      linkedLessonId: lessonId || undefined,
      linkedDeckId: deckId || undefined,
    });
  };

  return (
    <section className="panel anim-fade-up mb-6 p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">New notebook</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a paper style now; you can change it page by page later.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X className="size-4" />
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Biology lecture notes"
          />
        </div>
        <div className="space-y-2">
          <Label>Subject</Label>
          <Input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Biology"
          />
        </div>
        <div className="space-y-2">
          <Label>Paper</Label>
          <Select value={template} onValueChange={(value) => setTemplate(value as PageTemplate)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_TEMPLATES.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Page size</Label>
          <Select value={size} onValueChange={(value) => setSize(value as keyof typeof PAGE_SIZES)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PAGE_SIZES).map(([id, item]) => (
                <SelectItem key={id} value={id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Cover colour</Label>
          <div className="flex flex-wrap gap-1.5">
            {NOTE_COLORS.map((item) => (
              <button
                key={item}
                type="button"
                aria-label={`Use ${item}`}
                onClick={() => setColor(item)}
                className={cn(
                  "size-7 rounded-full ring-2 ring-offset-2 ring-offset-background",
                  color === item ? "ring-primary" : "ring-transparent",
                )}
                style={{ background: item }}
              />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Emoji</Label>
          <Input value={emoji} onChange={(event) => setEmoji(event.target.value)} maxLength={4} />
        </div>
        <div className="space-y-2">
          <Label>Link to course (optional)</Label>
          <Select
            value={courseId}
            onValueChange={(value) => {
              setCourseId(value === "none" ? "" : value);
              setLessonId("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="No course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No course</SelectItem>
              {state.courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Link to lesson</Label>
          <Select
            value={lessonId}
            onValueChange={(value) => setLessonId(value === "none" ? "" : value)}
            disabled={!selectedCourse}
          >
            <SelectTrigger>
              <SelectValue placeholder="No lesson" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No lesson</SelectItem>
              {lessons.map((lesson) => (
                <SelectItem key={lesson.id} value={lesson.id}>
                  {lesson.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Link to deck (optional)</Label>
          <Select
            value={deckId}
            onValueChange={(value) => setDeckId(value === "none" ? "" : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="No deck" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No deck</SelectItem>
              {state.decks.map((deck) => (
                <SelectItem key={deck.id} value={deck.id}>
                  {deck.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={create}>
            <Check className="size-4" /> Create notebook
          </Button>
        </div>
      </div>
    </section>
  );
}
