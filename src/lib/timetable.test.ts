import { describe, expect, it } from "vitest";
import {
  currentSlot,
  fromMinutes,
  prettyTime,
  slotMinutes,
  slotsForDay,
  sortSlots,
  toMinutes,
  totalHours,
} from "./timetable";
import type { TimetableSlot } from "./timetable";

const slot = (over: Partial<TimetableSlot>): TimetableSlot => ({
  id: "s",
  day: 0,
  start: "09:00",
  end: "10:00",
  title: "Class",
  ...over,
});

describe("time helpers", () => {
  it("round-trips minutes", () => {
    expect(toMinutes("09:30")).toBe(570);
    expect(fromMinutes(570)).toBe("09:30");
    expect(fromMinutes(24 * 60 + 5)).toBe("23:59");
  });

  it("renders 12-hour times", () => {
    expect(prettyTime("09:30")).toBe("9:30 am");
    expect(prettyTime("13:05")).toBe("1:05 pm");
    expect(prettyTime("00:00")).toBe("12:00 am");
  });
});

describe("slot helpers", () => {
  it("sorts by day then start time", () => {
    const sorted = sortSlots([
      slot({ start: "13:00", end: "14:00" }),
      slot({ start: "09:00", end: "10:00" }),
      slot({ day: 1, start: "08:00", end: "09:00" }),
    ]);
    expect(sorted.map((s) => s.start)).toEqual(["09:00", "13:00", "08:00"]);
  });

  it("filters per day", () => {
    const slots = [
      slot({ id: "a", day: 0 }),
      slot({ id: "b", day: 2 }),
      slot({ id: "c", day: 0, start: "11:00", end: "12:00" }),
    ];
    expect(slotsForDay(slots, 0).map((s) => s.id)).toEqual(["a", "c"]);
  });

  it("computes durations and weekly hours", () => {
    expect(slotMinutes(slot({ start: "09:00", end: "10:30" }))).toBe(90);
    expect(
      totalHours([slot({ start: "09:00", end: "10:30" }), slot({ start: "10:00", end: "11:00" })]),
    ).toBe(2.5);
  });
});

describe("currentSlot", () => {
  it("checks the class happening right now", () => {
    const slots = [slot({ start: "09:00", end: "10:00" })];
    expect(currentSlot(slots, { day: 0, minutes: toMinutes("09:30") })).toMatchObject({
      kind: "now",
    });
  });

  it("finds the next class later the same day", () => {
    const slots = [slot({ start: "13:00", end: "14:00" })];
    expect(currentSlot(slots, { day: 0, minutes: toMinutes("09:30") })).toMatchObject({
      kind: "next",
    });
  });

  it("wraps into next week's first class", () => {
    const slots = [slot({ day: 2, start: "09:00", end: "10:00" })];
    const result = currentSlot(slots, { day: 6, minutes: toMinutes("12:00") });
    expect(result?.slot.day).toBe(2);
    expect(result?.kind).toBe("next");
  });

  it("returns null with an empty timetable", () => {
    expect(currentSlot([], { day: 0, minutes: 600 })).toBeNull();
  });
});
