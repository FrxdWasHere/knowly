import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eraser,
  FileJson,
  FileText,
  Hand,
  Highlighter,
  ImagePlus,
  LassoSelect,
  Maximize2,
  Mic,
  MicOff,
  NotebookPen,
  Palette,
  PenLine,
  Pencil,
  PencilRuler,
  Plus,
  Redo2,
  RectangleHorizontal,
  Shapes,
  Sparkles,
  StickyNote,
  Trash2,
  Type,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Module } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useKnowly } from "@/store/knowly";
import {
  exportNotebookBundle,
  getNotebook,
  listPages,
  putNotebook,
  putPage,
  deletePage,
} from "@/lib/notes/db";
import {
  cloneElement,
  downloadDataUrl,
  downloadText,
  drawTemplate,
  elementBounds,
  exportNotebookPdf,
  hitElement,
  loadImage,
  moveElement,
  pointInPolygon,
  renderPageToCanvas,
  renderPageToDataUrl,
  resizeElementToBounds,
} from "@/lib/notes/render";
import {
  buildNotesFlashcardPrompt,
  buildNotesQuizPrompt,
  buildNotesSummaryPrompt,
  collectNotebookText,
} from "@/lib/notes/study";
import {
  emptyPage,
  clampTemplateOpacity,
  HIGHLIGHTER_COLORS,
  NOTE_COLORS,
  PAGE_TEMPLATES,
  PEN_COLORS,
  withDefaultSection,
  type AudioElement,
  type NoteElement,
  type NotePage,
  type NoteTool,
  type NotebookMeta,
  type NotebookSection,
  type PageTemplate,
  type ShapeElement,
  type StrokeElement,
} from "@/lib/notes/types";
import { cn } from "@/lib/utils";
import { readableOn } from "@/lib/themes";

/** Read a theme CSS variable so canvas always draws in the current theme. */
function themePrimary() {
  if (typeof document === "undefined") return "#5aa9f8";
  const v = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
  return v || "#5aa9f8";
}

export const Route = createFileRoute("/_authenticated/notes/$notebookId")({
  validateSearch: (search: Record<string, unknown>): { page?: string } => ({
    page: typeof search.page === "string" ? search.page : undefined,
  }),
  head: () => ({
    meta: [{ title: "Notebook Editor — Handwriting, Pages & Study Tools | Knowly" }],
  }),
  component: NotebookEditorPage,
});

const TOOLS: { id: NoteTool; label: string; icon: typeof PenLine }[] = [
  { id: "pen", label: "Pen", icon: PenLine },
  { id: "pencil", label: "Pencil", icon: Pencil },
  { id: "highlighter", label: "Highlighter", icon: Highlighter },
  { id: "eraser", label: "Eraser", icon: Eraser },
  { id: "select", label: "Select / lasso", icon: LassoSelect },
  { id: "text", label: "Text", icon: Type },
  { id: "sticky", label: "Sticky note", icon: StickyNote },
  { id: "tape", label: "Study tape", icon: RectangleHorizontal },
  { id: "shape", label: "Shape", icon: Shapes },
  { id: "image", label: "Image", icon: ImagePlus },
  { id: "pan", label: "Pan", icon: Hand },
];

const TOOL_SHORT_LABELS: Partial<Record<NoteTool, string>> = {
  highlighter: "Marker",
  select: "Select",
  sticky: "Sticky",
  tape: "Tape",
};

type DragMode =
  "draw" | "erase" | "shape" | "tape" | "select-move" | "select-resize" | "lasso" | "pan" | null;

interface DragState {
  mode: DragMode;
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  points: number[];
  snapshot: NoteElement[];
  elements: NoteElement[];
  /** ids being moved — captured at pointer-down so React state can't lag behind */
  selection: string[];
  resizeId: string | null;
  resizeOrigin: { x: number; y: number; width: number; height: number } | null;
  resizeHandle: "nw" | "ne" | "sw" | "se";
  panStartX: number;
  panStartY: number;
  scrollLeft: number;
  scrollTop: number;
}

const emptyDrag = (): DragState => ({
  mode: null,
  pointerId: -1,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  points: [],
  snapshot: [],
  elements: [],
  selection: [],
  resizeId: null,
  resizeOrigin: null,
  resizeHandle: "se",
  panStartX: 0,
  panStartY: 0,
  scrollLeft: 0,
  scrollTop: 0,
});

