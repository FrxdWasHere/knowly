import type { CSSProperties, ReactNode } from "react";

/**
 * Cover designs for the paper themes.
 *
 * Each paper theme (the one chosen in "Paper theme") owns a cover: its own
 * surface, its own ink, and its own ornament. The important part is `dark`:
 * colours are never assumed. Light covers (lab report, newspaper, manuscript,
 * comic, botanical, workbook) print dark ink; dark covers (classic, module,
 * field notes, blueprint, terminal) print light ink. Nothing here can produce
 * white body text on white paper.
 *
 * Everything is CSS + inline SVG, so covers stay offline and vector.
 */

export interface CoverDesign {
  /** true when the cover prints light ink on a dark surface */
  dark: boolean;
  /** full background paint for the cover sheet */
  surface: string;
  /** primary cover ink */
  ink: string;
  /** secondary ink for meta lines, captions, counts */
  muted: string;
  /** hairline frames, rules and borders */
  line: string;
  /** translucent chip / tile fill that works on this surface */
  fill: string;
}

const mix = (a: string, pct: number, b: string) => `color-mix(in oklab, ${a} ${pct}%, ${b})`;

/** Light covers share one dark reading palette; only the surface differs. */
const lightInk = {
  ink: "#1b2430",
  muted: "#5d6b78",
  line: "rgba(27, 36, 48, 0.24)",
  fill: "rgba(27, 36, 48, 0.06)",
} as const;

