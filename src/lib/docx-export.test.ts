import { inflateRawSync } from "node:zlib";
import { defaultCoursePrintOptions } from "@/components/print/course-paper";
import { defaultExamOptions } from "@/lib/exam-print";
import type { Course, Module, Question } from "@/lib/types";
import { describe, expect, it } from "vitest";
import { courseDocxBlob, examDocxBlob, moduleDocxBlob } from "./docx-export";

function readZipText(buffer: ArrayBuffer, target: string): string {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  for (let offset = 0; offset + 46 <= bytes.length;) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      offset++;
      continue;
    }

    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));

    if (name === target) {
      const method = view.getUint16(offset + 10, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const localOffset = view.getUint32(offset + 42, true);
      const dataOffset =
        localOffset +
        30 +
        view.getUint16(localOffset + 26, true) +
        view.getUint16(localOffset + 28, true);
      const compressed = bytes.subarray(dataOffset, dataOffset + compressedSize);
      const data = method === 0 ? compressed : inflateRawSync(compressed);

      return new TextDecoder().decode(data);
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }

  throw new Error(`DOCX entry not found: ${target}`);
}

describe("DOCX answer key equations", () => {
  const question = {
    id: "equation",
    type: "short-answer",
    question: "Solve $x^2$.",
    answer: "$\\frac{1}{2}$",
    explanation: "Use $y_1$.",
    difficulty: "easy",
  } satisfies Question;

  it("writes question, answer, and explanation math as native Word equations", async () => {
    const options = {
      ...defaultExamOptions("Math quiz $z^3$"),
      subject: "$a_1$",
      instructions: "Use $b^2$.",
      headerText: "Quiz header $q^4$",
      footerText: "Footnote $t_2$",
      showNameLines: false,
      printStyle: "friendly" as const,
    };
    const blob = await examDocxBlob("Math quiz", [question], options, defaultCoursePrintOptions);

    const documentXml = readZipText(await blob.arrayBuffer(), "word/document.xml");
    const headerXml = readZipText(await blob.arrayBuffer(), "word/header1.xml");
    const footerXml = readZipText(await blob.arrayBuffer(), "word/footer1.xml");

    expect(documentXml.match(/<m:oMath>/g)).toHaveLength(6);
    expect(headerXml.match(/<m:oMath>/g)).toHaveLength(1);
    expect(footerXml.match(/<m:oMath>/g)).toHaveLength(1);
    expect(documentXml).toContain("<m:f>");
    expect(documentXml).toContain("<m:sSup>");
    expect(documentXml).toContain("<m:sSub>");
    expect(documentXml).not.toContain("[LaTeX:");
  });

  it("writes course and module answer-key math as native Word equations", async () => {
    const courseModule = {
      id: "unit",
      title: "Unit",
      objectives: [],
      lessons: [
        {
          id: "lesson",
          title: "Lesson",
          objectives: [],
          blocks: [],
          questions: [question],
          linkedDeckIds: [],
        },
      ],
      linkedDeckIds: [],
    } satisfies Course["modules"][number];
    const course = {
      id: "course",
      title: "Course",
      subject: "Math",
      color: "#123456",
      tags: [],
      objectives: [],
      sources: [],
      modules: [courseModule],
      linkedDeckIds: [],
      createdAt: 0,
      updatedAt: 0,
    } satisfies Course;
    const module = {
      id: "module",
      title: "Module",
      subject: "Math",
      color: "#123456",
      emoji: "📘",
      tags: [],
      isSTEM: true,
      needsEquations: true,
      needsGraphs: false,
      objectives: [],
      blocks: [],
      questions: [question],
      linkedDeckIds: [],
      estimatedMinutes: 10,
      difficulty: 1,
      createdAt: 0,
      updatedAt: 0,
    } satisfies Module;
    const courseOptions = {
      ...defaultCoursePrintOptions,
      includeCover: false,
      includeToc: false,
      includeNotes: false,
      printStyle: "friendly" as const,
    };
    const moduleOptions = {
      ...defaultCoursePrintOptions,
      includeTitlePage: false,
      includeNotes: false,
      printStyle: "friendly" as const,
    };

    const courseBlob = await courseDocxBlob(course, undefined, [], courseOptions);
    const moduleBlob = await moduleDocxBlob(module, [], undefined, moduleOptions);
    const courseXml = readZipText(await courseBlob.arrayBuffer(), "word/document.xml");
    const moduleXml = readZipText(await moduleBlob.arrayBuffer(), "word/document.xml");

    expect(courseXml.match(/<m:oMath>/g)).toHaveLength(3);
    expect(moduleXml.match(/<m:oMath>/g)).toHaveLength(3);
    expect(courseXml).not.toContain("[LaTeX:");
    expect(moduleXml).not.toContain("[LaTeX:");
  });
});
