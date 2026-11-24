import type { QuestionType } from "./types";
import type { LengthPreset } from "./types";
import { LENGTH_PRESETS, lengthBudgetFor } from "./length-detail";
import { extractDocument } from "./document-extraction";

export { LENGTH_PRESETS };
export type { LengthPreset };

/**
 * Smart Mode is the shared "read my material and propose a setup" layer used by
 * every Prompt Studio surface. It owns file intake and content analysis, while
 * the actual prompt shape lives in the prompt builders.
 */
export interface SmartModeConfig {
  enabled: boolean;
  sourceFiles: SmartModeSourceFile[];
  autoConfigure: boolean;
  lengthPreset: LengthPreset;
  lengthSliderValue: number;
}

/** A source file plus the text extracted from it. */
export interface SmartModeSourceFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  extractedContent?: string;
  processingStatus: "pending" | "processing" | "completed" | "failed";
  processingError?: string;
  /** the original file, kept in memory so extraction can read its bytes */
  file?: File;
  wordCount?: number;
  pageCount?: number;
}

export interface AISuggestions {
  title?: string;
  subject?: string;
  description?: string;
  difficulty?: string;
  learningObjectives?: string[];
  topics?: string[];
  questionTypes?: QuestionType[];
  difficultyDistribution?: {
    easy: number;
    medium: number;
    hard: number;
  };
  [key: string]: unknown;
}

export interface SmartModeAnalysisResult {
  config: SmartModeConfig;
  suggestions: AISuggestions;
  sourceAnalysis: {
    wordCount: number;
    topicCoverage: string[];
    conceptCount: number;
    redundancyScore: number;
  };
}

export interface SourceAnalysis {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  headings: string[];
  estimatedTopics: string[];
  estimatedConcepts: number;
  readingMinutes: number;
}

/* ------------------------------------------------------------------ *
 * File intake
 * ------------------------------------------------------------------ */

export function createSourceFileEntry(file: File): SmartModeSourceFile {
  return {
    id: `file_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`,
    name: file.name,
    type: file.type,
    size: file.size,
    content: "",
    processingStatus: "pending",
    file,
  };
}

/**
 * Extracts one entry's text. Text formats are read directly; PDF/DOCX/PPTX go
 * through the shared document-extraction layer.
 */
export async function processSourceFile(entry: SmartModeSourceFile): Promise<SmartModeSourceFile> {
  const file = entry.file;
  if (!file) {
    return {
      ...entry,
      processingStatus: "failed",
      processingError: "The original file is no longer available — add it again.",
    };
  }

  try {
    const extracted = await extractDocument(file);
    const text = extracted.text?.trim() ?? "";
    if (!text) {
      return {
        ...entry,
        processingStatus: "failed",
        processingError: "No readable text was found in this file.",
      };
    }
    return {
      ...entry,
      content: text,
      extractedContent: text,
      wordCount: extracted.metadata.wordCount ?? countWords(text),
      pageCount: extracted.metadata.pageCount,
      processingStatus: "completed",
    };
  } catch (error) {
    return {
      ...entry,
      processingStatus: "failed",
      processingError: error instanceof Error ? error.message : "Could not read this file.",
    };
  }
}

export async function processSourceFiles(files: File[]): Promise<SmartModeSourceFile[]> {
  const entries = files.map(createSourceFileEntry);
  const processed: SmartModeSourceFile[] = [];
  for (const entry of entries) {
    processed.push(await processSourceFile({ ...entry, processingStatus: "processing" }));
  }
  return processed;
}

export function getSupportedExtensions(): string[] {
  return [".txt", ".md", ".rtf", ".pdf", ".docx", ".pptx", ".html", ".htm", ".json", ".csv"];
}

export function getFileTypeName(fileType: string, fileName = ""): string {
  const lower = `${fileType} ${fileName}`.toLowerCase();
  if (lower.includes("pdf")) return "PDF";
  if (lower.includes("word") || lower.includes(".docx") || lower.includes(".doc")) return "Word";
  if (
    lower.includes("powerpoint") ||
    lower.includes("presentation") ||
    lower.includes(".pptx") ||
    lower.includes(".ppt")
  )
    return "PowerPoint";
  if (lower.includes("html")) return "HTML";
  if (lower.includes("json")) return "JSON";
  if (lower.includes("csv")) return "CSV";
  if (lower.includes("rtf")) return "RTF";
  if (lower.includes("markdown") || lower.includes(".md")) return "Markdown";
  return "Text";
}

export function isSupportedFileType(fileType: string, fileName: string): boolean {
  if (
    fileType.includes("text/") ||
    fileType === "application/pdf" ||
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    fileType === "text/html" ||
    fileType === "application/json"
  ) {
    return true;
  }
  const lowerName = fileName.toLowerCase();
  return getSupportedExtensions().some((ext) => lowerName.endsWith(ext));
}

/* ------------------------------------------------------------------ *
 * Content analysis
 * ------------------------------------------------------------------ */

export function countWords(content: string): number {
  return content.trim() ? content.trim().split(/\s+/).length : 0;
}

