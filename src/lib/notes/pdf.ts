import type { NotePage } from "./types";

/**
 * Renders each PDF page to a high-resolution image and turns it into a
 * notebook page. Annotations are stored as normal note elements on top.
 */
export async function importPdfPages(file: File, notebookId: string): Promise<NotePage[]> {
  const pdfjs = await import("pdfjs-dist");
  const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;

  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: NotePage[] = [];
  const now = Date.now();

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const pdfPage = await pdf.getPage(pageNumber);
    const baseViewport = pdfPage.getViewport({ scale: 1 });
    const renderViewport = pdfPage.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(renderViewport.width);
    canvas.height = Math.ceil(renderViewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await pdfPage.render({ canvasContext: ctx, viewport: renderViewport, canvas }).promise;

    let searchText = "";
    try {
      const text = await pdfPage.getTextContent();
      searchText = text.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    } catch {
      // text extraction is best-effort
    }

    pages.push({
      id: `pg_${Math.random().toString(36).slice(2, 10)}_${now.toString(36)}_${pageNumber}`,
      notebookId,
      template: "blank",
      width: Math.round(baseViewport.width),
      height: Math.round(baseViewport.height),
      elements: [],
      background: canvas.toDataURL("image/jpeg", 0.86),
      searchText,
      createdAt: now + pageNumber,
      updatedAt: now + pageNumber,
    });
  }

  return pages;
}
