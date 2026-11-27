import type { Difficulty, LengthPreset, QuestionType } from "./types";
import type { AISuggestions, SmartModeConfig } from "./smart-mode";
import { buildPrompt } from "./prompt";
import { buildModulePrompt } from "./module-prompt";
import { buildCoursePrompt } from "./course-prompt";
import { getLengthInstructions } from "./length-detail";
import type { LearningPathPromptOptions } from "./learning-path-prompt-builder";

/**
 * Smart Mode adds source analysis to the canonical prompt builders without
 * treating local suggestions as decisions or defining a second output schema.
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
  purpose?: string;

  /** deck question count; when omitted Smart Mode derives it from the material */
  count?: number;
  countAuto?: boolean;
  typesAuto?: boolean;
  distributionAuto?: boolean;

  /** manual Learning Path structure from Prompt Studio */
  learningPath?: LearningPathPromptOptions;

  // course-specific
  topic?: string;
  objectives?: string[];
  sectionGuidance?: string;
  sectionsPerLesson?: number;
  sectionsAuto?: boolean;
  sizeAuto?: boolean;
  moduleCount?: number;
  lessonsPerModule?: number;
  questionsPerLesson?: number;
  levelAuto?: boolean;
  includeAssessments?: boolean;
}

export function buildSmartPrompt(options: PromptBuildOptions): string {
  if (options.content_type === "deck") return buildSmartDeckPrompt(options);
  if (options.content_type === "module") {
    return buildModulePrompt({
      title: options.title,
      subject: options.subject,
      description: options.description ?? "",
      difficulty: options.suggestions.difficulty ?? "2",
      minutes: "15",
      objectives: options.suggestions.learningObjectives?.join("\n") ?? "",
      topics: options.suggestions.topics?.join("\n") ?? "",
      material: options.material,
      extra: options.extra ?? "",
      tone: options.tone ?? "",
      blurbs: [],
      lengthSliderValue: options.lengthSliderValue,
      smartModeEnabled: true,
      difficultyAuto: true,
      minutesAuto: true,
    });
  }
  return buildSmartCoursePrompt(options);
}

function buildSmartCoursePrompt(options: PromptBuildOptions): string {
  return buildCoursePrompt({
    topic: options.topic ?? options.suggestions.topics?.join("\n") ?? "",
    material: options.material,
    title: options.title || options.suggestions.title || "",
    subject: options.subject || options.suggestions.subject || "",
    level: options.level ?? "",
    description: options.description?.trim() || options.suggestions.description || "",
    objectives:
      options.objectives?.join("\n") ?? options.suggestions.learningObjectives?.join("\n") ?? "",
    sectionGuidance: options.sectionGuidance ?? "",
    sectionsPerLesson: options.sectionsPerLesson,
    sectionsAuto: true,
    moduleCount: options.moduleCount ?? 4,
    lessonsPerModule: options.lessonsPerModule ?? 3,
    questionsPerLesson: options.questionsPerLesson ?? 4,
    types: options.questionTypes,
    distribution: options.difficultyDistribution,
    audience: options.level,
    purpose: options.purpose ?? "",
    extra: options.extra ?? "",
    tone: options.tone ?? "",
    includeAssessments: options.includeAssessments ?? true,
    isSTEM: options.isSTEM,
    needsEquations: options.needsEquations,
    needsGraphs: options.needsGraphs,
    sizeAuto: true,
    typesAuto: true,
    distributionAuto: true,
    levelAuto: true,
    lengthSliderValue: options.lengthSliderValue,
    smartModeEnabled: true,
  });
}

function buildSmartDeckPrompt(options: PromptBuildOptions): string {
  const material = options.material.trim();
  const wordCount = material ? material.split(/\s+/).length : 0;
  const count =
    options.count ??
    (options.autoConfigure ? 1 : Math.max(5, Math.min(120, Math.round(wordCount / 25) || 10)));

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
    countAuto: true,
    typesAuto: true,
    distributionAuto: true,
    smartModeEnabled: true,
    lengthSliderValue: options.lengthSliderValue,
    learningPath: { ...options.learningPath, autonomous: true },
  });

  return base;
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
