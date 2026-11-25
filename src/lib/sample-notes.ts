import { getNotebook, listPages, putNotebook, putPage } from "@/lib/notes/db";
import { PAGE_SIZES, type NotePage, type NotebookMeta } from "@/lib/notes/types";

const NOTEBOOK_ID = "knowly-dev-sample-notebook";
const PAGE_ID = "knowly-dev-sample-notebook-page";
const SECTION_ID = "knowly-dev-sample-notebook-section";

export async function loadSampleNotebook(): Promise<NotebookMeta> {
  const existing = await getNotebook(NOTEBOOK_ID);
  if (existing && (await listPages(NOTEBOOK_ID)).length > 0) return existing;

  const now = Date.now();
  const sectionId = existing?.sections?.[0]?.id ?? SECTION_ID;
  const page: NotePage = {
    id: PAGE_ID,
    notebookId: NOTEBOOK_ID,
    sectionId,
    template: "lined",
    width: PAGE_SIZES.a4.width,
    height: PAGE_SIZES.a4.height,
    elements: [
      {
        id: "knowly-dev-sample-title",
        type: "text",
        x: 64,
        y: 64,
        width: 620,
        height: 72,
        text: "Your study sandbox",
        fontSize: 28,
        color: "#24324A",
        bold: true,
      },
      {
        id: "knowly-dev-sample-note",
        type: "text",
        x: 68,
        y: 156,
        width: 590,
        height: 140,
        text: "Try the pen, highlighter, text tool, shapes, and page templates here.",
        fontSize: 18,
        color: "#334155",
      },
      {
        id: "knowly-dev-sample-sticky",
        type: "sticky",
        x: 72,
        y: 340,
        width: 220,
        height: 150,
        text: "Sticky notes are editable!",
        color: "#FDE68A",
      },
      {
        id: "knowly-dev-sample-tape",
        type: "tape",
        x: 330,
        y: 358,
        width: 220,
        height: 90,
        color: "#A7F3D0",
        revealed: false,
        label: "Tap to reveal",
      },
      {
        id: "knowly-dev-sample-shape",
        type: "shape",
        shape: "rect",
        x: 72,
        y: 548,
        width: 460,
        height: 92,
        stroke: "#7C3AED",
        fill: "#EDE9FE",
        strokeWidth: 3,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  const notebook: NotebookMeta = existing
    ? {
        ...existing,
        sections: existing.sections?.length
          ? existing.sections
          : [{ id: SECTION_ID, name: "Try the tools", color: existing.color, createdAt: now }],
        pageIds: [PAGE_ID],
        updatedAt: now,
      }
    : {
        id: NOTEBOOK_ID,
        title: "Developer sandbox",
        subject: "Sample notes",
        color: "#8B5CF6",
        emoji: "🧪",
        tags: ["sample", "developer"],
        favorite: true,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
        pageIds: [PAGE_ID],
        bookmarkedPageIds: [],
        defaultTemplate: "lined",
        width: PAGE_SIZES.a4.width,
        height: PAGE_SIZES.a4.height,
        sections: [{ id: SECTION_ID, name: "Try the tools", color: "#8B5CF6", createdAt: now }],
      };

  await putPage(page);
  await putNotebook(notebook);
  return notebook;
}
