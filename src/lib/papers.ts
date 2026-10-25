import type { ExamOptions } from "./exam-print";

/**
 * The past-paper shelf: printed exam configurations saved as papers, plus
 * every sitting (an attempt at one) with its score. All local.
 */

export interface PaperSitting {
  id: string;
  /** when the sitting finished */
  takenAt: number;
  score: number;
  total: number;
  percentage: number;
  /** self-graded? or timed? — both derived from the paper */
  minutes?: number;
  notes?: string;
}

export interface PaperRecord {
  id: string;
  title: string;
  createdAt: number;
  /** the print configuration it came from */
  options: ExamOptions;
  /** snapshot of the questions printed (ids trimmed of runtime extras) */
  questionIds: string[];
  count: number;
  subject?: string;
  sittings: PaperSitting[];
  labelIds?: string[];
}
