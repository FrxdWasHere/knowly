/**
 * Accessibility utilities for the notebook editor.
 * Provides keyboard navigation, ARIA support, and assistive tech compatibility.
 */

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  category: "editing" | "navigation" | "selection" | "view";
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Editing
  { key: "Z", ctrl: true, description: "Undo", category: "editing" },
  { key: "Y", ctrl: true, description: "Redo", category: "editing" },
  { key: "Z", ctrl: true, shift: true, description: "Redo", category: "editing" },
  { key: "X", ctrl: true, description: "Cut selected items", category: "editing" },
  { key: "C", ctrl: true, description: "Copy selected items", category: "editing" },
  { key: "V", ctrl: true, description: "Paste from clipboard", category: "editing" },
  { key: "Delete", description: "Delete selected items", category: "editing" },
  { key: "Backspace", description: "Delete selected items", category: "editing" },
  { key: "D", ctrl: true, description: "Duplicate selected items", category: "editing" },
  
  // Navigation
  { key: "ArrowUp", description: "Previous page", category: "navigation" },
  { key: "ArrowDown", description: "Next page", category: "navigation" },
  { key: "Home", description: "First page", category: "navigation" },
  { key: "End", description: "Last page", category: "navigation" },
  
  // Selection
  { key: "A", ctrl: true, description: "Select all items on page", category: "selection" },
  { key: "Escape", description: "Deselect all items", category: "selection" },
  
  // View
  { key: "0", ctrl: true, description: "Fit to width", category: "view" },
  { key: "=", ctrl: true, description: "Zoom in", category: "view" },
  { key: "-", ctrl: true, description: "Zoom out", category: "view" },
  { key: "Space", description: "Pan/grab (hold)", category: "view" },
];

/**
 * Check if a keyboard event matches a specific shortcut.
 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut,
): boolean {
  return (
    event.key === shortcut.key &&
    (shortcut.ctrl ?? false) === event.ctrlKey &&
    (shortcut.shift ?? false) === event.shiftKey &&
    (shortcut.alt ?? false) === event.altKey
  );
}

/**
 * Format a shortcut for display.
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push("Ctrl");
  if (shortcut.alt) parts.push("Alt");
  if (shortcut.shift) parts.push("Shift");
  parts.push(shortcut.key);
  return parts.join("+");
}

/**
 * Get shortcuts for a specific category.
 */
export function getShortcutsByCategory(
  category: KeyboardShortcut["category"],
): KeyboardShortcut[] {
  return KEYBOARD_SHORTCUTS.filter((s) => s.category === category);
}

/**
 * Create an ARIA live region for status updates.
 */
export function createAriaLiveRegion(
  id: string,
  polite = true,
): HTMLDivElement {
  const region = document.createElement("div");
  region.id = id;
  region.setAttribute("aria-live", polite ? "polite" : "assertive");
  region.setAttribute("aria-atomic", "true");
  region.style.position = "absolute";
  region.style.left = "-10000px";
  region.style.width = "1px";
  region.style.height = "1px";
  region.style.overflow = "hidden";
  return region;
}

/**
 * Announce a message to screen readers via aria-live region.
 */
export function announceToScreen(regionId: string, message: string): void {
  const region = document.getElementById(regionId);
  if (!region) return;
  region.textContent = message;
}

/**
 * Make an element keyboard accessible with role.
 */
export function makeKeyboardAccessible(
  element: HTMLElement,
  role: string,
): void {
  element.setAttribute("role", role);
  element.setAttribute("tabindex", "0");
}

/**
 * Create keyboard-accessible canvas wrapper.
 */
export function wrapCanvasKeyboard(
  canvas: HTMLCanvasElement,
  onKeyDown: (event: KeyboardEvent) => void,
): void {
  canvas.setAttribute("role", "application");
  canvas.setAttribute("tabindex", "0");
  canvas.setAttribute("aria-label", "Notebook canvas - use arrow keys to navigate, space to pan");
  
  canvas.addEventListener("keydown", (event) => {
    // Prevent default browser shortcuts but allow custom handling
    if (event.key === " " || event.key.startsWith("Arrow")) {
      event.preventDefault();
    }
    onKeyDown(event);
  });
}

/**
 * Announce save status to screen readers.
 */
export function announceSaveStatus(
  regionId: string,
  status: "saved" | "saving" | "error",
): void {
  const messages = {
    saved: "All changes saved",
    saving: "Saving changes...",
    error: "Failed to save changes",
  };
  announceToScreen(regionId, messages[status]);
}

/**
 * Create a keyboard shortcut help panel.
 */
export function generateShortcutHelp(): string {
  const byCategory = {
    editing: getShortcutsByCategory("editing"),
    navigation: getShortcutsByCategory("navigation"),
    selection: getShortcutsByCategory("selection"),
    view: getShortcutsByCategory("view"),
  };

  let help = "Keyboard Shortcuts\n\n";
  for (const [category, shortcuts] of Object.entries(byCategory)) {
    help += `${category.charAt(0).toUpperCase() + category.slice(1)}:\n`;
    for (const shortcut of shortcuts) {
      help += `  ${formatShortcut(shortcut)}: ${shortcut.description}\n`;
    }
    help += "\n";
  }

  return help;
}
