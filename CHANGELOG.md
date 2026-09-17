# Changelog

All notable changes to Knowly are documented here. The app is fully offline — no accounts, no syncing, no network calls.

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
