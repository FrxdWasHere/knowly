import type { Difficulty, LengthPreset, Question } from "./types";
import { displayAnswer } from "./interactive";
import {
  getLengthInstructions,
  lengthBudgetFor,
  lengthBudgetForPreset,
  type LengthBudget,
} from "./length-detail";
import {
  LEARNING_ACTIVITY_META,
  LEARNING_ACTIVITY_TYPES,
  LEARNING_PURPOSE_META,
  LEARNING_STAGE_PURPOSES,
  conceptOf,
} from "./learning-paths";

/**
 * The Learning Path contract shared by the deck prompt, the Smart Mode prompt
 * and the standalone "re-plan this deck" prompt. Keeping it in one place means
 * an AI always returns the same structure no matter which door the learner
 * came through.
 */

export interface LearningPathPromptOptions {
  /** 0–100 shared length/detail value */
  sliderValue?: number;
  lengthPreset?: LengthPreset;
  /** let the model choose every path count and activity decision */
  autonomous?: boolean;
  /** the learner can pin the number of stages before generating */
  stageCount?: number;
  includeApplication?: boolean;
  includeIntegration?: boolean;
  includeReinforcement?: boolean;
  /** hand-written stage briefs from the manual Learning Path editor */
  customStages?: {
    title: string;
    purpose?: string;
    concepts?: string[];
    activityTypes?: string[];
  }[];
}

export function promptBudget(options: LearningPathPromptOptions = {}): LengthBudget {
  if (typeof options.sliderValue === "number") return lengthBudgetFor(options.sliderValue);
  if (options.lengthPreset) return lengthBudgetForPreset(options.lengthPreset);
  return lengthBudgetForPreset("regular");
}

/** The JSON shape of the `learningPath` field inside a deck. */
export const LEARNING_PATH_SCHEMA_TEXT = `"learningPath": {
  "title": string,                       // required — the journey's name
  "description": string,                 // required — one line on the journey
  "stages": [                            // required — 1-8 ordered stages
    {
      "title": string,                   // required — e.g. "Foundations: Membrane structure"
      "description": string,             // required — why this stage exists
      "purpose": ${LEARNING_STAGE_PURPOSES.map((purpose) => `"${purpose}"`).join(" | ")},
      "objectives": string[],            // required — 2-4 "can do" statements
      "concepts": string[],              // required — the concepts this stage teaches
      "prerequisiteConcepts": string[],  // required — earlier concepts this builds on (may be empty)
      "difficultyTarget": "easy" | "medium" | "hard",
      "estimatedMinutes": number,
      "activities": [                    // required — 1-3 activities
        {
          "type": ${LEARNING_ACTIVITY_TYPES.map((type) => `"${type}"`).join(" | ")},
          "title": string,
          "description": string,
          "objective": string,
          "estimatedMinutes": number,
          "questions": number[]          // required — 1-based positions in the deck's "questions" array
        }
      ]
    }
  ],
  "estimatedMinutes": number,
  "conceptsCovered": string[]
}`;

/** A compact human-readable menu for prompts. */
export function activityMenuText(): string {
  return LEARNING_ACTIVITY_TYPES.map(
    (type) => `- ${type}: ${LEARNING_ACTIVITY_META[type].objective}`,
  ).join("\n");
}

export function purposeMenuText(): string {
  return LEARNING_STAGE_PURPOSES.map(
    (purpose) => `- ${purpose}: ${LEARNING_PURPOSE_META[purpose].blurb}`,
  ).join("\n");
}

/**
 * The Learning Path half of a deck prompt. It carries the length/detail
 * decision into concrete structure, activity variety, progression and
 * reinforcement rules.
 */
