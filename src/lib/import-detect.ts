/**
 * Works out which kind of Knowly file a user just dropped in.
 *
 * Every Knowly JSON format is recognised here so the import panel can hand the
 * payload to the right validator without the user picking a page first.
 */
export type ImportKind = "deck" | "questions" | "course" | "module" | "notebook" | "backup";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const isQuestionList = (value: unknown) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item) => isRecord(item) && "type" in item);

/** Returns the most likely format, or `null` when nothing matches. */
export function detectImportKind(data: unknown): ImportKind | null {
  if (Array.isArray(data)) return isQuestionList(data) ? "questions" : null;
  if (!isRecord(data)) return null;

  // Full library backup — the only format with a `decks` array.
  if (Array.isArray(data.decks)) return "backup";

  // Notebook bundle exported from the Notes section.
  if (data.format === "knowly-notebook" || (isRecord(data.notebook) && Array.isArray(data.pages))) {
    return "notebook";
  }

  // Courses and modules may arrive wrapped in { course: … } / { module: … }.
  const course = isRecord(data.course) ? data.course : data;
  if (
    isRecord(course) &&
    Array.isArray(course.modules) &&
    course.modules.some((module) => isRecord(module) && Array.isArray(module.lessons))
  ) {
    return "course";
  }

  const mod = isRecord(data.module) ? data.module : data;
  if (isRecord(mod) && Array.isArray(mod.blocks) && "title" in mod) return "module";

  const deck = isRecord(data.deck) ? data.deck : data;
  if (isRecord(deck) && Array.isArray(deck.questions)) {
    return typeof deck.title === "string" && deck.title.trim() ? "deck" : "questions";
  }

  if (Array.isArray(data.questions)) return "questions";

  // A backup that lost its decks list still carries the app state markers.
  if (isRecord(data.settings) || Array.isArray(data.courses) || Array.isArray(data.modules)) {
    return "backup";
  }

  return null;
}