export function estimateReadingTime(content: string, wordsPerMinute = 200): number {
  return Math.max(1, Math.ceil(countWords(content) / Math.max(1, wordsPerMinute)));
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "have",
  "has",
  "are",
  "was",
  "were",
  "will",
  "would",
  "can",
  "could",
  "should",
  "into",
  "their",
  "there",
  "they",
  "them",
  "these",
  "those",
  "such",
  "than",
  "then",
  "when",
  "where",
  "which",
  "while",
  "your",
  "you",
  "our",
  "its",
  "not",
  "but",
  "all",
  "any",
  "each",
  "how",
  "why",
  "what",
  "who",
  "whom",
  "about",
  "also",
  "been",
  "being",
  "because",
  "between",
  "both",
  "does",
  "doing",
  "during",
  "more",
  "most",
  "other",
  "over",
  "only",
  "same",
  "some",
  "very",
  "just",
  "may",
  "might",
  "must",
  "shall",
  "upon",
  "within",
  "without",
  "using",
  "used",
  "use",
  "one",
  "two",
  "three",
]);

/**
 * Lightweight, offline topic detection: frequent meaningful words, repeated
 * title-like phrases and markdown headings. It is deliberately conservative —
 * the prompt still asks the AI to do the real conceptual analysis.
 */
export function analyzeContent(content: string): SourceAnalysis {
  const text = content.replace(/\r/g, "");
  const words = text.toLowerCase().match(/[a-z][a-z0-9'-]{2,}/g) ?? [];
  const wordCount = countWords(text);
  const sentenceCount = text.split(/[.!?]+/).filter((part) => part.trim()).length;
  const paragraphCount = text.split(/\n\s*\n/).filter((part) => part.trim()).length;
  const headings = text
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        /^#{1,4}\s+\S/.test(line) ||
        (/^[A-Z][A-Za-z0-9 ,&:—-]{3,60}$/.test(line) && line.split(" ").length <= 8),
    )
    .map((line) => line.replace(/^#{1,4}\s+/, "").trim())
    .filter(Boolean)
    .slice(0, 24);

  const frequency = new Map<string, number>();
  words.forEach((word) => {
    if (STOP_WORDS.has(word) || word.length < 4) return;
    frequency.set(word, (frequency.get(word) ?? 0) + 1);
  });
  const frequent = Array.from(frequency.entries())
    .filter(([, count]) => count >= Math.max(2, Math.round(wordCount / 900)))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 14)
    .map(([word]) => word);

  const estimatedTopics = Array.from(
    new Set([...headings.slice(0, 8), ...frequent.map(titleCase)]),
  ).slice(0, 12);

  return {
    wordCount,
    sentenceCount,
    paragraphCount,
    headings,
    estimatedTopics,
    estimatedConcepts: Math.max(2, Math.min(24, Math.round(Math.sqrt(wordCount) / 2))),
    readingMinutes: estimateReadingTime(text),
  };
}

function titleCase(word: string): string {
  return word
    .split(/([-'])/)
    .map((part) => (part.length > 2 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join("");
}

export function analyzeContentForTopics(content: string) {
  const analysis = analyzeContent(content);
  return {
    wordCount: analysis.wordCount,
    sentenceCount: analysis.sentenceCount,
    paragraphCount: analysis.paragraphCount,
    estimatedTopics: analysis.estimatedTopics,
  };
}

/** Combines every completed source file into one material string. */
export function combinedMaterial(files: SmartModeSourceFile[]): string {
  return files
    .filter((file) => file.processingStatus === "completed")
    .map((file) => `[Source: ${file.name}]\n${file.extractedContent ?? file.content}`)
    .join("\n\n");
}

export async function analyzeSourceFiles(
  files: SmartModeSourceFile[],
): Promise<SmartModeAnalysisResult> {
  const content = combinedMaterial(files);
  const analysis = analyzeContent(content);
  const budget = lengthBudgetFor(50);

  const suggestions: AISuggestions = {
    title: analysis.estimatedTopics.length
      ? analysis.estimatedTopics.slice(0, 2).join(" — ")
      : files[0]?.name.replace(/\.[^/.]+$/, ""),
    subject: undefined,
    description: analysis.estimatedTopics.length
      ? `A ${budget.label.toLowerCase()} study resource covering ${analysis.estimatedTopics
          .slice(0, 5)
          .join(", ")}.`
      : "A study resource built from the supplied material.",
    learningObjectives: analysis.estimatedTopics
      .slice(0, 5)
      .map((topic) => `Explain the core concepts of ${topic.toLowerCase()}.`),
    topics: analysis.estimatedTopics,
  };

  return {
    config: {
      enabled: true,
      sourceFiles: files,
      autoConfigure: true,
      lengthPreset: budget.preset,
      lengthSliderValue: budget.sliderValue,
    },
    suggestions,
    sourceAnalysis: {
      wordCount: analysis.wordCount,
      topicCoverage: analysis.estimatedTopics,
      conceptCount: analysis.estimatedConcepts,
      redundancyScore: 0.2,
    },
  };
}

/** Applies user edits without discarding the rest of the config. */
export function mergeConfigWithSuggestions(
  originalConfig: SmartModeConfig,
  _suggestions: Partial<AISuggestions>,
  userOverrides: Record<string, unknown>,
): SmartModeConfig {
  return {
    ...originalConfig,
    ...userOverrides,
    autoConfigure: false,
    sourceFiles: originalConfig.sourceFiles,
    lengthPreset: originalConfig.lengthPreset,
    lengthSliderValue: originalConfig.lengthSliderValue,
    enabled: originalConfig.enabled,
  };
}
