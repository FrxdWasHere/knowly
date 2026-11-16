/**
 * Data validation and consistency checks for notebooks.
 * Detects and repairs orphaned pages, broken references, and inconsistencies.
 */

import { type NotebookMeta, type NotePage } from "./types";

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  repaired: boolean;
}

export interface ValidationIssue {
  code: string;
  severity: "error" | "warning";
  description: string;
  affectedIds?: string[];
}

/**
 * Validate a notebook and its pages for consistency.
 */
export async function validateNotebook(
  notebook: NotebookMeta,
  pages: NotePage[],
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  const pageIds = new Set(pages.map((p) => p.id));

  // Check for orphaned pages (pages not in meta.pageIds)
  const orphanedPages = pages.filter((p) => !notebook.pageIds.includes(p.id));
  if (orphanedPages.length > 0) {
    issues.push({
      code: "ORPHANED_PAGES",
      severity: "warning",
      description: `Found ${orphanedPages.length} page(s) not listed in notebook metadata`,
      affectedIds: orphanedPages.map((p) => p.id),
    });
  }

  // Check for dangling references (pageIds pointing to deleted pages)
  const danglingPageIds = notebook.pageIds.filter((id) => !pageIds.has(id));
  if (danglingPageIds.length > 0) {
    issues.push({
      code: "DANGLING_PAGE_REFS",
      severity: "error",
      description: `Found ${danglingPageIds.length} reference(s) to deleted page(s)`,
      affectedIds: danglingPageIds,
    });
  }

  // Check section consistency
  if (notebook.sections) {
    const sectionIds = new Set(notebook.sections.map((s) => s.id));
    for (const page of pages) {
      if (page.sectionId && !sectionIds.has(page.sectionId)) {
        issues.push({
          code: "BROKEN_SECTION_REF",
          severity: "warning",
          description: `Page ${page.id} references missing section ${page.sectionId}`,
          affectedIds: [page.id],
        });
      }
    }
  }

  // Check for linked resource validity
  if (notebook.linkedCourseId && !notebook.linkedCourseId.startsWith("course_")) {
    issues.push({
      code: "INVALID_LINKED_COURSE",
      severity: "warning",
      description: "Linked course ID has invalid format",
    });
  }

  const valid = !issues.some((i) => i.severity === "error");
  return {
    valid,
    issues,
    repaired: false,
  };
}

/**
 * Repair a notebook by fixing consistency issues.
 */
export function repairNotebook(
  notebook: NotebookMeta,
  pages: NotePage[],
): { notebook: NotebookMeta; changed: boolean } {
  let changed = false;
  const pageIds = new Set(pages.map((p) => p.id));

  // Remove dangling page references
  const repairedPageIds = notebook.pageIds.filter((id) => pageIds.has(id));
  if (repairedPageIds.length !== notebook.pageIds.length) {
    changed = true;
  }

  // Add orphaned pages to the end
  const orphanedPages = pages.filter((p) => !notebook.pageIds.includes(p.id));
  if (orphanedPages.length > 0) {
    changed = true;
    repairedPageIds.push(...orphanedPages.map((p) => p.id));
  }

  // Ensure default section exists
  let sections = notebook.sections;
  if (!sections || sections.length === 0) {
    sections = [
      {
        id: `section_${Date.now()}_0`,
        name: "Notes",
        color: notebook.color || "#6d8cff",
        createdAt: Date.now(),
      },
    ];
    changed = true;
  }

  // Assign orphaned pages to default section
  const defaultSectionId = sections[0].id;
  for (const page of pages) {
    if (page.sectionId && !sections.some((s) => s.id === page.sectionId)) {
      page.sectionId = defaultSectionId;
      changed = true;
    }
  }

  return {
    notebook: {
      ...notebook,
      pageIds: repairedPageIds,
      sections,
      updatedAt: changed ? Date.now() : notebook.updatedAt,
    },
    changed,
  };
}

/**
 * Detect potential data loss scenarios.
 */
export interface DataLossRisk {
  risk: boolean;
  reason?: string;
  recommendations: string[];
}

export function detectDataLossRisks(notebook: NotebookMeta, pages: NotePage[]): DataLossRisk {
  const recommendations: string[] = [];
  let risk = false;

  // Check for very large notebooks that might exceed storage
  const estimatedSize = JSON.stringify({ notebook, pages }).length;
  if (estimatedSize > 10 * 1024 * 1024) {
    risk = true;
    recommendations.push("Notebook is very large (>10MB). Consider exporting and archiving.");
  }

  // Check for many unsaved changes (inferred by updatedAt being recent)
  const recentUpdates = pages.filter(
    (p) => Date.now() - p.updatedAt < 60000, // Last minute
  ).length;
  if (recentUpdates > pages.length * 0.5) {
    recommendations.push("Many recent changes detected. Ensure auto-save is enabled.");
  }

  // Check for pages with many elements (performance risk)
  const heavyPages = pages.filter((p) => p.elements.length > 500);
  if (heavyPages.length > 0) {
    recommendations.push(
      `${heavyPages.length} page(s) have many elements (>500). Performance may suffer.`,
    );
  }

  return {
    risk,
    recommendations,
  };
}

/**
 * Sanitize imported notebook data to prevent injection.
 */
export function sanitizeNotebook(notebook: Partial<NotebookMeta>): Partial<NotebookMeta> {
  return {
    title: sanitizeString(notebook.title, 100),
    subject: sanitizeString(notebook.subject, 100),
    color: sanitizeColor(notebook.color),
    tags: Array.isArray(notebook.tags)
      ? notebook.tags.map((t) => sanitizeString(t, 50)).filter(Boolean)
      : [],
    // Keep other fields as-is for validation elsewhere
    ...Object.fromEntries(
      Object.entries(notebook).filter(
        ([key]) => !["title", "subject", "color", "tags"].includes(key),
      ),
    ),
  };
}

function sanitizeString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength).replace(/[<>]/g, ""); // Remove angle brackets to prevent HTML injection
}

function sanitizeColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  // Validate hex color format
  if (!/^#[0-9a-f]{6}$/i.test(value)) return undefined;
  return value.toLowerCase();
}
