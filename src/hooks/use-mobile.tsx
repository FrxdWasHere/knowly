import { useEffect, useState } from "react";

/**
 * True on touch-first devices. Used to skip desktop-only affordances such as
 * auto-focusing text inputs (which would pop the keyboard on every question).
 * All authenticated routes render client-side, so `window` is always defined.
 */
export function useCoarsePointer() {
  const [coarse, setCoarse] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  );

  useEffect(() => {
    const mql = window.matchMedia("(pointer: coarse)");
    const onChange = () => setCoarse(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return coarse;
}
