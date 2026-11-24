import type { ReadingHighlight } from "@/lib/types";

export interface ReadingHighlightAnchor {
  quote: string;
  prefix: string;
  suffix: string;
  startOffset: number;
}

export interface LocatedHighlight {
  start: number;
  end: number;
}

export function normalizeReadingText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function createReadingHighlightAnchor(
  before: string,
  selected: string,
  after: string,
): ReadingHighlightAnchor | null {
  const quote = normalizeReadingText(selected);
  if (!quote) return null;
  const prefix = normalizeReadingText(before).slice(-80);
  const suffix = normalizeReadingText(after).slice(0, 80);
  return {
    quote,
    prefix,
    suffix,
    startOffset: normalizeReadingText(before).length,
  };
}

function commonSuffixLength(first: string, second: string): number {
  let length = 0;
  while (
    length < first.length &&
    length < second.length &&
    first[first.length - length - 1] === second[second.length - length - 1]
  ) {
    length += 1;
  }
  return length;
}

function commonPrefixLength(first: string, second: string): number {
  let length = 0;
  while (length < first.length && length < second.length && first[length] === second[length]) {
    length += 1;
  }
  return length;
}

export function locateReadingHighlight(
  content: string,
  anchor: Pick<ReadingHighlight, "quote" | "prefix" | "suffix" | "startOffset">,
): LocatedHighlight | null {
  const text = normalizeReadingText(content);
  const quote = normalizeReadingText(anchor.quote);
  if (!quote) return null;

  const candidates: LocatedHighlight[] = [];
  let from = 0;
  while (from <= text.length - quote.length) {
    const start = text.indexOf(quote, from);
    if (start < 0) break;
    candidates.push({ start, end: start + quote.length });
    from = start + 1;
  }
  if (!candidates.length) return null;

  return candidates.reduce((best, candidate) => {
    const candidatePrefix = normalizeReadingText(
      text.slice(Math.max(0, candidate.start - 80), candidate.start),
    );
    const candidateSuffix = normalizeReadingText(text.slice(candidate.end, candidate.end + 80));
    const contextScore =
      commonSuffixLength(anchor.prefix, candidatePrefix) +
      commonPrefixLength(anchor.suffix, candidateSuffix);
    const bestPrefix = normalizeReadingText(text.slice(Math.max(0, best.start - 80), best.start));
    const bestSuffix = normalizeReadingText(text.slice(best.end, best.end + 80));
    const bestContextScore =
      commonSuffixLength(anchor.prefix, bestPrefix) + commonPrefixLength(anchor.suffix, bestSuffix);
    const candidateDistance = Math.abs(candidate.start - anchor.startOffset);
    const bestDistance = Math.abs(best.start - anchor.startOffset);
    return contextScore > bestContextScore ||
      (contextScore === bestContextScore && candidateDistance < bestDistance)
      ? candidate
      : best;
  });
}

export function sameHighlightLocation(
  first: Pick<ReadingHighlight, "documentType" | "documentId" | "locationId">,
  second: Pick<ReadingHighlight, "documentType" | "documentId" | "locationId">,
): boolean {
  return (
    first.documentType === second.documentType &&
    first.documentId === second.documentId &&
    first.locationId === second.locationId
  );
}
