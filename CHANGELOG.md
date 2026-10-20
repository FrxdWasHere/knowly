# Changelog

All notable changes to Knowly are documented here. The app is fully offline — no accounts, no syncing, no network calls.

## Unreleased — Sidebar submenus & iOS-style Settings

### Changed

- **Sidebar submenus modernized.** Groups now expand with a smooth height animation into an iOS-style grouped list — hairline dividers, compact icon tiles, chevron accessories, and a clean primary-tinted active row. Closed groups with an active page keep a status dot; hidden groups are inert to keyboard focus.
- **Settings rebuilt iOS-style.** Every section is now a grouped card with a small grey header, colorful icon tiles, toggle rows, segmented controls (theme, density, button size), and right-aligned value rows — with a profile banner on top. No setting was removed; everything moved into the new rows.

## 2026-10-16 — Reliability & cleanup

### Fixes

- **Ordering questions can be dragged with the mouse again.** Replaced native HTML5 drag-and-drop (which Tauri/WebView2 on Windows intercepts) with pointer-event dragging, and disabled `dragDropEnabled` in the Tauri window config — this also unblocks drag-and-drop for JSON import.
- **Streaks and daily goals now roll over at local midnight** instead of UTC midnight, so a late-night session no longer counts against the wrong day. The Goals heat map and Report date labels were aligned to the same local-day logic.
- **Night Owl / Early Bird no longer pollute study-day stats.** They were stored as `__nightowl` / `__earlybird` sentinel keys inside `studyDays`; they are now proper boolean fields, and existing saves are migrated automatically.
- **`totalIncorrect` no longer double-subtracts skipped cards.**
- **Wallpapers moved out of the main save blob.** Large images previously shared the ~5 MB `localStorage` budget and could silently stop _all_ progress from saving; they now live in IndexedDB, and a toast warns if a save ever fails. Settings shows a local-storage usage meter.
- **Quitting a quiz with instant feedback can no longer record the abandoned session** — the pending advance timer is cleaned up on unmount.
- **Achievements are evaluated by a pure function**, removing a side effect from inside a React state updater.
- **`window.confirm` replaced with a themed dialog** for quitting a quiz or leaving a study session.
- **Collision-prone IDs fixed.** Deck, question, session, template and snapshot ids now use `crypto.randomUUID()` instead of `Math.random()`.
- **Achievements bundle slimmed from ~585 kB to ~3 kB** by replacing the whole-library icon import with an explicit icon registry.
- Repaired the long-standing `tsc` error in the root error boundary so `npm run typecheck` passes cleanly.

### New

- **Spaced-repetition settings** — relearn step, interval modifier, easy bonus and maximum interval are now configurable in Settings; grade previews reflect them.
- **Versioned state migrations** — persisted saves carry a schema version and are upgraded on load instead of relying on ad-hoc repair.

### Maintenance

- Removed the unused Supabase/Drizzle network scaffolding (the app is fully offline) and ~30 unused shadcn `ui/` wrappers, along with the npm dependencies that only they used.
- Added Vitest with 71 unit tests over the pure logic (answers, interactive questions, SRS, schema validation, gamification, ids, storage) plus `typecheck`/`test` scripts and a CI workflow.
- Formatted the whole `src` tree with Prettier (57 files) and excluded the Tauri `target` build output (1.8 GB) from linting and version control.
- Added keyboard/ARIA affordances to the ordering, matching and word-bank interactions (live-region announcements, `aria-pressed`, descriptive labels, `aria-hidden` decorations).

## 2026-09-17 — The Big Feature Drop

### New sidebar features (15)

**Study & practice**

- **Cram Mode** — rapid-fire pre-exam blitz through your weakest cards, ignoring the SRS schedule. Pick decks, card count and order, set a per-card timer, and chase combos with a results summary at the end.
- **Exam Simulator** — timed, mixed-deck mock exams with a proper pass/fail report.
- **Focus Timer** — a Pomodoro-style study timer with adjustable focus/break lengths, a countdown ring, pause/skip/reset, a chime, and sitting stats tied to your study sessions. Shows cards due now with quick links into Daily Review and weak-spot drilling.

**Improve**

- **Weak Spots** — your shakiest cards and concepts ranked in one place, with leech counts, average ease, and weak concepts under 80% accuracy. One-click "Drill weak spots" launches a focused session.
- **Leech Manager** — surfacing the cards you keep forgetting, with a slider to set the miss threshold. Pause, reset, or rewrite problem cards; paused cards stay out of reviews and due counts.
- **Card Browser** — one searchable, filterable table of every card across all decks. Filter by deck, question type, difficulty, bookmarked-only or due-only; sort by deck, soonest due, weakest, or hardest; star cards and expand rows to peek at answers, explanations and options.
- **Tag & Concept Explorer** — browse the whole library by tag or concept, with counts, mastery and accuracy, plus matching card details and deck links.
- **Bookmarks & Notes** — a hub for starred cards and personal notes: note previews, inline editing with one-click delete, and a "Quiz my starred cards" shortcut.

**Progress & motivation**

- **Goals & Streaks** — daily goal tracking with a calendar, streaks and milestones.
- **Progress Report** — pick a date range and get a clean, printable summary of sessions, accuracy, XP and time studied — perfect for showing a teacher or parent. Print or save as PDF.
- **Study Journal** — a per-session notes log you can search and reflect on during exam prep.

**Library & organization**

- **Merge & Split** — reorganise decks without re-importing: combine decks while retaining mastered progress, or split one deck into smaller ones by tag or size.
- **Snapshots & Backup** — local state snapshots (up to 20) you can take, restore, delete, download as JSON, or import on another device.

**Power tools**

- **Command Palette** — press `Ctrl`/`Cmd`+`K` to jump to any page, deck or action, toggle the sidebar or switch themes.
- **Shortcuts & Help** — an in-app reference for every keyboard shortcut, plus quick answers about reviews, decks, imports and where your data lives.

### Spaced repetition

- New SRS scheduler with a Daily Review session, a dashboard widget showing what's due, and due rings on every deck in the library.
- Review grading, XP, due forecasts and due counts all wired up across the app.

### Design

- **Ocean Deep** theme rolled out across every app screen and overlay — homepage tokens promoted app-wide, with refreshed navigation, page headings, panels and workspace presentation.
- Removed every legacy warm accent and warm-theme reference for one consistent look, in both light and dark mode.
- **New app branding** — the src-tauri icon artwork is now the single app logo everywhere.
- **Sidebar overhaul** — 26 entries organised into six labelled groups (Overview, Library, Study, Improve, Progress, System), with a scrollable sidebar and group separators in collapsed mode.

### Also in this release

- Accessibility and hydration fixes: proper dialog titles in the command palette, no nested interactive elements, cleaner SSR-safe rendering.

## Earlier baseline

The starting point for everything above: Dashboard, Deck Library, Prompt Forge and Deck Forge, Import JSON and JSON Format, Practice Quiz, Print Exam, Statistics, Achievements, and Settings — all fully offline.
