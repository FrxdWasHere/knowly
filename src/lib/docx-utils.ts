/**
 * Shared utilities for DOCX export pipeline.
 * Extracted to eliminate duplication between course-docx.ts and exam-docx.ts
 */

import { ShadingType, TextRun, type ITextStyleOptions } from "docx";

const GRAY_LIGHT = "94A3B8";

/**
 * `rgb(12, 34, 56)` and `color(srgb 0.1 0.2 0.3)` → `0C2238`.
 * Converts computed CSS colors to hex for use in docx library.
 */
export function computedColorToHex(value: string): string | null {
  const toHex = (channel: number) =>
    Math.max(0, Math.min(255, Math.round(channel)))
      .toString(16)
      .padStart(2, "0");

  // Handle rgb() and rgba()
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(value);
  if (rgb) {
    const [r, g, b] = rgb[1]!
      .split(/[,\s/]+/)
      .filter(Boolean)
      .map(Number);
    if ([r, g, b].some((channel) => !Number.isFinite(channel))) return null;
    return `${toHex(r!)}${toHex(g!)}${toHex(b!)}`.toUpperCase();
  }

  // Handle color(srgb ...)
  const srgb = /^color\(\s*srgb\s+([^)]+)\)$/i.exec(value);
  if (srgb) {
    const parts = srgb[1]!.trim().split(/\s+/).map(Number);
    if (parts.length < 3 || parts.some((channel) => !Number.isFinite(channel))) return null;
    return `${toHex(parts[0]! * 255)}${toHex(parts[1]! * 255)}${toHex(parts[2]! * 255)}`.toUpperCase();
  }

  return null;
}

/**
 * docx rejects anything but a six-digit hex colour, and every identity colour in
 * this app is a CSS token (`var(--deck-3)`) or a `color-mix()`. Resolve those to
 * real channels through the browser before they reach a shading or a text run.
 */
export function resolveHex(color: string | undefined, fallback = "3B5BDB"): string {
  const raw = (color ?? "").trim();
  if (!raw) return fallback;

  // Handle shorthand hex
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(raw);
  if (short)
    return `${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toUpperCase();

  // Handle full hex
  const full = /^#([0-9a-f]{6})$/i.exec(raw);
  if (full) return full[1]!.toUpperCase();

  // Handle bare hex (no #)
  const bare = /^([0-9a-f]{6})$/i.exec(raw);
  if (bare) return bare[1]!.toUpperCase();

  // Try to resolve via DOM if available
  if (typeof document === "undefined") return fallback;
  const probe = document.createElement("span");
  probe.style.color = raw;
  if (!probe.style.color) return fallback;

  probe.style.display = "none";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  return computedColorToHex(computed) ?? fallback;
}

/**
 * Blend a hex color toward white — used for callout fills.
 */
export function tint(color: string, amount: number): string {
  const value = resolveHex(color);
  const mixed = (index: number) => {
    const channel = parseInt(value.slice(index, index + 2), 16);
    return Math.round(channel + (255 - channel) * amount)
      .toString(16)
      .padStart(2, "0");
  };
  return `${mixed(0)}${mixed(2)}${mixed(4)}`;
}

/**
 * Convert pixels to twips (1/20th of a point)
 * Used for docx measurements.
 */
export const px = (value: number) => Math.round(value * 15);

/**
 * Callout tone definitions for different callout types
 */
export interface CalloutTone {
  from: string;
  label: string;
  border: string;
}

export const CALLOUT_TONES: Record<string, CalloutTone> = {
  info: { from: "334155", label: "0F172A", border: GRAY_LIGHT },
  tip: { from: "334155", label: "0F172A", border: GRAY_LIGHT },
  warning: { from: "B45309", label: "92400E", border: "F59E0B" },
  definition: { from: "2563EB", label: "1E3A8A", border: "3B82F6" },
  example: { from: "059669", label: "065F46", border: "10B981" },
};

export interface FlowStyle {
  /** shading fill applied to plain paragraphs (callout bodies) */
  fill?: string;
  borderColor?: string;
  italics?: boolean;
}

export interface Shading {
  type: typeof ShadingType.CLEAR;
  fill: string;
}

export interface BorderLeft {
  left: { style: string; size: number; color: string; space: number };
}

/**
 * Create a text run with common styling.
 * Useful for consistent formatting across the document.
 */
export function styledRun(
  text: string,
  options: ITextStyleOptions = {},
): TextRun {
  return new TextRun({
    text,
    ...options,
  });
}
