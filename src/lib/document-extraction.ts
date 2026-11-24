/**
 * Document extraction for Smart Mode.
 *
 * Every supported format is converted to plain text plus light metadata. The
 * heavy parsers are loaded on demand so the app stays fast and the server
 * bundle never touches browser-only code.
 */

export interface ExtractedContent {
  text: string;
  metadata: {
    title?: string;
    author?: string;
    pageCount?: number;
    wordCount?: number;
    lastModified?: number;
  };
  sections?: Section[];
}

export interface Section {
  title: string;
  level: number;
  text: string;
  startIndex: number;
  endIndex: number;
}

const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

const decodeEntities = (text: string) =>
  text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));

function tidy(text: string): string {
  return decodeEntities(text)
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function titleFromName(name: string): string {
  return name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();
}

function buildSections(text: string): Section[] {
  const lines = text.split("\n");
  const sections: Section[] = [];
  let offset = 0;
  let current: Section | null = null;

  const push = () => {
    if (!current) return;
    current.endIndex = offset;
    current.text = current.text.trim();
    if (current.text) sections.push(current);
    current = null;
  };

  lines.forEach((line) => {
    const heading = line.match(/^#{1,4}\s+(.+)$/);
    const looksLikeHeading =
      !heading &&
      line.trim().length >= 3 &&
      line.trim().length <= 70 &&
      /^[A-Z0-9]/.test(line.trim()) &&
      !/[.!?]$/.test(line.trim()) &&
      line.trim().split(/\s+/).length <= 9;

    if (heading || looksLikeHeading) {
      push();
      current = {
        title: (heading ? heading[1] : line).trim(),
        level: heading ? Math.min(4, heading[0].trim().length) : 1,
        text: "",
        startIndex: offset,
        endIndex: offset,
      };
    } else if (current) {
      current.text += `${line}\n`;
    }
    offset += line.length + 1;
  });
  push();

  return sections.slice(0, 40);
}

export async function extractFromText(file: File): Promise<ExtractedContent> {
  const text = tidy(await file.text());
  return {
    text,
    metadata: {
      title: titleFromName(file.name),
      wordCount: countWords(text),
      lastModified: file.lastModified,
    },
    sections: buildSections(text),
  };
}

export const extractFromMarkdown = extractFromText;

export async function extractFromHTML(file: File): Promise<ExtractedContent> {
  const raw = await file.text();
  const text = tidy(
    raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<head[\s\S]*?<\/head>/gi, " ")
      .replace(/<\/(p|div|section|article|li|h[1-6]|tr|blockquote)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, " "),
  );
  const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return {
    text,
    metadata: {
      title: titleMatch ? tidy(titleMatch[1]) : titleFromName(file.name),
      wordCount: countWords(text),
      lastModified: file.lastModified,
    },
    sections: buildSections(text),
  };
}

export async function extractFromPDF(file: File): Promise<ExtractedContent> {
  const pdfjs = await import("pdfjs-dist");
  const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;

  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const parts: string[] = [];
  const sections: Section[] = [];
  let offset = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const block = `[Page ${pageNumber}]\n${pageText}`;
    if (pageText) {
      sections.push({
        title: `Page ${pageNumber}`,
        level: 1,
        text: pageText,
        startIndex: offset,
        endIndex: offset + block.length,
      });
      parts.push(block);
      offset += block.length + 2;
    }
  }

  const text = tidy(parts.join("\n\n"));
  return {
    text,
    metadata: {
      title: titleFromName(file.name),
      pageCount: pdf.numPages,
      wordCount: countWords(text),
      lastModified: file.lastModified,
    },
    sections: sections.length ? sections : undefined,
  };
}

async function readZipText(
  file: File,
  pick: (entries: string[]) => string[],
): Promise<{ text: string; count: number }> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const entries = pick(Object.keys(zip.files)).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  const parts: string[] = [];
  for (const entry of entries) {
    const xml = await zip.file(entry)?.async("string");
    if (xml) parts.push(xml);
  }
  return { text: parts.join("\n"), count: entries.length };
}

