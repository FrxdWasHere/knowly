import { getStroke } from "perfect-freehand";

import type {
  ImageElement,
  NoteElement,
  NotePage,
  PageTemplate,
  ShapeElement,
  StrokeElement,
  TextElement,
} from "./types";
import { clampTemplateOpacity } from "./types";
import { readableOn } from "@/lib/themes";

const imageCache = new Map<string, HTMLImageElement>();

/** Read a themed CSS variable (scene canvases must follow the active theme). */
function themeVar(name: string) {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Resolve an arbitrary CSS color (including color-mix / var references) into a
 * concrete canvas color by round-tripping it through fillStyle. If the browser
 * can't parse it, the fallback stays in place and is returned instead.
 */
function canvasColor(ctx: CanvasRenderingContext2D, raw: string, fallback: string) {
  ctx.fillStyle = fallback;
  if (raw) ctx.fillStyle = raw;
  return String(ctx.fillStyle);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached?.complete) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      imageCache.set(src, image);
      resolve(image);
    };
    image.onerror = reject;
    image.src = src;
  });
}

export function drawTemplate(
  ctx: CanvasRenderingContext2D,
  template: PageTemplate,
  width: number,
  height: number,
  opacity = 1,
) {
  const paper = canvasColor(ctx, themeVar("--card"), "#fffefa");
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, opacity));
  const inkFaint = canvasColor(
    ctx,
    "color-mix(in oklab, var(--foreground) 62%, transparent)",
    "rgba(0, 0, 0, 0.75)",
  );
  const inkStrong = canvasColor(
    ctx,
    "color-mix(in oklab, var(--foreground) 88%, transparent)",
    "rgba(0, 0, 0, 1)",
  );
  const inkLabel = canvasColor(
    ctx,
    "color-mix(in oklab, var(--foreground) 55%, var(--card))",
    "#6b7280",
  );
  ctx.strokeStyle = inkFaint;
  ctx.fillStyle = inkFaint;
  ctx.lineWidth = 1;

  const margin = 64;
  const line = 34;

  if (template === "lined" || template === "cornell") {
    for (let y = margin + 48; y < height - margin; y += line) {
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(width - margin, y);
      ctx.stroke();
    }
    if (template === "cornell") {
      ctx.beginPath();
      ctx.moveTo(width * 0.3, margin);
      ctx.lineTo(width * 0.3, height - margin);
      ctx.moveTo(margin, height * 0.72);
      ctx.lineTo(width - margin, height * 0.72);
      ctx.stroke();
      ctx.font = "600 13px system-ui, sans-serif";
      ctx.fillStyle = inkLabel;
      ctx.fillText("CUES", margin + 10, margin + 22);
      ctx.fillText("NOTES", width * 0.3 + 16, margin + 22);
      ctx.fillText("SUMMARY", margin + 10, height * 0.72 + 22);
      ctx.fillStyle = inkFaint;
    }
  } else if (template === "grid" || template === "graph") {
    const step = template === "graph" ? 24 : 32;
    for (let x = margin; x < width - margin; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, margin);
      ctx.lineTo(x, height - margin);
      ctx.stroke();
    }
    for (let y = margin; y < height - margin; y += step) {
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(width - margin, y);
      ctx.stroke();
    }
    if (template === "graph") {
      ctx.strokeStyle = inkStrong;
      ctx.lineWidth = 1.4;
      for (let x = margin; x < width - margin; x += step * 5) {
        ctx.beginPath();
        ctx.moveTo(x, margin);
        ctx.lineTo(x, height - margin);
        ctx.stroke();
      }
      for (let y = margin; y < height - margin; y += step * 5) {
        ctx.beginPath();
        ctx.moveTo(margin, y);
        ctx.lineTo(width - margin, y);
        ctx.stroke();
      }
    }
  } else if (template === "dotted") {
    for (let x = margin; x < width - margin; x += 28) {
      for (let y = margin; y < height - margin; y += 28) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (template === "checklist") {
    for (let y = margin + 34; y < height - margin; y += 44) {
      ctx.strokeRect(margin, y - 11, 16, 16);
      ctx.beginPath();
      ctx.moveTo(margin + 36, y);
      ctx.lineTo(width - margin, y);
      ctx.stroke();
    }
  } else if (template === "music") {
    for (let y = margin + 48; y < height - margin; y += 52) {
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.moveTo(margin, y + i * 10);
        ctx.lineTo(width - margin, y + i * 10);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: StrokeElement) {
  if (stroke.points.length < 6) return;
  const points: [number, number, number][] = [];
  for (let i = 0; i < stroke.points.length; i += 3) {
    points.push([stroke.points[i], stroke.points[i + 1], stroke.points[i + 2] ?? 0.5]);
  }
  const outline = getStroke(points, {
    size: stroke.width,
    thinning: stroke.tool === "highlighter" ? 0 : 0.55,
    smoothing: 0.55,
    streamline: 0.5,
    simulatePressure: stroke.tool !== "highlighter",
    last: true,
  });
  if (outline.length < 3) return;
  ctx.save();
  ctx.globalAlpha = stroke.opacity;
  ctx.fillStyle = stroke.color;
  if (stroke.tool === "highlighter") ctx.globalCompositeOperation = "multiply";
  ctx.beginPath();
  ctx.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i += 1) {
    ctx.lineTo(outline[i][0], outline[i][1]);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawText(ctx: CanvasRenderingContext2D, element: TextElement) {
  ctx.save();
  ctx.fillStyle = element.color;
  ctx.font = `${element.italic ? "italic " : ""}${element.bold ? "700 " : "400 "}${element.fontSize}px system-ui, sans-serif`;
  ctx.textAlign = element.align ?? "left";
  const x =
    element.align === "center"
      ? element.x + element.width / 2
      : element.align === "right"
        ? element.x + element.width
        : element.x;
  const lineHeight = element.fontSize * 1.42;
  let y = element.y + element.fontSize;
  for (const paragraph of element.text.split("\n")) {
    const words = paragraph.split(/\s+/);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > element.width && line) {
        ctx.fillText(line, x, y);
        y += lineHeight;
        line = word;
      } else {
        line = next;
      }
    }
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  ctx.restore();
}

function drawElement(ctx: CanvasRenderingContext2D, element: NoteElement) {
  if (element.type === "stroke") {
    drawStroke(ctx, element);
  } else if (element.type === "text") {
    drawText(ctx, element);
  } else if (element.type === "sticky") {
    ctx.save();
    ctx.fillStyle = element.color;
    ctx.shadowColor = canvasColor(
      ctx,
      "color-mix(in oklab, var(--foreground) 18%, transparent)",
      "rgba(30, 40, 60, 0.18)",
    );
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    roundRect(ctx, element.x, element.y, element.width, element.height, 8);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = readableOn(element.color);
    ctx.font = "500 16px system-ui, sans-serif";
    const words = element.text.split(/\s+/);
    let line = "";
    let y = element.y + 26;
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > element.width - 24 && line) {
        ctx.fillText(line, element.x + 12, y);
        y += 21;
        line = word;
      } else {
        line = next;
      }
    }
    ctx.fillText(line, element.x + 12, y);
    ctx.restore();
  } else if (element.type === "tape") {
    ctx.save();
    ctx.globalAlpha = element.revealed ? 0.28 : 0.94;
    ctx.fillStyle = element.color;
    roundRect(ctx, element.x, element.y, element.width, element.height, 6);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (element.revealed) {
      ctx.fillStyle = readableOn(element.color);
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.fillText("revealed", element.x + 8, element.y + 18);
    }
    ctx.restore();
  } else if (element.type === "shape") {
    drawShape(ctx, element);
  } else if (element.type === "image") {
    const image = imageCache.get(element.src);
    if (image?.complete) {
      ctx.drawImage(image, element.x, element.y, element.width, element.height);
    }
  } else if (element.type === "audio") {
    ctx.save();
    ctx.fillStyle = canvasColor(
      ctx,
      "color-mix(in oklab, var(--primary) 14%, var(--card))",
      "#eef2ff",
    );
    ctx.strokeStyle = canvasColor(
      ctx,
      "color-mix(in oklab, var(--primary) 45%, var(--card))",
      "#c7d2fe",
    );
    roundRect(ctx, element.x, element.y, element.width, element.height, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = canvasColor(ctx, themeVar("--foreground"), "#1f2937");
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillText(`♪ ${element.label}`, element.x + 12, element.y + 26);
    ctx.restore();
  }
}

function drawShape(ctx: CanvasRenderingContext2D, element: ShapeElement) {
  ctx.save();
  ctx.strokeStyle = element.stroke;
  ctx.fillStyle = element.fill ?? "transparent";
  ctx.lineWidth = element.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (element.shape === "rect") {
    ctx.beginPath();
    ctx.rect(element.x, element.y, element.width, element.height);
    if (element.fill) ctx.fill();
    ctx.stroke();
  } else if (element.shape === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(
      element.x + element.width / 2,
      element.y + element.height / 2,
      Math.abs(element.width / 2),
      Math.abs(element.height / 2),
      0,
      0,
      Math.PI * 2,
    );
    if (element.fill) ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(element.x, element.y);
    const x2 = element.x + element.width;
    const y2 = element.y + element.height;
    ctx.lineTo(x2, y2);
    ctx.stroke();
    if (element.shape === "arrow") {
      const angle = Math.atan2(y2 - element.y, x2 - element.x);
      const size = 14;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - size * Math.cos(angle - Math.PI / 6),
        y2 - size * Math.sin(angle - Math.PI / 6),
      );
      ctx.lineTo(
        x2 - size * Math.cos(angle + Math.PI / 6),
        y2 - size * Math.sin(angle + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fillStyle = element.stroke;
      ctx.fill();
    }
  }
  ctx.restore();
}

export async function renderPageToCanvas(page: NotePage, scale = 2): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(page.width * scale);
  canvas.height = Math.round(page.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.scale(scale, scale);
  drawTemplate(
    ctx,
    page.template,
    page.width,
    page.height,
    clampTemplateOpacity(page.templateOpacity) / 100,
  );

  if (page.background) {
    try {
      const image = await loadImage(page.background);
      ctx.drawImage(image, 0, 0, page.width, page.height);
    } catch {
      // ignore a broken background
    }
  }

  for (const element of page.elements) {
    if (element.type === "image") {
      try {
        await loadImage(element.src);
      } catch {
        // ignore a broken image
      }
    }
  }

  const highlighter = page.elements.filter(
    (element) => element.type === "stroke" && element.tool === "highlighter",
  );
  const rest = page.elements.filter(
    (element) => !(element.type === "stroke" && element.tool === "highlighter"),
  );
  for (const element of highlighter) drawElement(ctx, element);
  for (const element of rest) drawElement(ctx, element);
  return canvas;
}

export async function renderPageToDataUrl(
  page: NotePage,
  scale = 2,
  type: "image/png" | "image/jpeg" = "image/png",
): Promise<string> {
  const canvas = await renderPageToCanvas(page, scale);
  return canvas.toDataURL(type, 0.9);
}

export async function exportNotebookPdf(notebookTitle: string, pages: NotePage[]): Promise<void> {
  if (!pages.length) return;
  // jsPDF (plus html2canvas/canvg) is a large bundle — load it only when a
  // PDF is actually exported, not when the notebook opens.
  const { jsPDF } = await import("jspdf");
  const first = pages[0];
  const orientation = first.width > first.height ? "landscape" : "portrait";
  const doc = new jsPDF({
    orientation,
    unit: "pt",
    format: [first.width * 0.75, first.height * 0.75],
  });
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    if (index > 0) {
      doc.addPage(
        [page.width * 0.75, page.height * 0.75],
        page.width > page.height ? "landscape" : "portrait",
      );
    }
    const image = await renderPageToDataUrl(page, 2, "image/jpeg");
    doc.addImage(image, "JPEG", 0, 0, page.width * 0.75, page.height * 0.75);
  }
  doc.save(`${notebookTitle.replace(/[^a-z0-9-_ ]/gi, "").trim() || "notebook"}.pdf`);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

export function downloadText(text: string, filename: string, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function elementBounds(element: NoteElement): Bounds {
  if (element.type === "stroke") {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < element.points.length; i += 3) {
      const x = element.points[i];
      const y = element.points[i + 1];
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  return {
    x: element.width < 0 ? element.x + element.width : element.x,
    y: element.height < 0 ? element.y + element.height : element.y,
    width: Math.abs(element.width),
    height: Math.abs(element.height),
  };
}

export function hitElement(element: NoteElement, x: number, y: number, tolerance = 10): boolean {
  if (element.type === "stroke") {
    for (let i = 0; i < element.points.length - 3; i += 3) {
      const x1 = element.points[i];
      const y1 = element.points[i + 1];
      const x2 = element.points[i + 3];
      const y2 = element.points[i + 4];
      if (distanceToSegment(x, y, x1, y1, x2, y2) <= tolerance + element.width / 2) return true;
    }
    return false;
  }
  const bounds = elementBounds(element);
  if (element.type === "shape" && (element.shape === "line" || element.shape === "arrow")) {
    return (
      distanceToSegment(
        x,
        y,
        element.x,
        element.y,
        element.x + element.width,
        element.y + element.height,
      ) <=
      tolerance + element.strokeWidth / 2
    );
  }
  return (
    x >= bounds.x - tolerance &&
    x <= bounds.x + bounds.width + tolerance &&
    y >= bounds.y - tolerance &&
    y <= bounds.y + bounds.height + tolerance
  );
}

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function pointInPolygon(x: number, y: number, polygon: { x: number; y: number }[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function moveElement(element: NoteElement, dx: number, dy: number): NoteElement {
  if (element.type === "stroke") {
    const points = [...element.points];
    for (let i = 0; i < points.length; i += 3) {
      points[i] += dx;
      points[i + 1] += dy;
    }
    return { ...element, points };
  }
  return { ...element, x: element.x + dx, y: element.y + dy };
}

/** Scale any selected object to a new rectangle, including every point in ink strokes. */
export function resizeElementToBounds(
  element: NoteElement,
  source: Bounds,
  target: Bounds,
): NoteElement {
  const scaleX = target.width / Math.max(1, source.width);
  const scaleY = target.height / Math.max(1, source.height);
  if (element.type === "stroke") {
    const points = [...element.points];
    for (let i = 0; i < points.length; i += 3) {
      points[i] = target.x + (points[i]! - source.x) * scaleX;
      points[i + 1] = target.y + (points[i + 1]! - source.y) * scaleY;
    }
    return { ...element, points };
  }
  if (element.type === "shape" && (element.shape === "line" || element.shape === "arrow")) {
    const mapX = (value: number) => target.x + (value - source.x) * scaleX;
    const mapY = (value: number) => target.y + (value - source.y) * scaleY;
    return {
      ...element,
      x: mapX(element.x),
      y: mapY(element.y),
      width: mapX(element.x + element.width) - mapX(element.x),
      height: mapY(element.y + element.height) - mapY(element.y),
    };
  }
  const bounds = elementBounds(element);
  return {
    ...element,
    x: target.x + (bounds.x - source.x) * scaleX,
    y: target.y + (bounds.y - source.y) * scaleY,
    width: bounds.width * scaleX,
    height: bounds.height * scaleY,
  };
}

export function cloneElement(element: NoteElement): NoteElement {
  const id = `el_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
  if (element.type === "stroke") return { ...element, id, points: [...element.points] };
  return { ...element, id };
}
