export type NoteTool =
  | "pen"
  | "pencil"
  | "highlighter"
  | "eraser"
  | "select"
  | "text"
  | "sticky"
  | "tape"
  | "shape"
  | "image"
  | "pan";

export type PageTemplate =
  "blank" | "lined" | "grid" | "dotted" | "cornell" | "checklist" | "graph" | "music";

export interface StrokeElement {
  id: string;
  type: "stroke";
  tool: "pen" | "pencil" | "highlighter";
  /** flat [x, y, pressure] triples in page coordinates */
  points: number[];
  color: string;
  width: number;
  opacity: number;
}

export interface TextElement {
  id: string;
  type: "text";
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  color: string;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
}

export interface StickyElement {
  id: string;
  type: "sticky";
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
}

export interface TapeElement {
  id: string;
  type: "tape";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  revealed: boolean;
  label?: string;
}

export interface ShapeElement {
  id: string;
  type: "shape";
  shape: "rect" | "ellipse" | "line" | "arrow";
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  fill?: string;
  strokeWidth: number;
}

export interface ImageElement {
  id: string;
  type: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  alt?: string;
}

export interface AudioElement {
  id: string;
  type: "audio";
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  label: string;
}

export type NoteElement =
  | StrokeElement
  | TextElement
  | StickyElement
  | TapeElement
  | ShapeElement
  | ImageElement
  | AudioElement;

export interface NotePage {
  id: string;
  notebookId: string;
  template: PageTemplate;
  width: number;
  height: number;
  elements: NoteElement[];
  /** optional PDF/image page background as a data URL */
  background?: string;
  /** extracted text for search (PDF text, typed text is indexed separately) */
  searchText?: string;
  createdAt: number;
  updatedAt: number;
}

export interface NotebookMeta {
  id: string;
  title: string;
  subject: string;
  color: string;
  emoji: string;
  tags: string[];
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number;
  pageIds: string[];
  bookmarkedPageIds: string[];
  defaultTemplate: PageTemplate;
  width: number;
  height: number;
  linkedCourseId?: string;
  linkedLessonId?: string;
  linkedDeckId?: string;
}

export interface NotebookBundle {
  format: "knowly-notebook";
  version: 1;
  notebook: NotebookMeta;
  pages: NotePage[];
  exportedAt: number;
}

export const PAGE_SIZES = {
  a4: { label: "A4", width: 794, height: 1123 },
  letter: { label: "Letter", width: 816, height: 1056 },
  square: { label: "Square", width: 900, height: 900 },
  wide: { label: "Wide", width: 1280, height: 800 },
} as const;

export const PAGE_TEMPLATES: { id: PageTemplate; label: string }[] = [
  { id: "blank", label: "Blank" },
  { id: "lined", label: "Lined" },
  { id: "grid", label: "Grid" },
  { id: "dotted", label: "Dotted" },
  { id: "cornell", label: "Cornell" },
  { id: "checklist", label: "Checklist" },
  { id: "graph", label: "Graph" },
  { id: "music", label: "Music" },
];

export const NOTE_COLORS = [
  "#6d8cff",
  "#35c2a1",
  "#f2a65a",
  "#e06c9f",
  "#9b7bf7",
  "#e35d6a",
  "#42a5f5",
  "#8aa35a",
];

export const PEN_COLORS = ["#1f2937", "#2563eb", "#dc2626", "#059669", "#7c3aed", "#d97706"];
export const HIGHLIGHTER_COLORS = ["#fde68a", "#bbf7d0", "#bfdbfe", "#fecdd3", "#e9d5ff"];

export function emptyPage(
  notebookId: string,
  template: PageTemplate,
  width: number,
  height: number,
): NotePage {
  const now = Date.now();
  return {
    id: `pg_${Math.random().toString(36).slice(2, 10)}_${now.toString(36)}`,
    notebookId,
    template,
    width,
    height,
    elements: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function textFromPage(page: NotePage): string {
  const parts: string[] = [];
  if (page.searchText) parts.push(page.searchText);
  for (const element of page.elements) {
    if (element.type === "text" || element.type === "sticky") parts.push(element.text);
    if (element.type === "tape" && element.label) parts.push(element.label);
  }
  return parts.join("\n");
}
