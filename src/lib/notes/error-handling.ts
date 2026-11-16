/**
 * Centralized error handling for notes operations.
 * Provides consistent error messages, logging, and recovery strategies.
 */

export class NotesError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "NotesError";
  }
}

export type ErrorSeverity = "critical" | "warning" | "info";

export interface ErrorReport {
  code: string;
  message: string;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
  timestamp: number;
}

const errorLog: ErrorReport[] = [];
const MAX_ERROR_LOG = 50;

/**
 * Log an error for debugging and reporting.
 */
export function logError(
  code: string,
  message: string,
  severity: ErrorSeverity = "warning",
  context?: Record<string, unknown>,
): void {
  const report: ErrorReport = {
    code,
    message,
    severity,
    context,
    timestamp: Date.now(),
  };

  errorLog.push(report);
  if (errorLog.length > MAX_ERROR_LOG) {
    errorLog.shift();
  }

  // Log to console in development
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.warn(`[NotesError ${code}]`, message, context || "");
  }
}

/**
 * Get all logged errors (for debugging/reporting).
 */
export function getErrorLog(): ErrorReport[] {
  return [...errorLog];
}

/**
 * Clear the error log.
 */
export function clearErrorLog(): void {
  errorLog.length = 0;
}

/**
 * Handle save failures with exponential backoff retry.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  code = "RETRY_FAILED",
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        logError(code, `Failed after ${maxAttempts} attempts`, "critical", {
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
      // Exponential backoff: 100ms, 200ms, 400ms
      const delay = 100 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
      logError(code, `Retry attempt ${attempt + 1}/${maxAttempts}`, "info", {
        delay,
        attempt: attempt + 1,
      });
    }
  }
  throw new NotesError("Retry loop completed without result", code);
}

/**
 * Handle PDF text extraction failures gracefully.
 */
export async function extractPdfTextSafely(
  pdfData: ArrayBuffer,
): Promise<{ text: string; partial: boolean }> {
  try {
    // This will be implemented based on the actual PDF library used
    // For now, just a placeholder that shows the error handling pattern
    const text = await extractPdfText(pdfData);
    return { text, partial: false };
  } catch (error) {
    logError(
      "PDF_TEXT_EXTRACT_FAILED",
      error instanceof Error ? error.message : "Failed to extract PDF text",
      "warning",
      { errorType: error instanceof Error ? error.constructor.name : typeof error },
    );
    // Return partial success rather than failing completely
    return { text: "", partial: true };
  }
}

/**
 * Placeholder for actual PDF text extraction.
 * Replace with actual implementation.
 */
async function extractPdfText(pdfData: ArrayBuffer): Promise<string> {
  // Implementation depends on the PDF library used
  throw new Error("PDF extraction not implemented");
}

/**
 * Validate linked resource references and return broken links.
 */
export function validateLinkedResources(
  linkedCourseId: string | undefined,
  availableCourses: Array<{ id: string }>,
): { valid: boolean; broken: boolean } {
  if (!linkedCourseId) {
    return { valid: true, broken: false };
  }
  const exists = availableCourses.some((course) => course.id === linkedCourseId);
  if (!exists) {
    logError(
      "BROKEN_LINKED_COURSE",
      `Linked course ${linkedCourseId} no longer exists`,
      "warning",
      { linkedCourseId },
    );
    return { valid: false, broken: true };
  }
  return { valid: true, broken: false };
}