export function buildLearningPathInstructions(options: LearningPathPromptOptions = {}): string {
  const budget = promptBudget(options);
  const stageTarget = options.stageCount
    ? Math.max(1, Math.min(8, Math.round(options.stageCount)))
    : undefined;
  const includeApplication = options.includeApplication ?? budget.includeApplication;
  const includeIntegration = options.includeIntegration ?? budget.includeIntegration;
  const includeReinforcement = options.includeReinforcement ?? budget.includeReinforcement;

  const stageLine = stageTarget
    ? `- Plan exactly ${stageTarget} stage${stageTarget === 1 ? "" : "s"}.`
    : options.autonomous
      ? "- Choose the number of stages the source and learning progression actually need; the schema allows 1–8. Do not follow a preset count or split mechanically."
      : `- Plan ${budget.minStages}–${budget.maxStages} stages, choosing the number the material actually needs.`;

  const custom = options.customStages?.length
    ? `\nLEARNER-PINNED STAGES (respect this structure, adapt the content)\n${options.customStages
        .map(
          (stage, index) =>
            `${index + 1}. ${stage.title.trim() || `Learner-defined stage ${index + 1}`}${stage.purpose ? ` — purpose: ${stage.purpose}` : ""}${
              stage.concepts?.length ? ` — concepts: ${stage.concepts.join(", ")}` : ""
            }${stage.activityTypes?.length ? ` — activities: ${stage.activityTypes.join(", ")}` : " — choose activities that fit the material and purpose"}`,
        )
        .join("\n")}\n`
    : "";

  return `LEARNING PATH — the deck is a journey, not a bag of cards
- Organise the deck into ordered learning stages. Each stage is a milestone with a clear purpose, a small set of concepts and one to three activities.
- ${stageLine}
- ${
    options.autonomous
      ? "Choose how many concepts and activities belong in each stage from the actual source and prerequisites; do not use prompt-engine counts or quotas."
      : `Use ${budget.conceptsPerStage} concept${budget.conceptsPerStage === 1 ? "" : "s"} per stage as a guide, but follow the material's real prerequisite order rather than an arbitrary split.`
  }
- ${
    options.autonomous
      ? "Choose activity and question counts independently based on what each concept needs."
      : `Activities per stage: up to ${budget.activitiesPerStage}. Questions per activity: about ${budget.questionsPerActivity}. These are guides, not quotas.`
  }
- Do not force every activity type into every path. Choose formats that fit the subject: recall for definitions, application for procedures, scenarios for judgement, ordering/matching for processes and relationships, integration for cross-topic ideas.
- ${
    options.autonomous
      ? "Decide whether application, integration, or reinforcement activities improve this particular learning journey."
      : includeApplication
        ? "Include application or problem-solving practice once the learner has the basics."
        : "Keep practice focused on recognition and recall; skip heavy application work at this length."
  }
- ${
    options.autonomous
      ? "Include cross-stage integration or spaced reinforcement when it serves the source material and learner."
      : includeIntegration
        ? "Include at least one integration activity that connects concepts from different stages."
        : "Keep stages focused; deep cross-concept integration is optional at this length."
  }
- ${
    options.autonomous
      ? "Bring earlier questions back only when reinforcement is useful; mark intentional revisits clearly."
      : includeReinforcement
        ? `Bring ${budget.reinforcementPerStage || 1} earlier card(s) back inside later reinforcement/review activities. Mark those cards as revisits in the activity title or description.`
        : "Reinforcement is light at this length; still let missed concepts return where natural."
  }
- Progression must be real: easier recognition and explanation first, then recall, application, integration and mastery. Later stages should depend on earlier ones.
- Every question in the deck must appear in at least one activity. Reinforcement activities may reuse earlier questions on purpose; that is spaced repetition, not duplication.
- Write specific stage titles and objectives from the material — never "Stage 1", "Part 2" or "Introduction" on its own.
- ${
    options.autonomous
      ? "Choose a suitable difficulty progression and explanation depth based on the source, learner, and selected length/detail preference."
      : `Difficulty target: ${budget.depth} conceptual depth, explanations ${budget.explanationDepth}.`
  }

${purposeMenuText()}

ACTIVITY MENU
${activityMenuText()}
${custom}`;
}

/** Standalone prompt for re-planning a deck that already has questions. */
export function buildLearningPathPrompt(
  deckTitle: string,
  subject: string,
  material: string,
  concepts: string[],
  questions: Question[],
  options: LearningPathPromptOptions = {},
): string {
  const budget = promptBudget(options);
  const questionList = questions
    .slice(0, 200)
    .map(
      (question, index) =>
        `${index + 1}. [${question.difficulty}] ${question.type} — ${conceptOf(question, subject)} — ${question.question.slice(0, 140)}`,
    )
    .join("\n");

  return `You are an expert curriculum designer. Re-plan the deck "${deckTitle}" as a Learning Path.

