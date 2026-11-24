import type { Difficulty, LengthPreset, QuestionType } from "./types";
import type { AISuggestions, SmartModeConfig } from "./smart-mode";
import { buildPrompt } from "./prompt";
import { getLengthInstructions } from "./length-detail";
import type { LearningPathPromptOptions } from "./learning-path-prompt-builder";

/**
 * Smart Mode adds source analysis and AI-suggested configuration on top of the
 * canonical prompt builders. It does not own a second schema: the deck prompt
 * (including its Learning Path contract) stays the single source of truth.
 */

export interface PromptBuildOptions {
  content_type: "deck" | "module" | "course";
  title: string;
  subject: string;
  description?: string;
  level?: string;
  material: string;

  suggestions: AISuggestions;
  autoConfigure: boolean;

  lengthPreset: LengthPreset;
  lengthSliderValue: number;

  questionTypes: QuestionType[];
  difficultyDistribution: Record<Difficulty, number>;
  isSTEM: boolean;
  needsEquations: boolean;
  needsGraphs: boolean;

  extra?: string;
  tone?: string;

  /** deck question count; when omitted Smart Mode derives it from the material */
  count?: number;
  countAuto?: boolean;
  typesAuto?: boolean;
  distributionAuto?: boolean;

  /** manual Learning Path structure from Prompt Studio */
  learningPath?: LearningPathPromptOptions;

  // course/module specific (not generated in this phase)
  moduleCount?: number;
  lessonsPerModule?: number;
  questionsPerLesson?: number;
  includeAssessments?: boolean;
}

export function buildSmartPrompt(options: PromptBuildOptions): string {
  if (options.content_type === "deck") return buildSmartDeckPrompt(options);

  return buildGenericSmartPrompt(options);
}

function buildSmartDeckPrompt(options: PromptBuildOptions): string {
  const material = options.material.trim();
  const wordCount = material ? material.split(/\s+/).length : 0;
  const count = options.count ?? Math.max(5, Math.min(120, Math.round(wordCount / 25) || 10));

  const base = buildPrompt({
    material: options.material,
    title: options.title,
    subject: options.subject,
    count,
    distribution: options.difficultyDistribution,
    types: options.questionTypes,
    extra: options.extra ?? "",
    audience: options.level,
    isSTEM: options.isSTEM,
    needsEquations: options.needsEquations,
    needsGraphs: options.needsGraphs,
    countAuto: options.countAuto ?? !options.count,
    typesAuto: options.typesAuto ?? false,
    distributionAuto: options.distributionAuto ?? false,
    lengthSliderValue: options.lengthSliderValue,
    learningPath: options.learningPath,
  });

  return `${smartHeader(options)}${base}`;
}

function smartHeader(options: PromptBuildOptions): string {
  const lines = [
    "SMART MODE — the material has already been read and summarised",
    `- Suggested title: ${options.title || options.suggestions.title || "derive one from the material"}`,
    `- Suggested subject: ${options.subject || options.suggestions.subject || "derive one from the material"}`,
  ];
  if (options.suggestions.description) {
    lines.push(`- Suggested description: ${options.suggestions.description}`);
  }
  if (options.suggestions.topics?.length) {
    lines.push(`- Likely topics: ${options.suggestions.topics.join(", ")}`);
  }
  if (options.suggestions.learningObjectives?.length) {
    lines.push(
      `- Suggested learning objectives:\n${options.suggestions.learningObjectives
        .map((objective) => `  - ${objective}`)
        .join("\n")}`,
    );
  }
  if (options.suggestions.difficultyDistribution) {
    const dist = options.suggestions.difficultyDistribution;
    lines.push(
      `- Suggested difficulty mix: ${dist.easy}% easy, ${dist.medium}% medium, ${dist.hard}% hard`,
    );
  }
  lines.push(
    "- Treat these as a starting point. The Learning Path below still has to be designed from the actual material, not from this summary.",
    "",
  );
  return `${lines.join("\n")}\n`;
}

/**
 * Module and course prompts are intentionally left as a thin scaffold in this
 * phase. Deck generation owns the full Learning Path contract.
 */
function buildGenericSmartPrompt(options: PromptBuildOptions): string {
  const { lengthSliderValue } = options;
  return `You are an expert curriculum designer. Create a ${options.content_type} from the material below.

${smartHeader(options)}

CONTENT SETTINGS
- Title: ${options.title || "Untitled"}
- Subject: ${options.subject || "General"}
- Level: ${options.level || "unspecified"}
${options.content_type === "course" ? `- Modules: ${options.moduleCount ?? 4}\n- Lessons per module: ${options.lessonsPerModule ?? 3}\n` : ""}
${options.content_type === "module" ? `- Checkpoint questions: ${options.questionsPerLesson ?? 5}\n` : ""}
${options.includeAssessments ? "- Include assessments.\n" : ""}

${getLengthInstructions(lengthSliderValue)}

${options.extra ? `ADDITIONAL INSTRUCTIONS\n${options.extra}\n` : ""}
STUDY MATERIAL
"""
${options.material || "(paste your study material here)"}
"""`;
}

/** Shared Smart Mode defaults so every surface starts from the same place. */
export function defaultSmartConfig(): SmartModeConfig {
  return {
    enabled: false,
    sourceFiles: [],
    autoConfigure: true,
    lengthPreset: "regular",
    lengthSliderValue: 50,
  };
}

export { getLengthInstructions };
