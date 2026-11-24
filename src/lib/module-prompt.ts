import { lengthBudgetFor } from "./length-detail";
import {
  jsonFileRule,
  QUESTION_SCHEMA_TEXT,
  SAMPLE_NOTE,
  STRICT_FORMAT_RULES,
  TUTOR_RULES,
} from "./prompt";
import { SAMPLE_MODULE_JSON } from "./module-schema";

export interface ModulePromptBlurb {
  title: string;
  body: string;
}

export interface ModulePromptInput {
  title: string;
  subject: string;
  description: string;
  difficulty: string;
  minutes: string;
  objectives: string;
  topics: string;
  material: string;
  extra: string;
  tone: string;
  blurbs: ModulePromptBlurb[];
  lengthSliderValue: number;
  smartModeEnabled?: boolean;
  difficultyAuto?: boolean;
  minutesAuto?: boolean;
}

interface ModuleStructureBudget {
  chapters: string;
  sections: string;
  checkpoints: string;
  examples: string;
}

function moduleStructureBudget(value: number): ModuleStructureBudget {
  if (value <= 25) {
    return {
      chapters: "2–3",
      sections: "1–2",
      checkpoints: "2–4",
      examples: "Give each central concept one concise, concrete example.",
    };
  }
  if (value <= 45) {
    return {
      chapters: "2–4",
      sections: "1–3",
      checkpoints: "3–5",
      examples: "Use at least one clear example for each important concept.",
    };
  }
  if (value <= 65) {
    return {
      chapters: "3–5",
      sections: "2–3",
      checkpoints: "4–7",
      examples: "Use varied examples for difficult or easily confused concepts.",
    };
  }
  if (value <= 85) {
    return {
      chapters: "4–6",
      sections: "2–4",
      checkpoints: "6–9",
      examples: "Use multiple examples, comparisons, and practical applications for key concepts.",
    };
  }
  return {
    chapters: "5–8",
    sections: "2–4",
    checkpoints: "8–12",
    examples:
      "Develop concepts with multiple varied examples, worked demonstrations, comparisons, and realistic applications.",
  };
}

export function moduleLengthInstructions(sliderValue: number): string {
  const budget = lengthBudgetFor(sliderValue);
  const structure = moduleStructureBudget(budget.sliderValue);
  return [
    `LENGTH & DETAIL — ${budget.label} (${budget.sliderValue}/100)`,
    `- Conceptual depth: ${budget.depth}; explanation depth: ${budget.explanationDepth}.`,
    `- Suggested organization: ${structure.chapters} chapters, generally ${structure.sections} sections per chapter, and ${structure.checkpoints} checkpoint questions. Scale this to the actual subject; never invent sections or repeat material to hit a range.`,
    `- Examples: ${structure.examples}`,
    "- Scale the actual coverage, context, examples, and section development with this setting. Do not satisfy a longer setting by adding filler or merely lengthening sentences.",
    "- Even at shorter settings, name and define every essential concept, explain unfamiliar terms, and provide enough context for a beginner to understand each section.",
  ].join("\n");
}