export function coverDesign(themeId: string | undefined, accent: string): CoverDesign {
  switch (themeId) {
    /* ---- dark covers ------------------------------------------------- */
    case "module":
      return {
        dark: true,
        surface: [
          `radial-gradient(120% 110% at 92% -10%, ${mix(accent, 70, "#ffffff")} 0%, transparent 58%)`,
          `linear-gradient(150deg, ${accent} 0%, ${mix(accent, 46, "#0d131b")} 58%, #0b1119 100%)`,
        ].join(", "),
        ink: "#ffffff",
        muted: "rgba(255, 255, 255, 0.74)",
        line: "rgba(255, 255, 255, 0.26)",
        fill: "rgba(255, 255, 255, 0.14)",
      };
    case "field-notes":
      return {
        dark: true,
        surface: [
          `radial-gradient(90% 80% at 0% 0%, ${mix(accent, 40, "#20261d")} 0%, transparent 60%)`,
          `linear-gradient(165deg, ${mix(accent, 18, "#2a2f26")} 0%, ${mix(
            accent,
            13,
            "#1d2119",
          )} 62%, ${mix(accent, 8, "#14170f")} 100%)`,
        ].join(", "),
        ink: "#f6f1e2",
        muted: "rgba(246, 241, 226, 0.72)",
        line: "rgba(246, 241, 226, 0.38)",
        fill: "rgba(246, 241, 226, 0.1)",
      };
    case "blueprint":
      return {
        dark: true,
        surface: [
          `linear-gradient(rgba(255, 255, 255, 0.09) 1px, transparent 1px)`,
          `linear-gradient(90deg, rgba(255, 255, 255, 0.09) 1px, transparent 1px)`,
          `linear-gradient(160deg, ${mix(accent, 32, "#10405f")} 0%, ${mix(
            accent,
            24,
            "#0a2a41",
          )} 55%, ${mix(accent, 16, "#06192a")} 100%)`,
        ].join(", "),
        ink: "#eaf4ff",
        muted: "rgba(234, 244, 255, 0.7)",
        line: "rgba(234, 244, 255, 0.34)",
        fill: "rgba(234, 244, 255, 0.12)",
      };
    case "terminal":
      return {
        dark: true,
        surface: [
          `repeating-linear-gradient(0deg, rgba(185, 255, 211, 0.06) 0 1px, transparent 1px 4px)`,
          `radial-gradient(120% 90% at 50% -10%, ${mix(accent, 34, "#050807")} 0%, transparent 62%)`,
          `linear-gradient(180deg, ${mix(accent, 10, "#0a1210")} 0%, ${mix(
            accent,
            7,
            "#050807",
          )} 100%)`,
        ].join(", "),
        ink: "#c9ffdf",
        muted: "rgba(201, 255, 223, 0.66)",
        line: "rgba(201, 255, 223, 0.3)",
        fill: "rgba(201, 255, 223, 0.1)",
      };

    /* ---- light covers ------------------------------------------------ */
    case "lab-report":
      return {
        dark: false,
        surface: [
          `linear-gradient(rgba(27, 36, 48, 0.07) 1px, transparent 1px)`,
          `linear-gradient(90deg, rgba(27, 36, 48, 0.07) 1px, transparent 1px)`,
          `linear-gradient(180deg, #ffffff 0%, ${mix(accent, 14, "#eef4f9")} 100%)`,
        ].join(", "),
        ...lightInk,
      };
    case "workbook":
      return {
        dark: false,
        surface: `linear-gradient(96deg, ${mix(accent, 12, "#ffffff")} 0%, #fffdf6 26%, #ffffff 100%)`,
        ...lightInk,
      };
    case "manuscript":
      return {
        dark: false,
        surface: `radial-gradient(80% 70% at 8% 4%, ${mix(accent, 10, "#fdf6e7")} 0%, transparent 55%), linear-gradient(160deg, ${mix(
          accent,
          10,
          "#fdf6e7",
        )} 0%, ${mix(accent, 16, "#f4e8cf")} 100%)`,
        ink: "#3b2f1c",
        muted: "#6b5836",
        line: "rgba(107, 88, 54, 0.45)",
        fill: "rgba(107, 88, 54, 0.09)",
      };
    case "newspaper":
      return {
        dark: false,
        surface: `linear-gradient(180deg, ${mix(accent, 6, "#fbf8f1")} 0%, ${mix(
          accent,
          9,
          "#f3eee2",
        )} 100%)`,
        ink: "#141414",
        muted: "#4b4b4b",
        line: "rgba(20, 20, 20, 0.34)",
        fill: "rgba(20, 20, 20, 0.05)",
      };
    case "comic":
      return {
        dark: false,
        surface: [
          `radial-gradient(${mix(accent, 25, "#ffffff")} 1.1px, transparent 1.2px)`,
          `linear-gradient(180deg, ${mix(accent, 8, "#fffdf2")} 0%, ${mix(
            accent,
            12,
            "#fff7e4",
          )} 100%)`,
        ].join(", "),
        ink: "#12100d",
        muted: "#4a443c",
        line: "rgba(18, 16, 13, 0.5)",
        fill: "rgba(18, 16, 13, 0.06)",
      };
    case "botanical":
      return {
        dark: false,
        surface: [
          `radial-gradient(70% 60% at 100% 0%, ${mix(accent, 16, "#f2f8ef")} 0%, transparent 60%)`,
          `radial-gradient(60% 50% at 0% 100%, ${mix(accent, 12, "#eef6ea")} 0%, transparent 58%)`,
          `linear-gradient(170deg, ${mix(accent, 8, "#f7fbf4")} 0%, ${mix(
            accent,
            12,
            "#e9f2e4",
          )} 100%)`,
        ].join(", "),
        ink: "#22301f",
        muted: "#5a6b54",
        line: "rgba(58, 74, 52, 0.34)",
        fill: "rgba(58, 74, 52, 0.07)",
      };

    /* ---- classic book (default) -------------------------------------- */
    case "classic":
    default:
      return {
        dark: true,
        surface: [
          `radial-gradient(140% 100% at 90% -20%, ${mix(accent, 45, "#ffffff")} 0%, transparent 52%)`,
          `linear-gradient(158deg, ${accent} 0%, ${mix(accent, 40, "#0a1322")} 60%, #091120 100%)`,
        ].join(", "),
        ink: "#ffffff",
        muted: "rgba(255, 255, 255, 0.72)",
        line: "rgba(255, 255, 255, 0.26)",
        fill: "rgba(255, 255, 255, 0.14)",
      };
  }
}

/** CSS custom properties the cover body reads for its type colours. */
export function coverVars(design: CoverDesign): CSSProperties {
  return {
    background: design.surface,
    color: design.ink,
    "--cover-ink": design.ink,
    "--cover-muted": design.muted,
    "--cover-line": design.line,
    "--cover-fill": design.fill,
  } as CSSProperties;
}