function newElementId() {
  return `el_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function NotebookEditorPage() {
  const { notebookId } = Route.useParams();
  const { page: pageParam } = Route.useSearch();
  const { state, addModule } = useKnowly();
  const navigate = useNavigate();

  const [notebook, setNotebook] = useState<NotebookMeta | null>(null);
  const [pages, setPages] = useState<NotePage[]>([]);
  const [currentId, setCurrentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [tool, setTool] = useState<NoteTool>("pen");
  const [color, setColor] = useState(PEN_COLORS[0]);
  const [penWidth, setPenWidth] = useState(3);
  const [shapeKind, setShapeKind] = useState<ShapeElement["shape"]>("rect");
  const [zoom, setZoom] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [textSize, setTextSize] = useState(18);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [inkOpen, setInkOpen] = useState(false);
  const [pageStyleOpen, setPageStyleOpen] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const [studyMode, setStudyMode] = useState<"flashcards" | "summary" | "quiz">("flashcards");
  const [exporting, setExporting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [sectionEditor, setSectionEditor] = useState<{
    target: NotebookSection | null;
    name: string;
    color: string;
  } | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const interactionRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imagePointRef = useRef({ x: 180, y: 180 });
  const dragRef = useRef<DragState>(emptyDrag());
  const historyRef = useRef<Record<string, { past: NoteElement[][]; future: NoteElement[][] }>>({});
  const saveTimers = useRef<Map<string, number>>(new Map());
  const pendingPages = useRef<Map<string, NotePage>>(new Map());
  const appliedPageParam = useRef("");
  const initialFit = useRef(false);
  const notebookTimer = useRef<number | null>(null);
  const pageRef = useRef<NotePage | null>(null);
  const notebookRef = useRef<NotebookMeta | null>(null);
  const clipboardRef = useRef<NoteElement[]>([]);
  const zoomRef = useRef(1);
  const spaceHeldRef = useRef(false);
  const recorderRef = useRef<{
    recorder: MediaRecorder;
    chunks: Blob[];
    stream: MediaStream;
  } | null>(null);
  /** id of an element placed this gesture — editing starts on pointer-up, so the
   * browser's mousedown focus change can't blur (and instantly delete) it. */
  const pendingEditRef = useRef<string | null>(null);
  const moveFrameRef = useRef<number | null>(null);
  const eraseFrameRef = useRef<number | null>(null);

  const currentPage = pages.find((page) => page.id === currentId) ?? pages[0] ?? null;
  const pageSignature = pages.map((page) => page.id).join("|");
  pageRef.current = currentPage;
  notebookRef.current = notebook;
  zoomRef.current = zoom;

  const sections = notebook?.sections ?? [];
  const textbookModules =
    notebook?.type === "textbook" ? state.modules.filter((m) => m.notebookId === notebook.id) : [];
  const activeSection =
    sections.find((section) => section.id === activeSectionId) ?? sections[0] ?? null;
  /** Pages of the active section (unassigned pages live in the first section). */
  const visiblePages = activeSection
    ? pages.filter((page) => (page.sectionId ?? sections[0]?.id) === activeSection.id)
    : pages;

  /** OneNote-style canvas: grow the page down when content pushes past the bottom. */
  const ensurePageFits = (page: NotePage, elements: NoteElement[]): NotePage => {
    let maxBottom = 0;
    for (const element of elements) {
      const bounds = elementBounds(element);
      maxBottom = Math.max(maxBottom, bounds.y + bounds.height);
    }
    const needed = Math.ceil(maxBottom) + 180;
    if (needed <= page.height) return page;
    const grown = Math.min(12000, Math.ceil(needed / 240) * 240);
    return grown > page.height ? { ...page, height: grown } : page;
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([getNotebook(notebookId), listPages(notebookId)]).then(([meta, loaded]) => {
      if (cancelled) return;
      if (!meta) {
        setLoading(false);
        return;
      }
      setNotebook(meta);
      const repaired = withDefaultSection(meta);
      if (repaired.changed) {
        void putNotebook(repaired.meta);
      }
      setNotebook(repaired.meta);
      const byId = new Map(loaded.map((page) => [page.id, page]));
      const ordered = [
        ...meta.pageIds.map((id) => byId.get(id)).filter((page): page is NotePage => Boolean(page)),
        ...loaded.filter((page) => !meta.pageIds.includes(page.id)),
      ];
      setPages(ordered);
      setActiveSectionId(repaired.meta.sections?.[0]?.id ?? "");
      const preferred = pageParam && ordered.some((page) => page.id === pageParam) ? pageParam : "";
      setCurrentId(preferred || ordered[0]?.id || "");
      setLoading(false);

      if (!ordered.length) {
        const page = emptyPage(meta.id, meta.defaultTemplate, meta.width, meta.height);
        void putPage(page).then(() => {
          const next = { ...meta, pageIds: [page.id], updatedAt: Date.now() };
          setNotebook(next);
          setPages([page]);
          setCurrentId(page.id);
          void putNotebook(next);
        });
      }
    });
    return () => {
      cancelled = true;
    };
    // `pageParam` only picks the initial page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notebookId]);

  useEffect(() => {
    if (!pageParam || !pages.some((page) => page.id === pageParam)) return;
    const key = `${notebookId}:${pageParam}`;
    if (appliedPageParam.current === key) return;
    appliedPageParam.current = key;
    setCurrentId(pageParam);
  }, [pageParam, pages, notebookId]);

  useEffect(() => {
    if (!currentPage) return;
    setSelectedIds([]);
    setEditingId(null);
    const canvas = liveCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [currentPage?.id]);

  // Fit the first visible page to the viewport once, so notebooks are usable on mobile.
  useEffect(() => {
    if (loading || !currentPage || initialFit.current) return;
    const container = scrollRef.current;
    if (!container) return;
    initialFit.current = true;
    const available = Math.max(280, container.clientWidth - 48);
    setZoom(Math.min(1.15, Math.max(0.35, available / currentPage.width)));
    // Only the first page decides the initial zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, currentPage?.id]);

  // Render the page background, strokes, shapes and images.
  useEffect(() => {
    if (!currentPage) return;
    let cancelled = false;
    const displayPage: NotePage = {
      ...currentPage,
      elements: currentPage.elements.filter(
        (element) =>
          element.type === "stroke" || element.type === "shape" || element.type === "image",
      ),
    };
    void renderPageToCanvas(displayPage, 2).then((rendered) => {
      if (cancelled) return;
      const canvas = bgCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(rendered, 0, 0);
    });
    return () => {
      cancelled = true;
    };
  }, [currentPage]);

  // Render all thumbnails once when the page list changes, then keep only the
  // active page's thumbnail fresh while drawing.
  useEffect(() => {
    if (!pages.length) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void Promise.all(
        pages.map(async (page) => ({
          id: page.id,
          src: await renderPageToDataUrl(page, 0.24, "image/jpeg"),
        })),
      ).then((items) => {
        if (cancelled) return;
        setThumbnails(
          Object.fromEntries(items.filter((item) => item.src).map((item) => [item.id, item.src])),
        );
      });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // Re-run only when pages are added, removed or reordered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSignature]);

  useEffect(() => {
    if (!currentPage) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void renderPageToDataUrl(currentPage, 0.24, "image/jpeg").then((src) => {
        if (!cancelled && src) {
          setThumbnails((current) => ({ ...current, [currentPage.id]: src }));
        }
      });
    }, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [currentPage]);

  /** Copy/cut/paste for selected elements (OneNote-style clipboard keys). */
  const copySelectedElements = () => {
    const page = pageRef.current;
    if (!page || !selectedIds.length) return;
    const clones = selectedIds
      .map((id) => page.elements.find((element) => element.id === id))
      .filter((element): element is NoteElement => Boolean(element))
      .map((element) => cloneElement(element));
    if (clones.length) {
      clipboardRef.current = clones;
      toast.success(
        `Copied ${clones.length} item${clones.length === 1 ? "" : "s"} — Ctrl+V to paste`,
      );
    }
  };

  const pasteClipboard = () => {
    const page = pageRef.current;
    if (!page || !clipboardRef.current.length) return;
    const clones = clipboardRef.current.map((element) =>
      moveElement(cloneElement(element), 24, 24),
    );
    commitElements([...page.elements, ...clones], page.elements);
    setSelectedIds(clones.map((clone) => clone.id));
  };

  useEffect(() => {
    // Space temporarily pans the canvas from any tool — OneNote-style grab.
    const isTyping = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      return target instanceof Element && target.matches("input, textarea, [contenteditable=true]");
    };
    const onDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || isTyping(event)) return;
      if (!spaceHeldRef.current) event.preventDefault();
      spaceHeldRef.current = true;
      setSpaceHeld(true);
    };
    const onUp = () => {
      spaceHeldRef.current = false;
      setSpaceHeld(false);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onUp);
    };
  }, []);

  // Ctrl/⌘ + wheel zooms around the cursor (attach natively: React wheel
  // listeners are passive, and ctrl+wheel must not zoom the browser instead).
  useEffect(() => {
    const element = scrollRef.current;
    if (!element || !currentPage) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const current = zoomRef.current;
      const next = Math.min(2.5, Math.max(0.25, current - event.deltaY * 0.0022));
      if (next === current) return;
      const rect = element.getBoundingClientRect();
      const anchorX = event.clientX - rect.left + element.scrollLeft;
      const anchorY = event.clientY - rect.top + element.scrollTop;
      const ratio = next / current;
      setZoom(next);
      requestAnimationFrame(() => {
        const after = element.getBoundingClientRect();
        element.scrollLeft = anchorX * ratio - (event.clientX - after.left);
        element.scrollTop = anchorY * ratio - (event.clientY - after.top);
      });
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [Boolean(currentPage)]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!(target instanceof Element) || target.matches("input, textarea, [contenteditable=true]"))
        return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelectedIds(currentPage?.elements.map((element) => element.id) ?? []);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedIds.length) {
          event.preventDefault();
          deleteSelected();
        }
      } else if (event.key === "Escape") {
        setSelectedIds([]);
        setEditingId(null);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        copySelectedElements();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "x") {
        copySelectedElements();
        deleteSelected();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
        pasteClipboard();
      } else if (
        selectedIds.length &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        event.preventDefault();
        const distance = event.shiftKey ? 10 : 1;
        const dx =
          event.key === "ArrowLeft" ? -distance : event.key === "ArrowRight" ? distance : 0;
        const dy = event.key === "ArrowUp" ? -distance : event.key === "ArrowDown" ? distance : 0;
        const page = pageRef.current;
        if (page) {
          commitElements(
            page.elements.map((element) =>
              selectedIds.includes(element.id) ? moveElement(element, dx, dy) : element,
            ),
          );
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // Handlers intentionally close over the latest selection and page state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, currentPage]);

  useEffect(() => {
    return () => {
      for (const timer of saveTimers.current.values()) window.clearTimeout(timer);
      for (const page of pendingPages.current.values()) void putPage(page);
      if (notebookRef.current) void putNotebook(notebookRef.current);
      if (notebookTimer.current) window.clearTimeout(notebookTimer.current);
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const flush = () => {
      if (document.visibilityState !== "hidden") return;
      for (const page of pendingPages.current.values()) void putPage(page);
      if (notebookRef.current) void putNotebook(notebookRef.current);
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, []);

  const touchNotebook = (updates: Partial<NotebookMeta> = {}) => {
    const current = notebookRef.current;
    if (!current) return;
    const next = { ...current, ...updates, updatedAt: Date.now(), lastOpenedAt: Date.now() };
    notebookRef.current = next;
    setNotebook(next);
    if (notebookTimer.current) window.clearTimeout(notebookTimer.current);
    notebookTimer.current = window.setTimeout(() => {
      void putNotebook(next).catch(() => setSaveState("error"));
    }, 500);
  };

  const scheduleSave = (page: NotePage) => {
    setSaveState("saving");
    pendingPages.current.set(page.id, page);
    const existing = saveTimers.current.get(page.id);
    if (existing) window.clearTimeout(existing);
    const timer = window.setTimeout(() => {
      saveTimers.current.delete(page.id);
      pendingPages.current.delete(page.id);
      void putPage(page)
        .then(() => {
          setSaveState("saved");
          touchNotebook();
        })
        .catch(() => {
          setSaveState("error");
          toast.error("Couldn't save this page", {
            description: "Knowly may be out of room to save. Export a backup and free some space.",
          });
        });
    }, 450);
    saveTimers.current.set(page.id, timer);
  };

  const replacePage = (next: NotePage, save = true) => {
    setPages((current) => current.map((page) => (page.id === next.id ? next : page)));
    if (save) scheduleSave(next);
  };

  const pushHistory = (pageId: string, elements: NoteElement[]) => {
    const history = historyRef.current[pageId] ?? { past: [], future: [] };
    history.past.push(elements);
    if (history.past.length > 40) history.past.shift();
    history.future = [];
    historyRef.current[pageId] = history;
  };

  const commitElements = (elements: NoteElement[], base?: NoteElement[]) => {
    const page = pageRef.current;
    if (!page) return;
    pushHistory(page.id, base ?? page.elements);
    const fit = ensurePageFits(page, elements);
    const next = { ...fit, elements, updatedAt: Date.now() };
    replacePage(next);
  };

  const undo = () => {
    const page = pageRef.current;
    if (!page) return;
    const history = historyRef.current[page.id];
    if (!history?.past.length) return;
    const previous = history.past.pop() as NoteElement[];
    history.future.unshift(page.elements);
    const next = { ...page, elements: previous, updatedAt: Date.now() };
    replacePage(next);
    setSelectedIds([]);
  };

  const redo = () => {
    const page = pageRef.current;
    if (!page) return;
    const history = historyRef.current[page.id];
    if (!history?.future.length) return;
    const nextElements = history.future.shift() as NoteElement[];
    history.past.push(page.elements);
    const next = { ...page, elements: nextElements, updatedAt: Date.now() };
    replacePage(next);
    setSelectedIds([]);
  };

  const deleteSelected = () => {
    const page = pageRef.current;
    if (!page || !selectedIds.length) return;
    commitElements(page.elements.filter((element) => !selectedIds.includes(element.id)));
    setSelectedIds([]);
  };

  const duplicateSelected = () => {
    const page = pageRef.current;
    if (!page || !selectedIds.length) return;
    const copies = page.elements
      .filter((element) => selectedIds.includes(element.id))
      .map((element) => moveElement(cloneElement(element), 24, 24));
    commitElements([...page.elements, ...copies]);
    setSelectedIds(copies.map((element) => element.id));
  };

  const fitWidth = () => {
    const container = scrollRef.current;
    if (!container || !currentPage) return;
    const available = Math.max(280, container.clientWidth - 64);
    setZoom(Math.min(2, Math.max(0.35, available / currentPage.width)));
  };

  const updatePageTemplate = (template: PageTemplate) => {
    const page = pageRef.current;
    if (!page) return;
    replacePage({ ...page, template, updatedAt: Date.now() });
  };

  const updateTemplateOpacity = (value: number) => {
    const page = pageRef.current;
    if (!page) return;
    replacePage({
      ...page,
      templateOpacity: clampTemplateOpacity(value),
      updatedAt: Date.now(),
    });
  };

  const addPage = () => {
    if (!notebook || !currentPage) return;
    const page = {
      ...emptyPage(notebook.id, currentPage.template, currentPage.width, currentPage.height),
      sectionId: activeSection?.id,
      templateOpacity: clampTemplateOpacity(currentPage.templateOpacity),
    };
    void putPage(page);
    const nextPageIndex = visiblePages.findIndex((item) => item.id === currentPage.id);
    const nextPages = [...pages];
    const insertAt = pages.findIndex((item) => item.id === currentPage.id) + 1;
    nextPages.splice(insertAt, 0, page);
    // Keep insertion right after the current page even when sections interleave.
    const selectedNeighbor = visiblePages[nextPageIndex + 1];
    const finalOrder = selectedNeighbor
      ? [
          ...pages.slice(
            0,
            pages.findIndex((item) => item.id === selectedNeighbor.id),
          ),
          page,
          ...pages.slice(pages.findIndex((item) => item.id === selectedNeighbor.id)),
        ]
      : nextPages;
    setPages(finalOrder);
    setCurrentId(page.id);
    touchNotebook({ pageIds: finalOrder.map((item) => item.id) });
    toast.success("Page added");
  };

  const duplicatePage = (source: NotePage) => {
    if (!notebook) return;
    const now = Date.now();
    const copy: NotePage = {
      ...source,
      id: `pg_${Math.random().toString(36).slice(2, 10)}_${now.toString(36)}`,
      elements: source.elements.map((element) => cloneElement(element)),
      createdAt: now,
      updatedAt: now,
    };
    void putPage(copy);
    const index = pages.findIndex((page) => page.id === source.id);
    const nextPages = [...pages];
    nextPages.splice(index + 1, 0, copy);
    setPages(nextPages);
    setCurrentId(copy.id);
    touchNotebook({ pageIds: nextPages.map((item) => item.id) });
  };

  const removePage = async (id: string) => {
    if (!notebook || pages.length <= 1) return;
    const pending = saveTimers.current.get(id);
    if (pending) {
      window.clearTimeout(pending);
      saveTimers.current.delete(id);
    }
    pendingPages.current.delete(id);
    await deletePage(id);
    const nextPages = pages.filter((page) => page.id !== id);
    setPages(nextPages);
    if (currentId === id) setCurrentId(nextPages[0]?.id ?? "");
    touchNotebook({
      pageIds: nextPages.map((page) => page.id),
      bookmarkedPageIds: notebook.bookmarkedPageIds.filter((pageId) => pageId !== id),
    });
    setDeleteTarget(null);
    toast.success("Page deleted");
  };

  /** Reorder within the section: swap with the neighbouring section page only. */
  const movePage = (id: string, direction: -1 | 1) => {
    const order = visiblePages.map((page) => page.id);
    const position = order.indexOf(id);
    const neighbour = position + direction;
    if (position < 0 || neighbour < 0 || neighbour >= order.length) return;
    const globalIndex = (pageId: string) => pages.findIndex((page) => page.id === pageId);
    const next = [...pages];
    [next[globalIndex(order[position])], next[globalIndex(order[neighbour])]] = [
      next[globalIndex(order[neighbour])],
      next[globalIndex(order[position])],
    ];
    setPages(next);
    touchNotebook({ pageIds: next.map((page) => page.id) });
  };

  /* ------------------------- Sections (OneNote tabs) ------------------------ */

  const openNewSection = () => {
    setSectionEditor({
      target: null,
      name: "",
      color: NOTE_COLORS[sections.length % NOTE_COLORS.length]!,
    });
  };

  const saveSection = () => {
    if (!notebook || !sectionEditor) return;
    const name = sectionEditor.name.trim().slice(0, 40) || "Untitled section";
    if (sectionEditor.target) {
      const nextSections = notebook.sections!.map((section) =>
        section.id === sectionEditor.target!.id
          ? { ...section, name, color: sectionEditor.color }
          : section,
      );
      touchNotebook({ sections: nextSections });
    } else {
      const created: NotebookSection = {
        id: `sc_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`,
        name,
        color: sectionEditor.color,
        createdAt: Date.now(),
      };
      touchNotebook({ sections: [...(notebook.sections ?? []), created] });
      setActiveSectionId(created.id);
    }
    setSectionEditor(null);
  };

  const removeSection = (id: string) => {
    if (!notebook) return;
    const current = notebook.sections ?? [];
    if (current.length <= 1) return;
    const fallback = current.find((section) => section.id !== id)!;
    const remaining = current.filter((section) => section.id !== id);
    // Pages of the deleted section slide into the first remaining one.
    const moved = pages.filter((page) => page.sectionId === id);
    const nextPages = pages.map((page) =>
      page.sectionId === id ? { ...page, sectionId: fallback.id, updatedAt: Date.now() } : page,
    );
    setPages(nextPages);
    for (const page of moved) {
      void putPage({ ...page, sectionId: fallback.id });
    }
    touchNotebook({ sections: remaining });
    setActiveSectionId(remaining[0]!.id);
    setSectionEditor(null);
  };

  /** Move a page to a different section tab (OneNote lets you drop pages
   * across sections; a cycle button keeps the touch surface small). */
  const movePageToSection = (id: string, direction: 1 | -1) => {
    if (!notebook) return;
    const list = notebook.sections ?? [];
    if (list.length < 2) return;
    const pageIndex = visiblePages.findIndex((page) => page.id === id);
    if (pageIndex < 0) return;
    const nextIndex =
      (list.findIndex((section) => section.id === activeSection?.id) + direction + list.length) %
      list.length;
    const target = list[nextIndex];
    const page = pages.find((item) => item.id === id);
    if (!page || !target) return;
    const updated: NotePage = { ...page, sectionId: target.id, updatedAt: Date.now() };
    replacePage(updated);
    void putPage(updated);
    setActiveSectionId(target.id);
    toast.success(`Moved to “${target.name}”`);
  };

  const toggleBookmark = (id: string) => {
    if (!notebook) return;
    const bookmarks = notebook.bookmarkedPageIds.includes(id)
      ? notebook.bookmarkedPageIds.filter((pageId) => pageId !== id)
      : [...notebook.bookmarkedPageIds, id];
    touchNotebook({ bookmarkedPageIds: bookmarks });
  };

  const startEditing = (element: NoteElement) => {
    if (element.type !== "text" && element.type !== "sticky") return;
    setEditingId(element.id);
    setEditText(element.text);
  };

  const finishEditing = (value = editText, contentHeight?: number) => {
    const page = pageRef.current;
    if (!page || !editingId) return;
    const element = page.elements.find((item) => item.id === editingId);
    if (!element || (element.type !== "text" && element.type !== "sticky")) {
      setEditingId(null);
      return;
    }
    // Empty text boxes are valid objects too: blur should not make the box vanish.
    if (value !== element.text) {
      commitElements(
        page.elements.map((item) =>
          item.id === editingId && (item.type === "text" || item.type === "sticky")
            ? { ...item, text: value, height: Math.max(item.height, contentHeight ?? item.height) }
            : item,
        ),
      );
    }
    setEditingId(null);
    setEditText("");
  };

  /** Tool switch that keeps the ink colour from the right palette. */
  const changeTool = (next: NoteTool) => {
    if (next === "highlighter" && !HIGHLIGHTER_COLORS.includes(color)) {
      setColor(HIGHLIGHTER_COLORS[0]!);
    } else if (
      (next === "pen" || next === "pencil" || next === "text" || next === "shape") &&
      HIGHLIGHTER_COLORS.includes(color)
    ) {
      setColor(PEN_COLORS[0]!);
    }
    setSelectedIds([]);
    setEditingId(null);
    setTool(next);
  };

  const editingElement = currentPage
    ? currentPage.elements.find((element) => element.id === editingId)
    : undefined;
  const editingText = editingElement?.type === "text" ? editingElement : undefined;
  const selectedText = currentPage?.elements.find(
    (element): element is Extract<NoteElement, { type: "text" }> =>
      selectedIds.length === 1 && element.id === selectedIds[0] && element.type === "text",
  );

  /** Ribbon font controls: tweak the text box being composed (or the size
   * default for the next one). */
  const updateEditingText = (patch: {
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    align?: "left" | "center" | "right";
  }) => {
    if (!currentPage) return;
    const targetId = editingText?.id ?? selectedText?.id;
    if (!targetId) {
      if (patch.fontSize !== undefined) setTextSize(patch.fontSize);
      return;
    }
    commitElements(
      currentPage.elements.map((element) =>
        element.id === targetId && element.type === "text" ? { ...element, ...patch } : element,
      ),
    );
  };

  /** Palette click: sets the ink colour for new elements and re-colours the
   * text box being edited right away. */
  const applyColor = (next: string) => {
    setColor(next);
    const targetId = editingText?.id ?? selectedText?.id;
    if (currentPage && targetId) {
      commitElements(
        currentPage.elements.map((element) =>
          element.id === targetId && element.type === "text"
            ? { ...element, color: next }
            : element,
        ),
      );
    }
  };

  const pointFromEvent = (event: React.PointerEvent) => {
    const rect = interactionRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0, pressure: 0.5 };
    return {
      x: (event.clientX - rect.left) / zoom,
      y: (event.clientY - rect.top) / zoom,
      pressure: event.pressure || 0.5,
    };
  };

  const liveContext = () => {
    const canvas = liveCanvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    return ctx;
  };

  const clearLive = () => {
    const canvas = liveCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const drawDraftStroke = (points: number[]) => {
    const ctx = liveContext();
    if (!ctx || points.length < 6) return;
    ctx.clearRect(0, 0, (currentPage?.width ?? 1000) + 20, (currentPage?.height ?? 1000) + 20);
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = tool === "highlighter" ? penWidth * 6 : penWidth;
    ctx.globalAlpha = tool === "highlighter" ? 0.32 : tool === "pencil" ? 0.82 : 1;
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let index = 3; index < points.length; index += 3) {
      ctx.lineTo(points[index], points[index + 1]);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  const drawShapePreview = (startX: number, startY: number, endX: number, endY: number) => {
    const ctx = liveContext();
    if (!ctx) return;
    clearLive();
    ctx.strokeStyle = color;
    ctx.lineWidth = penWidth;
    ctx.lineCap = "round";
    const width = endX - startX;
    const height = endY - startY;
    if (shapeKind === "rect") ctx.strokeRect(startX, startY, width, height);
    else if (shapeKind === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(
        startX + width / 2,
        startY + height / 2,
        Math.abs(width / 2),
        Math.abs(height / 2),
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  };

  const drawTapePreview = (startX: number, startY: number, endX: number, endY: number) => {
    const ctx = liveContext();
    if (!ctx) return;
    clearLive();
    ctx.fillStyle = "#f8d477";
    ctx.globalAlpha = 0.9;
    ctx.fillRect(startX, startY, endX - startX, endY - startY);
    ctx.globalAlpha = 1;
  };

  const drawLasso = (points: number[]) => {
    const ctx = liveContext();
    if (!ctx || points.length < 6) return;
    clearLive();
    ctx.strokeStyle = themePrimary();
    ctx.lineWidth = 1.4;
    ctx.setLineDash([6, 5]);
    for (const [alpha, fill] of [
      [0.8, false],
      [0.08, true],
    ] as const) {
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(points[0], points[1]);
      for (let index = 3; index < points.length; index += 3) {
        ctx.lineTo(points[index], points[index + 1]);
      }
      ctx.closePath();
      if (fill) ctx.fill();
      else ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  };

  const topElementAt = (page: NotePage, x: number, y: number) => {
    for (let index = page.elements.length - 1; index >= 0; index -= 1) {
      const element = page.elements[index];
      if (hitElement(element, x, y, 8)) return element;
    }
    return null;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!currentPage) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-note-resize-handle]")) return;
    if (target.closest("[data-note-editable]")) return;
    if (target.closest("[data-note-audio-control]")) return;
    if (editingId) finishEditing();
    const point = pointFromEvent(event);
    const page = currentPage;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some browsers reject synthetic or ended pointers; drawing still works.
    }
    const drag = emptyDrag();
    drag.pointerId = event.pointerId;
    drag.startX = point.x;
    drag.startY = point.y;
    drag.lastX = point.x;
    drag.lastY = point.y;
    drag.panStartX = event.clientX;
    drag.panStartY = event.clientY;
    drag.scrollLeft = scrollRef.current?.scrollLeft ?? 0;
    drag.scrollTop = scrollRef.current?.scrollTop ?? 0;

    if (tool === "pan" || event.button === 1 || spaceHeldRef.current) {
      // Middle-drag pan, or Space-held temporary pan from any tool (OneNote-style).
      if (event.button === 1) event.preventDefault();
      drag.mode = "pan";
      dragRef.current = drag;
      return;
    }

    if (tool === "pen" || tool === "pencil" || tool === "highlighter") {
      drag.mode = "draw";
      drag.points = [point.x, point.y, point.pressure];
      drag.snapshot = page.elements;
      drag.elements = page.elements;
      clearLive();
      drawDraftStroke(drag.points);
      dragRef.current = drag;
      return;
    }

    if (tool === "eraser") {
      drag.mode = "erase";
      drag.snapshot = page.elements;
      drag.elements = page.elements;
      dragRef.current = drag;
      eraseAt(page, point.x, point.y, event.pointerId);
      return;
    }

    if (tool === "shape" || tool === "tape") {
      drag.mode = tool === "shape" ? "shape" : "tape";
      drag.snapshot = page.elements;
      drag.elements = page.elements;
      dragRef.current = drag;
      return;
    }

    if (tool === "text") {
      const element: NoteElement = {
        id: newElementId(),
        type: "text",
        x: point.x,
        y: point.y,
        width: Math.max(60, Math.min(320, page.width - point.x - 20)),
        height: 100,
        text: "",
        fontSize: textSize,
        color,
      };
      commitElements([...page.elements, element]);
      setSelectedIds([element.id]);
      pendingEditRef.current = element.id;
      dragRef.current = drag;
      return;
    }

    if (tool === "sticky") {
      const element: NoteElement = {
        id: newElementId(),
        type: "sticky",
        x: Math.max(10, point.x - 90),
        y: Math.max(10, point.y - 60),
        width: 220,
        height: 160,
        text: "",
        color: "#fef3a5",
      };
      commitElements([...page.elements, element]);
      setSelectedIds([element.id]);
      pendingEditRef.current = element.id;
      dragRef.current = drag;
      return;
    }

    if (tool === "image") {
      imagePointRef.current = { x: point.x, y: point.y };
      imageInputRef.current?.click();
      return;
    }

    if (tool === "select") {
      const hit = topElementAt(page, point.x, point.y);
      if (hit) {
        const additive = event.shiftKey || event.ctrlKey || event.metaKey;
        const alreadySelected = selectedIds.includes(hit.id);
        const nextSelection = additive
          ? alreadySelected
            ? selectedIds.filter((id) => id !== hit.id)
            : [...selectedIds, hit.id]
          : alreadySelected
            ? selectedIds
            : [hit.id];
        setSelectedIds(nextSelection);
        if (nextSelection.includes(hit.id)) {
          drag.mode = "select-move";
          drag.selection = nextSelection;
          drag.snapshot = page.elements;
          drag.elements = page.elements;
        } else {
          setSelectedIds(nextSelection);
        }
      } else {
        setSelectedIds([]);
        drag.mode = "lasso";
        // Keep the same [x, y, pressure] triple layout the move handler appends,
        // so the closing polygon lines up with the real drawn path.
        drag.points = [point.x, point.y, 0.5];
      }
      dragRef.current = drag;
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.mode || drag.pointerId !== event.pointerId || !currentPage) return;
    const point = pointFromEvent(event);

    if (drag.mode === "pan") {
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = drag.scrollLeft - (event.clientX - drag.panStartX);
        scrollRef.current.scrollTop = drag.scrollTop - (event.clientY - drag.panStartY);
      }
      return;
    }

    if (drag.mode === "draw") {
      drag.points.push(point.x, point.y, point.pressure);
      drawDraftStroke(drag.points);
      return;
    }

    if (drag.mode === "erase") {
      eraseAt(currentPage, point.x, point.y, event.pointerId);
      return;
    }

    if (drag.mode === "shape") {
      drawShapePreview(drag.startX, drag.startY, point.x, point.y);
      drag.lastX = point.x;
      drag.lastY = point.y;
      return;
    }

    if (drag.mode === "tape") {
      drawTapePreview(drag.startX, drag.startY, point.x, point.y);
      drag.lastX = point.x;
      drag.lastY = point.y;
      return;
    }

    if (drag.mode === "lasso") {
      drag.points.push(point.x, point.y, 0.5);
      drawLasso(drag.points);
      return;
    }

    if (drag.mode === "select-resize" && drag.resizeId && drag.resizeOrigin) {
      const { x, y, width, height } = drag.resizeOrigin;
      const source = { x, y, width, height };
      const resizedElement = drag.elements.find((item) => item.id === drag.resizeId);
      const minSize = Math.max(
        24,
        resizedElement?.type === "text" ? resizedElement.fontSize * 2 : 24,
      );
      const handle = drag.resizeHandle;
      const movingLeft = handle === "nw" || handle === "sw";
      const movingTop = handle === "nw" || handle === "ne";
      const rawWidth = width + (movingLeft ? drag.startX - point.x : point.x - drag.startX);
      const rawHeight = height + (movingTop ? drag.startY - point.y : point.y - drag.startY);
      const nextWidth = Math.max(minSize, rawWidth);
      const nextHeight = Math.max(minSize, rawHeight);
      const target = {
        x: movingLeft ? x + width - nextWidth : x,
        y: movingTop ? y + height - nextHeight : y,
        width: nextWidth,
        height: nextHeight,
      };
      drag.elements = drag.elements.map((element) =>
        element.id === drag.resizeId ? resizeElementToBounds(element, source, target) : element,
      );
      if (moveFrameRef.current === null) {
        moveFrameRef.current = window.requestAnimationFrame(() => {
          moveFrameRef.current = null;
          const live = pageRef.current;
          if (live) {
            replacePage(
              { ...live, elements: dragRef.current.elements, updatedAt: Date.now() },
              false,
            );
          }
        });
      }
      return;
    }

    if (drag.mode === "select-move") {
      const dx = point.x - drag.lastX;
      const dy = point.y - drag.lastY;
      if (!dx && !dy) return;
      drag.elements = drag.elements.map((element) =>
        drag.selection.includes(element.id) ? moveElement(element, dx, dy) : element,
      );
      drag.lastX = point.x;
      drag.lastY = point.y;
      // One React+canvas render per animation frame keeps dragging smooth.
      if (moveFrameRef.current === null) {
        moveFrameRef.current = window.requestAnimationFrame(() => {
          moveFrameRef.current = null;
          const live = pageRef.current;
          if (live) {
            replacePage(
              { ...live, elements: dragRef.current.elements, updatedAt: Date.now() },
              false,
            );
          }
        });
      }
    }
  };

  const eraseAt = (page: NotePage, x: number, y: number, pointerId: number) => {
    const drag = dragRef.current;
    if (drag.pointerId !== pointerId) return;
    const next = drag.elements.filter((element) => !hitElement(element, x, y, 9));
    if (next.length === drag.elements.length) return;
    drag.elements = next;
    if (eraseFrameRef.current === null) {
      eraseFrameRef.current = window.requestAnimationFrame(() => {
        eraseFrameRef.current = null;
        replacePage({ ...page, elements: dragRef.current.elements, updatedAt: Date.now() }, false);
      });
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const page = pageRef.current;
    if (!page || drag.pointerId !== event.pointerId) return;
    const point = pointFromEvent(event);
    if (moveFrameRef.current !== null) {
      window.cancelAnimationFrame(moveFrameRef.current);
      moveFrameRef.current = null;
    }
    if (eraseFrameRef.current !== null) {
      window.cancelAnimationFrame(eraseFrameRef.current);
      eraseFrameRef.current = null;
    }

    if (drag.mode === "draw" && drag.points.length >= 3) {
      // A quick tap should still leave a dot, not disappear entirely.
      const points =
        drag.points.length < 6 ? [...drag.points, drag.points[0], drag.points[1]] : drag.points;
      const stroke: StrokeElement = {
        id: newElementId(),
        type: "stroke",
        tool: tool === "highlighter" ? "highlighter" : tool === "pencil" ? "pencil" : "pen",
        points,
        color: tool === "highlighter" ? color : color,
        width: tool === "highlighter" ? penWidth * 6 : penWidth,
        opacity: tool === "highlighter" ? 0.45 : tool === "pencil" ? 0.85 : 1,
      };
      commitElements([...page.elements, stroke], drag.snapshot);
    } else if (drag.mode === "erase") {
      pushHistory(page.id, drag.snapshot);
      scheduleSave({ ...page, elements: drag.elements, updatedAt: Date.now() });
    } else if (drag.mode === "shape") {
      const width = point.x - drag.startX;
      const height = point.y - drag.startY;
      if (Math.abs(width) > 4 || Math.abs(height) > 4) {
        const isLine = shapeKind === "line" || shapeKind === "arrow";
        const shape: ShapeElement = {
          id: newElementId(),
          type: "shape",
          shape: shapeKind,
          x: isLine ? drag.startX : Math.min(drag.startX, point.x),
          y: isLine ? drag.startY : Math.min(drag.startY, point.y),
          width: isLine ? width : Math.abs(width),
          height: isLine ? height : Math.abs(height),
          stroke: color,
          strokeWidth: penWidth,
        };
        commitElements([...page.elements, shape], drag.snapshot);
      }
    } else if (drag.mode === "tape") {
      const x = Math.min(drag.startX, point.x);
      const y = Math.min(drag.startY, point.y);
      const width = Math.abs(point.x - drag.startX);
      const height = Math.abs(point.y - drag.startY);
      if (width > 8 && height > 8) {
        commitElements(
          [
            ...page.elements,
            {
              id: newElementId(),
              type: "tape",
              x,
              y,
              width,
              height,
              color: "#f8d477",
              revealed: false,
            },
          ],
          drag.snapshot,
        );
      }
    } else if (drag.mode === "select-move" || drag.mode === "select-resize") {
      pushHistory(page.id, drag.snapshot);
      const fit = ensurePageFits(page, drag.elements);
      scheduleSave({ ...fit, elements: drag.elements, updatedAt: Date.now() });
    } else if (drag.mode === "lasso") {
      const polygon: { x: number; y: number }[] = [];
      for (let index = 0; index < drag.points.length; index += 3) {
        polygon.push({ x: drag.points[index], y: drag.points[index + 1] });
      }
      if (polygon.length >= 3) {
        const selected = page.elements
          .filter((element) => {
            if (element.type === "stroke") {
              for (let index = 0; index < element.points.length; index += 3) {
                if (pointInPolygon(element.points[index], element.points[index + 1], polygon)) {
                  return true;
                }
              }
              return false;
            }
            const bounds = elementBounds(element);
            return pointInPolygon(
              bounds.x + bounds.width / 2,
              bounds.y + bounds.height / 2,
              polygon,
            );
          })
          .map((element) => element.id);
        setSelectedIds(selected);
        if (!selected.length)
          toast.message("Nothing selected", { description: "Draw around notes to select them." });
      }
    }

    clearLive();
    dragRef.current = emptyDrag();
    if (interactionRef.current?.hasPointerCapture(event.pointerId)) {
      interactionRef.current.releasePointerCapture(event.pointerId);
    }
    if (pendingEditRef.current) {
      const id = pendingEditRef.current;
      pendingEditRef.current = null;
      setSelectedIds([id]);
      setEditingId(id);
      setEditText("");
    }
  };

  const startResize = (
    event: React.PointerEvent<HTMLButtonElement>,
    element: NoteElement,
    handle: DragState["resizeHandle"],
  ) => {
    if (!currentPage) return;
    event.preventDefault();
    event.stopPropagation();
    const point = pointFromEvent(event);
    const drag = emptyDrag();
    drag.mode = "select-resize";
    drag.pointerId = event.pointerId;
    drag.startX = point.x;
    drag.startY = point.y;
    drag.snapshot = currentPage.elements;
    drag.elements = currentPage.elements;
    drag.resizeId = element.id;
    drag.resizeOrigin = elementBounds(element);
    drag.resizeHandle = handle;
    dragRef.current = drag;
    setSelectedIds([element.id]);
    try {
      interactionRef.current?.setPointerCapture(event.pointerId);
    } catch {
      // Continue with pointer events when capture is unavailable.
    }
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!currentPage) return;
    const rect = interactionRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;
    const hit = topElementAt(currentPage, x, y);
    if (!hit) return;
    if (hit.type === "text" || hit.type === "sticky") {
      startEditing(hit);
    } else if (hit.type === "tape") {
      commitElements(
        currentPage.elements.map((element) =>
          element.id === hit.id && element.type === "tape"
            ? { ...element, revealed: !element.revealed }
            : element,
        ),
      );
    }
  };

  const handleImageChosen = async (file: File) => {
    if (!currentPage) return;
    try {
      const src = await fileToDataUrl(file);
      const image = await loadImage(src);
      const maxWidth = Math.min(460, currentPage.width * 0.65);
      const scale = Math.min(1, maxWidth / image.naturalWidth);
      const width = Math.max(80, image.naturalWidth * scale);
      const height = Math.max(60, image.naturalHeight * scale);
      const x = Math.max(10, Math.min(currentPage.width - width - 10, imagePointRef.current.x));
      const y = Math.max(10, Math.min(currentPage.height - height - 10, imagePointRef.current.y));
      commitElements([
        ...currentPage.elements,
        { id: newElementId(), type: "image", x, y, width, height, src },
      ]);
      toast.success("Image added");
    } catch {
      toast.error("Couldn't read that image");
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.recorder.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Audio recording isn't supported in this browser");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        void fileToDataUrl(blob).then((src) => {
          const page = pageRef.current;
          if (!page) return;
          const element: AudioElement = {
            id: newElementId(),
            type: "audio",
            x: 64,
            y: 64,
            width: Math.min(360, page.width - 128),
            height: 60,
            src,
            label: `Recording ${new Date().toLocaleTimeString()}`,
          };
          commitElements([...page.elements, element]);
          toast.success("Recording added to the page");
        });
        recorderRef.current = null;
        setRecording(false);
      };
      recorder.start();
      recorderRef.current = { recorder, chunks, stream };
      setRecording(true);
      toast.info("Recording… tap the microphone again to stop");
    } catch {
      toast.error("Microphone permission was denied");
    }
  };

  const generateStudy = (mode: "flashcards" | "summary" | "quiz") => {
    if (!notebook) return;
    const text = collectNotebookText(pages);
    if (!text.trim()) {
      toast.error("Add typed notes or import a PDF with selectable text first");
      return;
    }
    setStudyMode(mode);
    setStudyOpen(true);
  };

  const studyPrompt =
    notebook && studyMode === "summary"
      ? buildNotesSummaryPrompt(notebook.title, collectNotebookText(pages))
      : notebook && studyMode === "quiz"
        ? buildNotesQuizPrompt(notebook.title, collectNotebookText(pages))
        : notebook
          ? buildNotesFlashcardPrompt(notebook.title, collectNotebookText(pages))
          : "";

  const copyStudyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(studyPrompt);
      toast.success("Study prompt copied");
    } catch {
      toast.error("Couldn't copy the prompt", {
        description: "Select the text and copy it manually.",
      });
    }
  };

  const exportPng = async () => {
    if (!currentPage || !notebook) return;
    setExporting(true);
    try {
      const dataUrl = await renderPageToDataUrl(currentPage, 2);
      downloadDataUrl(dataUrl, `${notebook.title}-page-${pages.indexOf(currentPage) + 1}.png`);
      toast.success("Page exported as PNG");
    } catch {
      toast.error("Couldn't export this page");
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    if (!notebook) return;
    setExporting(true);
    try {
      await exportNotebookPdf(notebook.title, pages);
      toast.success("Notebook exported as PDF");
    } catch {
      toast.error("PDF export failed");
    } finally {
      setExporting(false);
    }
  };

  const exportJson = async () => {
    if (!notebook) return;
    setExporting(true);
    try {
      const bundle = await exportNotebookBundle(notebook.id);
      if (!bundle) throw new Error("Notebook not found");
      downloadText(
        bundle,
        `${notebook.title.replace(/[^a-z0-9-_ ]/gi, "").trim() || "notebook"}.json`,
      );
      toast.success("Notebook copy saved");
    } catch {
      toast.error("Couldn't save the notebook copy");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-40 grid place-items-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (!notebook || !currentPage) {
    return (
      <div className="fixed inset-0 z-40 grid place-items-center bg-background p-6">
        <div className="panel max-w-lg p-8 text-center">
          <NotebookPen className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-4 font-display text-xl font-semibold">Notebook not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            It may have been deleted from this device.
          </p>
          <Button asChild className="mt-5">
            <Link to="/notes">Back to notebooks</Link>
          </Button>
        </div>
      </div>
    );
  }

  const linkedCourse = state.courses.find((course) => course.id === notebook.linkedCourseId);
  const linkedDeck = state.decks.find((deck) => deck.id === notebook.linkedDeckId);
  const sectionIndex = Math.max(
    0,
    visiblePages.findIndex((page) => page.id === currentPage.id),
  );
  const goToPage = (delta: number) => {
    const target = visiblePages[sectionIndex + delta];
    if (target) setCurrentId(target.id);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleImageChosen(file);
        }}
      />

      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-background px-2 py-2 sm:px-3">
        <Button asChild variant="ghost" size="sm" aria-label="Back to notebooks">
          <Link to="/notes">
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Notebooks</span>
          </Link>
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Input
            value={notebook.title}
            onChange={(event) => touchNotebook({ title: event.target.value })}
            className="h-9 min-w-0 max-w-xs border-transparent bg-transparent px-2 font-display text-base font-semibold shadow-none focus-visible:border-border"
            aria-label="Notebook title"
          />
          <Badge
            variant="outline"
            className={cn(
              "hidden shrink-0 sm:inline-flex",
              saveState === "error" && "border-destructive/40 text-destructive",
            )}
          >
            {saveState === "saving" ? "Saving…" : saveState === "error" ? "Save failed" : "Saved"}
          </Badge>
        </div>

        <div className="hidden items-center gap-2 text-[11px] text-muted-foreground lg:flex">
          <span className="rounded-full bg-surface2 px-2 py-1">Local notebook</span>
          {linkedCourse && (
            <Link
              to="/courses/$courseId"
              params={{ courseId: linkedCourse.id }}
              className="max-w-40 truncate font-medium text-primary hover:underline"
            >
              {linkedCourse.title}
            </Link>
          )}
          {linkedDeck && (
            <Link
              to="/decks/$deckId"
              params={{ deckId: linkedDeck.id }}
              className="max-w-40 truncate font-medium text-primary hover:underline"
            >
              {linkedDeck.title}
            </Link>
          )}
        </div>
      </header>

      <ToolRibbon
        tool={tool}
        setTool={changeTool}
        color={color}
        setColor={applyColor}
        penWidth={penWidth}
        shapeKind={shapeKind}
        setShapeKind={setShapeKind}
        zoom={zoom}
        setZoom={setZoom}
        fitWidth={fitWidth}
        deleteSelected={deleteSelected}
        duplicateSelected={duplicateSelected}
        selectedCount={selectedIds.length}
        showTextOptions={tool === "text" || Boolean(editingText) || Boolean(selectedText)}
        textFontSize={editingText?.fontSize ?? selectedText?.fontSize ?? textSize}
        textBold={Boolean(editingText?.bold ?? selectedText?.bold)}
        textItalic={Boolean(editingText?.italic ?? selectedText?.italic)}
        onTextFont={updateEditingText}
        textAlign={editingText?.align ?? selectedText?.align ?? "left"}
        onTextAlign={(align) => updateEditingText({ align })}
        onOpenSize={() => setInkOpen(true)}
        onUndo={undo}
        onRedo={redo}
        recording={recording}
        onToggleRecording={toggleRecording}
        onStudy={(mode) => generateStudy(mode)}
        onExport={() => setExportOpen(true)}
        onPageStyle={() => setPageStyleOpen(true)}
        onAddPage={addPage}
        pageNumber={sectionIndex + 1}
        pageCount={visiblePages.length}
        onPrevPage={() => goToPage(-1)}
        onNextPage={() => goToPage(1)}
      />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-40 shrink-0 flex-col border-r border-border bg-surface/50 md:flex">
          {/* OneNote-style section tabs */}
          <div className="border-b border-border p-2">
            <div className="flex items-center justify-between px-1 pb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Sections
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={openNewSection}
                aria-label="New section"
              >
                <Plus className="size-3" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {sections.map((section) => {
                const active = section.id === activeSection?.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSectionId(section.id)}
                    onDoubleClick={() =>
                      setSectionEditor({
                        target: section,
                        name: section.name,
                        color: section.color,
                      })
                    }
                    title={`${section.name} — double-click to edit`}
                    className={cn(
                      "flex h-8 min-w-0 items-center gap-1 rounded-md border px-1.5 text-[10px] font-medium transition-colors",
                      active
                        ? "border-transparent shadow-sm"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                    style={
                      active
                        ? { backgroundColor: section.color, color: readableOn(section.color) }
                        : undefined
                    }
                  >
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: section.color }}
                    />
                    <span className="truncate">{section.name}</span>
                  </button>
                );
              })}
            </div>
            {activeSection && (
              <button
                type="button"
                onClick={() =>
                  setSectionEditor({
                    target: activeSection,
                    name: activeSection.name,
                    color: activeSection.color,
                  })
                }
                className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-md py-1 text-[10px] text-muted-foreground hover:bg-surface2 hover:text-foreground"
                aria-label="Edit current section"
              >
                <PencilRuler className="size-3" /> Edit section
              </button>
            )}
          </div>
          {notebook?.type === "textbook" && (
            <div className="border-b border-border p-2">
              <div className="flex items-center justify-between px-1 pb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Modules
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => {
                    if (!notebook) return;
                    const now = Date.now();
                    const mod: Module = {
                      id: `mod_${Math.random().toString(36).slice(2, 10)}_${now.toString(36)}`,
                      title: "Untitled module",
                      subject: notebook.subject,
                      color: notebook.color,
                      emoji: "📘",
                      tags: [],
                      isSTEM: false,
                      needsEquations: false,
                      needsGraphs: false,
                      objectives: [],
                      blocks: [
                        {
                          id: `b_${now}`,
                          type: "markdown",
                          markdown: "# New module\n\nStart writing…",
                        },
                      ],
                      questions: [],
                      linkedDeckIds: [],
                      estimatedMinutes: 15,
                      difficulty: 2,
                      notebookId: notebook.id,
                      createdAt: now,
                      updatedAt: now,
                    };
                    addModule(mod);
                    navigate({ to: "/modules/$moduleId", params: { moduleId: mod.id } } as never);
                  }}
                  aria-label="Add module"
                >
                  <Plus className="size-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {textbookModules.length === 0 && (
                  <p className="px-1 text-[10px] text-muted-foreground">
                    No modules yet — add one.
                  </p>
                )}
                {textbookModules.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      navigate({ to: "/modules/$moduleId", params: { moduleId: m.id } } as never)
                    }
                    className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] text-muted-foreground hover:bg-surface2 hover:text-foreground"
                  >
                    <span className="text-sm">{m.emoji}</span>
                    <span className="truncate">{m.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pages
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={addPage}
              aria-label="Add page"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-auto p-2">
            {visiblePages.map((page, index) => {
              const active = page.id === currentPage.id;
              const bookmarked = notebook.bookmarkedPageIds.includes(page.id);
              return (
                <div key={page.id} className="group">
                  <button
                    type="button"
                    onClick={() => setCurrentId(page.id)}
                    className={cn(
                      "relative block w-full overflow-hidden rounded-lg border-2 bg-card shadow-sm transition-all",
                      active
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    {thumbnails[page.id] ? (
                      <img
                        src={thumbnails[page.id]}
                        alt=""
                        className="aspect-[3/4] w-full object-cover"
                      />
                    ) : (
                      <div className="aspect-[3/4] w-full animate-pulse bg-surface2" />
                    )}
                    <span className="absolute bottom-1 left-1 rounded bg-foreground/60 px-1.5 py-0.5 text-[10px] font-medium text-background">
                      {index + 1}
                    </span>
                    {bookmarked && (
                      <BookmarkCheck className="absolute right-1 top-1 size-3.5 text-warning" />
                    )}
                  </button>
                  {active && (
                    <div className="mt-1 flex items-center justify-center gap-0.5">
                      <button
                        type="button"
                        className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-surface2 hover:text-foreground"
                        onClick={() => movePage(page.id, -1)}
                        aria-label="Move page up"
                      >
                        <ArrowUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-surface2 hover:text-foreground"
                        onClick={() => movePage(page.id, 1)}
                        aria-label="Move page down"
                      >
                        <ArrowDown className="size-3" />
                      </button>
                      <button
                        type="button"
                        className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-surface2 hover:text-foreground"
                        onClick={() => duplicatePage(page)}
                        aria-label="Duplicate page"
                      >
                        <Copy className="size-3" />
                      </button>
                      {(notebook.sections?.length ?? 0) > 1 && (
                        <button
                          type="button"
                          className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-surface2 hover:text-foreground"
                          onClick={() => movePageToSection(page.id, 1)}
                          aria-label="Send page to next section"
                        >
                          <ChevronRight className="size-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        className={cn(
                          "grid size-6 place-items-center rounded text-muted-foreground hover:bg-surface2 hover:text-foreground",
                          bookmarked && "text-warning",
                        )}
                        onClick={() => toggleBookmark(page.id)}
                        aria-label="Bookmark page"
                      >
                        <Bookmark className="size-3" />
                      </button>
                      <button
                        type="button"
                        className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-surface2 hover:text-destructive"
                        onClick={() => setDeleteTarget(page.id)}
                        disabled={pages.length <= 1}
                        aria-label="Delete page"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="border-t border-border p-2">
            <Button variant="outline" size="sm" className="w-full" onClick={addPage}>
              <Plus className="size-3.5" /> Page
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Sections strip (mobile) */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border px-2 py-2 md:hidden">
            {sections.map((section) => {
              const active = section.id === activeSection?.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSectionId(section.id)}
                  className={cn(
                    "flex h-8 shrink-0 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors",
                    active ? "border-transparent shadow-sm" : "border-border text-muted-foreground",
                  )}
                  style={
                    active
                      ? { backgroundColor: section.color, color: readableOn(section.color) }
                      : undefined
                  }
                >
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: section.color }}
                  />
                  {section.name}
                </button>
              );
            })}
            <Button
              variant="outline"
              size="icon"
              className="size-8 shrink-0"
              onClick={openNewSection}
              aria-label="New section"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto border-b border-border px-2 py-2 md:hidden">
            {visiblePages.map((page, index) => (
              <button
                key={page.id}
                type="button"
                onClick={() => setCurrentId(page.id)}
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg border text-xs font-medium",
                  page.id === currentPage.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground",
                )}
              >
                {index + 1}
              </button>
            ))}
            <Button
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              onClick={addPage}
              aria-label="Add page"
            >
              <Plus className="size-4" />
            </Button>
          </div>

          <div className="flex min-h-0 flex-1">
            <div
              ref={scrollRef}
              className="relative min-h-0 flex-1 overflow-auto bg-[radial-gradient(circle_at_1px_1px,color-mix(in_oklab,var(--foreground)_14%,transparent)_1px,transparent_0)] [background-size:22px_22px]"
            >
              <div className="flex min-h-full justify-center p-3 sm:p-6">
                <div
                  className="relative h-fit shrink-0 shadow-[var(--shadow-panel)]"
                  style={{
                    width: currentPage.width * zoom,
                    minHeight: currentPage.height * zoom,
                  }}
                >
                  <canvas
                    ref={bgCanvasRef}
                    width={Math.round(currentPage.width * 2)}
                    height={Math.round(currentPage.height * 2)}
                    className="absolute inset-0 h-full w-full rounded-sm bg-card"
                  />
                  <canvas
                    ref={liveCanvasRef}
                    width={Math.round(currentPage.width * 2)}
                    height={Math.round(currentPage.height * 2)}
                    className="pointer-events-none absolute inset-0 z-30 h-full w-full rounded-sm"
                  />

                  {currentPage.elements.map((element) => {
                    if (element.type === "text") {
                      if (editingId === element.id) {
                        return (
                          <textarea
                            data-note-editable="true"
                            key={element.id}
                            autoFocus
                            value={editText}
                            onChange={(event) => setEditText(event.target.value)}
                            onBlur={(event) =>
                              finishEditing(
                                event.currentTarget.value,
                                event.currentTarget.scrollHeight / zoom,
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                event.preventDefault();
                                finishEditing(event.currentTarget.value);
                                event.currentTarget.blur();
                              }
                            }}
                            className="absolute z-50 resize-none overflow-auto rounded border border-primary/50 bg-card/95 p-1 text-foreground outline-none"
                            style={{
                              left: element.x * zoom,
                              top: element.y * zoom,
                              width: element.width * zoom,
                              height: element.height * zoom,
                              fontSize: element.fontSize * zoom,
                              lineHeight: 1.42,
                              overflow: "hidden",
                              color: element.color,
                              fontWeight: element.bold ? 700 : 400,
                              fontStyle: element.italic ? "italic" : "normal",
                              textAlign: element.align ?? "left",
                            }}
                          />
                        );
                      }
                      return (
                        <div
                          key={element.id}
                          className="pointer-events-none absolute z-20 whitespace-pre-wrap break-words"
                          style={{
                            left: element.x * zoom,
                            top: element.y * zoom,
                            width: element.width * zoom,
                            height: element.height * zoom,
                            overflow: "hidden",
                            fontSize: element.fontSize * zoom,
                            lineHeight: 1.42,
                            color: element.color,
                            fontWeight: element.bold ? 700 : 400,
                            fontStyle: element.italic ? "italic" : "normal",
                            textAlign: element.align ?? "left",
                          }}
                        >
                          {element.text}
                        </div>
                      );
                    }

                    if (element.type === "sticky") {
                      if (editingId === element.id) {
                        return (
                          <textarea
                            data-note-editable="true"
                            key={element.id}
                            autoFocus
                            value={editText}
                            onChange={(event) => setEditText(event.target.value)}
                            onBlur={(event) =>
                              finishEditing(
                                event.currentTarget.value,
                                event.currentTarget.scrollHeight / zoom,
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                event.preventDefault();
                                finishEditing(event.currentTarget.value);
                                event.currentTarget.blur();
                              }
                            }}
                            className="absolute z-50 resize-none overflow-auto rounded-lg border border-primary/50 p-2 shadow-lg outline-none"
                            style={{
                              left: element.x * zoom,
                              top: element.y * zoom,
                              width: element.width * zoom,
                              height: element.height * zoom,
                              fontSize: 16 * zoom,
                              overflow: "hidden",
                              background: element.color,
                              color: readableOn(element.color),
                            }}
                          />
                        );
                      }
                      return (
                        <div
                          key={element.id}
                          className="pointer-events-none absolute z-20 overflow-hidden rounded-lg p-3 shadow-md"
                          style={{
                            left: element.x * zoom,
                            top: element.y * zoom,
                            width: element.width * zoom,
                            height: element.height * zoom,
                            background: element.color,
                            fontSize: 16 * zoom,
                            lineHeight: 1.35,
                            color: readableOn(element.color),
                          }}
                        >
                          <span className="pointer-events-none whitespace-pre-wrap break-words">
                            {element.text}
                          </span>
                        </div>
                      );
                    }

                    if (element.type === "tape") {
                      return (
                        <div
                          key={element.id}
                          className="pointer-events-none absolute z-20 flex items-center justify-center rounded-md text-center"
                          style={{
                            left: element.x * zoom,
                            top: element.y * zoom,
                            width: element.width * zoom,
                            height: element.height * zoom,
                            overflow: "hidden",
                            background: element.color,
                            opacity: element.revealed ? 0.28 : 0.94,
                            color: readableOn(element.color),
                            fontSize: 12 * zoom,
                            fontWeight: 600,
                          }}
                        >
                          {element.revealed ? (element.label ?? "revealed") : ""}
                        </div>
                      );
                    }

                    if (element.type === "audio") {
                      return (
                        <div
                          key={element.id}
                          data-note-audio-control="true"
                          className="absolute z-[45] rounded-xl border border-border bg-card p-2 shadow-sm"
                          style={{
                            left: element.x * zoom,
                            top: element.y * zoom,
                            width: element.width * zoom,
                          }}
                        >
                          <div className="mb-1 flex items-center justify-between gap-1">
                            <p className="truncate text-[10px] font-medium text-primary">
                              {element.label}
                            </p>
                            <button
                              type="button"
                              aria-label="Delete recording"
                              onClick={() =>
                                commitElements(
                                  currentPage.elements.filter((item) => item.id !== element.id),
                                )
                              }
                              className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-foreground/10 hover:text-destructive"
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                          <audio controls src={element.src} className="h-8 w-full" />
                        </div>
                      );
                    }

                    return null;
                  })}

                  {selectedIds.map((id) => {
                    const element = currentPage.elements.find((item) => item.id === id);
                    if (!element) return null;
                    const bounds = elementBounds(element);
                    return (
                      <div
                        key={`selection-${id}`}
                        className="pointer-events-none absolute z-20 rounded-sm border-2 border-dashed border-primary/70 bg-primary/5"
                        style={{
                          left: (bounds.x - 4) * zoom,
                          top: (bounds.y - 4) * zoom,
                          width: (bounds.width + 8) * zoom,
                          height: (bounds.height + 8) * zoom,
                        }}
                      >
                        {selectedIds.length === 1 &&
                          element.type !== "audio" &&
                          (
                            [
                              ["nw", "-left-2 -top-2"],
                              ["ne", "-right-2 -top-2"],
                              ["sw", "-left-2 -bottom-2"],
                              ["se", "-right-2 -bottom-2"],
                            ] as const
                          ).map(([handle, position]) => (
                            <button
                              key={handle}
                              type="button"
                              data-note-resize-handle
                              aria-label={`Resize selected item from ${handle}`}
                              title="Drag to resize"
                              onPointerDown={(event) => startResize(event, element, handle)}
                              className={cn(
                                "pointer-events-auto absolute size-3 touch-none rounded-sm border-2 border-background bg-primary shadow",
                                position,
                              )}
                            />
                          ))}
                      </div>
                    );
                  })}

                  <div
                    ref={interactionRef}
                    className={cn(
                      "absolute inset-0 touch-none",
                      spaceHeld || tool === "pan" ? "z-40" : "z-10",
                      spaceHeld && "cursor-grab",
                    )}
                    style={{
                      cursor:
                        tool === "pan"
                          ? "grab"
                          : tool === "text"
                            ? "text"
                            : tool === "select"
                              ? "default"
                              : "crosshair",
                    }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onDoubleClick={handleDoubleClick}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden items-center justify-between gap-3 border-t border-border bg-background px-3 py-1.5 text-xs text-muted-foreground md:flex">
        <div className="flex items-center gap-3">
          <span>
            Page {sectionIndex + 1} of {visiblePages.length}
          </span>
          <span className="capitalize">{currentPage.template} paper</span>
          <span>
            {clampTemplateOpacity(currentPage.templateOpacity) === 100
              ? "Pattern: pure black"
              : `Pattern: ${clampTemplateOpacity(currentPage.templateOpacity)}%`}
          </span>
          {selectedIds.length > 0 && <span>{selectedIds.length} selected</span>}
          {recording && <span className="text-destructive">Recording</span>}
        </div>
        <div className="flex items-center gap-3">
          <span>{Math.round(zoom * 100)}% zoom</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-success" /> Saved locally
          </span>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this page?"
        description="The page and everything on it will be removed."
        confirmLabel="Delete page"
        destructive
        onConfirm={() => {
          if (deleteTarget) void removePage(deleteTarget);
        }}
      />

      <Dialog
        open={Boolean(sectionEditor)}
        onOpenChange={(open) => !open && setSectionEditor(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{sectionEditor?.target ? "Edit section" : "New section"}</DialogTitle>
            <DialogDescription>
              Sections are OneNote-style tabs — group related pages inside this notebook.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="section-name">Name</Label>
              <Input
                id="section-name"
                value={sectionEditor?.name ?? ""}
                onChange={(event) =>
                  setSectionEditor((current) =>
                    current ? { ...current, name: event.target.value } : current,
                  )
                }
                placeholder="e.g. Chapter 3 — optics"
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Tab colour</Label>
              <div className="flex flex-wrap gap-1.5">
                {NOTE_COLORS.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    aria-label={`Use tab colour ${swatch}`}
                    onClick={() =>
                      setSectionEditor((current) =>
                        current ? { ...current, color: swatch } : current,
                      )
                    }
                    className={cn(
                      "size-7 rounded-full border-2 transition-transform",
                      sectionEditor?.color === swatch
                        ? "scale-110 border-foreground"
                        : "border-transparent hover:scale-105",
                    )}
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
            </div>
            {sectionEditor?.target && (notebook?.sections?.length ?? 0) > 1 && (
              <Button
                variant="outline"
                className="justify-start text-destructive hover:text-destructive"
                onClick={() => removeSection(sectionEditor.target!.id)}
              >
                <Trash2 className="size-4" /> Delete section (pages move to the first tab)
              </Button>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSectionEditor(null)}>
                Cancel
              </Button>
              <Button onClick={saveSection}>
                {sectionEditor?.target ? "Save section" : "Add section"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export notebook</DialogTitle>
            <DialogDescription>
              Files are created on this device. The PDF uses page images and includes every note.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button
              variant="outline"
              className="justify-start"
              onClick={exportPng}
              disabled={exporting}
            >
              <Download className="size-4" /> Current page as PNG
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={exportPdf}
              disabled={exporting}
            >
              <FileText className="size-4" /> Whole notebook as PDF
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={exportJson}
              disabled={exporting}
            >
              <FileJson className="size-4" /> Copy of the whole notebook (as a file)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PageStyleDialog
        open={pageStyleOpen}
        onOpenChange={setPageStyleOpen}
        template={currentPage.template}
        opacity={currentPage.templateOpacity}
        onTemplateChange={updatePageTemplate}
        onOpacityChange={updateTemplateOpacity}
        width={currentPage.width}
        height={currentPage.height}
      />

      <InkSizeDialog
        open={inkOpen}
        onOpenChange={setInkOpen}
        width={penWidth}
        onWidthChange={setPenWidth}
        tool={tool}
        color={color}
      />

      <Dialog open={studyOpen} onOpenChange={setStudyOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {studyMode === "summary"
                ? "AI revision sheet"
                : studyMode === "quiz"
                  ? "AI quiz from your notes"
                  : "AI flashcards from your notes"}
            </DialogTitle>
            <DialogDescription>
              Copy this into your AI, then bring the result back into Knowly. Your notebook text
              only goes into the text you copy — nothing is sent anywhere.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-1.5">
            {(["flashcards", "summary", "quiz"] as const).map((mode) => (
              <Button
                key={mode}
                size="sm"
                variant={studyMode === mode ? "default" : "outline"}
                onClick={() => setStudyMode(mode)}
              >
                {mode === "flashcards" ? "Flashcards" : mode === "summary" ? "Summary" : "Quiz"}
              </Button>
            ))}
          </div>
          <Textarea
            readOnly
            value={studyPrompt}
            className="min-h-[320px] font-mono text-xs leading-5"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={copyStudyPrompt}>
              <Copy className="size-4" /> Copy instructions
            </Button>
            {studyMode !== "summary" && (
              <Button asChild>
                <Link to="/import">
                  Bring the result in <ChevronRight className="size-4" />
                </Link>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PageStyleDialog({
  open,
  onOpenChange,
  template,
  opacity,
  onTemplateChange,
  onOpacityChange,
  width,
  height,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: PageTemplate;
  opacity: number | undefined;
  onTemplateChange: (template: PageTemplate) => void;
  onOpacityChange: (value: number) => void;
  width: number;
  height: number;
}) {
  const pattern = clampTemplateOpacity(opacity);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const presets = [
    { label: "None", value: 0 },
    { label: "Light", value: 30 },
    { label: "Soft", value: 60 },
    { label: "Full", value: 100 },
  ];

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawTemplate(ctx, template, width, height, pattern / 100);
  }, [template, pattern, width, height]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="size-4 text-primary" /> Page style
          </DialogTitle>
          <DialogDescription>
            Choose the paper type, then set how visible its pattern is. Pattern strength defaults to
            100, which draws the pattern in pure black. At 0 the page keeps its paper colour and
            becomes completely blank.
          </DialogDescription>
        </DialogHeader>

        <div>
          <p className="text-xs font-medium">Paper type</p>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {PAGE_TEMPLATES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onTemplateChange(item.id)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-[11px] font-medium transition-colors",
                  template === item.id
                    ? "border-primary/35 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/25 hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 rounded-2xl border border-border bg-surface/50 p-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center">
          <div className="relative mx-auto h-40 w-28 overflow-hidden rounded-xl border border-border bg-card shadow-inner sm:w-full">
            <canvas
              ref={previewRef}
              aria-label={`${template} paper preview`}
              className="h-full w-full object-cover object-top"
            />
            <span className="absolute bottom-2 right-2 rounded-full bg-foreground/60 px-1.5 py-0.5 text-[9px] font-semibold text-background">
              {pattern}%
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Show page pattern</p>
                <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                  0 hides the pattern; 100 is pure black
                </p>
              </div>
              <Switch
                checked={pattern > 0}
                onCheckedChange={(checked) => onOpacityChange(checked ? 100 : 0)}
                aria-label="Toggle page pattern"
              />
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="page-pattern" className="text-xs">
                  Pattern strength
                </Label>
                <span className="rounded-md bg-background px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ring-1 ring-border">
                  {pattern}%
                </span>
              </div>
              <Slider
                id="page-pattern"
                value={[pattern]}
                onValueChange={(next) => onOpacityChange(next[0] ?? 0)}
                min={0}
                max={100}
                step={5}
                aria-label="Page pattern strength"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onOpacityChange(preset.value)}
              className={cn(
                "rounded-xl border px-2 py-2 text-xs font-medium transition-colors",
                pattern === preset.value
                  ? "border-primary/35 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/25 hover:text-foreground",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <p className="text-[11px] leading-4 text-muted-foreground">
          The pattern sits behind handwriting, images, and any PDF page. A PDF or image background
          can cover the paper pattern on that page.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function InkSizeDialog({
  open,
  onOpenChange,
  width,
  onWidthChange,
  tool,
  color,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  width: number;
  onWidthChange: (width: number) => void;
  tool: NoteTool;
  color: string;
}) {
  const effectiveWidth = tool === "highlighter" ? width * 6 : width;
  const label =
    tool === "highlighter" ? "Highlighter size" : tool === "pencil" ? "Pencil size" : "Ink size";
  const presets = [1, 2, 3, 5, 8, 12];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="size-4 text-primary" /> {label}
          </DialogTitle>
          <DialogDescription>
            Set the stroke width from hairline to bold marker. Your choice carries across pen,
            pencil, shapes and tape edges.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-inner">
          <svg viewBox="0 0 280 64" className="h-16 w-full" aria-hidden>
            <path
              d="M12 44 C 44 8, 72 58, 102 26 S 156 8, 184 36 S 232 58, 268 18"
              fill="none"
              stroke={color}
              strokeWidth={effectiveWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={tool === "highlighter" ? 0.45 : tool === "pencil" ? 0.82 : 1}
            />
          </svg>{" "}
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Live preview</span>
            <span className="font-semibold text-foreground">
              {width}px{tool === "highlighter" ? ` → ${effectiveWidth}px` : ""}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="ink-size" className="text-xs">
              Stroke width
            </Label>
            <span className="rounded-md bg-surface2 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
              {width}px
            </span>
          </div>
          <Slider
            id="ink-size"
            value={[width]}
            onValueChange={(next) => onWidthChange(next[0] ?? 1)}
            min={1}
            max={12}
            step={0.5}
            aria-label="Ink stroke width"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>Hairline</span>
            <span>Bold</span>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onWidthChange(preset)}
              className={cn(
                "grid h-9 place-items-center rounded-lg border text-[10px] font-semibold transition-colors",
                width === preset
                  ? "border-primary/35 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/25 hover:text-foreground",
              )}
            >
              {preset}
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ToolRibbon({
  tool,
  setTool,
  color,
  setColor,
  penWidth,
  shapeKind,
  setShapeKind,
  zoom,
  setZoom,
  fitWidth,
  deleteSelected,
  duplicateSelected,
  selectedCount,
  showTextOptions,
  textFontSize,
  textBold,
  textItalic,
  onTextFont,
  textAlign,
  onTextAlign,
  onOpenSize,
  onUndo,
  onRedo,
  recording,
  onToggleRecording,
  onStudy,
  onExport,
  onPageStyle,
  onAddPage,
  pageNumber,
  pageCount,
  onPrevPage,
  onNextPage,
}: {
  tool: NoteTool;
  setTool: (tool: NoteTool) => void;
  color: string;
  setColor: (color: string) => void;
  penWidth: number;
  shapeKind: ShapeElement["shape"];
  setShapeKind: (shape: ShapeElement["shape"]) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  fitWidth: () => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  selectedCount: number;
  showTextOptions: boolean;
  textFontSize: number;
  textBold: boolean;
  textItalic: boolean;
  onTextFont: (patch: {
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    align?: "left" | "center" | "right";
  }) => void;
  textAlign: "left" | "center" | "right";
  onTextAlign: (align: "left" | "center" | "right") => void;
  onOpenSize: () => void;
  onUndo: () => void;
  onRedo: () => void;
  recording: boolean;
  onToggleRecording: () => void;
  onStudy: (mode: "summary" | "flashcards" | "quiz") => void;
  onExport: () => void;
  onPageStyle: () => void;
  onAddPage: () => void;
  pageNumber: number;
  pageCount: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}) {
  const palette = tool === "highlighter" ? HIGHLIGHTER_COLORS : PEN_COLORS;

  return (
    <section
      aria-label="Notebook tools ribbon"
      className="shrink-0 border-b border-border bg-surface/80 shadow-sm"
    >
      <div className="flex items-stretch gap-1.5 overflow-x-auto px-2 py-1.5 [scrollbar-width:thin] sm:gap-2 sm:px-3">
        <RibbonGroup label="History">
          <RibbonButton icon={Undo2} label="Undo" title="Undo (Ctrl+Z)" onClick={onUndo} />
          <RibbonButton icon={Redo2} label="Redo" title="Redo (Ctrl+Y)" onClick={onRedo} />
        </RibbonGroup>

        <RibbonGroup label="Tools">
          <div className="grid grid-flow-col grid-rows-2 gap-0.5">
            {TOOLS.map((item) => {
              const Icon = item.icon;
              return (
                <RibbonButton
                  key={item.id}
                  icon={Icon}
                  label={TOOL_SHORT_LABELS[item.id] ?? item.label}
                  title={item.label}
                  active={tool === item.id}
                  pressed={tool === item.id}
                  onClick={() => setTool(item.id)}
                />
              );
            })}
          </div>
        </RibbonGroup>

        {tool === "shape" && (
          <RibbonGroup label="Shape">
            <div className="grid grid-cols-2 gap-0.5">
              {(["rect", "ellipse", "line", "arrow"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setShapeKind(kind)}
                  className={cn(
                    "h-9 w-14 rounded-md border text-[10px] font-medium capitalize transition-colors",
                    shapeKind === kind
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/25 hover:text-foreground",
                  )}
                >
                  {kind}
                </button>
              ))}
            </div>
          </RibbonGroup>
        )}

        {selectedCount > 0 && (
          <RibbonGroup label="Selection">
            <RibbonButton
              icon={Copy}
              label="Duplicate"
              title="Duplicate selected items"
              onClick={duplicateSelected}
            />
            <RibbonButton
              icon={Trash2}
              label="Delete"
              title="Delete selected items"
              danger
              onClick={deleteSelected}
            />
          </RibbonGroup>
        )}

        {showTextOptions && (
          <RibbonGroup label="Text">
            <div className="flex flex-col gap-1">
              <div className="flex gap-0.5">
                {[14, 18, 24, 32].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => onTextFont({ fontSize: size })}
                    aria-pressed={textFontSize === size}
                    title={`${size}px text`}
                    className={cn(
                      "h-9 w-9 rounded-md border text-[11px] font-semibold tabular-nums transition-colors",
                      textFontSize === size
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/25 hover:text-foreground",
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <div className="flex gap-0.5">
                <button
                  type="button"
                  onClick={() => onTextFont({ bold: !textBold })}
                  aria-pressed={textBold}
                  title="Bold"
                  className={cn(
                    "h-7 w-9 rounded-md border text-xs font-bold transition-colors",
                    textBold
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/25 hover:text-foreground",
                  )}
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => onTextFont({ italic: !textItalic })}
                  aria-pressed={textItalic}
                  title="Italic"
                  className={cn(
                    "h-7 w-9 rounded-md border text-xs italic transition-colors",
                    textItalic
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/25 hover:text-foreground",
                  )}
                >
                  I
                </button>
              </div>
              <div className="flex gap-0.5">
                {(
                  [
                    ["left", AlignLeft],
                    ["center", AlignCenter],
                    ["right", AlignRight],
                  ] as const
                ).map(([align, Icon]) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => onTextAlign(align)}
                    aria-label={`Align text ${align}`}
                    aria-pressed={textAlign === align}
                    className={cn(
                      "grid size-7 place-items-center rounded-md border transition-colors",
                      textAlign === align
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/25 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                  </button>
                ))}
              </div>
            </div>
          </RibbonGroup>
        )}

        <RibbonGroup label="Ink">
          <div className="flex flex-col gap-1">
            <div className="grid grid-cols-4 gap-1.5 px-0.5">
              {palette.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setColor(item)}
                  aria-label={`Use ink colour ${item}`}
                  aria-pressed={color === item}
                  title={item}
                  className={cn(
                    "size-[18px] rounded-full transition-transform hover:scale-110",
                    color === item
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-surface"
                      : "ring-1 ring-border",
                  )}
                  style={{ background: item }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={onOpenSize}
              title="Open ink size settings"
              aria-label={`Ink size is ${penWidth} pixels. Open size settings.`}
              className="flex h-7 w-full items-center gap-1.5 rounded-md border border-border bg-background px-1.5 text-[10px] font-medium transition-colors hover:border-primary/30"
            >
              <span
                className="min-w-1 flex-1 rounded-full"
                style={{
                  height: Math.max(1, Math.min(5, penWidth / 2)),
                  background: color,
                  boxShadow: "0 0 0 1px color-mix(in oklab, var(--foreground) 12%, transparent)",
                }}
              />
              <span className="shrink-0 tabular-nums">{penWidth}px</span>
            </button>
          </div>
        </RibbonGroup>

        <RibbonGroup label="Page">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-0.5">
              <RibbonIconButton
                icon={ChevronLeft}
                label="Previous page"
                onClick={onPrevPage}
                disabled={pageNumber <= 1}
              />
              <div className="grid h-9 min-w-12 place-items-center rounded-md bg-background px-1 ring-1 ring-border">
                <span className="text-[10px] font-semibold tabular-nums">
                  {pageNumber}/{pageCount}
                </span>
                <span className="text-[8px] uppercase tracking-wide text-muted-foreground">
                  page
                </span>
              </div>
              <RibbonIconButton
                icon={ChevronRight}
                label="Next page"
                onClick={onNextPage}
                disabled={pageNumber >= pageCount}
              />
            </div>
            <div className="flex items-center gap-0.5">
              <RibbonButton
                icon={Plus}
                label="New page"
                title="Add a new page"
                onClick={onAddPage}
              />
              <RibbonButton
                icon={Palette}
                label="Paper"
                title="Choose paper type and pattern strength"
                onClick={onPageStyle}
              />
            </div>
          </div>
        </RibbonGroup>

        <RibbonGroup label="View">
          <RibbonButton
            icon={ChevronLeft}
            label="Zoom out"
            onClick={() => setZoom(Math.max(0.35, Math.round((zoom - 0.1) * 100) / 100))}
          />
          <div className="grid h-9 min-w-12 place-items-center rounded-md bg-background px-1 ring-1 ring-border">
            <span className="text-[10px] font-semibold tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <span className="text-[8px] uppercase tracking-wide text-muted-foreground">zoom</span>
          </div>
          <RibbonButton
            icon={ChevronRight}
            label="Zoom in"
            onClick={() => setZoom(Math.min(2.2, Math.round((zoom + 0.1) * 100) / 100))}
          />
          <RibbonButton icon={Maximize2} label="Fit" title="Fit page width" onClick={fitWidth} />
        </RibbonGroup>

        <RibbonGroup label="Study">
          <div className="grid grid-cols-2 gap-0.5">
            <RibbonButton
              icon={FileText}
              label="Summary"
              title="Generate an AI revision sheet from this notebook"
              onClick={() => onStudy("summary")}
            />
            <RibbonButton
              icon={Copy}
              label="Cards"
              title="Generate AI flashcards from this notebook"
              onClick={() => onStudy("flashcards")}
            />
            <RibbonButton
              icon={Check}
              label="Quiz"
              title="Generate an AI quiz from this notebook"
              onClick={() => onStudy("quiz")}
            />
            <RibbonButton
              icon={Download}
              label="Export"
              title="Save this page, the notebook PDF, or a copy of the notebook"
              onClick={onExport}
            />
          </div>
        </RibbonGroup>

        <RibbonGroup label="Audio">
          <RibbonButton
            icon={recording ? MicOff : Mic}
            label={recording ? "Stop" : "Record"}
            title={recording ? "Stop recording audio" : "Record audio onto this page"}
            active={recording}
            pressed={recording}
            onClick={onToggleRecording}
          />
        </RibbonGroup>
      </div>
    </section>
  );
}

function RibbonGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col justify-between border-r border-border/70 pr-1.5 last:border-r-0 last:pr-0",
        className,
      )}
    >
      <div className="flex items-start gap-0.5">{children}</div>
      <p className="mt-0.5 text-center text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/65">
        {label}
      </p>
    </div>
  );
}

function RibbonButton({
  icon: Icon,
  label,
  title,
  active,
  pressed,
  danger,
  disabled,
  onClick,
}: {
  icon: typeof PenLine;
  label: string;
  title?: string;
  active?: boolean;
  pressed?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      aria-label={title ?? label}
      aria-pressed={pressed}
      disabled={disabled}
      className={cn(
        "flex h-9 w-[52px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-md px-0.5 text-[9px] leading-none transition-colors",
        active
          ? "bg-primary/15 text-primary ring-1 ring-inset ring-primary/25"
          : "text-muted-foreground hover:bg-surface2 hover:text-foreground",
        danger && "hover:bg-destructive/10 hover:text-destructive",
        disabled &&
          "cursor-not-allowed opacity-35 hover:bg-transparent hover:text-muted-foreground",
      )}
    >
      <Icon className="size-3.5" />
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}

function RibbonIconButton({
  icon: Icon,
  label,
  disabled,
  onClick,
}: {
  icon: typeof PenLine;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface2 hover:text-foreground",
        disabled && "cursor-not-allowed opacity-30 hover:bg-transparent",
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