export function buildModulePrompt(input: ModulePromptInput): string {
  const {
    title,
    subject,
    description,
    difficulty,
    minutes,
    objectives,
    topics,
    material,
    extra,
    tone,
    blurbs,
    lengthSliderValue,
    smartModeEnabled = false,
    difficultyAuto = false,
    minutesAuto = false,
  } = input;
  const difficultyLabel = difficulty === "1" ? "Intro" : difficulty === "3" ? "Advanced" : "Core";
  const objectiveList = objectives
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  const topicList = topics
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  const blurbSpec = blurbs
    .filter((blurb) => blurb.title.trim() || blurb.body.trim())
    .map(
      (blurb, index) =>
        `  ${index + 1}. "${blurb.title.trim() || "Untitled callout"}" — ${
          blurb.body.trim() || "a focused takeaway"
        } (suggested tone: ${["info", "tip", "warning", "definition"][index % 4]})`,
    )
    .join("\n");
  const lengthValue = lengthBudgetFor(lengthSliderValue).sliderValue;
  const structure = moduleStructureBudget(lengthValue);
  const sourceMaterial = material.trim()
    ? material.trim()
    : "(No source text supplied. Develop the module from the brief and outline; do not imply that source documents were provided.)";

  return `You are an expert textbook author and learning designer. Turn the brief and source material into a cohesive, standalone educational module that reads like a professionally written textbook chapter.

MODULE BRIEF
- Title: ${title.trim() || "(derive a precise, learner-friendly title)"}
- Subject: ${subject.trim() || "(identify the subject from the material)"}
- Description: ${description.trim() || "(write a clear one-sentence description)"}
- Difficulty: ${difficultyAuto ? "determine the appropriate level from the material and audience" : `${difficultyLabel} (${difficulty})`}
- Estimated time: ${
    minutesAuto
      ? "choose a realistic estimate from the amount and depth of content"
      : `${minutes || 15} minutes`
  }
- Learning objectives:
${objectiveList.length ? objectiveList.map((item) => `  - ${item}`).join("\n") : "  - Create clear, measurable objectives from the brief and source material."}
- Chapter and section guidance:
${topicList.length ? topicList.map((item) => `  - ${item}`).join("\n") : "  - Infer a meaningful chapter and section outline from the subject and source material."}
${extra.trim() ? `- Additional instructions: ${extra.trim()}\n` : ""}${
    tone.trim()
      ? `\nTONE & VOICE\nWrite the prose, callouts, examples, and checkpoint feedback in this voice:\n"""\n${tone.trim()}\n"""\nThe voice affects presentation, never factual accuracy or the output schema.\n`
      : ""
  }
${smartModeEnabled ? `SMART MODE\nTreat any source-analysis suggestions in the brief as learner-reviewed guidance. Uploaded files, when present, appear below under their original filenames; the source material remains the factual anchor.\n` : ""}
TEXTBOOK-CHAPTER WRITING STANDARD
- Write a complete teaching resource, not a summary, transcript, set of notes, or list of facts. Assume the learner may be new to the subject.
- Start with the foundational ideas needed to understand the topic, then develop concepts in a logical progression toward more advanced or integrated material.
- Explicitly name and define every important concept. Explain unfamiliar terminology when it first appears, in clear language before relying on it.
- Explain how and why ideas work. Supply relevant background, causal links, assumptions, and context instead of compressing them into unsupported conclusions.
- Use approachable, friendly prose with academic accuracy. Prefer clear paragraphs and purposeful headings; use bullets only when they genuinely improve comparison, procedure, or reference.
- Add concrete examples, analogies, comparisons, step-by-step reasoning, and practical applications where they improve understanding. Do not add generic filler, repeated summaries, or examples that do not teach anything.
- Keep all claims accurate. Use source material as the factual anchor, reconcile overlapping explanations, preserve important details, and connect related concepts rather than copying or concatenating the original documents.
- When a prerequisite is missing, add a concise, reliable foundation that helps the reader. Do not invent unsupported specifics; identify genuine uncertainty or conflicts in the sources clearly.

SOURCE CONSOLIDATION
- Treat each named source as potentially related to the others. First identify their shared concepts, unique details, differences, and gaps; then organize a single coherent explanation.
- Remove redundant explanations while retaining useful distinctions and examples. Reorder material by prerequisite and conceptual progression, not by upload order or the source documents' headings.
- Add transitions and context so the final module stands alone. Do not reproduce document boundaries or refer to "the first file", "the second source", or "the material above".

STUDY MATERIAL
<source-material>
${sourceMaterial}
</source-material>

CHAPTER AND SECTION ORGANIZATION
- Choose the number and order of chapters and sections based on the actual subject, source coverage, and selected length/detail setting below. The ranges are guidance, not quotas.
- Use this Markdown heading hierarchy in markdown blocks: \`## Chapter 1 — Chapter title\`, followed by \`### Section 1.1 — Section title\`. Number later chapters and sections consistently.
- Put each chapter's heading and brief framing introduction in a markdown block. Put each section in its own markdown block, beginning with its section heading, so the module can provide a contents list and sections can be opened directly.
- Each section must make sense when opened on its own: briefly establish the specific context and needed background, define key terms locally, and explain the concept fully. Avoid unexplained references such as "as discussed earlier" or "this process" without naming the process.
- Let sections contribute naturally to the chapter's progression. Use concise cross-references only when useful; never make a section depend on reading every preceding section.
- Give each chapter a meaningful purpose. Avoid arbitrary headings, one-paragraph fragments, and splitting a single concept across disconnected blocks.

CONTENT BLOCKS
Use the existing module block types in reading order:
1. {"type":"markdown","markdown":"…"} — chapter framing and section prose, with the heading hierarchy above.
2. {"type":"callout","tone":"info|tip|warning|definition","title":"…","markdown":"…"} — occasional key definitions, misconceptions, or useful reminders. Use selectively; prose should carry the teaching.
3. {"type":"example","title":"…","markdown":"…"} — a worked example or practical scenario that demonstrates the reasoning.
4. {"type":"checkpoint","questionId":"q1"} — a question placed immediately after relevant teaching, matched to a question id.
5. {"type":"divider"} — only when a clear visual break helps.
Do not let callouts, questions, or short blocks replace the explanatory textbook prose.

AI-SELECTED KEY PASSAGES
- On prose markdown, callout and example blocks, include an optional "highlightedText" array containing only a small number of especially important visible passages (key definitions, causal ideas, or useful takeaways). Do not highlight whole paragraphs or add highlights mechanically.
- Each entry must be an exact, contiguous phrase from the rendered text in that same block, written as plain text without Markdown markers or LaTeX. Avoid selecting text across paragraph boundaries, equations, or code.
- Usually choose no more than one or two passages per section. Omit the field when nothing merits emphasis.

EQUATIONS & NOTATION
- Use LaTeX whenever the subject calls for equations or scientific notation: inline as $…$ or displayed as $$…$$.
- Keep ordinary words outside math delimiters. Escape backslashes so the JSON remains valid (for example, \\\\frac in the raw JSON file). Do not fake equations with plain text or put equations in code blocks.

CALL-OUTS REQUESTED BY THE LEARNER
Include every requested callout below as a titled callout block, preserving its intended takeaway while adapting any wording needed for accuracy. Use the suggested tone when appropriate. Add other callouts only when they provide clear educational value.
${blurbSpec || "  (None specified. Add a callout only when it has clear educational value.)"}

CHECKPOINT QUESTIONS
- Create ${structure.checkpoints} concise checkpoint questions that test understanding, not just recognition. Place each checkpoint beside the concept it tests.
- Questions should vary appropriately between conceptual explanation, recall, and application. Avoid questions that require facts not taught in the module.
- Every checkpoint block must reference an existing question id, and every question should be referenced by an inline checkpoint block.
- Each question should include a clear explanation and a useful incorrect-answer explanation where the schema supports it.

${moduleLengthInstructions(lengthValue)}

OUTPUT RULES
${jsonFileRule("knowly-module.json")}
- Return one complete module JSON object only. Do not set "blocks" to null.
- Preserve the block schema below, using "highlightedText" only as described. Chapter and section structure belongs in the ordered Markdown blocks; do not invent other JSON fields.

SCHEMA — the complete module object
{
  "title": string,
  "subject": string,
  "description": string,
  "difficulty": 1 | 2 | 3,
  "emoji": string,
  "color": string,
  "tags": string[],
  "isSTEM": boolean,
  "needsEquations": boolean,
  "needsGraphs": boolean,
  "objectives": string[],
  "estimatedMinutes": number,
  "blocks": [ Block ],
  "questions": [ Question ],
  "linkedDeckIds": string[]
}

BLOCK OBJECT
{
  "type": "markdown" | "callout" | "example" | "image" | "checkpoint" | "divider" | "activity",
  "markdown": string,
  "highlightedText": string[],
  "tone": "info" | "tip" | "warning" | "definition",
  "title": string,
  "url": string,
  "alt": string,
  "caption": string,
  "questionId": string,
  "deckId": string
}

QUESTION OBJECT
${QUESTION_SCHEMA_TEXT}

TUTOR NOTES
${TUTOR_RULES}

FULL SAMPLE
${SAMPLE_NOTE}
${SAMPLE_MODULE_JSON}

FORMAT ADHERENCE — CRITICAL
${STRICT_FORMAT_RULES}
The sample demonstrates the JSON shape only; the finished module's depth, chapter structure, and completeness must follow the brief and selected length/detail setting above.`;
}