/* ------------------------------------------------------------------ *
 * Ornaments — one per theme, drawn behind the cover copy
 * ------------------------------------------------------------------ */

function Frame({ inset, color }: { inset: number; color: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{ inset, border: `1px solid ${color}` }}
    />
  );
}

export function CoverOrnament({
  theme,
  padX,
  accent,
  design,
}: {
  theme: string | undefined;
  padX: number;
  accent: string;
  design: CoverDesign;
}) {
  const inset = Math.round(padX * 0.55);
  const corners = (
    <>
      <Frame inset={inset} color={design.line} />
      <Frame inset={inset + 7} color={design.dark ? "rgba(255,255,255,0.12)" : "rgba(27,36,48,0.12)"} />
    </>
  );

  const ornaments: Record<string, ReactNode> = {
    classic: (
      <>
        {corners}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 h-px -translate-x-1/2"
          style={{ top: inset + 34, width: "18%", background: design.line }}
        />
      </>
    ),

    module: (
      <>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0"
          style={{
            top: "38%",
            height: 1.5,
            background: `linear-gradient(90deg, transparent, ${design.ink}, transparent)`,
            opacity: 0.35,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            right: -inset * 2,
            bottom: -inset * 3,
            width: "58%",
            aspectRatio: "1",
            border: `1px solid ${design.line}`,
            opacity: 0.5,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: 0,
            top: 0,
            width: 10,
            height: "34%",
            background: accent,
            opacity: 0.9,
          }}
        />
      </>
    ),

    "field-notes": (
      <>
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            inset,
            border: `1.5px dashed ${design.line}`,
            borderRadius: 6,
          }}
        />
        {/* masking tape, top-left and bottom-right */}
        {[
          { top: inset - 6, left: inset - 18, angle: -12 },
          { bottom: inset - 6, right: inset - 18, angle: -12 },
        ].map(({ angle, ...position }, index) => (
          <div
            key={index}
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              ...position,
              width: 96,
              height: 26,
              background: "rgba(246, 241, 226, 0.28)",
              transform: `rotate(${angle}deg)`,
            }}
          />
        ))}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(${design.line} 1px, transparent 1px)`,
            backgroundSize: "22px 22px",
            opacity: 0.5,
          }}
        />
      </>
    ),

    "lab-report": (
      <>
        {corners}
        {/* crop marks */}
        {[
          "top-left",
          "top-right",
          "bottom-left",
          "bottom-right",
        ].map((corner) => (
          <div key={corner} aria-hidden className="pointer-events-none absolute" style={{ inset: 16 }}>
            <div
              style={{
                position: "absolute",
                width: 14,
                height: 1,
                background: design.line,
                top: corner.startsWith("top") ? 0 : "100%",
                left: corner.endsWith("left") ? 0 : "100%",
              }}
            />
            <div
              style={{
                position: "absolute",
                width: 1,
                height: 14,
                background: design.line,
                top: corner.startsWith("top") ? 0 : "100%",
                left: corner.endsWith("left") ? 0 : "100%",
              }}
            />
          </div>
        ))}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: inset,
            bottom: inset + 6,
            fontSize: 9,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: design.muted,
          }}
        >
          Specimen sheet
        </div>
      </>
    ),

    workbook: (
      <>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0"
          style={{ width: 14, background: accent, opacity: 0.85 }}
        />
        {[0.24, 0.56, 0.88].map((top) => (
          <div
            key={top}
            aria-hidden
            className="pointer-events-none absolute rounded-full"
            style={{
              left: 30,
              top: `${top * 100}%`,
              width: 13,
              height: 13,
              border: `1px solid ${design.line}`,
              background: "#ffffff",
            }}
          />
        ))}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(180deg, transparent 0 33px, ${design.line} 34px)`,
            opacity: 0.35,
          }}
        />
      </>
    ),

    blueprint: (
      <>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: design.surface, backgroundSize: "26px 26px, 26px 26px, auto" }}
        />
        {corners}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: inset,
            right: inset,
            bottom: inset + 26,
            borderTop: `1px dashed ${design.line}`,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: "50%",
            bottom: inset + 20,
            width: 1,
            height: 12,
            background: design.line,
          }}
        />
      </>
    ),

    manuscript: (
      <>
        <Frame inset={inset} color={design.line} />
        <Frame inset={inset + 5} color={design.line} />
        {[
          { top: inset + 16, left: inset + 16 },
          { top: inset + 16, right: inset + 16 },
          { bottom: inset + 16, left: inset + 16 },
          { bottom: inset + 16, right: inset + 16 },
        ].map((position, index) => (
          <span
            key={index}
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              ...position,
              width: 7,
              height: 7,
              transform: "rotate(45deg)",
              border: `1px solid ${design.line}`,
            }}
          />
        ))}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0"
          style={{ top: "31%", height: 1, background: design.line, opacity: 0.5 }}
        />
      </>
    ),

    newspaper: (
      <>
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{ left: inset, right: inset, top: inset + 16, height: 3, background: design.line }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{ left: inset, right: inset, top: inset + 23, height: 1, background: design.line }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: "50%",
            top: "38%",
            bottom: inset,
            width: 1,
            background: design.line,
            opacity: 0.45,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            right: inset,
            top: inset + 34,
            fontSize: 8.5,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: design.muted,
          }}
        >
          Vol. I
        </div>
      </>
    ),

    comic: (
      <>
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{ inset: 16, border: `3px solid ${design.ink}` }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(${design.line} 1.4px, transparent 1.5px)`,
            backgroundSize: "12px 12px",
            opacity: 0.4,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            right: -20,
            top: 44,
            width: 150,
            height: 74,
            background: accent,
            clipPath:
              "polygon(50% 0%, 61% 18%, 82% 6%, 79% 30%, 100% 34%, 84% 51%, 100% 68%, 78% 71%, 82% 95%, 60% 82%, 50% 100%, 40% 82%, 18% 95%, 22% 71%, 0% 68%, 16% 51%, 0% 34%, 21% 30%, 18% 6%, 39% 18%)",
            opacity: 0.85,
          }}
        />
      </>
    ),

    botanical: (
      <>
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: -inset,
            bottom: -inset,
            width: "46%",
            aspectRatio: "1",
            borderRadius: "0 100% 0 0",
            background: mix(accent, 18, "#ffffff"),
            opacity: 0.5,
          }}
        />
        <svg
          aria-hidden
          viewBox="0 0 120 120"
          className="pointer-events-none absolute"
          style={{ right: inset, top: inset, width: "22%", opacity: 0.55 }}
        >
          <g fill="none" stroke={design.line} strokeWidth="1.6">
            <path d="M60 112C60 70 60 40 60 8" />
            {/* accent may be a var() or a color-mix(), so a hex suffix would be
                invalid here — mix with transparent instead */}
            <path d="M60 44c-14-2-24-12-26-26 14 2 24 12 26 26z" fill={mix(accent, 22, "transparent")} />
            <path d="M60 62c14-2 24-12 26-26-14 2-24 12-26 26z" fill={mix(accent, 22, "transparent")} />
            <path d="M60 84c-12-2-20-10-22-22 12 2 20 10 22 22z" fill={mix(accent, 22, "transparent")} />
          </g>
        </svg>
      </>
    ),

    terminal: (
      <>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(180deg, rgba(201,255,223,0.05) 0 1px, transparent 1px 3px)`,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute font-mono"
          style={{
            left: inset,
            top: inset,
            right: inset,
            bottom: inset,
            border: `1px solid ${design.line}`,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute font-mono"
          style={{
            left: inset + 12,
            bottom: inset + 10,
            fontSize: 10,
            letterSpacing: "0.18em",
            color: design.muted,
          }}
        >
          ~/knowly $ _
        </div>
      </>
    ),
  };

  return (
    <div aria-hidden className="cover-ornament pointer-events-none absolute inset-0 overflow-hidden">
      {ornaments[theme ?? "classic"] ?? ornaments.classic}
    </div>
  );
}
