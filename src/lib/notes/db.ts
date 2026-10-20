import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  PAGE_SIZES,
  PAGE_TEMPLATES,
  type NoteElement,
  type NotePage,
  type NotebookBundle,
  type NotebookMeta,
  type PageTemplate,
} from "./types";

const DB_NAME = "knowly.notes";
const DB_VERSION = 1;

interface NotesDB extends DBSchema {
  notebooks: {
    key: string;
    value: NotebookMeta;
    indexes: { "by-updated": number; "by-favorite": string };
  };
  pages: {
    key: string;
    value: NotePage;
    indexes: { "by-notebook": string };
  };
}

let dbPromise: Promise<IDBPDatabase<NotesDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<NotesDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const notebooks = db.createObjectStore("notebooks", { keyPath: "id" });
        notebooks.createIndex("by-updated", "updatedAt");
        notebooks.createIndex("by-favorite", "favorite");
        const pages = db.createObjectStore("pages", { keyPath: "id" });
        pages.createIndex("by-notebook", "notebookId");
      },
    });
  }
  return dbPromise;
}

const available = () => typeof window !== "undefined" && typeof indexedDB !== "undefined";

export async function listNotebooks(): Promise<NotebookMeta[]> {
  if (!available()) return [];
  const db = await getDb();
  const notebooks = await db.getAll("notebooks");
  return notebooks.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getNotebook(id: string): Promise<NotebookMeta | undefined> {
  if (!available()) return undefined;
  return (await getDb()).get("notebooks", id);
}

export async function putNotebook(notebook: NotebookMeta): Promise<void> {
  if (!available()) return;
  await (await getDb()).put("notebooks", notebook);
}

export async function deleteNotebook(id: string): Promise<void> {
  if (!available()) return;
  const db = await getDb();
  const pages = await db.getAllFromIndex("pages", "by-notebook", id);
  const tx = db.transaction(["notebooks", "pages"], "readwrite");
  await Promise.all([
    tx.objectStore("notebooks").delete(id),
    ...pages.map((page) => tx.objectStore("pages").delete(page.id)),
    tx.done,
  ]);
}

export async function listPages(notebookId: string): Promise<NotePage[]> {
  if (!available()) return [];
  const db = await getDb();
  const pages = await db.getAllFromIndex("pages", "by-notebook", notebookId);
  return pages.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getPage(id: string): Promise<NotePage | undefined> {
  if (!available()) return undefined;
  return (await getDb()).get("pages", id);
}

export async function putPage(page: NotePage): Promise<void> {
  if (!available()) return;
  await (await getDb()).put("pages", page);
}

export async function deletePage(id: string): Promise<void> {
  if (!available()) return;
  await (await getDb()).delete("pages", id);
}

export interface NoteSearchHit {
  notebook: NotebookMeta;
  page: NotePage;
  snippet: string;
}

export async function searchNotes(query: string): Promise<NoteSearchHit[]> {
  const term = query.trim().toLowerCase();
  if (!term || !available()) return [];
  const db = await getDb();
  const [notebooks, pages] = await Promise.all([db.getAll("notebooks"), db.getAll("pages")]);
  const notebookById = new Map(notebooks.map((notebook) => [notebook.id, notebook]));
  const hits: NoteSearchHit[] = [];
  for (const page of pages) {
    const notebook = notebookById.get(page.notebookId);
    if (!notebook) continue;
    const parts = [notebook.title, notebook.subject, notebook.tags.join(" ")];
    if (page.searchText) parts.push(page.searchText);
    for (const element of page.elements) {
      if (element.type === "text" || element.type === "sticky") parts.push(element.text);
      if (element.type === "tape" && element.label) parts.push(element.label);
    }
    const haystack = parts.join("\n");
    const index = haystack.toLowerCase().indexOf(term);
    if (index === -1) continue;
    hits.push({
      notebook,
      page,
      snippet: haystack.slice(Math.max(0, index - 45), index + term.length + 75).trim(),
    });
    if (hits.length >= 80) break;
  }
  return hits;
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const estimate = await navigator.storage.estimate();
  return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
}

export async function exportNotebookBundle(notebookId: string): Promise<string | null> {
  const notebook = await getNotebook(notebookId);
  if (!notebook) return null;
  const pages = await listPages(notebookId);
  const bundle: NotebookBundle = {
    format: "knowly-notebook",
    version: 1,
    notebook,
    pages,
    exportedAt: Date.now(),
  };
  return JSON.stringify(bundle, null, 2);
}

function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export async function importNotebookBundle(raw: string): Promise<NotebookMeta | null> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const bundle = parsed as Partial<NotebookBundle>;
  if (bundle.format !== "knowly-notebook" || !bundle.notebook || !Array.isArray(bundle.pages)) {
    return null;
  }

  const rawNotebook = bundle.notebook as Partial<NotebookMeta>;
  if (typeof rawNotebook.title !== "string" || !rawNotebook.title.trim()) return null;

  const now = Date.now();
  const notebookId = newId("nb");
  const pageIdMap = new Map<string, string>();
  const elementTypes = new Set<NoteElement["type"]>([
    "stroke",
    "text",
    "sticky",
    "tape",
    "shape",
    "image",
    "audio",
  ]);
  const templateIds = new Set<PageTemplate>(PAGE_TEMPLATES.map((template) => template.id));
  const numberOr = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;

  const pages: NotePage[] = bundle.pages
    .filter((page): page is NotePage => Boolean(page) && typeof page === "object")
    .map((page, index) => {
      const id = newId("pg");
      if (typeof page.id === "string") pageIdMap.set(page.id, id);
      const width = numberOr(page.width, PAGE_SIZES.a4.width);
      const height = numberOr(page.height, PAGE_SIZES.a4.height);
      return {
        id,
        notebookId,
        template: templateIds.has(page.template) ? page.template : "lined",
        width,
        height,
        elements: Array.isArray(page.elements)
          ? page.elements.filter(
              (element): element is NoteElement =>
                Boolean(element) && typeof element === "object" && elementTypes.has(element.type),
            )
          : [],
        background: typeof page.background === "string" ? page.background : undefined,
        searchText: typeof page.searchText === "string" ? page.searchText : undefined,
        createdAt: typeof page.createdAt === "number" ? page.createdAt : now + index,
        updatedAt: typeof page.updatedAt === "number" ? page.updatedAt : now + index,
      };
    });

  const width = numberOr(rawNotebook.width, pages[0]?.width ?? PAGE_SIZES.a4.width);
  const height = numberOr(rawNotebook.height, pages[0]?.height ?? PAGE_SIZES.a4.height);
  const notebook: NotebookMeta = {
    id: notebookId,
    title: `${rawNotebook.title.trim()} (imported)`,
    subject: typeof rawNotebook.subject === "string" ? rawNotebook.subject : "General",
    color: typeof rawNotebook.color === "string" ? rawNotebook.color : "#6d8cff",
    emoji: typeof rawNotebook.emoji === "string" ? rawNotebook.emoji : "📓",
    tags: Array.isArray(rawNotebook.tags)
      ? rawNotebook.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    favorite: false,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    pageIds: pages.map((page) => page.id),
    bookmarkedPageIds: (Array.isArray(rawNotebook.bookmarkedPageIds)
      ? rawNotebook.bookmarkedPageIds
      : []
    )
      .map((id) => pageIdMap.get(id))
      .filter((id): id is string => Boolean(id)),
    defaultTemplate: templateIds.has(rawNotebook.defaultTemplate as PageTemplate)
      ? (rawNotebook.defaultTemplate as PageTemplate)
      : "lined",
    width,
    height,
    linkedCourseId:
      typeof rawNotebook.linkedCourseId === "string" ? rawNotebook.linkedCourseId : undefined,
    linkedLessonId:
      typeof rawNotebook.linkedLessonId === "string" ? rawNotebook.linkedLessonId : undefined,
    linkedDeckId:
      typeof rawNotebook.linkedDeckId === "string" ? rawNotebook.linkedDeckId : undefined,
  };

  await putNotebook(notebook);
  for (const page of pages) await putPage(page);
  return notebook;
}
