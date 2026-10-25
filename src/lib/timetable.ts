/**
 * Weekly class timetable. Classes repeat every week — no dates, just a day
 * slot. Fully local: it lives in the same state blob as the rest of the app.
 */

export interface TimetableSlot {
  id: string;
  /** 0 = Monday … 6 = Sunday */
  day: number;
  /** "HH:MM", 24-hour */
  start: string;
  end: string;
  title: string;
  subject?: string;
  room?: string;
  teacher?: string;
  /** optional studying hooks */
  deckId?: string;
  courseId?: string;
  /** deck colour token (var(--deck-N)) so rows match the linked material */
  color?: string;
}

/** Monday-first labels. */
export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/**
 * Maps JavaScript's getDay() (0 = Sunday) to the Monday-first index used
 * everywhere in the timetable.
 */
export function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** "09:30" → 570. Invalid inputs fall back to 0. */
export function toMinutes(value: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value ?? "");
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** 570 → "09:30" */
export function fromMinutes(total: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(total)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Friendly "2:30 pm" style rendering. */
export function prettyTime(value: string): string {
  const minutes = toMinutes(value);
  if (!minutes && value !== "00:00") return value;
  const h24 = Math.floor(minutes / 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const suffix = h24 < 12 ? "am" : "pm";
  return `${h12}:${String(minutes % 60).padStart(2, "0")} ${suffix}`;
}

export function slotMinutes(slot: TimetableSlot): number {
  return Math.max(0, toMinutes(slot.end) - toMinutes(slot.start));
}

/** Sorts slots by day, then start time. */
export function sortSlots(slots: TimetableSlot[]): TimetableSlot[] {
  return [...slots].sort((a, b) => a.day - b.day || toMinutes(a.start) - toMinutes(b.start));
}

export function slotsForDay(slots: TimetableSlot[], day: number): TimetableSlot[] {
  return sortSlots(slots.filter((s) => s.day === day));
}

/** The class happening right now, or the next one coming up. */
export function currentSlot(
  slots: TimetableSlot[],
  now: { day: number; minutes: number },
): { slot: TimetableSlot; kind: "now" | "next" } | null {
  const today = slotsForDay(slots, now.day);
  const nowSlot = today.find(
    (s) => toMinutes(s.start) <= now.minutes && toMinutes(s.end) > now.minutes,
  );
  if (nowSlot) return { slot: nowSlot, kind: "now" };
  const upcoming = today.find((s) => toMinutes(s.start) > now.minutes);
  if (upcoming) return { slot: upcoming, kind: "next" };
  // wrap to the rest of the week
  for (let offset = 1; offset <= 7; offset++) {
    const day = (now.day + offset) % 7;
    const first = slotsForDay(slots, day)[0];
    if (first) return { slot: first, kind: "next" };
  }
  return null;
}

/** How many hours of class a week, roughly. */
export function totalHours(slots: TimetableSlot[]): number {
  const minutes = slots.reduce((sum, s) => sum + slotMinutes(s), 0);
  return Math.round((minutes / 60) * 10) / 10;
}
