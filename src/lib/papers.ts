import type { ExamOptions } from "./exam-print";
import type { Question } from "./types";

/**
 * The past-paper shelf: printed exam configurations saved as papers, plus
 * every sitting (an attempt at one) with its score. The full question list is
 * snapshotted so a paper always reprints exactly as it was, even if the decks
 * change later. All local.
 */

export interface PaperSitting {
  id: string;
  /** when the sitting finished */
  takenAt: number;
  score: number;
  total: number;
  percentage: number;
  /** how long the learner took, in minutes */
  minutes?: number;
  /** self-reflection notes */
  notes?: string;
}

export interface PaperRecord {
  id: string;
  title: string;
  createdAt: number;
  /** the print configuration it came from */
  options: ExamOptions;
  /** snapshot of the questions as printed (with any on-paper edits) */
  questions: Question[];
  /** deck ids it was drawn from, for context */
  deckIds?: string[];
  labelIds?: string[];
  sittings: PaperSitting[];
}

export function bestSitting(paper: PaperRecord): PaperSitting | undefined {
  return [...paper.sittings].sort((a, b) => b.percentage - a.percentage)[0];
}

export function lastSitting(paper: PaperRecord): PaperSitting | undefined {
  return [...paper.sittings].sort((a, b) => b.takenAt - a.takenAt)[0];
}

export function averagePercentage(papers: PaperRecord[]): number | null {
  const all = papers.flatMap((p) => p.sittings);
  if (!all.length) return null;
  return Math.round(all.reduce((sum, s) => sum + s.percentage, 0) / all.length);
}
