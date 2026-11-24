import type {
  ActivityType,
  ActivityQuestionReference,
  Deck,
  Difficulty,
  LearningActivity,
  LearningPath,
  LearningStage,
  LengthPreset,
  Question,
  QuestionType,
  StagePurpose,
} from "./types";
import {
  clampSliderValue,
  lengthBudgetFor,
  lengthBudgetForPreset,
  MAX_LEARNING_STAGES,
  type LengthBudget,
} from "./length-detail";

/* ------------------------------------------------------------------ *
 * Learning Paths
 *
 * A deck is not a bag of cards: it is a journey. This module turns a deck's
 * questions and concepts into ordered stages, each with a pedagogical
 * purpose and a set of activities. Everything here is pure, so planning,
 * progress and AI-imported structures can be unit-tested.
 * ------------------------------------------------------------------ */

export interface BuildLearningPathOptions {
  /** 0–100 shared length/detail value */
  sliderValue?: number;
  /** preset shortcut when no slider value is supplied */
  lengthPreset?: LengthPreset;
  /** where this structure came from */
  source?: LearningPath["source"];
  /** override the automatically chosen number of stages (manual creation) */
  stageCount?: number;
  /** force inclusion/exclusion of activity families (manual creation) */
  includeApplication?: boolean;
  includeIntegration?: boolean;
  includeReinforcement?: boolean;
  /** title override */
  title?: string;
  /** optional explicit stage blueprint from the learner */
  blueprint?: ManualStageBlueprint[];
}

/** A stage the learner configured by hand before generation. */
export interface ManualStageBlueprint {
  title: string;
  purpose?: StagePurpose;
  concepts?: string[];
  activityTypes?: ActivityType[];
}

const DIFFICULTY_VALUE: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };
const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
};

const STAGE_PURPOSES: StagePurpose[] = [
  "concept-exposure",
  "comprehension",
  "active-recall",
  "application",
  "reinforcement",
  "integration",
  "retention",
  "mastery",
];

const ACTIVITY_TYPES: ActivityType[] = [
  "concept-introduction",
  "understanding-check",
  "active-recall",
  "application-exercises",
  "reinforcement-practice",
  "integration-challenge",
  "final-assessment",
  "review-session",
  "practice-quiz",
  "scenario-based",
  "problem-solving",
  "concept-mapping",
  "self-assessment",
  "mastery-check",
  "bonus-challenge",
  "error-analysis",
];

/** Seconds a learner typically spends on one card of each format. */
const SECONDS_BY_TYPE: Record<QuestionType, number> = {
  flashcard: 25,
  "multiple-choice": 40,
  "true-false": 25,
  "fill-blank": 45,
  "short-answer": 70,
  ordering: 55,
  matching: 55,
  "word-bank": 55,
};

const PURPOSE_META: Record<
  StagePurpose,
  {
    label: string;
    blurb: string;
    verbs: string[];
    difficulty: Difficulty;
  }
> = {
  "concept-exposure": {
    label: "Foundations",
    blurb: "Meet the core ideas and build a mental model before being tested.",
    verbs: ["recognise", "describe", "explain in your own words"],
    difficulty: "easy",
  },
  comprehension: {
    label: "Understanding",
    blurb: "Check that the ideas make sense and connect to what you already know.",
    verbs: ["interpret", "compare", "summarise"],
    difficulty: "easy",
  },
  "active-recall": {
    label: "Recall",
    blurb: "Retrieve the ideas from memory without leaning on hints.",
    verbs: ["recall", "state", "reproduce"],
    difficulty: "medium",
  },
  application: {
    label: "Application",
    blurb: "Use the ideas on new problems, examples and scenarios.",
    verbs: ["apply", "solve", "use"],
    difficulty: "medium",
  },
  reinforcement: {
    label: "Reinforcement",
    blurb: "Revisit the ideas that did not stick and practise them again.",
    verbs: ["strengthen", "correct", "retry"],
    difficulty: "medium",
  },
  integration: {
    label: "Integration",
    blurb: "Combine several ideas and see how they fit together.",
    verbs: ["connect", "combine", "transfer"],
    difficulty: "hard",
  },
  retention: {
    label: "Retention",
    blurb: "Bring earlier material back before it fades.",
    verbs: ["retain", "revisit", "recognise again"],
    difficulty: "medium",
  },
  mastery: {
    label: "Mastery",
    blurb: "Prove the whole stage holds together under harder conditions.",
    verbs: ["master", "demonstrate", "defend"],
    difficulty: "hard",
  },
};

const ACTIVITY_META: Record<
  ActivityType,
  { title: string; description: string; objective: string }
> = {
  "concept-introduction": {
    title: "Meet the concepts",
    description: "A first pass over the new ideas, with definitions and worked examples.",
    objective: "Build a first mental model of the concepts.",
  },
  "understanding-check": {
    title: "Check your understanding",
    description: "Guided questions that show whether the ideas make sense yet.",
    objective: "Explain and interpret the concepts accurately.",
  },
  "active-recall": {
    title: "Active recall",
    description: "Retrieve each idea from memory without hints or options in front of you.",
    objective: "Recall the key facts and definitions unaided.",
  },
  "application-exercises": {
    title: "Apply it",
    description: "Put the ideas to work on concrete problems and examples.",
    objective: "Use the concepts in new situations.",
  },
  "reinforcement-practice": {
    title: "Reinforcement",
    description: "Extra practice on the cards and concepts that were missed.",
    objective: "Turn weak recall into reliable recall.",
  },
  "integration-challenge": {
    title: "Connect the ideas",
    description: "Questions that pull several concepts together at once.",
    objective: "Transfer knowledge across concept boundaries.",
  },
  "final-assessment": {
    title: "Stage assessment",
    description: "A mixed set covering everything this stage set out to teach.",
    objective: "Demonstrate stage-level mastery.",
  },
  "review-session": {
    title: "Spaced review",
    description: "Earlier material returns at the moment it is most useful.",
    objective: "Keep earlier learning available.",
  },
  "practice-quiz": {
    title: "Practice quiz",
    description: "A short mixed quiz to keep the ideas sharp.",
    objective: "Practise under light assessment conditions.",
  },
  "scenario-based": {
    title: "Scenarios",
    description: "Realistic situations where the concepts have to be chosen and used.",
    objective: "Decide when and how to use each idea.",
  },
  "problem-solving": {
    title: "Problem solving",
    description: "Multi-step problems that reward a clear method.",
    objective: "Work through problems systematically.",
  },
  "concept-mapping": {
    title: "Concept map",
    description: "Questions that ask how the ideas relate to one another.",
    objective: "See the structure between concepts.",
  },
  "self-assessment": {
    title: "Self-check",
    description: "Judge your own recall before moving on.",
    objective: "Notice what is solid and what needs work.",
  },
  "mastery-check": {
    title: "Mastery check",
    description: "A harder mixed set that confirms the stage is secure.",
    objective: "Meet the stage's mastery bar.",
  },
  "bonus-challenge": {
    title: "Bonus challenge",
    description: "Optional stretch questions for extra depth.",
    objective: "Push beyond the core material.",
  },
  "error-analysis": {
    title: "Error analysis",
    description: "Look closely at the mistakes and correct the reasoning behind them.",
    objective: "Replace a misconception with the right model.",
  },
};