export async function extractFromDOCX(file: File): Promise<ExtractedContent> {
  const { text: xml } = await readZipText(file, (entries) =>
    entries.filter((entry) => entry === "word/document.xml"),
  );
  if (!xml) throw new Error("This Word file has no readable document body.");

  const text = tidy(
    xml
      .replace(/<w:tab[^>]*\/>/g, "\t")
      .replace(/<w:br[^>]*\/>/g, "\n")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<\/w:tr>/g, "\n")
      .replace(/<\/w:tc>/g, " | ")
      .replace(/<[^>]+>/g, ""),
  );

  return {
    text,
    metadata: {
      title: titleFromName(file.name),
      wordCount: countWords(text),
      lastModified: file.lastModified,
    },
    sections: buildSections(text),
  };
}

export async function extractFromPPTX(file: File): Promise<ExtractedContent> {
  const { text: xml, count } = await readZipText(file, (entries) =>
    entries.filter((entry) => /^ppt\/slides\/slide\d+\.xml$/.test(entry)),
  );
  if (!xml) throw new Error("This PowerPoint file has no readable slides.");

  const slides = xml.split(/(?=<p:sld[ >])/).filter(Boolean);
  const text = tidy(
    slides
      .map((slide, index) => {
        const runs = Array.from(slide.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)).map((match) =>
          decodeEntities(match[1]),
        );
        return `[Slide ${index + 1}]\n${runs.join(" ")}`;
      })
      .join("\n\n")
      .replace(/<[^>]+>/g, ""),
  );

  return {
    text,
    metadata: {
      title: titleFromName(file.name),
      pageCount: count,
      wordCount: countWords(text),
      lastModified: file.lastModified,
    },
  };
}

export async function extractFromRTF(file: File): Promise<ExtractedContent> {
  const raw = await file.text();
  let text = raw
    .replace(/\\'([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\u(-?\d+)\??/g, (_, code) => String.fromCharCode(Number(code) + 65536))
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\line/g, "\n")
    .replace(/\\tab/g, "\t")
    .replace(/\{\\\*[^{}]*\}/g, "")
    .replace(/\{[^{}]*\}/g, "")
    .replace(/\\[a-z]+-?\d* ?/gi, "")
    .replace(/[{}]/g, "");
  text = tidy(text);
  return {
    text,
    metadata: {
      title: titleFromName(file.name),
      wordCount: countWords(text),
      lastModified: file.lastModified,
    },
    sections: buildSections(text),
  };
}

export async function extractDocument(file: File): Promise<ExtractedContent> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return extractFromPDF(file);
  if (name.endsWith(".docx")) return extractFromDOCX(file);
  if (name.endsWith(".pptx")) return extractFromPPTX(file);
  if (name.endsWith(".rtf")) return extractFromRTF(file);
  if (name.endsWith(".html") || name.endsWith(".htm")) return extractFromHTML(file);
  if (
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".markdown") ||
    name.endsWith(".json") ||
    name.endsWith(".csv")
  ) {
    return extractFromText(file);
  }
  if (name.endsWith(".doc") || name.endsWith(".ppt")) {
    throw new Error("Legacy .doc and .ppt files are not supported — save them as .docx or .pptx first.");
  }
  // Last resort: treat it as text if the browser can decode it.
  return extractFromText(file);
}

export async function extractDocuments(files: File[]): Promise<Map<string, ExtractedContent>> {
  const results = new Map<string, ExtractedContent>();
  for (const file of files) {
    try {
      results.set(file.name, await extractDocument(file));
    } catch (error) {
      console.error(`Failed to extract from ${file.name}:`, error);
    }
  }
  return results;
}

export function consolidateExtractedContent(contents: Map<string, ExtractedContent>): {
  combinedText: string;
  mergedMetadata: {
    totalFiles: number;
    totalWords: number;
    sources: { name: string; wordCount: number }[];
  };
  sections: Section[];
} {
  const sources: { name: string; wordCount: number }[] = [];
  const allSections: Section[] = [];
  let combinedText = "";
  let totalWords = 0;
  let globalOffset = 0;

  for (const [filename, content] of contents) {
    const wordCount = content.metadata.wordCount ?? countWords(content.text);
    sources.push({ name: filename, wordCount });
    totalWords += wordCount;

    const prefix = `\n\n[Source: ${filename}]\n`;
    if (content.sections) {
      allSections.push(
        ...content.sections.map((section) => ({
          ...section,
          startIndex: globalOffset + prefix.length + section.startIndex,
          endIndex: globalOffset + prefix.length + section.endIndex,
        })),
      );
    }
    combinedText += prefix + content.text;
    globalOffset += prefix.length + content.text.length;
  }

  return {
    combinedText,
    mergedMetadata: { totalFiles: sources.length, totalWords, sources },
    sections: allSections,
  };
}
