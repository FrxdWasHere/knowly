import type { Question } from "./types";
import { selectQuestions, type ExamOptions, type SelectionFilters } from "./exam-print";
import { shuffleArray } from "./answers";
import { createId } from "./id";

export type BulkDistributionStrategy =
  "same-for-all" | "random-per-paper" | "sequential" | "custom-per-paper";

export const BULK_STRATEGIES: {
  id: BulkDistributionStrategy;
  label: string;
  description: string;
}[] = [
  {
    id: "same-for-all",
    label: "Same for all",
    description: "Every paper gets the exact same questions",
  },
  {
    id: "random-per-paper",
    label: "Random per paper",
    description: "Each paper gets a different selection, no repeats until the pool runs out",
  },
  {
    id: "sequential",
    label: "Sequential",
    description: "Papers take questions in deck order, with no overlap",
  },
  {
    id: "custom-per-paper",
    label: "Custom per paper",
    description: "Choose how many questions each paper gets",
  },
];

export interface BulkExamConfig {
  numberOfPapers: number;
  distributionStrategy: BulkDistributionStrategy;
  /** One count for every paper, or one count per paper for `custom-per-paper`. */
  questionsPerPaper: number | number[];
  autoNumbering: boolean;
  namingPrefix: string;
}

export interface GeneratedBulkPaper {
  paperId: string;
  paperNumber: number;
  title: string;
  questions: Question[];
  options: ExamOptions;
}

/** The questions that survive the shared type/difficulty filters. */
export function eligibleQuestions(pool: Question[], filters: SelectionFilters): Question[] {
  return pool.filter(
    (q) => filters.types.includes(q.type) && filters.difficulties.includes(q.difficulty),
  );
}

/** Per-paper counts, normalised to exactly `numberOfPapers` entries. */
export function perPaperCounts(config: BulkExamConfig): number[] {
  const counts = config.questionsPerPaper;
  return Array.from({ length: Math.max(1, config.numberOfPapers) }, (_, i) =>
    Math.max(1, typeof counts === "number" ? counts : (counts[i] ?? counts[0] ?? 20)),
  );
}

export function getTotalQuestionsNeeded(config: BulkExamConfig): number {
  return perPaperCounts(config).reduce((sum, count) => sum + count, 0);
}

/**
 * How many distinct questions the strategy needs before it can keep its
 * promise. `same-for-all` reuses one set, so it only needs the largest paper;
 * every other strategy draws fresh questions for each paper.
 */
export function getRequiredPoolSize(config: BulkExamConfig): number {
  const counts = perPaperCounts(config);
  return config.distributionStrategy === "same-for-all"
    ? Math.max(...counts)
    : counts.reduce((sum, count) => sum + count, 0);
}

function paperTitle(baseOptions: ExamOptions, paperNumber: number, config: BulkExamConfig): string {
  if (!config.autoNumbering) return baseOptions.title || "Practice Exam";
  const prefix = config.namingPrefix.trim() || baseOptions.title.trim() || "Exam";
  return `${prefix} — Paper ${paperNumber}`;
}

export function generateBulkPapers(
  pool: Question[],
  filters: SelectionFilters,
  baseOptions: ExamOptions,
  config: BulkExamConfig,
): GeneratedBulkPaper[] {
  const eligible = eligibleQuestions(pool, filters);
  const counts = perPaperCounts(config);
  const results: GeneratedBulkPaper[] = [];

  // `same-for-all` picks one set up front so every paper matches exactly.
  const sharedQuestions =
    config.distributionStrategy === "same-for-all"
      ? selectQuestions(eligible, { ...filters, count: Math.max(...counts) })
      : [];

  // A shuffled queue feeds the random strategies: papers stay distinct until
  // the pool is exhausted, then a fresh shuffle starts the rotation again.
  let queue: Question[] = [];
  let queueIndex = 0;
  const takeNext = (count: number): Question[] => {
    const picked: Question[] = [];
    while (picked.length < count) {
      if (eligible.length === 0) break;
      if (queueIndex >= queue.length) {
        queue = shuffleArray(eligible);
        queueIndex = 0;
      }
      picked.push(queue[queueIndex]!);
      queueIndex += 1;
    }
    return picked;
  };

  // Sequential papers read the filtered pool in deck order.
  let sequentialIndex = 0;

  for (let index = 0; index < counts.length; index += 1) {
    const paperNumber = index + 1;
    const count = counts[index]!;

    let questions: Question[];
    switch (config.distributionStrategy) {
      case "same-for-all":
        questions = sharedQuestions.slice(0, count);
        break;
      case "sequential":
        questions = eligible.slice(sequentialIndex, sequentialIndex + count);
        sequentialIndex += count;
        break;
      case "custom-per-paper":
      case "random-per-paper":
      default:
        questions = takeNext(count);
        break;
    }

    const title = paperTitle(baseOptions, paperNumber, config);
    results.push({
      paperId: createId(),
      paperNumber,
      title,
      questions,
      options: { ...baseOptions, title },
    });
  }

  return results;
}