const PURPOSE_ACTIVITIES: Record<StagePurpose, ActivityType[]> = {
  "concept-exposure": ["concept-introduction", "understanding-check"],
  comprehension: ["understanding-check", "active-recall"],
  "active-recall": ["active-recall", "practice-quiz", "self-assessment"],
  application: ["application-exercises", "problem-solving", "scenario-based"],
  reinforcement: ["reinforcement-practice", "error-analysis"],
  integration: ["integration-challenge", "concept-mapping", "mastery-check"],
  retention: ["review-session", "reinforcement-practice"],
  mastery: ["mastery-check", "final-assessment"],
};

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "stage";

const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function conceptOf(question: Question, fallback = "General"): string {
  return question.concept?.trim() || question.tags?.find((t) => t.trim())?.trim() || fallback;
}

const difficultyOf = (question: Question) => DIFFICULTY_VALUE[question.difficulty] ?? 1;

const byDifficulty = (a: Question, b: Question) =>
  difficultyOf(a) - difficultyOf(b) || a.question.localeCompare(b.question);

const maxDifficulty = (questions: Question[]): Difficulty => {
  const value = questions.reduce((max, q) => Math.max(max, difficultyOf(q)), 0);
  return value >= 2 ? "hard" : value === 1 ? "medium" : "easy";
};

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function isApplicationQuestion(question: Question): boolean {
  if (["short-answer", "word-bank", "ordering", "matching"].includes(question.type)) return true;
  const text = question.question.toLowerCase();
  return /(solve|apply|calculate|explain|why|how|use |scenario|predict|compare)/.test(text);
}

function isDefinitionQuestion(question: Question): boolean {
  if (question.type === "flashcard") return true;
  const text = question.question.toLowerCase();
  return /(define|what is|what are|identify|name |which of|meaning of)/.test(text);
}

function hasConceptVariety(questions: Question[], fallback: string): boolean {
  const concepts = new Set(questions.map((q) => conceptOf(q, fallback)));
  return concepts.size > 1;
}

function budgetFromOptions(options: BuildLearningPathOptions): LengthBudget {
  if (typeof options.sliderValue === "number") return lengthBudgetFor(options.sliderValue);
  if (options.lengthPreset) return lengthBudgetForPreset(options.lengthPreset);
  return lengthBudgetForPreset("regular");
}

function pick<T>(items: T[], count: number): T[] {
  return items.slice(0, Math.max(0, count));
}

function questionMinutes(questions: Question[]): number {
  const seconds = questions.reduce((total, q) => total + (SECONDS_BY_TYPE[q.type] ?? 45), 0);
  return Math.max(2, Math.ceil(seconds / 60));
}