DECK CONTEXT
- Title: ${deckTitle}
- Subject: ${subject}
- Material: ${material.slice(0, 1500)}${material.length > 1500 ? "…" : ""}
- Concepts already present: ${concepts.join(", ") || "not labelled"}
- Questions available: ${questions.length}

${getLengthInstructions(budget.sliderValue)}

${buildLearningPathInstructions(options)}

QUESTIONS — reference these by their 1-based number
${questionList}

OUTPUT RULES
- Output one valid JSON object and nothing else.
- Shape:
{
  "title": string,
  "description": string,
  "stages": [
    {
      "title": string,
      "description": string,
      "purpose": string,
      "objectives": string[],
      "concepts": string[],
      "prerequisiteConcepts": string[],
      "difficultyTarget": "easy" | "medium" | "hard",
      "estimatedMinutes": number,
      "activities": [
        {
          "type": string,
          "title": string,
          "description": string,
          "objective": string,
          "estimatedMinutes": number,
          "questions": number[]
        }
      ]
    }
  ],
  "estimatedMinutes": number,
  "conceptsCovered": string[]
}
- Use only question numbers that exist above. Every question must appear at least once.`;
}

/** A single-stage prompt used when a path is built incrementally. */
export function buildStagePrompt(
  deckTitle: string,
  stageIndex: number,
  stageTitle: string,
  purpose: string,
  concepts: string[],
  material: string,
  questions: Question[],
  options: LearningPathPromptOptions = {},
): string {
  const budget = promptBudget(options);
  const questionList = questions
    .map((question, index) => `${index + 1}. [${question.difficulty}] ${question.question}`)
    .join("\n");

  return `You are an expert educational content designer. Design stage ${stageIndex + 1} of "${deckTitle}".

STAGE CONTEXT
- Title: ${stageTitle}
- Purpose: ${purpose}
- Concepts: ${concepts.join(", ") || "choose from the material"}
- Material: ${material.slice(0, 1200)}${material.length > 1200 ? "…" : ""}

${getLengthInstructions(budget.sliderValue)}

REQUIREMENTS
- ${budget.activitiesPerStage} activities, ${budget.questionsPerActivity} questions each as a guide.
- Keep the stage's purpose visible in every activity.
- Reference questions by their 1-based number.
- Build from easier recognition to harder application where the stage allows it.

QUESTIONS
${questionList}

Return only:
{
  "title": string,
  "description": string,
  "purpose": string,
  "objectives": string[],
  "concepts": string[],
  "prerequisiteConcepts": string[],
  "difficultyTarget": "easy" | "medium" | "hard",
  "estimatedMinutes": number,
  "activities": [
    { "type": string, "title": string, "description": string, "objective": string, "estimatedMinutes": number, "questions": number[] }
  ]
}`;
}

/** Prompt for extra practice on a concept the learner keeps missing. */
export function buildReinforcementPrompt(
  deckTitle: string,
  concept: string,
  incorrectQuestions: Question[],
  options: LearningPathPromptOptions = {},
): string {
  const budget = promptBudget(options);
  const missed = incorrectQuestions
    .map((question) => `- ${question.question} → ${displayAnswer(question)}`)
    .join("\n");

  return `You are an expert educational content designer. Create reinforcement practice for the concept "${concept}" in the deck "${deckTitle}".

WHY THIS EXISTS
The learner has missed these cards, so the goal is to repair the underlying model — not to repeat the same wording.

MISSED CARDS
${missed || "(none supplied — infer the likely misconceptions)"}

${getLengthInstructions(budget.sliderValue)}

REQUIREMENTS
- Write 2-4 new questions at ${budget.explanationDepth} explanation depth.
- Vary the format where it helps (multiple-choice, multiple-select, true-false, short-answer, fill-blank).
- Each question needs a clear explanation, a hint and tutor notes.
- Explain the misconception behind likely wrong answers.
- Keep the same concept label so the deck's analytics stay coherent.

Return only:
{
  "questions": [
    {
      "type": "multiple-choice" | "multiple-select" | "true-false" | "short-answer" | "fill-blank" | "flashcard",
      "question": string,
      "answer": string,
      "options": string[],
      "correctOptions": string[], // required for multiple-select; at least two exact options
      "correctOptions": string[],
      "explanation": string,
      "difficulty": ${JSON.stringify("easy" as Difficulty)} | "medium" | "hard",
      "concept": string,
      "hint": string
    }
  ]
}`;
}
