import type { LengthPreset } from "./types";

/**
 * Shared length/detail model for every generation surface.
 *
 * The five presets are not "more questions" switches. They describe how much
 * conceptual depth, practice, reinforcement and explanation a resource should
 * carry. Decks translate this into Learning Path structure (stage count,
 * activity mix, question depth), while modules and courses can reuse the same
 * budget for their own shape.
 */

export const LENGTH_PRESETS: Record<
  LengthPreset,
  { label: string; description: string; sliderValue: number }
> = {
  shorter: {
    label: "Shorter",
    description: "Essential concepts only",
    sliderValue: 20,
  },
  short: {
    label: "Short",
    description: "Concise, meaningful practice",
    sliderValue: 40,
  },
  regular: {
    label: "Regular",
    description: "Balanced coverage (default)",
    sliderValue: 50,
  },
  long: {
    label: "Long",
    description: "Broader practice and reinforcement",
    sliderValue: 70,
  },
  longer: {
    label: "Longer",
    description: "Deepest coverage and mastery work",
    sliderValue: 90,
  },
};

export const LENGTH_ORDER: LengthPreset[] = ["shorter", "short", "regular", "long", "longer"];

/** Closest preset to an arbitrary 0–100 slider value. */
export function presetForSliderValue(value: number): LengthPreset {
  let best: LengthPreset = "regular";
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const preset of LENGTH_ORDER) {
    const diff = Math.abs(value - LENGTH_PRESETS[preset].sliderValue);
    if (diff < bestDiff) {
      best = preset;
      bestDiff = diff;
    }
  }
  return best;
}

export function clampSliderValue(value: number): number {
  if (!Number.isFinite(value)) return LENGTH_PRESETS.regular.sliderValue;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export type DetailDepth = "essential" | "concise" | "balanced" | "thorough" | "comprehensive";

export interface LengthBudget {
  preset: LengthPreset;
  sliderValue: number;
  label: string;
  depth: DetailDepth;
  /** Learning Path shape */
  minStages: number;
  maxStages: number;
  conceptsPerStage: number;
  activitiesPerStage: number;
  questionsPerActivity: number;
  reinforcementPerStage: number;
  includeApplication: boolean;
  includeIntegration: boolean;
  includeReinforcement: boolean;
  includeRetention: boolean;
  includeAdvanced: boolean;
  /** how much explanation and feedback the AI should write */
  explanationDepth: "brief" | "clear" | "detailed" | "rich";
  /** free-form instruction for prompts */
  instruction: string;
}

/**
 * Turns a slider value into concrete planning numbers. The numbers grow
 * smoothly rather than in five hard steps, so an in-between slider value still
 * produces a sensible path.
 */
export function lengthBudgetFor(sliderValue: number): LengthBudget {
  const value = clampSliderValue(sliderValue);
  const preset = presetForSliderValue(value);

  const minStages = value <= 25 ? 2 : value <= 45 ? 3 : value <= 65 ? 3 : value <= 85 ? 4 : 4;
  const maxStages = value <= 25 ? 3 : value <= 45 ? 4 : value <= 65 ? 5 : value <= 85 ? 7 : 8;

  const depth: DetailDepth =
    value <= 20
      ? "essential"
      : value <= 40
        ? "concise"
        : value <= 60
          ? "balanced"
          : value <= 80
            ? "thorough"
            : "comprehensive";

  const activitiesPerStage = value <= 30 ? 1 : value <= 65 ? 2 : value <= 85 ? 3 : 3;
  const questionsPerActivity =
    value <= 20 ? 5 : value <= 40 ? 7 : value <= 60 ? 9 : value <= 80 ? 12 : 15;
  const reinforcementPerStage = value <= 30 ? 0 : value <= 50 ? 1 : value <= 80 ? 2 : 3;

  const instruction =
    value <= 20
      ? "Keep the path to essential concepts and a small number of sharp activities. Do not add extra stages or filler practice."
      : value <= 40
        ? "Keep the path concise but complete: cover each essential concept once, with focused recall and a short reinforcement step."
        : value <= 60
          ? "Build a balanced path: introduce each concept, check understanding, practise recall and apply it, with reinforcement where it matters."
          : value <= 80
            ? "Build a thorough path: broader concept coverage, additional practice, application and integration work, and regular reinforcement of weaker concepts."
            : "Build the most comprehensive path: extensive practice, deeper conceptual exploration, advanced/integration work, and repeated reinforcement until mastery.";

  return {
    preset,
    sliderValue: value,
    label: LENGTH_PRESETS[preset].label,
    depth,
    minStages,
    maxStages,
    conceptsPerStage: value <= 30 ? 3 : value <= 60 ? 2 : value <= 80 ? 2 : 1,
    activitiesPerStage,
    questionsPerActivity,
    reinforcementPerStage,
    includeApplication: value > 25,
    includeIntegration: value >= 60,
    includeReinforcement: value > 30,
    includeRetention: value >= 55,
    includeAdvanced: value >= 80,
    explanationDepth:
      value <= 20 ? "brief" : value <= 40 ? "clear" : value <= 70 ? "detailed" : "rich",
    instruction,
  };
}

export function lengthBudgetForPreset(preset: LengthPreset): LengthBudget {
  return lengthBudgetFor(LENGTH_PRESETS[preset].sliderValue);
}

/** Shared prompt block describing the selected length/detail setting. */
export function getLengthInstructions(sliderValue: number): string {
  const budget = lengthBudgetFor(sliderValue);
  return [
    `LENGTH & DETAIL — ${budget.label} (${budget.sliderValue}/100)`,
    budget.instruction,
    `- Conceptual depth: ${budget.depth}.`,
    `- Explanation depth: ${budget.explanationDepth}.`,
  ].join("\n");
}

/** One-line summary for UI previews. */
export function describeLengthBudget(sliderValue: number): string {
  const budget = lengthBudgetFor(sliderValue);
  const details = [`${budget.depth} coverage`, `${budget.explanationDepth} explanations`];
  if (budget.includeApplication) details.push("application practice");
  if (budget.includeReinforcement) details.push("reinforcement");
  return details.join(" · ");
}

/** The maximum number of stages a path should ever plan for. */
export const MAX_LEARNING_STAGES = 8;
