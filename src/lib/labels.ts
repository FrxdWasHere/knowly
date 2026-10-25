/**
 * Binder labels — colour-coded tags the learner can stick on decks,
 * courses and past papers to keep the library organised. Purely local.
 */

export type BinderLabelColor = "blue" | "green" | "amber" | "rose" | "violet" | "cyan";

export interface BinderLabel {
  id: string;
  name: string;
  color: BinderLabelColor;
  /** small icon shown next to the name */
  emoji?: string;
}

/** CSS classes for label chips in both themes. */
export const LABEL_STYLES: Record<BinderLabelColor, { chip: string; dot: string }> = {
  blue: {
    chip: "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  green: {
    chip: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  amber: {
    chip: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  rose: {
    chip: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  violet: {
    chip: "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  cyan: {
    chip: "border-cyan-500/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
    dot: "bg-cyan-500",
  },
};

export const LABEL_COLORS: BinderLabelColor[] = [
  "blue",
  "green",
  "amber",
  "rose",
  "violet",
  "cyan",
];

export function labelById(labels: BinderLabel[], id: string): BinderLabel | undefined {
  return labels.find((l) => l.id === id);
}

export function labelIdsOf(item: { labelIds?: string[] }): string[] {
  return item.labelIds ?? [];
}
