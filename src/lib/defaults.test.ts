import { describe, expect, it } from "vitest";
import { stemFlagsForSubject } from "./defaults";

describe("stemFlagsForSubject", () => {
  it("stays neutral for an empty or missing subject", () => {
    expect(stemFlagsForSubject("")).toEqual({
      isSTEM: false,
      needsEquations: false,
      needsGraphs: false,
    });
    expect(stemFlagsForSubject("   ")).toEqual({
      isSTEM: false,
      needsEquations: false,
      needsGraphs: false,
    });
    expect(stemFlagsForSubject(undefined)).toEqual({
      isSTEM: false,
      needsEquations: false,
      needsGraphs: false,
    });
  });

  it("stays neutral for a humanities subject", () => {
    expect(stemFlagsForSubject("History")).toEqual({
      isSTEM: false,
      needsEquations: false,
      needsGraphs: false,
    });
    expect(stemFlagsForSubject("Literature")).toEqual({
      isSTEM: false,
      needsEquations: false,
      needsGraphs: false,
    });
    expect(stemFlagsForSubject("Law")).toEqual({
      isSTEM: false,
      needsEquations: false,
      needsGraphs: false,
    });
  });

  it("marks physics, chemistry and maths as equations work", () => {
    for (const subject of ["Physics", "Chemistry", "Mathematics", "Further Maths"]) {
      const flags = stemFlagsForSubject(subject);
      expect(flags, subject).toEqual({ isSTEM: true, needsEquations: true, needsGraphs: true });
    }
  });

  it("matches case-insensitively and inside longer subject names", () => {
    expect(stemFlagsForSubject("ap physics c").isSTEM).toBe(true);
    expect(stemFlagsForSubject("Grade 11 Chemistry").needsEquations).toBe(true);
    expect(stemFlagsForSubject("mathematics extension 2").needsEquations).toBe(true);
  });

  it("asks biology for graphs but not for equations", () => {
    expect(stemFlagsForSubject("Biology")).toEqual({
      isSTEM: true,
      needsEquations: false,
      needsGraphs: true,
    });
  });

  it("treats computer science as equations work without asking for graphs", () => {
    expect(stemFlagsForSubject("Computer Science")).toEqual({
      isSTEM: true,
      needsEquations: true,
      needsGraphs: false,
    });
  });
});