function refFor(
  question: Question,
  overrides: Partial<ActivityQuestionReference> = {},
): ActivityQuestionReference {
  return {
    questionId: question.id,
    isReinforcement: false,
    mastered: false,
    attempts: 0,
    correctAttempts: 0,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ *
 * Planning
 * ------------------------------------------------------------------ */

interface ConceptInfo {
  name: string;
  questions: Question[];
  order: number;
  difficulty: number;
  types: QuestionType[];
}

export function analyzeDeckConcepts(deck: Deck): ConceptInfo[] {
  const map = new Map<string, ConceptInfo>();
  deck.questions.forEach((question, index) => {
    const name = conceptOf(question, deck.subject);
    const existing = map.get(name);
    if (existing) {
      existing.questions.push(question);
      existing.difficulty += difficultyOf(question);
      existing.types.push(question.type);
      return;
    }
    map.set(name, {
      name,
      questions: [question],
      order: index,
      difficulty: difficultyOf(question),
      types: [question.type],
    });
  });

  const concepts = Array.from(map.values());
  concepts.forEach((concept) => {
    concept.difficulty /= Math.max(1, concept.questions.length);
    concept.types = unique(concept.types);
  });

  // Foundational concepts first: lower difficulty and earlier appearance in
  // the source material both count. Stable on ties.
  return concepts.sort(
    (a, b) =>
      a.difficulty - b.difficulty || a.order - b.order || a.name.localeCompare(b.name),
  );
}

interface StageSeed {
  concepts: string[];
  questions: Question[];
}

/**
 * Builds exactly as many coherent stage seeds as the material can support.
 * When there are more concepts than stages, adjacent concepts merge. When
 * there are fewer, the biggest concept splits by difficulty so later stages
 * still move forward instead of repeating the same cards.
 */
function makeStageSeeds(
  concepts: ConceptInfo[],
  desiredStages: number,
): StageSeed[] {
  if (!concepts.length) return [];

  let seeds: StageSeed[] = concepts.map((concept) => ({
    concepts: [concept.name],
    questions: [...concept.questions].sort(byDifficulty),
  }));

  const target = Math.max(1, Math.min(desiredStages, MAX_LEARNING_STAGES));

  while (seeds.length < target) {
    let splitIndex = -1;
    let splitScore = 0;
    seeds.forEach((seed, index) => {
      if (seed.questions.length < 4) return;
      if (seed.questions.length > splitScore) {
        splitScore = seed.questions.length;
        splitIndex = index;
      }
    });
    if (splitIndex === -1) break;

    const seed = seeds[splitIndex];
    const ordered = [...seed.questions].sort(byDifficulty);
    const midpoint = Math.ceil(ordered.length / 2);
    const first: StageSeed = {
      concepts: [...seed.concepts],
      questions: ordered.slice(0, midpoint),
    };
    const second: StageSeed = {
      concepts: [...seed.concepts],
      questions: ordered.slice(midpoint),
    };
    seeds.splice(splitIndex, 1, first, second);
  }

  while (seeds.length > target) {
    let mergeIndex = 0;
    let mergeScore = Number.POSITIVE_INFINITY;
    for (let i = 0; i < seeds.length - 1; i += 1) {
      const score = seeds[i].questions.length + seeds[i + 1].questions.length;
      if (score < mergeScore) {
        mergeScore = score;
        mergeIndex = i;
      }
    }
    const [left, right] = [seeds[mergeIndex], seeds[mergeIndex + 1]];
    seeds.splice(mergeIndex, 2, {
      concepts: unique([...left.concepts, ...right.concepts]),
      questions: [...left.questions, ...right.questions],
    });
  }

  return seeds;
}

function purposeForStage(
  index: number,
  total: number,
  budget: LengthBudget,
  stageQuestions: Question[],
  allQuestions: Question[],
): StagePurpose {
  if (total === 1) return "comprehension";
  if (index === 0) return "concept-exposure";
  if (index === total - 1) {
    return budget.depth === "essential" || total === 2 ? "retention" : "mastery";
  }
  if (index === 1) return "comprehension";

  if (index === total - 2 && budget.includeRetention) return "retention";

  const cycle: StagePurpose[] = ["active-recall"];
  if (budget.includeApplication && stageQuestions.some(isApplicationQuestion)) {
    cycle.push("application");
  }
  if (budget.includeReinforcement) cycle.push("reinforcement");
  if (budget.includeIntegration && hasConceptVariety(allQuestions, "General")) {
    cycle.push("integration");
  }
  if (budget.includeAdvanced) cycle.push("mastery");

  return cycle[(index - 2) % cycle.length] ?? "active-recall";
}

function activityTypesFor(
  purpose: StagePurpose,
  budget: LengthBudget,
  stageQuestions: Question[],
): ActivityType[] {
  const family = PURPOSE_ACTIVITIES[purpose];
  const selected = pick(family, Math.max(1, budget.activitiesPerStage));

  if (purpose === "application") {
    const hasScenarios = stageQuestions.some((q) =>
      /(scenario|case|situation|real world|application)/i.test(q.question),
    );
    const hasNumeric = stageQuestions.some((q) =>
      /(calculate|solve|equation|value|compute|\d)/i.test(q.question),
    );
    if (hasScenarios && !selected.includes("scenario-based")) selected.push("scenario-based");
    if (hasNumeric && !selected.includes("problem-solving")) selected.push("problem-solving");
  }

  return unique(selected).slice(0, Math.max(1, budget.activitiesPerStage));
}

function selectForActivity(
  type: ActivityType,
  stage: StageSeed,
  uncovered: Question[],
  priorQuestions: Question[],
  budget: LengthBudget,
): { questions: Question[]; reinforcement: boolean } {
  const stageQuestions = [...stage.questions].sort(byDifficulty);
  const fromStage = (pool: Question[]) =>
    pool.filter((question) => stage.questions.some((q) => q.id === question.id));

  let pool: Question[] = stageQuestions;

  switch (type) {
    case "concept-introduction":
      pool = fromStage(stageQuestions.filter(isDefinitionQuestion));
      if (!pool.length) pool = stageQuestions.filter((q) => q.difficulty === "easy");
      break;
    case "understanding-check":
      pool = fromStage(
        stageQuestions.filter((q) =>
          ["multiple-choice", "true-false", "short-answer", "fill-blank"].includes(q.type),
        ),
      );
      break;
    case "active-recall":
      pool = fromStage(
        stageQuestions.filter((q) =>
          ["flashcard", "fill-blank", "short-answer", "word-bank"].includes(q.type),
        ),
      );
      break;
    case "application-exercises":
    case "problem-solving":
    case "scenario-based":
      pool = fromStage(stageQuestions.filter(isApplicationQuestion));
      break;
    case "reinforcement-practice":
    case "error-analysis":
      pool = fromStage(stageQuestions.filter((q) => q.difficulty !== "easy"));
      break;
    case "integration-challenge":
    case "concept-mapping":
      pool = fromStage(
        stageQuestions.filter((q) => (q.tags?.length ?? 0) > 1 || q.difficulty === "hard"),
      );
      break;
    case "review-session":
      pool = fromStage(stageQuestions);
      break;
    case "mastery-check":
    case "final-assessment":
      pool = fromStage([...stageQuestions].sort((a, b) => byDifficulty(b, a)));
      break;
    default:
      pool = fromStage(stageQuestions);
  }

  if (!pool.length) pool = stageQuestions;

  // Prefer cards not yet shown in this stage, then fill from the activity's
  // natural pool. Reinforcement cards from earlier stages come last so the
  // core material always leads.
  const unseen = pool.filter((question) =>
    uncovered.some((candidate) => candidate.id === question.id),
  );
  const ordered = [
    ...unseen,
    ...pool.filter((question) => !unseen.some((candidate) => candidate.id === question.id)),
  ];

  const cap = Math.max(1, budget.questionsPerActivity);
  const questions = ordered.slice(0, cap);

  const wantsReinforcement =
    budget.includeReinforcement &&
    budget.reinforcementPerStage > 0 &&
    ["reinforcement-practice", "review-session", "mastery-check", "final-assessment", "integration-challenge"].includes(
      type,
    );

  if (wantsReinforcement && priorQuestions.length) {
    const reinforcement = priorQuestions
      .filter((question) => !questions.some((q) => q.id === question.id))
      .slice(0, budget.reinforcementPerStage);
    questions.push(...reinforcement);
    return { questions, reinforcement: reinforcement.length > 0 };
  }

  return { questions, reinforcement: false };
}

function stageTitle(purpose: StagePurpose, concepts: string[]): string {
  const names = concepts.slice(0, 2).join(" & ");
  switch (purpose) {
    case "concept-exposure":
      return names ? `Foundations: ${names}` : "Foundations";
    case "comprehension":
      return names ? `Understanding ${names}` : "Understanding the material";
    case "active-recall":
      return names ? `Recall: ${names}` : "Active recall";
    case "application":
      return names ? `Apply ${names}` : "Apply what you know";
    case "reinforcement":
      return names ? `Strengthen ${names}` : "Strengthen weak spots";
    case "integration":
      return names ? `Connect ${names}` : "Connect the ideas";
    case "retention":
      return names ? `Keep ${names} fresh` : "Keep it fresh";
    case "mastery":
      return names ? `Mastery: ${names}` : "Final mastery check";
  }
}

function stageObjectives(
  purpose: StagePurpose,
  concepts: string[],
  questions: Question[],
): string[] {
  const labels = concepts.length ? concepts : ["the material"];
  const formats = unique(questions.map((q) => q.type));
  const objectiveFor = (concept: string): string => {
    switch (purpose) {
      case "concept-exposure":
        return `Describe ${concept} in your own words.`;
      case "comprehension":
        return `Explain and compare the key ideas in ${concept}.`;
      case "active-recall":
        return `Recall the key facts about ${concept} without hints.`;
      case "application":
        return `Apply ${concept} to a new problem.`;
      case "reinforcement":
        return `Correct earlier mistakes about ${concept}.`;
      case "integration":
        return `Connect ${concept} with the other concepts.`;
      case "retention":
        return `Bring ${concept} back from memory after a break.`;
      case "mastery":
        return `Demonstrate mastery of ${concept} under harder conditions.`;
    }
  };
  const objectives = labels.slice(0, 3).map(objectiveFor);

  if (purpose === "application") objectives.push("Choose the right idea for an unfamiliar problem.");
  if (purpose === "integration") objectives.push("Connect ideas from more than one concept.");
  if (purpose === "retention") objectives.push("Bring earlier material back without re-learning it.");
  if (purpose === "mastery") objectives.push("Answer harder mixed questions without support.");
  if (purpose === "active-recall") objectives.push("Recall key facts without hints.");
  if (purpose === "concept-exposure") objectives.push("Describe the core ideas in your own words.");
  if (formats.includes("ordering") || formats.includes("matching")) {
    objectives.push("Recognise the correct sequence and relationships.");
  }

  return unique(objectives).slice(0, 4);
}

function buildStage(
  seed: StageSeed,
  index: number,
  total: number,
  budget: LengthBudget,
  allQuestions: Question[],
  priorQuestions: Question[],
  priorConcepts: string[],
  fallbackSubject: string,
  blueprint?: ManualStageBlueprint,
): LearningStage {
  const purpose =
    blueprint?.purpose && STAGE_PURPOSES.includes(blueprint.purpose)
      ? blueprint.purpose
      : purposeForStage(index, total, budget, seed.questions, allQuestions);
  const concepts = seed.concepts.length
    ? seed.concepts
    : unique(seed.questions.map((q) => conceptOf(q, fallbackSubject)));
  const activities: LearningActivity[] = [];
  const uncovered = [...seed.questions].sort(byDifficulty);
  const blueprintTypes = blueprint?.activityTypes?.filter((type) =>
    ACTIVITY_TYPES.includes(type),
  );
  const types = blueprintTypes?.length
    ? blueprintTypes
    : activityTypesFor(purpose, budget, seed.questions);

  for (const type of types) {
    const picked = selectForActivity(type, seed, uncovered, priorQuestions, budget);
    if (!picked.questions.length) continue;

    const meta = ACTIVITY_META[type];
    const refs = picked.questions.map((question) =>
      refFor(question, { isReinforcement: picked.reinforcement }),
    );
    picked.questions.forEach((question) => {
      const at = uncovered.findIndex((candidate) => candidate.id === question.id);
      if (at >= 0) uncovered.splice(at, 1);
    });

    activities.push({
      id: uid("act"),
      type,
      title: meta.title,
      description: meta.description,
      objective: meta.objective,
      questions: refs,
      estimatedMinutes: questionMinutes(picked.questions),
      masteryPct: 0,
      completed: false,
    });
  }

  // Coverage guarantee: any card that no activity picked lands in the first
  // activity (or a dedicated practice activity when the stage had none).
  if (uncovered.length) {
    if (!activities.length) {
      const meta = ACTIVITY_META["practice-quiz"];
      activities.push({
        id: uid("act"),
        type: "practice-quiz",
        title: meta.title,
        description: meta.description,
        objective: meta.objective,
        questions: uncovered.map((question) => refFor(question)),
        estimatedMinutes: questionMinutes(uncovered),
        masteryPct: 0,
        completed: false,
      });
    } else {
      const first = activities[0];
      first.questions.push(...uncovered.map((question) => refFor(question)));
      first.estimatedMinutes = questionMinutes(
        first.questions
          .map((ref) => allQuestions.find((q) => q.id === ref.questionId))
          .filter((q): q is Question => Boolean(q)),
      );
    }
  }

  // Reinforcement cards are not part of stage coverage, so mark them clearly.
  const prerequisiteConcepts = unique(priorConcepts).filter(
    (concept) => !concepts.includes(concept),
  );

  return {
    id: uid("stage"),
    index,
    title: blueprint?.title?.trim() || stageTitle(purpose, concepts),
    description: PURPOSE_META[purpose].blurb,
    purpose,
    objectives: stageObjectives(purpose, concepts, seed.questions),
    concepts,
    prerequisiteConcepts: prerequisiteConcepts.slice(0, 4),
    difficultyTarget: purpose === "concept-exposure" ? "easy" : maxDifficulty(seed.questions),
    progress: {
      status: "not-started",
      totalQuestionsAnswered: 0,
      correctAnswers: 0,
      questionsRequiringReinforcement: [],
    },
    activities,
    masteryPct: 0,
    estimatedMinutes: activities.reduce((totalMinutes, activity) => totalMinutes + activity.estimatedMinutes, 0),
  };
}

export function buildLearningPath(
  deck: Deck,
  options: BuildLearningPathOptions = {},
): LearningPath {
  const budget = budgetFromOptions(options);
  const concepts = analyzeDeckConcepts(deck);
  const questionCount = deck.questions.length;

  // A stage needs real material. Small decks get fewer stages even when the
  // length setting asks for a long path.
  const desiredFromBudget = options.stageCount
    ? options.stageCount
    : Math.round((budget.minStages + budget.maxStages) / 2);
  const materialLimit = Math.max(1, Math.ceil(questionCount / 3));
  const desiredStages = Math.max(
    1,
    Math.min(
      MAX_LEARNING_STAGES,
      options.stageCount ?? Math.min(desiredFromBudget, materialLimit),
    ),
  );

  let seeds = makeStageSeeds(concepts, desiredStages);

  // A manual blueprint overrides the automatic titles/activity families while
  // still using the material's questions.
  if (options.blueprint?.length) {
    seeds = blueprintSeeds(options.blueprint, concepts, deck, seeds);
  }

  const stages: LearningStage[] = [];
  seeds.forEach((seed, index) => {
    const priorQuestions = seeds
      .slice(0, index)
      .flatMap((prior) => prior.questions)
      .sort(byDifficulty);
    const priorConcepts = unique(seeds.slice(0, index).flatMap((prior) => prior.concepts));
    stages.push(
      buildStage(
        seed,
        index,
        seeds.length,
        budget,
        deck.questions,
        priorQuestions,
        priorConcepts,
        deck.subject,
        options.blueprint?.[index],
      ),
    );
  });

  const conceptsCovered = unique(stages.flatMap((stage) => stage.concepts));
  const title = options.title?.trim() || deck.title;

  return {
    id: uid("path"),
    deckId: deck.id,
    title,
    description: `A ${budget.label.toLowerCase()} learning path through ${conceptsCovered.length || 1} concept${
      conceptsCovered.length === 1 ? "" : "s"
    } in “${deck.title}”.`,
    source: options.source ?? "auto",
    lengthPreset: budget.preset,
    stages,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    totalMasteryPct: 0,
    conceptsCovered,
    estimatedMinutes: stages.reduce((total, stage) => total + stage.estimatedMinutes, 0),
    reinforcementQuestionIds: [],
  };
}

/** Maps hand-written blueprints onto stage seeds without losing coverage. */
function blueprintSeeds(
  blueprint: ManualStageBlueprint[],
  concepts: ConceptInfo[],
  deck: Deck,
  fallback: StageSeed[],
): StageSeed[] {
  const byConcept = new Map(concepts.map((concept) => [concept.name, concept]));
  const used = new Set<string>();
  const seeds: StageSeed[] = [];

  blueprint.forEach((entry, index) => {
    const names = (entry.concepts?.length ? entry.concepts : concepts.map((c) => c.name)).filter(
      Boolean,
    );
    let questions: Question[] = [];
    names.forEach((name) => {
      const concept = byConcept.get(name);
      if (!concept) return;
      concept.questions.forEach((question) => {
        if (!used.has(question.id)) {
          questions.push(question);
          used.add(question.id);
        }
      });
    });
    if (!questions.length) {
      const fallbackSeed = fallback[index] ?? fallback[fallback.length - 1];
      questions = fallbackSeed ? fallbackSeed.questions.filter((q) => !used.has(q.id)) : [];
    }
    if (!questions.length) return;
    seeds.push({ concepts: names.slice(0, 4), questions });
  });

  const leftovers = deck.questions.filter((question) => !used.has(question.id));
  if (leftovers.length) {
    if (seeds.length) seeds[seeds.length - 1].questions.push(...leftovers);
    else seeds.push({ concepts: concepts.map((c) => c.name), questions: leftovers });
  }

  return seeds.length ? seeds : fallback;
}

/* ------------------------------------------------------------------ *
 * Progress
 * ------------------------------------------------------------------ */

export interface LearningPathStats {
  totalStages: number;
  completedStages: number;
  startedStages: number;
  totalQuestions: number;
  masteredQuestions: number;
  masteryPct: number;
  nextStage?: LearningStage;
  currentStage?: LearningStage;
  reinforcementCount: number;
}

function uniqueQuestionIds(path: LearningPath): string[] {
  return unique(
    path.stages.flatMap((stage) => stage.activities.flatMap((activity) => activity.questions.map((ref) => ref.questionId))),
  );
}

export function pathStats(path: LearningPath): LearningPathStats {
  const totalStages = path.stages.length;
  const completedStages = path.stages.filter((stage) => stage.progress.status === "completed").length;
  const startedStages = path.stages.filter((stage) => stage.progress.status !== "not-started").length;
  const ids = uniqueQuestionIds(path);
  const mastered = new Set<string>();
  path.stages.forEach((stage) =>
    stage.activities.forEach((activity) =>
      activity.questions.forEach((ref) => {
        if (ref.mastered) mastered.add(ref.questionId);
      }),
    ),
  );
  const masteryPct = ids.length ? Math.round((mastered.size / ids.length) * 100) : 0;

  return {
    totalStages,
    completedStages,
    startedStages,
    totalQuestions: ids.length,
    masteredQuestions: mastered.size,
    masteryPct,
    nextStage: path.stages.find((stage) => stage.progress.status !== "completed"),
    currentStage:
      path.stages.find((stage) => stage.progress.status === "in-progress") ??
      path.stages.find((stage) => stage.progress.status !== "completed"),
    reinforcementCount: path.reinforcementQuestionIds.length,
  };
}

export function nextActivity(stage: LearningStage): LearningActivity | undefined {
  return stage.activities.find((activity) => !activity.completed && activity.questions.length > 0);
}

export function isStageUnlocked(path: LearningPath, stageId: string): boolean {
  const index = path.stages.findIndex((stage) => stage.id === stageId);
  if (index <= 0) return true;
  const previous = path.stages[index - 1];
<<<<<<< HEAD
  return previous.progress.status === "completed" || previous.masteryPct >= 60;
=======
  return (
    previous.progress.status === "completed" ||
    previous.masteryPct >= 60 ||
    previous.activities.some((activity) => activity.questions.some((ref) => ref.attempts > 0))
  );
>>>>>>> 4356d87774549d8fc1f4271d8e44ba482a79a15a
}

function recomputeActivity(activity: LearningActivity): LearningActivity {
  const total = activity.questions.length;
  const mastered = activity.questions.filter((ref) => ref.mastered).length;
  const masteryPct = total ? Math.round((mastered / total) * 100) : 0;
  const completed = activity.completed || (total > 0 && masteryPct >= 70);
  return {
    ...activity,
    masteryPct,
    completed,
    completedAt: completed ? activity.completedAt ?? Date.now() : undefined,
  };
}

function recomputeStage(stage: LearningStage, now: number): LearningStage {
  const activities = stage.activities.map(recomputeActivity);
  const refs = activities.flatMap((activity) => activity.questions);
  const uniqueIds = unique(refs.map((ref) => ref.questionId));
  const masteredIds = unique(
    refs.filter((ref) => ref.mastered).map((ref) => ref.questionId),
  );
  const masteryPct = uniqueIds.length
    ? Math.round((masteredIds.length / uniqueIds.length) * 100)
    : 0;
  const status =
    stage.progress.status === "completed" || (uniqueIds.length > 0 && masteryPct >= 80)
      ? "completed"
      : stage.progress.status === "in-progress" || refs.some((ref) => ref.attempts > 0)
        ? "in-progress"
        : "not-started";

  return {
    ...stage,
    activities,
    masteryPct,
    progress: {
      ...stage.progress,
      status,
      completedAt:
        status === "completed" ? stage.progress.completedAt ?? now : stage.progress.completedAt,
      startedAt: stage.progress.startedAt ?? (refs.some((ref) => ref.attempts > 0) ? now : undefined),
    },
    estimatedMinutes:
      stage.estimatedMinutes ||
      activities.reduce((total, activity) => total + activity.estimatedMinutes, 0),
  };
}

function recomputePath(path: LearningPath, now = Date.now()): LearningPath {
  const stages = path.stages.map((stage) => recomputeStage(stage, now));
  const stats = pathStats({ ...path, stages });
  const reinforcement = unique(
    stages.flatMap((stage) => stage.progress.questionsRequiringReinforcement),
  );

  return {
    ...path,
    stages,
    totalMasteryPct: stats.masteryPct,
    completedAt:
      stages.length > 0 && stages.every((stage) => stage.progress.status === "completed")
        ? path.completedAt ?? now
        : path.completedAt,
    updatedAt: now,
    reinforcementQuestionIds: reinforcement,
  };
}

export function markStageStarted(path: LearningPath, stageId: string): LearningPath {
  const now = Date.now();
  return recomputePath(
    {
      ...path,
      stages: path.stages.map((stage) =>
        stage.id === stageId && stage.progress.status === "not-started"
          ? {
              ...stage,
              progress: { ...stage.progress, status: "in-progress", startedAt: now },
            }
          : stage,
      ),
      updatedAt: now,
    },
    now,
  );
}

export function markStageCompleted(path: LearningPath, stageId: string): LearningPath {
  const now = Date.now();
  return recomputePath(
    {
      ...path,
      stages: path.stages.map((stage) =>
        stage.id === stageId
          ? {
              ...stage,
              activities: stage.activities.map((activity) => ({
                ...activity,
                completed: true,
                completedAt: activity.completedAt ?? now,
              })),
              progress: {
                ...stage.progress,
                status: "completed",
                completedAt: stage.progress.completedAt ?? now,
              },
            }
          : stage,
      ),
      updatedAt: now,
    },
    now,
  );
}

export interface AnswerContext {
  stageId?: string;
  activityId?: string;
}

/**
 * Records one answer against a path. Missed cards join the path-wide
 * reinforcement queue; a card leaves it only when it has been recalled again
 * (ideally inside a reinforcement activity) rather than simply disappearing.
 */
export function applyLearningPathAnswer(
  path: LearningPath,
  questionId: string,
  correct: boolean,
  context: AnswerContext = {},
): LearningPath {
  const now = Date.now();
  const targetStageId =
    context.stageId ??
    path.stages.find((stage) =>
      stage.activities.some((activity) =>
        activity.questions.some((ref) => ref.questionId === questionId),
      ),
    )?.id;
<<<<<<< HEAD
  const originalRef = path.stages
    .flatMap((stage) => stage.activities)
    .flatMap((activity) => activity.questions)
    .find((ref) => ref.questionId === questionId);

  let answeredInReinforcement = false;

  let stages: LearningStage[] = path.stages.map((stage) => {
=======

  let answeredInReinforcement = false;

  const stages: LearningStage[] = path.stages.map((stage) => {
>>>>>>> 4356d87774549d8fc1f4271d8e44ba482a79a15a
    if (targetStageId && stage.id !== targetStageId) return stage;

    const activities = stage.activities.map((activity) => {
      if (context.activityId && activity.id !== context.activityId) return activity;
      if (
        !context.activityId &&
        !activity.questions.some((ref) => ref.questionId === questionId)
      ) {
        return activity;
      }

      const questions = activity.questions.map((ref) => {
        if (ref.questionId !== questionId) return ref;
        if (ref.isReinforcement && correct) answeredInReinforcement = true;
        return {
          ...ref,
          attempts: ref.attempts + 1,
          correctAttempts: ref.correctAttempts + (correct ? 1 : 0),
          mastered: ref.mastered || correct,
          lastAnsweredAt: now,
        };
      });

      return { ...activity, questions };
    });

    const asked = activities.some((activity) =>
      activity.questions.some((ref) => ref.questionId === questionId && ref.attempts > 0),
    );
    if (!asked) return stage;

    const reinforcement = correct
      ? stage.progress.questionsRequiringReinforcement.filter((id) => id !== questionId)
      : unique([...stage.progress.questionsRequiringReinforcement, questionId]);

    return {
      ...stage,
      activities,
      progress: {
        ...stage.progress,
        status: stage.progress.status === "completed" ? "completed" : "in-progress",
        startedAt: stage.progress.startedAt ?? now,
        totalQuestionsAnswered: stage.progress.totalQuestionsAnswered + 1,
        correctAnswers: stage.progress.correctAnswers + (correct ? 1 : 0),
        questionsRequiringReinforcement: reinforcement,
      },
    };
  });

<<<<<<< HEAD
  if (!correct && originalRef && targetStageId) {
    const stageIndex = stages.findIndex((stage) => stage.id === targetStageId);
    const activityIndex =
      stages[stageIndex]?.activities.findIndex((activity) => activity.id === context.activityId) ??
      -1;
    const reinforcementTypes: ActivityType[] = [
      "reinforcement-practice",
      "review-session",
      "error-analysis",
    ];
    let target: { stageIndex: number; activityIndex: number } | undefined;

    for (let si = stageIndex; si < stages.length && !target; si += 1) {
      const firstActivity = si === stageIndex ? activityIndex + 1 : 0;
      const activity = stages[si].activities.findIndex(
        (candidate, ai) =>
          ai >= firstActivity &&
          reinforcementTypes.includes(candidate.type) &&
          !candidate.questions.some((ref) => ref.questionId === questionId),
      );
      if (activity >= 0) target = { stageIndex: si, activityIndex: activity };
    }

    if (target) {
      const { stageIndex: targetStageIndex, activityIndex: targetActivityIndex } = target;
      stages = stages.map((stage, si) =>
        si !== targetStageIndex
          ? stage
          : {
              ...stage,
              activities: stage.activities.map((activity, ai) =>
                ai !== targetActivityIndex
                  ? activity
                  : {
                      ...activity,
                      questions: [
                        ...activity.questions,
                        {
                          ...originalRef,
                          isReinforcement: true,
                          mastered: false,
                          attempts: 0,
                          correctAttempts: 0,
                          lastAnsweredAt: undefined,
                        },
                      ],
                    },
              ),
            },
      );
    } else {
      const alreadyQueued = stages
        .slice(stageIndex)
        .flatMap((stage) => stage.activities)
        .some(
          (activity) =>
            reinforcementTypes.includes(activity.type) &&
            activity.questions.some(
              (ref) => ref.questionId === questionId && ref.attempts === 0 && !ref.mastered,
            ),
        );
      if (!alreadyQueued) {
        const destinationIndex = stageIndex + 1 < stages.length ? stageIndex + 1 : stageIndex;
        const activity: LearningActivity = {
          id: uid("act"),
          type: "reinforcement-practice",
          title: ACTIVITY_META["reinforcement-practice"].title,
          description: ACTIVITY_META["reinforcement-practice"].description,
          objective: ACTIVITY_META["reinforcement-practice"].objective,
          questions: [
            {
              ...originalRef,
              isReinforcement: true,
              mastered: false,
              attempts: 0,
              correctAttempts: 0,
              lastAnsweredAt: undefined,
            },
          ],
          estimatedMinutes: 2,
          masteryPct: 0,
          completed: false,
        };
        stages = stages.map((stage, si) =>
          si !== destinationIndex
            ? stage
            : {
                ...stage,
                activities: [...stage.activities, activity],
                estimatedMinutes: stage.estimatedMinutes + activity.estimatedMinutes,
              },
        );
      }
    }
  }

  if (correct && answeredInReinforcement) {
    stages = stages.map((stage) => ({
      ...stage,
      progress: {
        ...stage.progress,
        questionsRequiringReinforcement: stage.progress.questionsRequiringReinforcement.filter(
          (id) => id !== questionId,
        ),
      },
    }));
  }

=======
>>>>>>> 4356d87774549d8fc1f4271d8e44ba482a79a15a
  const updated: LearningPath = {
    ...path,
    stages,
    reinforcementQuestionIds: correct
      ? answeredInReinforcement
        ? path.reinforcementQuestionIds.filter((id) => id !== questionId)
        : path.reinforcementQuestionIds
      : unique([...path.reinforcementQuestionIds, questionId]),
    updatedAt: now,
  };

  return recomputePath(updated, now);
}

/* ------------------------------------------------------------------ *
 * Importing an AI-planned path
 * ------------------------------------------------------------------ */

function coercePurpose(value: unknown, fallback: StagePurpose): StagePurpose {
  return typeof value === "string" && (STAGE_PURPOSES as string[]).includes(value)
    ? (value as StagePurpose)
    : fallback;
}

function coerceActivityType(value: unknown, fallback: ActivityType): ActivityType {
  return typeof value === "string" && (ACTIVITY_TYPES as string[]).includes(value)
    ? (value as ActivityType)
    : fallback;
}

function coerceString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function resolveQuestionRefs(value: unknown, deck: Deck): Question[] {
  if (!Array.isArray(value)) return [];
  const questions = deck.questions;
  const byId = new Map(questions.map((question) => [question.id, question]));
  const picked: Question[] = [];

  const push = (question: Question | undefined) => {
    if (question && !picked.some((existing) => existing.id === question.id)) picked.push(question);
  };

  value.forEach((entry) => {
    if (typeof entry === "number" && Number.isFinite(entry)) {
      const asOneBased = questions[entry - 1];
      const asZeroBased = questions[entry];
      push(asOneBased ?? asZeroBased);
      return;
    }
    if (typeof entry === "string") {
      push(byId.get(entry));
      return;
    }
    if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>;
      const id = coerceString(record.questionId) ?? coerceString(record.id);
      if (id) {
        push(byId.get(id));
        return;
      }
      const index = record.index;
      if (typeof index === "number" && Number.isFinite(index)) {
        push(questions[index - 1] ?? questions[index]);
      }
    }
  });

  return picked;
}

function refsFromQuestions(
  questions: Question[],
  existing: Map<string, ActivityQuestionReference>,
  reinforcement = false,
): ActivityQuestionReference[] {
  return questions.map((question) => {
    const prior = existing.get(question.id);
    return prior
      ? { ...prior, isReinforcement: prior.isReinforcement || reinforcement }
      : refFor(question, { isReinforcement: reinforcement });
  });
}

/**
 * Turns an AI-returned (or backup-restored) path into a safe LearningPath.
 * Question references may be ids, 1-based indices or objects. Unknown ids are
 * ignored, missing titles are filled, and any uncovered card is appended so
 * the path never silently drops material.
 */
export function parseLearningPath(
  raw: unknown,
  deck: Deck,
  options: BuildLearningPathOptions = {},
): LearningPath {
  if (!raw || typeof raw !== "object") return buildLearningPath(deck, options);
  const record = raw as Record<string, unknown>;
  const rawStages = Array.isArray(record.stages) ? record.stages : [];
  if (!rawStages.length) return buildLearningPath(deck, options);

  const existingRefs = new Map<string, ActivityQuestionReference>();
  const priorProgress = new Map<string, LearningStage>();
  if (Array.isArray(record.stages)) {
    (record.stages as unknown[]).forEach((stageValue) => {
      if (!stageValue || typeof stageValue !== "object") return;
      const stage = stageValue as Record<string, unknown>;
      const stageId = coerceString(stage.id);
      if (stageId) priorProgress.set(stageId, stage as unknown as LearningStage);
      const activities = Array.isArray(stage.activities) ? stage.activities : [];
      activities.forEach((activityValue) => {
        if (!activityValue || typeof activityValue !== "object") return;
        const activity = activityValue as Record<string, unknown>;
        const refs = Array.isArray(activity.questions) ? activity.questions : [];
        refs.forEach((refValue) => {
          if (!refValue || typeof refValue !== "object") return;
          const ref = refValue as Record<string, unknown>;
          const id = coerceString(ref.questionId) ?? coerceString(ref.id);
          if (!id) return;
          existingRefs.set(id, {
            questionId: id,
            isReinforcement: Boolean(ref.isReinforcement),
            mastered: Boolean(ref.mastered),
            attempts: typeof ref.attempts === "number" ? ref.attempts : 0,
            correctAttempts:
              typeof ref.correctAttempts === "number" ? ref.correctAttempts : 0,
            lastAnsweredAt:
              typeof ref.lastAnsweredAt === "number" ? ref.lastAnsweredAt : undefined,
          });
        });
      });
    });
  }

  const used = new Set<string>();
  const stages: LearningStage[] = [];

  rawStages.forEach((stageValue, stageIndex) => {
    if (!stageValue || typeof stageValue !== "object") return;
    const stage = stageValue as Record<string, unknown>;
    const rawActivities = Array.isArray(stage.activities) ? stage.activities : [];
    const stageId = coerceString(stage.id) ?? uid("stage");
    const prior = priorProgress.get(stageId);
    const purpose = coercePurpose(
      stage.purpose,
      stageIndex === 0 ? "concept-exposure" : "comprehension",
    );

    const activities: LearningActivity[] = [];
    rawActivities.forEach((activityValue, activityIndex) => {
      if (!activityValue || typeof activityValue !== "object") return;
      const activity = activityValue as Record<string, unknown>;
      const type = coerceActivityType(
        activity.type,
        purpose === "concept-exposure" ? "concept-introduction" : "understanding-check",
      );
      const questions = resolveQuestionRefs(activity.questions ?? activity.questionIds, deck);
      if (!questions.length) return;
      questions.forEach((question) => used.add(question.id));
      const meta = ACTIVITY_META[type];
      const isReinforcement = type === "reinforcement-practice" || type === "review-session";
      activities.push({
        id: coerceString(activity.id) ?? uid("act"),
        type,
        title: coerceString(activity.title) ?? meta.title,
        description: coerceString(activity.description) ?? meta.description,
        objective: coerceString(activity.objective) ?? meta.objective,
        questions: refsFromQuestions(questions, existingRefs, isReinforcement),
        estimatedMinutes:
          typeof activity.estimatedMinutes === "number"
            ? Math.max(1, Math.round(activity.estimatedMinutes))
            : questionMinutes(questions),
        masteryPct: 0,
        completed: Boolean(activity.completed),
      });
    });

    if (!activities.length) return;

    const concepts = Array.isArray(stage.concepts)
      ? stage.concepts.map((value) => coerceString(value)).filter((v): v is string => Boolean(v))
      : unique(activities.flatMap((activity) =>
          activity.questions
            .map((ref) => deck.questions.find((q) => q.id === ref.questionId))
            .filter((q): q is Question => Boolean(q))
            .map((q) => conceptOf(q, deck.subject)),
        ));

    const progressRecord =
      prior && prior.progress && typeof prior.progress === "object"
        ? (prior.progress as unknown as LearningStage["progress"])
        : undefined;

    stages.push({
      id: stageId,
      index: stageIndex,
      title: coerceString(stage.title) ?? stageTitle(purpose, concepts),
      description: coerceString(stage.description) ?? PURPOSE_META[purpose].blurb,
      purpose,
      objectives: Array.isArray(stage.objectives)
        ? stage.objectives
            .map((value) => coerceString(value))
            .filter((v): v is string => Boolean(v))
        : stageObjectives(
            purpose,
            concepts,
            activities.flatMap((activity) =>
              activity.questions
                .map((ref) => deck.questions.find((q) => q.id === ref.questionId))
                .filter((q): q is Question => Boolean(q)),
            ),
          ),
      concepts,
      prerequisiteConcepts: Array.isArray(stage.prerequisiteConcepts)
        ? stage.prerequisiteConcepts
            .map((value) => coerceString(value))
            .filter((v): v is string => Boolean(v))
        : undefined,
      difficultyTarget: ["easy", "medium", "hard"].includes(String(stage.difficultyTarget))
        ? (stage.difficultyTarget as Difficulty)
        : "medium",
      progress: progressRecord
        ? {
            status: ["not-started", "in-progress", "completed"].includes(
              String(progressRecord.status),
            )
              ? progressRecord.status
              : "not-started",
            completedAt: progressRecord.completedAt,
            startedAt: progressRecord.startedAt,
            totalQuestionsAnswered: progressRecord.totalQuestionsAnswered ?? 0,
            correctAnswers: progressRecord.correctAnswers ?? 0,
            questionsRequiringReinforcement: Array.isArray(
              progressRecord.questionsRequiringReinforcement,
            )
              ? progressRecord.questionsRequiringReinforcement
              : [],
          }
        : {
            status: "not-started",
            totalQuestionsAnswered: 0,
            correctAnswers: 0,
            questionsRequiringReinforcement: [],
          },
      activities,
      masteryPct: typeof stage.masteryPct === "number" ? stage.masteryPct : 0,
      estimatedMinutes:
        typeof stage.estimatedMinutes === "number"
          ? Math.max(1, Math.round(stage.estimatedMinutes))
          : activities.reduce((total, activity) => total + activity.estimatedMinutes, 0),
    });
  });

  if (!stages.length) return buildLearningPath(deck, options);

  // Coverage guarantee: append any card the AI forgot to the closest stage.
  const uncovered = deck.questions.filter((question) => !used.has(question.id));
  if (uncovered.length) {
    const last = stages[stages.length - 1];
    const activity = last.activities[last.activities.length - 1];
    if (activity) {
      activity.questions.push(...refsFromQuestions(uncovered, existingRefs));
      activity.estimatedMinutes = Math.max(
        activity.estimatedMinutes,
        questionMinutes(uncovered),
      );
    } else {
      last.activities.push({
        id: uid("act"),
        type: "practice-quiz",
        title: ACTIVITY_META["practice-quiz"].title,
        description: ACTIVITY_META["practice-quiz"].description,
        objective: ACTIVITY_META["practice-quiz"].objective,
        questions: refsFromQuestions(uncovered, existingRefs),
        estimatedMinutes: questionMinutes(uncovered),
        masteryPct: 0,
        completed: false,
      });
    }
    last.concepts = unique([
      ...last.concepts,
      ...uncovered.map((question) => conceptOf(question, deck.subject)),
    ]);
  }

  const conceptsCovered = unique(stages.flatMap((stage) => stage.concepts));
  const path: LearningPath = {
    id: coerceString(record.id) ?? uid("path"),
    deckId: deck.id,
    title: coerceString(record.title) ?? deck.title,
    description:
      coerceString(record.description) ??
      `A learning path through ${conceptsCovered.length || 1} concept${
        conceptsCovered.length === 1 ? "" : "s"
      } in “${deck.title}”.`,
    source: "imported",
    lengthPreset: options.lengthPreset,
    stages,
    createdAt: typeof record.createdAt === "number" ? record.createdAt : Date.now(),
    updatedAt: Date.now(),
    completedAt: typeof record.completedAt === "number" ? record.completedAt : undefined,
    totalMasteryPct: typeof record.totalMasteryPct === "number" ? record.totalMasteryPct : 0,
    conceptsCovered,
    estimatedMinutes:
      typeof record.estimatedMinutes === "number"
        ? Math.max(1, Math.round(record.estimatedMinutes))
        : stages.reduce((total, stage) => total + stage.estimatedMinutes, 0),
    reinforcementQuestionIds: Array.isArray(record.reinforcementQuestionIds)
      ? record.reinforcementQuestionIds.filter((id): id is string => typeof id === "string")
      : [],
  };

  return recomputePath(path);
}

/* ------------------------------------------------------------------ *
 * Growing and rebuilding
 * ------------------------------------------------------------------ */

/** Adds newly imported questions to the path that already exists. */
export function mergeQuestionsIntoPath(
  path: LearningPath,
  deck: Deck,
  newQuestions: Question[],
  options: BuildLearningPathOptions = {},
): LearningPath {
  const existingIds = new Set(uniqueQuestionIds(path));
  const fresh = newQuestions.filter((question) => !existingIds.has(question.id));
  if (!fresh.length) return path;
  if (!path.stages.length) return buildLearningPath(deck, options);

  const now = Date.now();
  const stages = path.stages.map((stage) => ({ ...stage, activities: [...stage.activities] }));
  const leftovers: Question[] = [];

  fresh.forEach((question) => {
    const concept = conceptOf(question, deck.subject);
    const target =
      stages.find((stage) => stage.concepts.includes(concept)) ??
      stages.find((stage) => stage.purpose === "reinforcement" || stage.purpose === "retention") ??
      stages[stages.length - 1];

    if (!target) {
      leftovers.push(question);
      return;
    }

    if (!target.concepts.includes(concept)) target.concepts.push(concept);
    const activity =
      target.activities.find((candidate) => candidate.type === "practice-quiz") ??
      target.activities[0];
    if (!activity) {
      leftovers.push(question);
      return;
    }
    if (!activity.questions.some((ref) => ref.questionId === question.id)) {
      activity.questions.push(refFor(question));
    }
    activity.estimatedMinutes = Math.max(
      activity.estimatedMinutes,
      questionMinutes([question]),
    );
  });

  if (leftovers.length) {
    stages.push({
      id: uid("stage"),
      index: stages.length,
      title: "Extended practice",
      description: "New material added to this deck after the path was planned.",
      purpose: "reinforcement",
      objectives: ["Practise the newly added material."],
      concepts: unique(leftovers.map((question) => conceptOf(question, deck.subject))),
      difficultyTarget: maxDifficulty(leftovers),
      progress: {
        status: "not-started",
        totalQuestionsAnswered: 0,
        correctAnswers: 0,
        questionsRequiringReinforcement: [],
      },
      activities: [
        {
          id: uid("act"),
          type: "practice-quiz",
          title: ACTIVITY_META["practice-quiz"].title,
          description: ACTIVITY_META["practice-quiz"].description,
          objective: ACTIVITY_META["practice-quiz"].objective,
          questions: leftovers.map((question) => refFor(question)),
          estimatedMinutes: questionMinutes(leftovers),
          masteryPct: 0,
          completed: false,
        },
      ],
      masteryPct: 0,
      estimatedMinutes: questionMinutes(leftovers),
    });
  }

  const merged: LearningPath = {
    ...path,
    stages: stages.map((stage, index) => ({ ...stage, index })),
    conceptsCovered: unique(stages.flatMap((stage) => stage.concepts)),
    updatedAt: now,
  };

  return recomputePath(merged, now);
}

/** Re-plans the path while carrying across every answer already recorded. */
export function rebuildLearningPath(
  deck: Deck,
  previous: LearningPath | undefined,
  options: BuildLearningPathOptions = {},
): LearningPath {
  const next = buildLearningPath(deck, options);
  if (!previous) return next;

  const history = new Map<string, ActivityQuestionReference>();
  previous.stages.forEach((stage) =>
    stage.activities.forEach((activity) =>
      activity.questions.forEach((ref) => {
        const existing = history.get(ref.questionId);
        history.set(ref.questionId, {
          ...ref,
          attempts: (existing?.attempts ?? 0) + ref.attempts,
          correctAttempts: (existing?.correctAttempts ?? 0) + ref.correctAttempts,
          mastered: Boolean(existing?.mastered) || ref.mastered,
        });
      }),
    ),
  );

  const stages = next.stages.map((stage) => ({
    ...stage,
    activities: stage.activities.map((activity) => ({
      ...activity,
      questions: activity.questions.map((ref) => {
        const prior = history.get(ref.questionId);
        return prior
          ? {
              ...ref,
              attempts: prior.attempts,
              correctAttempts: prior.correctAttempts,
              mastered: prior.mastered,
              lastAnsweredAt: prior.lastAnsweredAt,
            }
          : ref;
      }),
    })),
  }));

  return recomputePath({
    ...next,
    stages,
    reinforcementQuestionIds: previous.reinforcementQuestionIds.filter((id) =>
      deck.questions.some((question) => question.id === id),
    ),
    createdAt: previous.createdAt,
    source: options.source ?? previous.source,
  });
}

/** A compact estimate for UI previews before questions exist. */
export function estimateLearningPathShape(
  questionCount: number,
  conceptCount: number,
  sliderValue: number,
): { stages: number; activities: number; questions: number; minutes: number } {
  const budget = lengthBudgetFor(sliderValue);
  const stages = Math.max(
    1,
    Math.min(
      MAX_LEARNING_STAGES,
      Math.round((budget.minStages + budget.maxStages) / 2),
      Math.max(1, Math.ceil(questionCount / 3)),
    ),
  );
  const activitiesPerStage = Math.max(1, budget.activitiesPerStage);
  const questions = Math.max(0, questionCount);
  const minutes = Math.max(
    5,
    Math.round((questions * 0.9 + stages * 3 + conceptCount * 1.5) * (0.7 + sliderValue / 100)),
  );
  return {
    stages,
    activities: stages * activitiesPerStage,
    questions,
    minutes,
  };
}

export const LEARNING_STAGE_PURPOSES = STAGE_PURPOSES;
export const LEARNING_ACTIVITY_TYPES = ACTIVITY_TYPES;
export const LEARNING_PURPOSE_META = PURPOSE_META;
export const LEARNING_ACTIVITY_META = ACTIVITY_META;

export function purposeLabel(purpose: StagePurpose): string {
  return PURPOSE_META[purpose].label;
}

export function activityLabel(type: ActivityType): string {
  return ACTIVITY_META[type].title;
}

/** The activity families that naturally fit a stage purpose. */
export function activityTypesForPurpose(purpose: StagePurpose): ActivityType[] {
  return PURPOSE_ACTIVITIES[purpose];
}

export function clampStageCount(value: number): number {
  return Math.max(1, Math.min(MAX_LEARNING_STAGES, Math.round(value)));
}

export function sliderValueForPreset(preset: LengthPreset): number {
  return lengthBudgetForPreset(preset).sliderValue;
}

export function normaliseSlider(value: number): number {
  return clampSliderValue(value);
}

export { DIFFICULTY_LABEL };
