import { Math as DocxMath } from "docx";
import { latexToMath } from "docx/math";

/** Convert LaTeX into an editable Office Math equation for Word. */
export function latexToDocxMath(source: string): DocxMath {
  return new DocxMath({ children: latexToMath(source) });
}
