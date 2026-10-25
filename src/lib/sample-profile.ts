import type {
  AppState,
  Course,
  CourseProgress,
  Deck,
  JournalEntry,
  Progress,
  Question,
  QuizResult,
  SessionSummary,
  Settings,
} from "./types";
import type { SrsCard } from "./srs";
import { defaultExamOptions } from "./exam-print";
import type { PaperRecord, PaperSitting } from "./papers";
import type { BinderLabel } from "./labels";
import type { TimetableSlot } from "./timetable";

const DAY = 86_400_000;
const HOUR = 3_600_000;

/**
 * Builds a complete "lived-in" profile that touches every corner of Knowly:
 * five decks in various states of study (mastered, mid-schedule, fresh —
 * including STEM decks with real LaTeX equations), an in-progress course with
 * real progress plus an untouched one, a weekly timetable, colour-coded binder
 * labels, saved past papers with sitting scores, six weeks of history, quiz
 * results, journal entries, templates, streaks and achievements. Timestamps
 * are generated relative to `now`, so the profile always looks freshly used on
 * import.
 */
export function buildSampleProfile(now = Date.now()): AppState {
  const yesterday = now - DAY;
  const lastWeek = now - 7 * DAY;
  const card = (
    ease: number,
    interval: number,
    due: number,
    reps: number,
    lapses = 0,
    lastReviewed = due - interval * DAY,
    streak = Math.max(0, reps - lapses),
  ): SrsCard => ({ ease, interval, due, reps, lapses, lastReviewed, streak });

  const dueNow: SrsCard = card(2.18, 1, now - 2 * HOUR, 2, 1, now - DAY, 1);
  const dueSoon: SrsCard = card(2.3, 3, now + 4 * HOUR, 3, 0, now - DAY - 2 * DAY, 3);
  const tomorrow: SrsCard = card(2.5, 1, now + 6 * HOUR, 1, 0, now - DAY, 1);
  const weekOut: SrsCard = card(2.6, 8, now + 6 * DAY, 6, 0, now - 2 * DAY, 6);
  const fortnight: SrsCard = card(2.72, 16, now + 14 * DAY, 8, 1, lastWeek, 7);
  const monthOut: SrsCard = card(2.85, 33, now + 30 * DAY, 11, 0, lastWeek, 11);

  /* ----------------------------------------------------------- decks */

  const deckBio: Deck = {
    id: "deck-bio",
    title: "Cell Biology — Unit 2",
    subject: "Biology",
    description: "Everything from the Unit 2 slides: organelles, transport, mitosis.",
    color: "var(--deck-1)",
    tags: ["Biology", "cells", "mitosis"],
    labelIds: ["label-l1", "label-l2"],
    createdAt: now - 34 * DAY,
    lastStudiedAt: now - DAY,
    favorite: true,
    masteredIds: ["q-bio-01", "q-bio-02", "q-bio-05", "q-bio-07", "q-bio-10"],
    bookmarks: ["q-bio-09", "q-bio-12"],
    notes: {
      "q-bio-12": "Teacher said this exact definition is on the exam — memorise it word for word.",
      "q-bio-09": "Draw the phases next to each other in the margin, the ordering trick helped.",
    },
    suspended: ["q-bio-11"],
    srs: {
      "q-bio-01": monthOut,
      "q-bio-02": fortnight,
      "q-bio-03": tomorrow,
      "q-bio-04": dueSoon,
      "q-bio-05": weekOut,
      "q-bio-06": dueNow,
      "q-bio-07": fortnight,
      "q-bio-10": monthOut,
      "q-bio-12": { ...dueNow, reps: 5, streak: 2 },
    },
    questions: [],
  };

  const bio = (
    id: string,
    question: Partial<Question> & Pick<Question, "type" | "question" | "answer">,
  ): Question => ({
    id,
    difficulty: "medium",
    ...question,
  });

  deckBio.questions = [
    bio("q-bio-01", {
      type: "multiple-choice",
      question: "Which organelle is known as the powerhouse of the cell?",
      answer: "Mitochondrion",
      options: ["Nucleus", "Mitochondrion", "Ribosome", "Golgi apparatus"],
      explanation:
        "Mitochondria generate most of the cell's ATP through oxidative phosphorylation.",
      concept: "Organelles",
      hint: "Think ATP.",
    }),
    bio("q-bio-02", {
      type: "true-false",
      question: "Ribosomes are the site of protein synthesis.",
      answer: "true",
      difficulty: "easy",
      explanation: "Ribosomes translate mRNA into polypeptide chains.",
      concept: "Organelles",
    }),
    bio("q-bio-03", {
      type: "short-answer",
      question: "Name the jelly-like substance that fills the cell and suspends the organelles.",
      answer: "Cytoplasm",
      explanation: "The cytoplasm also contains the cytoskeleton and dissolved solutes.",
      concept: "Cell structure",
      hint: "Starts with C.",
    }),
    bio("q-bio-04", {
      type: "ordering",
      question: "Order the path of a secreted protein through the endomembrane system.",
      answer: "Ribosome → Rough ER → Golgi → Vesicle → Plasma membrane",
      items: ["Ribosome", "Rough ER", "Golgi apparatus", "Secretory vesicle", "Plasma membrane"],
      concept: "Endomembrane system",
    }),
    bio("q-bio-05", {
      type: "matching",
      question: "Match each organelle to its primary role.",
      answer: "Mitochondrion–ATP, Lysosome–digestion, Chloroplast–photosynthesis",
      pairs: [
        { left: "Mitochondrion", right: "ATP production" },
        { left: "Lysosome", right: "Waste digestion" },
        { left: "Chloroplast", right: "Photosynthesis" },
      ],
      concept: "Organelles",
    }),
    bio("q-bio-06", {
      type: "flashcard",
      question: "How does the rough ER differ from the smooth ER?",
      answer:
        "Rough ER is studded with ribosomes and builds proteins; smooth ER makes lipids and detoxifies.",
      explanation: "The ribosomes give the rough ER its name under a microscope.",
      concept: "Endomembrane system",
    }),
    bio("q-bio-07", {
      type: "fill-blank",
      question: "The ______ acts as the control centre of the cell and houses the DNA.",
      answer: "nucleus",
      difficulty: "easy",
      concept: "Cell structure",
    }),
    bio("q-bio-08", {
      type: "multiple-choice",
      question: "Which structure modifies, packages and ships proteins out of the cell?",
      answer: "Golgi apparatus",
      options: ["Golgi apparatus", "Lysosome", "Nucleolus", "Vacuole"],
      concept: "Endomembrane system",
    }),
    bio("q-bio-09", {
      type: "word-bank",
      question:
        "Fill in the four key phases of mitosis in order: ______ → ______ → ______ → ______.",
      answer: "prophase, metaphase, anaphase, telophase",
      blanks: ["prophase", "metaphase", "anaphase", "telophase"],
      wordBank: ["prophase", "metaphase", "anaphase", "telophase", "interphase", "cytokinesis"],
      concept: "Mitosis",
      difficulty: "hard",
    }),
    bio("q-bio-10", {
      type: "short-answer",
      question: "Define osmosis.",
      answer:
        "The diffusion of water across a semipermeable membrane, from low solute to high solute concentration.",
      concept: "Transport",
      difficulty: "hard",
    }),
    bio("q-bio-11", {
      type: "flashcard",
      question: "What is simple diffusion?",
      answer:
        "Movement of small nonpolar molecules straight through the bilayer, with no protein help.",
      concept: "Transport",
      difficulty: "easy",
    }),
    bio("q-bio-12", {
      type: "flashcard",
      question: "What does selectively permeable mean?",
      answer:
        "The membrane lets some substances cross but blocks others, based on size, charge and polarity.",
      concept: "Transport",
      hint: "It's what 'semi-permeable' really implies.",
    }),
  ];

  const deckChem: Deck = {
    id: "deck-chem",
    title: "Chemistry — Stoichiometry",
    subject: "Chemistry",
    description: "Mole conversions, limiting reagents and balancing reactions.",
    color: "var(--deck-2)",
    tags: ["Chemistry", "stoichiometry"],
    isSTEM: true,
    needsEquations: true,
    needsGraphs: true,
    labelIds: ["label-l2"],
    createdAt: now - 26 * DAY,
    lastStudiedAt: now - 2 * DAY,
    favorite: false,
    masteredIds: ["q-chem-01", "q-chem-02", "q-chem-08"],
    bookmarks: [],
    notes: {
      "q-chem-03": "Always divide by the smaller coefficient. Check units before rounding.",
    },
    srs: {
      "q-chem-01": monthOut,
      "q-chem-02": weekOut,
      "q-chem-03": dueNow,
      "q-chem-04": tomorrow,
      "q-chem-06": dueSoon,
      "q-chem-08": fortnight,
    },
    questions: [
      {
        id: "q-chem-01",
        type: "multiple-choice",
        question: "How many particles are in one mole of a substance?",
        answer: "$6.02 \\times 10^{23}$",
        options: [
          "$6.02 \\times 10^{23}$",
          "$3.14 \\times 10^{8}$",
          "$1.60 \\times 10^{-19}$",
          "$9.81 \\times 10^{0}$",
        ],
        difficulty: "easy",
        explanation: "Avogadro's number: $6.02214076 \\times 10^{23}$ particles per mole.",
        concept: "The mole",
      },
      {
        id: "q-chem-02",
        type: "true-false",
        question: "The coefficients in a balanced equation give the ratio of moles involved.",
        answer: "true",
        difficulty: "easy",
        explanation: "Coefficients are the mole ratio used in every stoichiometry conversion.",
        concept: "Mole ratios",
      },
      {
        id: "q-chem-03",
        type: "short-answer",
        question:
          "In $2H_2 + O_2 \\to 2H_2O$, if you have 5 mol of $H_2$ and 2 mol of $O_2$, which is the limiting reagent?",
        answer: "Oxygen (O₂)",
        explanation: "2 mol O₂ can only oxidise 4 mol of H₂, so oxygen runs out first.",
        concept: "Limiting reagents",
        difficulty: "hard",
      },
      {
        id: "q-chem-04",
        type: "fill-blank",
        question: "One mole of any gas at STP occupies ______ litres.",
        answer: "22.4",
        concept: "The mole",
        difficulty: "easy",
      },
      {
        id: "q-chem-05",
        type: "multiple-choice",
        question:
          "What is the molar mass of $\\mathrm{CuSO_4 \\cdot 5H_2O}$ (copper(II) sulfate pentahydrate)?",
        answer: "249.7 g/mol",
        options: ["159.6 g/mol", "249.7 g/mol", "181.2 g/mol", "267.3 g/mol"],
        difficulty: "hard",
        explanation: "CuSO₄ is 159.6 g/mol; five waters add $5 \\times 18.0 = 90$ g/mol.",
        concept: "Molar mass",
      },
      {
        id: "q-chem-06",
        type: "ordering",
        question: "Order the steps of a stoichiometry problem from given mass to mass of product.",
        answer: "Mass → moles → mole ratio → moles of product → mass",
        difficulty: "medium",
        items: [
          "Convert mass to moles",
          "Apply the mole ratio",
          "Convert to moles of product",
          "Convert moles back to mass",
        ],
        concept: "Problem solving",
      },
      {
        id: "q-chem-07",
        type: "word-bank",
        question: "Balance the equation: ___CH₄ + ___O₂ → ___CO₂ + ___H₂O",
        answer: "1, 2, 1, 2",
        blanks: ["1", "2", "1", "2"],
        wordBank: ["1", "2", "3", "4"],
        concept: "Balancing",
        difficulty: "easy",
      },
      {
        id: "q-chem-08",
        type: "flashcard",
        question: "What is percent yield?",
        answer:
          "$\\text{Percent yield} = \\frac{\\text{actual yield}}{\\text{theoretical yield}} \\times 100\\%$",
        explanation: "Divide what you made by what the balanced equation says you could make.",
        concept: "Yield",
        difficulty: "easy",
      },
    ],
  };

  const deckHist: Deck = {
    id: "deck-hist",
    title: "World History — Interwar Years",
    subject: "History",
    description: "1919–1939: treaties, depression, and the road to WWII.",
    color: "var(--deck-3)",
    tags: ["History", "20th century"],
    createdAt: now - 12 * DAY,
    lastStudiedAt: now - 5 * DAY,
    favorite: false,
    masteredIds: ["q-hist-01"],
    bookmarks: ["q-hist-05"],
    notes: {},
    srs: {
      "q-hist-01": weekOut,
      "q-hist-02": { ...dueNow, lastReviewed: now - 5 * DAY },
    },
    questions: [
      {
        id: "q-hist-01",
        type: "short-answer",
        question: "Which treaty formally ended WWI and imposed reparations on Germany?",
        answer: "The Treaty of Versailles (1919)",
        difficulty: "easy",
        concept: "Post-WWI settlement",
      },
      {
        id: "q-hist-02",
        type: "multiple-choice",
        question:
          "Which country's hyperinflation peaked in 1923, making bread cost billions of marks?",
        answer: "Germany",
        difficulty: "easy",
        options: ["Germany", "Austria", "Hungary", "France"],
        concept: "Economic crisis",
      },
      {
        id: "q-hist-03",
        type: "true-false",
        question: "The League of Nations had its headquarters in New York.",
        answer: "false",
        difficulty: "easy",
        explanation: "The League was based in Geneva, Switzerland. The US never joined.",
        concept: "League of Nations",
      },
      {
        id: "q-hist-04",
        type: "flashcard",
        question: "What was the Dawes Plan?",
        answer:
          "A 1924 loan programme that stabilised the German mark by restructuring reparations payments.",
        difficulty: "medium",
        concept: "Economic crisis",
      },
      {
        id: "q-hist-05",
        type: "ordering",
        question: "Order these interwar events chronologically.",
        answer: "Versailles → Dawes Plan → Wall Street Crash → Hitler becomes Chancellor",
        items: [
          "Treaty of Versailles",
          "Dawes Plan",
          "Wall Street Crash",
          "Hitler becomes Chancellor",
        ],
        concept: "Timeline",
        difficulty: "hard",
      },
      {
        id: "q-hist-06",
        type: "matching",
        question: "Match each country to its interwar leader.",
        answer: "Germany–Hitler, Italy–Mussolini, USSR–Stalin",
        difficulty: "easy",
        pairs: [
          { left: "Germany", right: "Adolf Hitler" },
          { left: "Italy", right: "Benito Mussolini" },
          { left: "USSR", right: "Joseph Stalin" },
        ],
        concept: "Rise of dictators",
      },
      {
        id: "q-hist-07",
        type: "word-bank",
        question: "The policy of giving concessions to Hitler to avoid war is called ______.",
        answer: "appeasement",
        difficulty: "easy",
        blanks: ["appeasement"],
        wordBank: ["appeasement", "annexation", "armistice", "autarky"],
        concept: "Road to WWII",
      },
      {
        id: "q-hist-08",
        type: "short-answer",
        question: "What year did the Wall Street Crash happen?",
        answer: "1929",
        difficulty: "easy",
        concept: "Economic crisis",
      },
    ],
  };

  const deckSpan: Deck = {
    id: "deck-span",
    title: "Spanish A2 — Travel Vocabulary",
    subject: "Languages",
    description: "Words I keep mixing up at the airport and the hotel.",
    color: "var(--deck-4)",
    tags: ["Spanish", "vocabulary"],
    createdAt: now - 55 * DAY,
    lastStudiedAt: now - DAY,
    favorite: true,
    masteredIds: ["q-span-01", "q-span-02", "q-span-03", "q-span-07"],
    bookmarks: [],
    notes: { "q-span-05": "One of the two 'leeches' — write it on a sticky note on my desk." },
    srs: {
      "q-span-01": monthOut,
      "q-span-02": fortnight,
      "q-span-03": weekOut,
      "q-span-04": {
        ease: 1.35,
        interval: 0,
        due: now - HOUR,
        reps: 9,
        lapses: 6,
        lastReviewed: now - DAY,
        streak: 0,
      },
      "q-span-05": {
        ease: 1.42,
        interval: 0,
        due: now,
        reps: 7,
        lapses: 5,
        lastReviewed: now - DAY,
        streak: 0,
      },
      "q-span-06": dueSoon,
      "q-span-07": fortnight,
      "q-span-09": tomorrow,
    },
    questions: [
      {
        id: "q-span-01",
        type: "flashcard",
        question: "el vuelo",
        answer: "the flight",
        difficulty: "easy",
        concept: "Airport",
      },
      {
        id: "q-span-02",
        type: "flashcard",
        question: "la maleta",
        answer: "the suitcase",
        difficulty: "easy",
        concept: "Airport",
      },
      {
        id: "q-span-03",
        type: "matching",
        question: "Match the lodging words.",
        answer: "habitación–room, recepción–front desk, huésped–guest",
        difficulty: "easy",
        pairs: [
          { left: "la habitación", right: "the room" },
          { left: "la recepción", right: "the front desk" },
          { left: "el huésped", right: "the guest" },
        ],
        concept: "Hotel",
      },
      {
        id: "q-span-04",
        type: "short-answer",
        question: "¿Cómo se dice 'I would like to check out'?",
        answer: "Quisiera hacer el check-out",
        difficulty: "hard",
        concept: "Hotel",
      },
      {
        id: "q-span-05",
        type: "fill-blank",
        question: "Necesito facturar ______ equipaje. (my)",
        answer: "mi",
        difficulty: "medium",
        concept: "Airport",
      },
      {
        id: "q-span-06",
        type: "multiple-choice",
        question: "Which word means 'delayed' for a flight?",
        answer: "retrasado",
        difficulty: "medium",
        options: ["retrasado", "reservado", "recogido", "registrado"],
        concept: "Airport",
      },
      {
        id: "q-span-07",
        type: "flashcard",
        question: "el andén",
        answer: "the platform (train station)",
        difficulty: "easy",
        concept: "Train",
      },
      {
        id: "q-span-08",
        type: "true-false",
        question: "'Un asiento de ventanilla' is an aisle seat.",
        answer: "false",
        explanation: "Ventanilla is the window; an aisle seat is 'un asiento de pasillo'.",
        concept: "Train",
        difficulty: "easy",
      },
      {
        id: "q-span-09",
        type: "word-bank",
        question: "Fill the sentence: Me ______ perdido en la estación. (I got lost)",
        answer: "he",
        difficulty: "easy",
        blanks: ["he"],
        wordBank: ["he", "había", "hoy", "hay"],
        concept: "Grammar",
      },
      {
        id: "q-span-10",
        type: "flashcard",
        question: "el equipaje de mano",
        answer: "hand luggage / carry-on",
        difficulty: "easy",
        concept: "Airport",
      },
    ],
  };

  const deckStats: Deck = {
    id: "deck-stats",
    title: "Statistics — Probability Basics",
    subject: "Statistics",
    description: "Next term's foundations: events, odds and distributions.",
    color: "var(--deck-5)",
    tags: ["Statistics", "probability"],
    isSTEM: true,
    labelIds: ["label-l3"],
    createdAt: now - 4 * DAY,
    lastStudiedAt: now - 3 * DAY,
    favorite: false,
    masteredIds: [],
    bookmarks: [],
    notes: {},
    srs: {
      "q-stat-01": { ...tomorrow, lastReviewed: now - 3 * DAY },
      "q-stat-07": dueSoon,
    },
    questions: [
      {
        id: "q-stat-01",
        type: "short-answer",
        question: "What is the probability of rolling a prime number on a fair six-sided die?",
        answer: "3/6 = 0.5 (primes: 2, 3, 5)",
        concept: "Basic probability",
        difficulty: "easy",
      },
      {
        id: "q-stat-02",
        type: "true-false",
        question: "Two events are mutually exclusive if they can happen at the same time.",
        answer: "false",
        difficulty: "easy",
        explanation: "Mutually exclusive events cannot happen together — $P(A \\cap B) = 0$.",
        concept: "Events",
      },
      {
        id: "q-stat-03",
        type: "multiple-choice",
        question: "Which is a discrete random variable?",
        answer: "Number of heads in 10 coin flips",
        difficulty: "medium",
        options: [
          "Number of heads in 10 coin flips",
          "Exact height of a student",
          "Time to run a lap",
          "Water temperature",
        ],
        concept: "Random variables",
      },
      {
        id: "q-stat-04",
        type: "flashcard",
        question: "What does $P(A \\cup B)$ equal when $A$ and $B$ are independent?",
        answer: "$P(A) + P(B) - P(A) \\cdot P(B)$",
        concept: "Combinatorics",
        difficulty: "hard",
      },
      {
        id: "q-stat-05",
        type: "fill-blank",
        question: "The expected value of a fair die roll is ______.",
        answer: "3.5",
        concept: "Expected value",
        difficulty: "easy",
      },
      {
        id: "q-stat-06",
        type: "ordering",
        question: "Order these outcomes from least to most likely when flipping two coins.",
        answer: "HH & TT (1/4 each) → exactly one head (1/2)",
        items: ["Two heads", "One head and one tail", "At least one head"],
        concept: "Basic probability",
        difficulty: "easy",
      },
      {
        id: "q-stat-07",
        type: "flashcard",
        question: "State the binomial probability of exactly $k$ successes in $n$ trials.",
        answer: "$P(X = k) = \\binom{n}{k}\\, p^k (1-p)^{n-k}$",
        explanation: "$\\binom{n}{k}$ counts the ways to arrange the $k$ successes.",
        concept: "Distributions",
        difficulty: "hard",
      },
    ],
  };

  /* --------------------------------------------------------- courses */

  const cp = (
    id: string,
    type: Question["type"],
    question: string,
    answer: string,
    extra: Partial<Question> = {},
  ): Question => ({ id, type, question, answer, difficulty: "medium", ...extra });

  const courseBio: Course = {
    id: "course-bio",
    title: "Biology 101: Cells & Systems",
    subject: "Biology",
    description: "My Grade 10 biology crash course built from the unit slides and class notes.",
    level: "Grade 10",
    color: "var(--deck-1)",
    emoji: "🔬",
    tags: ["Biology", "cells", "exam prep"],
    labelIds: ["label-l1"],
    objectives: [
      "Identify every major organelle and its function",
      "Explain membrane transport: diffusion, osmosis, active transport",
      "Describe mitosis and meiosis phase by phase",
      "Answer past-paper style questions under time pressure",
    ],
    estimatedMinutes: 420,
    sources: [
      {
        id: "src-bio-1",
        title: "Unit 2 class notes (photo transcription)",
        content:
          "Pages 4–19 of my notebook: labelled diagrams of plant and animal cells, the phospholipid bilayer, and the onion-lab observations.",
      },
    ],
    modules: [
      {
        id: "mod-bio-1",
        title: "Cell structure & transport",
        summary: "What's inside a cell and how materials move across its boundary.",
        objectives: [
          "Label organelles",
          "Explain transport mechanisms",
          "Predict tonicity outcomes",
        ],
        linkedDeckIds: ["deck-bio"],
        lessons: [
          {
            id: "lesson-bio-1",
            title: "The eukaryotic cell",
            summary: "A tour of every organelle you need for the exam.",
            objectives: ["Name each organelle", "Match organelles to their functions"],
            estimatedMinutes: 25,
            blocks: [
              {
                id: "blk-1",
                type: "markdown",
                markdown:
                  "Every eukaryotic cell is divided into **compartments**. The nucleus stores DNA while organelles in the cytoplasm specialise in energy, synthesis and disposal.",
              },
              {
                id: "blk-2",
                type: "callout",
                tone: "definition",
                title: "Key term",
                markdown:
                  "**Organelle** — a membrane-bound structure inside a cell with a specific job.",
              },
              {
                id: "blk-3",
                type: "example",
                title: "Worked example",
                markdown:
                  "In the onion-lab we saw the cell wall, a large vacuole and the nucleus. Animal cells lacked the wall and vacuole but had centrioles.",
              },
              { id: "blk-4", type: "checkpoint", questionId: "q-pair-1", title: "Quick check" },
            ],
            questions: [
              cp(
                "q-pair-1",
                "multiple-choice",
                "Which organelle generates most of the cell's ATP?",
                "Mitochondrion",
                {
                  options: ["Nucleus", "Mitochondrion", "Golgi apparatus", "Vacuole"],
                  explanation:
                    "Oxidative phosphorylation happens on the inner mitochondrial membrane.",
                  concept: "Organelles",
                },
              ),
              cp(
                "q-pair-2",
                "true-false",
                "Plant cells have chloroplasts; animal cells do not.",
                "true",
                {
                  difficulty: "easy",
                  concept: "Organelles",
                },
              ),
            ],
            linkedDeckIds: ["deck-bio"],
          },
          {
            id: "lesson-bio-2",
            title: "Membrane transport",
            summary: "Diffusion, osmosis and active transport across the bilayer.",
            objectives: ["Distinguish passive from active transport", "Define tonicity"],
            estimatedMinutes: 30,
            blocks: [
              {
                id: "blk-5",
                type: "markdown",
                markdown:
                  "Small nonpolar molecules slip through the bilayer by **simple diffusion**. Water crosses via aquaporins (**osmosis**). Anything pumped *against* its gradient needs ATP — **active transport**.",
              },
              { id: "blk-6", type: "divider" },
              {
                id: "blk-7",
                type: "callout",
                tone: "tip",
                title: "Exam tip",
                markdown:
                  "Tonicity questions always come with a diagram. First label the outside solution as hypertonic, isotonic or hypotonic — the rest follows.",
              },
              { id: "blk-8", type: "checkpoint", questionId: "q-pair-3", title: "Quick check" },
            ],
            questions: [
              cp(
                "q-pair-3",
                "short-answer",
                "What happens to an animal cell placed in a hypotonic solution?",
                "It swells and may burst (lyse) as water flows in",
                {
                  concept: "Transport",
                  difficulty: "hard",
                },
              ),
              cp("q-pair-4", "multiple-choice", "Which process requires ATP?", "Active transport", {
                options: [
                  "Facilitated diffusion",
                  "Osmosis",
                  "Active transport",
                  "Simple diffusion",
                ],
                concept: "Transport",
                difficulty: "easy",
              }),
            ],
            linkedDeckIds: ["deck-bio"],
          },
          {
            id: "lesson-bio-3",
            title: "Osmosis & tonicity lab review",
            summary: "Reading the potato-lab results like an exam question.",
            objectives: ["Interpret water-potential results", "Write a conclusion paragraph"],
            estimatedMinutes: 20,
            blocks: [
              {
                id: "blk-9",
                type: "markdown",
                markdown:
                  "Potato strips in salt solution *lost* mass; in pure water they *gained* mass. Conclusion: water moves toward the higher solute concentration.",
              },
              {
                id: "blk-10",
                type: "example",
                title: "Model answer",
                markdown:
                  "The strip in 10% NaCl lost 3.1 g because the solution was hypertonic, so water left the cells by osmosis until equilibrium.",
              },
              { id: "blk-11", type: "checkpoint", questionId: "q-pair-5", title: "Quick check" },
            ],
            questions: [
              cp(
                "q-pair-5",
                "short-answer",
                "In the potato lab, which solution was hypertonic to the potato cells?",
                "The 10% salt (NaCl) solution",
                { concept: "Transport" },
              ),
              cp(
                "q-pair-6",
                "true-false",
                "At equilibrium, water stops moving across the membrane entirely.",
                "false",
                {
                  explanation:
                    "Water keeps moving both ways at equal rates — net movement is zero.",
                  difficulty: "easy",
                  concept: "Transport",
                },
              ),
            ],
            linkedDeckIds: ["deck-bio"],
          },
        ],
        quiz: {
          id: "quiz-mod-bio-1",
          title: "Module 1 checkpoint quiz",
          questions: [
            cp(
              "q-bio-01",
              "multiple-choice",
              "Which organelle is known as the powerhouse of the cell?",
              "Mitochondrion",
              {
                options: ["Nucleus", "Mitochondrion", "Ribosome", "Golgi apparatus"],
                concept: "Organelles",
              },
            ),
            cp(
              "q-pair-3",
              "short-answer",
              "What happens to an animal cell in a hypotonic solution?",
              "It swells and may burst",
              { concept: "Transport" },
            ),
            cp(
              "q-pair-6",
              "true-false",
              "At equilibrium, water stops moving across the membrane.",
              "false",
              { difficulty: "easy" },
            ),
            cp(
              "q-bio-04",
              "ordering",
              "Order the path of a secreted protein through the endomembrane system.",
              "Ribosome → Rough ER → Golgi → Vesicle → Membrane",
              {
                items: [
                  "Ribosome",
                  "Rough ER",
                  "Golgi apparatus",
                  "Secretory vesicle",
                  "Plasma membrane",
                ],
                difficulty: "hard",
              },
            ),
          ],
          passingScore: 70,
          timeLimitMinutes: 15,
        },
      },
      {
        id: "mod-bio-2",
        title: "Cell division",
        summary: "Mitosis, meiosis and why siblings aren't clones.",
        objectives: ["Phase-by-phase mitosis", "Crossing over and variation"],
        linkedDeckIds: ["deck-bio"],
        lessons: [
          {
            id: "lesson-bio-4",
            title: "Mitosis in five phases",
            summary: "IPMAT: what actually happens in each phase.",
            objectives: ["Order the phases", "Spot each phase in a microscope image"],
            estimatedMinutes: 28,
            blocks: [
              {
                id: "blk-12",
                type: "markdown",
                markdown:
                  "**IPMAT**: interphase (copy DNA), prophase (chromosomes condense), metaphase (align at the equator), anaphase (sister chromatids separate), telophase (two nuclei reform).",
              },
              {
                id: "blk-13",
                type: "callout",
                tone: "warning",
                title: "Common mix-up",
                markdown:
                  "Metaphase = M for *middle*. Anaphase = A for *apart*. Don't swap them under exam pressure.",
              },
              { id: "blk-14", type: "checkpoint", questionId: "q-pair-7", title: "Quick check" },
            ],
            questions: [
              cp(
                "q-pair-7",
                "word-bank",
                "Fill the phases in order: ______ → ______ → ______ → ______.",
                "prophase, metaphase, anaphase, telophase",
                {
                  blanks: ["prophase", "metaphase", "anaphase", "telophase"],
                  wordBank: [
                    "prophase",
                    "metaphase",
                    "anaphase",
                    "telophase",
                    "interphase",
                    "cytokinesis",
                  ],
                  concept: "Mitosis",
                  difficulty: "hard",
                },
              ),
              cp(
                "q-pair-8",
                "short-answer",
                "What separates during anaphase?",
                "Sister chromatids",
                { difficulty: "easy", concept: "Mitosis" },
              ),
            ],
            linkedDeckIds: ["deck-bio"],
          },
          {
            id: "lesson-bio-5",
            title: "Meiosis & genetic variation",
            summary: "Crossing over, independent assortment and gametes.",
            objectives: ["Compare mitosis and meiosis", "Explain why siblings differ"],
            estimatedMinutes: 32,
            blocks: [
              {
                id: "blk-15",
                type: "markdown",
                markdown:
                  "Meiosis produces four **haploid** gametes from one diploid cell. Crossing over in prophase I swaps segments between homologous chromosomes — the main source of variation.",
              },
              { id: "blk-16", type: "checkpoint", questionId: "q-pair-9", title: "Quick check" },
            ],
            questions: [
              cp(
                "q-pair-9",
                "multiple-choice",
                "How many chromosomes does a human gamete carry?",
                "23",
                {
                  options: ["23", "46", "92", "12"],
                  concept: "Meiosis",
                  difficulty: "easy",
                },
              ),
              cp(
                "q-pair-10",
                "true-false",
                "Crossing over happens during prophase I of meiosis.",
                "true",
                { concept: "Meiosis" },
              ),
            ],
            linkedDeckIds: ["deck-bio"],
          },
        ],
      },
    ],
    finalExam: {
      id: "exam-course-bio",
      title: "Biology 101 final exam",
      questions: [
        cp(
          "q-bio-01",
          "multiple-choice",
          "Which organelle is known as the powerhouse of the cell?",
          "Mitochondrion",
          {
            options: ["Nucleus", "Mitochondrion", "Ribosome", "Golgi apparatus"],
          },
        ),
        cp(
          "q-bio-03",
          "short-answer",
          "Name the jelly-like substance that fills the cell.",
          "Cytoplasm",
          { difficulty: "easy" },
        ),
        cp(
          "q-pair-5",
          "short-answer",
          "In the potato lab, which solution was hypertonic to the potato cells?",
          "The 10% salt solution",
          { concept: "Transport", difficulty: "hard" },
        ),
        cp(
          "q-bio-09",
          "word-bank",
          "Fill the four mitosis phases in order.",
          "prophase, metaphase, anaphase, telophase",
          {
            blanks: ["prophase", "metaphase", "anaphase", "telophase"],
            wordBank: ["prophase", "metaphase", "anaphase", "telophase", "interphase", "apoptosis"],
            difficulty: "hard",
          },
        ),
        cp("q-pair-9", "multiple-choice", "How many chromosomes does a human gamete carry?", "23", {
          options: ["23", "46", "92", "64"],
          difficulty: "easy",
        }),
        cp(
          "q-pair-10",
          "true-false",
          "Crossing over happens during prophase I of meiosis.",
          "true",
          { difficulty: "easy" },
        ),
      ],
      passingScore: 70,
      timeLimitMinutes: 45,
    },
    linkedDeckIds: ["deck-bio"],
    createdAt: now - 30 * DAY,
    updatedAt: now - DAY,
  };

  const courseChem: Course = {
    id: "course-chem",
    title: "Chemistry Foundations: Atoms to Reactions",
    subject: "Chemistry",
    description: "Planned for next term — warming up with the stoichiometry deck first.",
    level: "Grade 11",
    color: "var(--deck-2)",
    emoji: "🧪",
    tags: ["Chemistry"],
    isSTEM: true,
    needsEquations: true,
    needsGraphs: true,
    labelIds: ["label-l2"],
    objectives: [
      "Describe atomic structure",
      "Balance chemical equations",
      "Do mole conversions fluently",
    ],
    estimatedMinutes: 300,
    sources: [
      {
        id: "src-chem-1",
        title: "Term 3 syllabus summary",
        content:
          "Atoms, periodic trends, ionic vs covalent bonding, moles, and the four reaction types.",
      },
    ],
    modules: [
      {
        id: "mod-chem-1",
        title: "Atomic structure",
        summary: "Subatomic particles, isotopes and electron configurations.",
        objectives: ["Draw Bohr models", "Decode isotope notation"],
        linkedDeckIds: ["deck-chem"],
        lessons: [
          {
            id: "lesson-chem-1",
            title: "Inside the atom",
            summary: "Protons, neutrons and electrons.",
            objectives: ["State relative charges and masses"],
            estimatedMinutes: 18,
            blocks: [
              {
                id: "blk-c1",
                type: "markdown",
                markdown:
                  "Protons (+1, in the nucleus) define the element. Neutrons add mass, not charge. Electrons (−1) orbit in shells and drive bonding. Isotope notation puts the mass number top-left of the symbol: carbon-14 is $^{14}_{6}\\mathrm{C}$.",
              },
              { id: "blk-c2", type: "checkpoint", questionId: "q-chemx-1", title: "Quick check" },
            ],
            questions: [
              cp(
                "q-chemx-1",
                "multiple-choice",
                "Which particle determines an element's identity?",
                "Proton",
                {
                  options: ["Proton", "Neutron", "Electron", "Nucleus"],
                  difficulty: "easy",
                  concept: "Atomic structure",
                },
              ),
            ],
            linkedDeckIds: ["deck-chem"],
          },
          {
            id: "lesson-chem-2",
            title: "Isotopes & notation",
            summary: "Reading ⁴²Ca and friends.",
            objectives: ["Calculate average atomic mass"],
            estimatedMinutes: 22,
            blocks: [
              {
                id: "blk-c3",
                type: "markdown",
                markdown:
                  "Mass number = protons + neutrons. Average atomic masses on the periodic table are weighted averages over natural isotopes.",
              },
            ],
            questions: [
              cp("q-chemx-2", "short-answer", "How many neutrons does carbon-14 have?", "8", {
                difficulty: "easy",
                concept: "Atomic structure",
              }),
            ],
            linkedDeckIds: ["deck-chem"],
          },
        ],
      },
    ],
    linkedDeckIds: ["deck-chem"],
    createdAt: now - 6 * DAY,
    updatedAt: now - 6 * DAY,
  };

  const lessonDone = (completedAt: number): CourseProgress["lessons"][string] => ({
    status: "completed",
    openedAt: completedAt - 2 * DAY,
    completedAt,
    srs: {
      "q-pair-1": monthOut,
      "q-pair-2": fortnight,
    },
    notes: "Solid. Re-read the model answer before the final.",
    bookmarks: [],
  });

  const courseProgress: Record<string, CourseProgress> = {
    "course-bio": {
      courseId: "course-bio",
      startedAt: now - 28 * DAY,
      lastStudiedAt: now - DAY,
      lessons: {
        "lesson-bio-1": lessonDone(now - 24 * DAY),
        "lesson-bio-2": lessonDone(now - 17 * DAY),
        "lesson-bio-3": lessonDone(now - 11 * DAY),
        "lesson-bio-4": {
          status: "in-progress",
          openedAt: now - DAY,
          srs: {
            "q-pair-7": dueSoon,
            "q-pair-8": tomorrow,
          },
          notes: "Got metaphase and anaphase swapped on the first try — use the mnemonic.",
          bookmarks: [],
        },
        "lesson-bio-5": { status: "not-started", srs: {}, bookmarks: [] },
      },
      questionStats: {
        "q-pair-1": { attempts: 2, correct: 2, lastSeen: now - 24 * DAY },
        "q-pair-2": { attempts: 1, correct: 1, lastSeen: now - 24 * DAY },
        "q-pair-3": { attempts: 3, correct: 2, lastSeen: now - 11 * DAY },
        "q-pair-4": { attempts: 1, correct: 1, lastSeen: now - 17 * DAY },
        "q-pair-5": { attempts: 2, correct: 1, lastSeen: now - 11 * DAY },
        "q-pair-6": { attempts: 1, correct: 1, lastSeen: now - 17 * DAY },
        "q-pair-7": { attempts: 1, correct: 0, lastSeen: now - DAY },
        "q-pair-8": { attempts: 1, correct: 1, lastSeen: now - DAY },
      },
      assessments: {
        "quiz-mod-bio-1": [
          {
            id: "ar-1",
            assessmentId: "quiz-mod-bio-1",
            createdAt: now - 10 * DAY,
            score: 3,
            total: 4,
            percentage: 75,
            passed: true,
            durationMs: 9 * 60_000,
          },
        ],
      },
    },
  };

  /* ------------------------------------------------------- progress */

  const studyDays: Record<string, number> = {};
  // Same local-date format the app's dayKey() uses.
  const dayKeyAt = (t: number) => {
    const d = new Date(t);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
  };
  const pattern: [number, number][] = [
    [40, 24],
    [38, 41],
    [37, 18],
    [35, 52],
    [34, 30],
    [33, 12],
    [31, 46],
    [30, 28],
    [28, 63],
    [27, 35],
    [26, 20],
    [24, 44],
    [23, 31],
    [22, 15],
    [21, 38],
    [19, 57],
    [18, 26],
    [17, 33],
    [16, 21],
    [14, 48],
    [13, 30],
    [12, 22],
    [11, 41],
    [10, 19],
    [9, 36],
    [8, 27],
    [7, 45],
    [6, 33],
    [5, 24],
    [4, 52],
    [3, 30],
    [2, 18],
    [1, 26],
  ];
  pattern.forEach(([daysAgo, count]) => {
    studyDays[dayKeyAt(now - daysAgo * DAY)] = count;
  });

  const progress: Progress = {
    xp: 240,
    lifetimeXp: 3420,
    totalAnswered: 1410,
    totalCorrect: 1156,
    totalIncorrect: 214,
    totalSkipped: 40,
    studyTimeMs: 116_640_000,
    streak: 6,
    longestStreak: 13,
    lastStudyDay: dayKeyAt(yesterday),
    studyDays,
    nightOwl: true,
    earlyBird: false,
    unlockedAchievements: [
      "first-deck",
      "hundred",
      "thousand",
      "perfect",
      "streak-7",
      "night-owl",
      "recall-expert",
    ],
    perfectQuizzes: 5,
    quizzesCompleted: 18,
    bestAccuracy: 100,
    bestCombo: 12,
    conceptStats: {
      Organelles: { correct: 148, total: 162 },
      "Endomembrane system": { correct: 61, total: 84 },
      Transport: { correct: 96, total: 121 },
      Mitosis: { correct: 44, total: 71 },
      Meiosis: { correct: 12, total: 20 },
      "The mole": { correct: 58, total: 74 },
      "Limiting reagents": { correct: 21, total: 39 },
      Balancing: { correct: 40, total: 46 },
      Airport: { correct: 66, total: 80 },
      Hotel: { correct: 38, total: 52 },
      "Basic probability": { correct: 9, total: 12 },
    },
  };

  /* ------------------------------------------------ historical data */

  const session = (
    id: string,
    daysAgo: number,
    hour: number,
    mode: SessionSummary["mode"],
    deckTitles: string[],
    answered: number,
    correct: number,
    minutes: number,
    xpRate = 3,
  ): SessionSummary => ({
    id,
    date: now - daysAgo * DAY + hour * HOUR,
    mode,
    deckTitles,
    answered,
    correct,
    skipped: Math.max(0, Math.round(answered * 0.04)),
    durationMs: minutes * 60_000,
    xpEarned: correct * xpRate + (mode === "quiz" ? 25 : 0),
    percentage: Math.round((correct / answered) * 100),
  });

  const history: SessionSummary[] = [
    session("ses-1", 40, 21, "study", ["Cell Biology — Unit 2"], 24, 17, 12),
    session("ses-2", 38, 20, "quiz", ["Cell Biology — Unit 2"], 10, 9, 6),
    session(
      "ses-3",
      35,
      22,
      "study",
      ["Cell Biology — Unit 2", "Chemistry — Stoichiometry"],
      52,
      41,
      24,
    ),
    session("ses-4", 33, 23.5, "study", ["Spanish A2 — Travel Vocabulary"], 12, 8, 8),
    session(
      "ses-5",
      31,
      20,
      "quiz",
      ["Chemistry — Stoichiometry", "Cell Biology — Unit 2"],
      12,
      10,
      8,
    ),
    session("ses-6", 28, 19, "study", ["Cell Biology — Unit 2"], 63, 55, 31),
    session(
      "ses-7",
      26,
      21,
      "study",
      ["Spanish A2 — Travel Vocabulary", "Cell Biology — Unit 2"],
      35,
      29,
      17,
    ),
    session(
      "ses-8",
      24,
      20,
      "quiz",
      ["Cell Biology — Unit 2", "Chemistry — Stoichiometry", "World History — Interwar Years"],
      18,
      14,
      12,
    ),
    session("ses-9", 22, 22.5, "study", ["Chemistry — Stoichiometry"], 31, 26, 15),
    session("ses-10", 21, 7.5, "study", ["Spanish A2 — Travel Vocabulary"], 38, 33, 19),
    session("ses-11", 19, 21, "quiz", ["Cell Biology — Unit 2"], 10, 10, 7),
    session(
      "ses-12",
      17,
      20,
      "study",
      ["Cell Biology — Unit 2", "Spanish A2 — Travel Vocabulary"],
      26,
      22,
      14,
    ),
    session("ses-13", 16, 22, "study", ["Cell Biology — Unit 2"], 21, 18, 11),
    session(
      "ses-14",
      14,
      20,
      "quiz",
      ["Chemistry — Stoichiometry", "World History — Interwar Years"],
      15,
      12,
      9,
    ),
    session("ses-15", 12, 19, "study", ["Cell Biology — Unit 2"], 48, 41, 26),
    session(
      "ses-16",
      11,
      21,
      "study",
      ["Spanish A2 — Travel Vocabulary", "Chemistry — Stoichiometry"],
      41,
      36,
      21,
    ),
    session(
      "ses-17",
      10,
      20,
      "quiz",
      ["Cell Biology — Unit 2", "Chemistry — Stoichiometry"],
      12,
      12,
      8,
    ),
    session(
      "ses-18",
      9,
      21.5,
      "study",
      ["Cell Biology — Unit 2", "World History — Interwar Years"],
      36,
      29,
      20,
    ),
    session("ses-19", 8, 20, "study", ["Spanish A2 — Travel Vocabulary"], 27, 24, 13),
    session(
      "ses-20",
      7,
      20,
      "quiz",
      ["Cell Biology — Unit 2", "Spanish A2 — Travel Vocabulary", "Chemistry — Stoichiometry"],
      20,
      17,
      14,
    ),
    session("ses-21", 6, 19, "study", ["Cell Biology — Unit 2"], 33, 28, 18),
    session(
      "ses-22",
      5,
      22,
      "study",
      ["Chemistry — Stoichiometry", "World History — Interwar Years"],
      24,
      19,
      13,
    ),
    session("ses-23", 4, 20, "quiz", ["Cell Biology — Unit 2"], 10, 10, 6),
    session(
      "ses-24",
      3,
      21,
      "study",
      ["Cell Biology — Unit 2", "Spanish A2 — Travel Vocabulary"],
      30,
      25,
      16,
    ),
    session(
      "ses-25",
      2,
      20,
      "study",
      ["Chemistry — Stoichiometry", "Cell Biology — Unit 2"],
      18,
      14,
      10,
    ),
    session(
      "ses-26",
      1,
      19.5,
      "study",
      ["Cell Biology — Unit 2", "Statistics — Probability Basics"],
      26,
      20,
      15,
    ),
  ];

  const quizResult = (
    id: string,
    daysAgo: number,
    hour: number,
    deckIds: string[],
    deckTitles: string[],
    score: number,
    total: number,
    minutes: number,
    types: QuizResult["config"]["types"],
  ): QuizResult => ({
    id,
    createdAt: now - daysAgo * DAY + hour * HOUR,
    deckIds,
    deckTitles,
    config: {
      deckIds,
      questionCount: total,
      types,
      difficulties: ["easy", "medium", "hard"],
      shuffle: true,
      perQuestionSeconds: null,
      totalMinutes: null,
      unlimited: false,
      passingScore: 70,
      xpEnabled: true,
      instantFeedback: false,
      bookmarkedOnly: false,
    },
    answers: [],
    durationMs: minutes * 60_000,
    xpEarned: score * 3 + 25,
    score,
    total,
    percentage: Math.round((score / total) * 100),
    passed: (score / total) * 100 >= 70,
  });

  const results: QuizResult[] = [
    quizResult("qr-1", 38, 20, ["deck-bio"], ["Cell Biology — Unit 2"], 9, 10, 6, [
      "multiple-choice",
      "true-false",
    ]),
    quizResult(
      "qr-2",
      31,
      20,
      ["deck-chem", "deck-bio"],
      ["Chemistry — Stoichiometry", "Cell Biology — Unit 2"],
      10,
      12,
      8,
      ["multiple-choice", "short-answer", "true-false"],
    ),
    quizResult(
      "qr-3",
      24,
      20,
      ["deck-bio", "deck-chem", "deck-hist"],
      ["Cell Biology — Unit 2", "Chemistry — Stoichiometry", "World History — Interwar Years"],
      14,
      18,
      12,
      ["multiple-choice", "true-false", "short-answer", "ordering"],
    ),
    quizResult("qr-4", 19, 21, ["deck-bio"], ["Cell Biology — Unit 2"], 10, 10, 7, [
      "multiple-choice",
      "true-false",
      "ordering",
      "matching",
    ]),
    quizResult(
      "qr-5",
      14,
      20,
      ["deck-chem", "deck-hist"],
      ["Chemistry — Stoichiometry", "World History — Interwar Years"],
      12,
      15,
      9,
      ["multiple-choice", "true-false", "short-answer"],
    ),
    quizResult(
      "qr-6",
      10,
      20,
      ["deck-bio", "deck-chem"],
      ["Cell Biology — Unit 2", "Chemistry — Stoichiometry"],
      12,
      12,
      8,
      ["multiple-choice", "true-false", "word-bank"],
    ),
    quizResult(
      "qr-7",
      7,
      20,
      ["deck-bio", "deck-span", "deck-chem"],
      ["Cell Biology — Unit 2", "Spanish A2 — Travel Vocabulary", "Chemistry — Stoichiometry"],
      17,
      20,
      14,
      ["multiple-choice", "true-false", "short-answer", "matching", "fill-blank"],
    ),
    quizResult(
      "qr-8",
      2,
      16.5,
      ["deck-chem", "deck-stats"],
      ["Chemistry — Stoichiometry", "Statistics — Probability Basics"],
      13,
      18,
      11,
      ["multiple-choice", "short-answer", "flashcard"],
    ),
  ];

  const templates = [
    {
      id: "tpl-1",
      name: "Exam-prep deck (30 cards)",
      body: "Create a study deck of exactly 30 question cards on: {{TOPIC}}.\nAudience: a {{GRADE}} student revising for a written exam.\nMix card types: 8 multiple-choice (4 options), 6 true-false, 6 short-answer, 4 ordering, 4 matching, 2 word-bank.\nTag every card with a narrow concept (e.g. 'Organelles', not 'Biology').\nDifficulty: 40% easy, 40% medium, 20% hard.\nReturn ONLY a JSON object matching Knowly's deck schema: title, subject, description, tags, questions[].",
    },
    {
      id: "tpl-2",
      name: "Language vocab pack",
      body: "Create a vocabulary deck for {{LANGUAGE}} at CEFR level {{LEVEL}}, themed on {{THEME}}.\n30 cards: 20 flashcards (target word → translation), 5 matching, 5 fill-with-the-word using the word_bank + blanks fields.\nInclude short sentences as context on every card.\nReturn ONLY a JSON object matching Knowly's deck schema.",
    },
    {
      id: "tpl-3",
      name: "STEM problem set (equations in LaTeX)",
      body:
        "Create a 24-question practice deck on {{TOPIC}} for a {{GRADE}} student.\n" +
        "This is a maths/science topic: write ALL equations in LaTeX — inline $...$, larger working in $$...$$ (e.g. $v = u + at$, $\\frac{d}{dx}(x^2) = 2x$).\n" +
        "Describe any graphs in words (axes, shape, key points) — the app shows text and LaTeX, never images.\n" +
        "Mix: 8 short-answer, 6 multiple-choice, 4 fill-blank, 4 flashcards, 2 ordering. Tag every card with a narrow concept.\n" +
        "Return ONLY a JSON object matching Knowly's deck schema.",
    },
  ];

  const journal: JournalEntry[] = [
    {
      id: "jrn-1",
      createdAt: now - 26 * DAY + 21 * HOUR,
      updatedAt: now - 26 * DAY + 21 * HOUR,
      title: "This app is already working",
      body: "Made the first 60 cards today and did my first review round. The again/good buttons feel honest — I got spanked by the endomembrane ordering card twice.",
      mood: "good",
      tags: ["setup", "cell biology"],
    },
    {
      id: "jrn-2",
      createdAt: now - 11 * DAY + 20 * HOUR,
      updatedAt: now - 11 * DAY + 20 * HOUR,
      title: "Mid-lab panic, then clarity",
      body: "Potato lab write-up due Friday. Realised the tonicity concept from the course lessons is basically the entire lab discussion. Reviewed 'Transport' cards for 15 minutes and the conclusion basically wrote itself.",
      mood: "great",
      tags: ["lab", "osmosis", "course"],
      sessionId: "ses-15",
    },
    {
      id: "jrn-3",
      createdAt: now - 4 * DAY + 22 * HOUR,
      updatedAt: now - 4 * DAY + 22 * HOUR,
      title: "Late-night grind",
      body: "Studied past midnight again — night owl achievement mode. Chemistry percentage problems are still fuzzy; added 6 more cards so the scheduler forces reps this week.",
      mood: "okay",
      tags: ["chemistry", "late night"],
    },
    {
      id: "jrn-4",
      createdAt: now - DAY + 20 * 3_600_000,
      updatedAt: now - DAY + 20 * 3_600_000,
      title: "Mitosis mnemonic version 3",
      body: "Finally found one that sticks: IPMAT — 'I Prefer My Anaphase Timely'. Got the word-bank mitosis card wrong yesterday, so tomorrow's queue should fix it. Statistics deck is warm-up for next term; feels weird to skip the schedule with cram later.",
      mood: "good",
      tags: ["mitosis", "mnemonics", "cell biology"],
      sessionId: "ses-26",
    },
    {
      id: "jrn-5",
      createdAt: now - 3 * HOUR,
      updatedAt: now - 3 * HOUR,
      title: "Week mapped, papers shelved",
      body: "Put the whole school week into the timetable and linked every class to its deck — revising for tomorrow's lesson is one tap from the schedule now. Shelved the two practice papers too: biology went 42% → 67% → 83% over three sittings, so the spaced reps really are paying off.",
      mood: "great",
      tags: ["timetable", "papers", "progress"],
    },
  ];

  /* -------------------------------------------- timetable, labels, papers */

  const labels: BinderLabel[] = [
    { id: "label-l1", name: "Term 1", color: "blue", emoji: "📘" },
    { id: "label-l2", name: "Exam priority", color: "amber", emoji: "🎯" },
    { id: "label-l3", name: "Needs practice", color: "rose", emoji: "🧗" },
  ];

  // Monday-first: day 0 = Monday … day 6 = Sunday.
  const timetable: TimetableSlot[] = [
    {
      id: "slot-mon-1",
      day: 0,
      start: "09:00",
      end: "10:00",
      title: "Biology",
      subject: "Biology",
      room: "B12",
      teacher: "Ms. Odell",
      deckId: "deck-bio",
    },
    {
      id: "slot-mon-2",
      day: 0,
      start: "13:00",
      end: "14:15",
      title: "Chemistry lab",
      subject: "Chemistry",
      room: "Lab 2",
      teacher: "Mr. Chen",
      deckId: "deck-chem",
    },
    {
      id: "slot-tue-1",
      day: 1,
      start: "09:00",
      end: "10:00",
      title: "Chemistry",
      subject: "Chemistry",
      room: "S3",
      teacher: "Mr. Chen",
      deckId: "deck-chem",
    },
    {
      id: "slot-tue-2",
      day: 1,
      start: "14:00",
      end: "15:00",
      title: "Biology course work",
      subject: "Study period",
      room: "Library",
      courseId: "course-bio",
    },
    {
      id: "slot-wed-1",
      day: 2,
      start: "11:30",
      end: "12:15",
      title: "Spanish",
      subject: "Spanish",
      room: "L7",
      teacher: "Sra. Vidal",
      deckId: "deck-span",
    },
    {
      id: "slot-wed-2",
      day: 2,
      start: "13:30",
      end: "14:30",
      title: "Statistics workshop",
      subject: "Statistics",
      room: "M1",
      teacher: "Mrs. Adeyemi",
      deckId: "deck-stats",
    },
    {
      id: "slot-thu-1",
      day: 3,
      start: "09:00",
      end: "10:00",
      title: "History",
      subject: "History",
      room: "H2",
      teacher: "Mr. Brandt",
      deckId: "deck-hist",
    },
    {
      id: "slot-thu-2",
      day: 3,
      start: "15:45",
      end: "16:45",
      title: "Biology course review",
      subject: "Revision",
      room: "Study hall",
      courseId: "course-bio",
    },
    {
      id: "slot-fri-1",
      day: 4,
      start: "09:00",
      end: "10:00",
      title: "Chemistry",
      subject: "Chemistry",
      room: "S3",
      teacher: "Mr. Chen",
      deckId: "deck-chem",
    },
    {
      id: "slot-sun-1",
      day: 6,
      start: "18:00",
      end: "19:30",
      title: "Weekly review & planning",
      subject: "Self-study",
      room: "Home",
      deckId: "deck-bio",
    },
  ];

  const sitting = (
    id: string,
    daysAgo: number,
    hour: number,
    score: number,
    total: number,
    minutes: number,
    notes?: string,
  ): PaperSitting => ({
    id,
    takenAt: now - daysAgo * DAY + hour * HOUR,
    score,
    total,
    percentage: Math.round((score / total) * 100),
    minutes,
    notes,
  });

  const papers: PaperRecord[] = [
    {
      id: "paper-bio-1",
      title: "Cell Biology — Practice Paper 1",
      createdAt: now - 18 * DAY,
      options: {
        ...defaultExamOptions("Cell Biology — Practice Paper 1", "Biology"),
        date: new Date(now).toISOString().slice(0, 10),
        studentName: "Alex Rivera",
        studentClass: "Grade 10 · Riverside High School",
        instructions: "Answer all questions. Show your working where a question says explain.",
      },
      questions: deckBio.questions.slice(0, 12),
      deckIds: ["deck-bio"],
      labelIds: ["label-l1", "label-l2"],
      sittings: [
        sitting(
          "sit-bio-3",
          3,
          17,
          10,
          12,
          31,
          "Finally beat the mitosis ordering — the mnemonic paid off.",
        ),
        sitting("sit-bio-2", 9, 18.5, 8, 12, 38),
        sitting("sit-bio-1", 16, 19, 5, 12, 45, "Transport and tonicity questions did the damage."),
      ],
    },
    {
      id: "paper-chem-1",
      title: "Chemistry — Stoichiometry Mini Paper",
      createdAt: now - 15 * DAY,
      options: {
        ...defaultExamOptions("Chemistry — Stoichiometry Mini Paper", "Chemistry"),
        date: new Date(now).toISOString().slice(0, 10),
        studentName: "Alex Rivera",
        studentClass: "Grade 10 · Riverside High School",
      },
      questions: deckChem.questions.slice(0, 8),
      deckIds: ["deck-chem"],
      labelIds: ["label-l2"],
      sittings: [
        sitting("sit-chem-2", 5, 15.5, 7, 8, 21),
        sitting(
          "sit-chem-1",
          13,
          20,
          4,
          8,
          24,
          "Went in cold — worth a retry after the course lessons.",
        ),
      ],
    },
  ];

  /* ------------------------------------------------------ settings */

  const settings: Partial<Settings> = {
    displayName: "Alex Rivera",
    gradeLevel: "Grade 10",
    school: "Riverside High School",
    avatarEmoji: "🔬",
    focusSubjects: ["Biology", "Chemistry", "Statistics"],
    studyReason: "Exam prep",
    dailyGoal: 30,
    theme: "dark",
    sidebarCollapsed: false,
    hiddenWidgets: [],
  };

  /* -------------------------------------------------------- bundle */

  return {
    version: 4,
    onboardingComplete: true,
    decks: [deckBio, deckChem, deckSpan, deckHist, deckStats],
    courses: [courseBio, courseChem],
    courseProgress,
    settings: settings as Settings,
    progress,
    history,
    results,
    templates,
    journal,
    timetable,
    labels,
    papers,
  };
}
