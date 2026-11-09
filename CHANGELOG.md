# Changelog

All notable changes to Knowly are documented here. The app is fully offline — no accounts, no syncing, no network calls.

## 3.4.0 — 2026-11-02 — The Rounds Release

The headline of v3.4: **deck study is now a game.** A big deck is split into parts and short rounds, mistakes cost hearts, three buttons sit under every card (Hint · Reveal · Explain), and the end of a part is a boss fight against your hardest cards.

### New: parts, rounds and hearts

- **Decks fragment themselves.** `fragmentDeck()` in `src/lib/rounds.ts` groups cards by concept (then tag, then subject) into parts of at most 20, so 200 cards arrive as a dozen sub-topics instead of one wall. Parts, mastery and due counts appear on the deck page with their own study links.
- **Rounds of eight.** Each part is studied in rounds, and a round ends on a recap that shows accuracy, XP, hearts left and the cards in the order they appeared, with the right answer beside every miss.
- **Hearts.** Five per session; a wrong answer costs one. At zero the session stops and a fresh heart can be bought for 500 XP (`spendXp` on the store), so XP is now something you spend as well as earn.
- **Missed cards come back.** A wrong card is re-queued once at the end of its round instead of vanishing.

### New: the three buttons

- **Hint** crosses out one wrong option (plus the card's saved hint), **Reveal** shows the answer, **Explain** shows the answer with its explanation and marks every option right or wrong.
- **Think first.** Multiple-choice options stay hidden behind *Show options* until you have an answer in mind — the recall happens before the recognition.

### New: harder rounds and bosses

- **Hard round** (hard cards only) and **speed run** (15 seconds a card) pay 1.5× and 2× XP.
- **Boss rounds.** Finish a part and *The Forgetting Curve* appears: your six highest-risk cards back to back, each right answer a hit on a visible HP bar. Weighting is `questionWeight()` — lapses, low ease, hard difficulty, never mastered.

### New: pre-written tutor notes

- **The tutor travels inside the JSON.** Every question can carry `tutor: { simple, mnemonic, example, whyWrong }` — a plain-words explanation, a memory hook, an example, and one reason per wrong option. In a session the **Tutor** button (or `T`) opens those notes; **Explain** now prints the matching `whyWrong` line under each distractor. No AI call, no key, works offline.
- **The prompts write them.** `TUTOR_RULES` in `src/lib/prompt.ts` is shared by the deck, expand-deck, course and lesson/module presets, `QUESTION_SCHEMA_TEXT` documents the object, and every sample JSON demonstrates it — so generated decks arrive with tutor notes already written instead of an empty panel.

### Prompt Forge

- **The Deck Studio matches the new rule.** Its count control starts at 200 (expanding a deck still allows small counts), the helper text previews the exact number the brief will request, and a note explains that cards come back with tutor notes across at least four concepts. `deckSizeTarget()` keeps the preview and the prompt in step.
- **Decks ask for 200 cards minimum**, scaling at roughly one card per 25 words of source (a 40,000-word source requests ~1,600), over at least four concept labels so the new parts are meaningful. The deck presets say so explicitly; the expand-deck preset keeps its explicit count.

## 3.3.0 — 2026-11-01 — The Print Studio Release

The headline of v3.3: **course and module print packs became real documents.** Each paper theme now designs its own cover, the sheet is always paper regardless of the app theme, and both studios export Word files that match what you see.

### New: a cover per paper theme

- **Eleven covers, one per theme.** `coverDesign()` in `src/components/print/cover-designs.tsx` gives each paper theme its own surface, ink and ornament, and `CoverOrnament()` draws it: hairline frames on Classic, an accent spine on Module, masking tape and a dot grid on Field notes, a blueprint grid with a title-block rule, scanlines and a prompt line on Terminal, crop marks on Lab report, a punched-holed spine on Workbook, twin parchment frames on Manuscript, masthead rules on Newspaper, an ink border and burst on Comic, a leaf sprig on Botanical.
- **Light themes print dark ink, dark themes print light ink.** A single `dark` flag is the contract, so no cover can put pale type on a pale surface. The module's in-flow hero wears the same design as its cover, and the course footer takes its tone from the cover it overlays.
- **Themed or plain.** The course cover control now reads Themed (designed by the paper theme) and Plain (white title page with accent rules); the module panel's control is Cover colour, since the theme owns the design.

### Fixed: paper ink

- **The sheet is paper, not UI.** Course and module sheets inherited the app theme's ink, so in a dark theme the body text was near-white on white paper. `.paper-skin` now pins the full reading palette in both media — `#1f2937` body ink (14.7:1 on white), `#5b6472` secondary (6.0:1), white card, pinned borders — plus the Tailwind `--color-*` aliases and `color-scheme: light`. What you read in the studio is what comes out of the printer.
- **Print stylesheets no longer rely on inheritance** for the theme ink classes, and the accents are deepened for both media, so the preview and the printed page use the same identity colour.

### New: Word export everywhere

- **Save as Word file** in the module studio, sharing the course builder's renderer (`src/lib/course-docx.ts`): title sheet, objectives, notes, blocks, practice questions, linked-deck practice and an answer key.
- **Colour tokens resolve before docx sees them.** Identity colours arrive as CSS tokens (`var(--deck-3)`) or `color-mix()`; they are resolved through a DOM probe (with a canvas fallback for `oklch()`/`lab()`) to six-digit hex, which is what docx requires — this is what fixed the export crash in the cover shading.

### Printing

- **Full-bleed backgrounds, 0.5in content margins.** The sheet is exactly the printed page, so the themed wash and accent edge reach the edge while the words keep a 0.5in margin. Choose **Margins: None** in the print dialog for a finished document.

- Version bumped to **3.3.0** across the app, the Tauri desktop shell and the Rust crate.

## 3.1.0 — 2026-10-25 — The Study Week Release

The headline of v3.1: **Knowly now plans your week and files your practice.** A weekly timetable links every class to its deck, colour-coded binder labels keep the library tidy, a paper shelf saves past papers with full sitting histories — and any subject that needs real math gets properly typeset equations.

### New: Math & STEM support

- **Real equations, rendered locally.** Any question, answer, explanation or lesson text containing `$…$`, `$$…$$`, `\[…\]` or `\(…\)` is typeset with KaTeX (e.g. `$2H_2 + O_2 \to 2H_2O$`, `$\binom{n}{k}p^k(1-p)^{n-k}$`) — no toggles, no network, no AI.
- **STEM flags across the model.** Decks, courses and every Forge (Prompt / Course / Deck) gained `isSTEM`, `needsEquations` and `needsGraphs` switches. Toggling them shapes the generated instructions ("write all equations in LaTeX", "describe graphs in words") and enables a 24-symbol math keypad in review, quiz and lesson check-points.
- Longest delimiters open first, so `\(...\)` never gets eaten by a shorter `$…$` interpretation, and malformed LaTeX falls back to plain text instead of erroring.

### New: Weekly timetable

- **Your week at a glance** (`/timetable`): a Monday-first grid of repeating class slots with title, subject, room and teacher. A "Next up / Happening now" banner points at the current or next class.
- **Every slot links its study material** — a deck ("Revise this deck"), a course, or both — so preparing for tomorrow's lesson is one click from the schedule. A footer totals your contact hours per week.

### New: Binder labels

- **Colour-coded labels** (`/labels` — 9 soft colours, optional emoji) can be stuck to decks, courses and papers, with a full count read-out in the manager.
- Labels appear on deck cards and the deck page, in the course editor, on the paper shelf, and as a **label filter in the deck library**. Deleting a label unsticks it everywhere automatically.

### New: Paper shelf

- **Past exams, shelved** (`/papers`): save any printable exam as a permanent record — the questions are snapshotted verbatim, so a paper reprints identical later via `Print → reprint from shelf` even if the source deck changes.
- Each paper tracks a **sitting history**: date, score, percentage, minutes and notes, with attempts / most recent / best stats on the card, and labels for colour-coding. "Save to paper shelf" is built into the printable exam studio.

### Improvements

- **Copy pass across the app** — friendlier, consistent wording everywhere (hero typo fixed), plus canonical phrasing for the external-AI workflow: "Knowly writes the instructions — copy them into the AI you already use, then bring the result back."
- **Hardened rendering** — papers render safely even when older saves are missing print options, and timetable badges no longer trigger React hydration warnings.

### Updated: Demo profile

- The sample profile now exercises **every feature**: two STEM decks with real LaTeX equations, a full 10.5-hour school timetable linked to decks and courses, three binder labels in use, two shelved practice papers with improving sitting histories (Biology 42% → 67% → 83%), a STEM prompt template, and journal entries telling the story.

### Maintenance

- State schema version remains **4** (the timetable/labels/papers migration from v3). Version bumped to **3.1.0** across the app, the Tauri desktop shell and the Rust crate.

## 3.0.0 — 2026-10-23 — The Publishing Release

The headline of v3: **your courses can now leave the screen.** A full print & publishing studio turns any course into a book-quality PDF or a Word document — plus a redesigned sidebar, a living workspace, and a demo profile for newcomers.

### New: Course Publishing Studio

- **Print any course as a real book.** A dedicated studio (`Courses → a course → Print course`) composes the entire course — modules, lessons, callouts, worked examples, checkpoint quizzes, the final exam, linked deck practice, plus your notes and progress — into paginated sheets with a full-bleed cover, table of contents and a complete answer key, ready for the browser's print/PDF dialog.
- **Every option is yours.** Paper (A4, Letter, Legal 8.5×13", B5, A5), orientation, margins, font size, typeface (sans/serif), line spacing, break behaviour (flow / by module / by lesson), footer styles, running headers, cover style ("book" or "classic"), TOC and answer-key toggles. Choices persist between visits.
- **One-click DOCX export.** The same composition is exported as a `.docx` file (via a self-hosted DOCX writer) so you can edit and hand in your coursework in Word. Honors every print option, embeds images, shades callouts and includes the full answer key and page numbering.
- **Live export progress.** A progress overlay narrates each export stage; if anything fails, a full error log (with copy/retry) is shown instead of a dead dialog.

### Fixes: Multi-page printing

- Printing a course correctly spans **as many pages as it has sheets** — the printed page count now matches the preview sheet-for-sheet (previously only one page made it to paper). Mobile-only chrome no longer leaks into print output, and blank gap strips between sheets are gone.

### New: Sidebar that shows its work

- The whole sidebar is redesigned: flat, always-visible sections — **Home · Study cycle · Courses · Decks & cards · Build & import · Notes · Progress · System** — so every feature is one click away with no buried submenus.
- Every item carries a **one-line explanation** under its label (e.g. *Cram Mode — last-minute blitz, ignores the schedule*), and Daily Review shows a **live due-count badge** (desktop and mobile) so the next action is never missed.
- Section headings highlight on the active area and can be collapsed by power users; the collapsed icon rail keeps richer tooltips; the mobile chip rail matches the same grouping.

### New: A workspace that breathes

- The main app gained an ambient backdrop: slow **aurora washes**, gently **floating orbs** and a counter-drifting **blueprint grid**, anchored by a glowing hairline — tuned to stay subtle in dark *and* light themes, respect the animation-speed setting and reduced motion, skip itself when a user wallpaper is set, and disappear entirely in print.

### New: Try Knowly instantly

- Onboarding now offers a **complete "lived-in" sample profile** at the bottom of the wizard: five decks at all stages of study (mastered, mid-schedule, brand-new, plus true leeches), a course at 60% with real lesson/quiz progress, six weeks of history, journal entries, templates and streaks. Timestamps are generated relative to import, so the demo always looks freshly used. Two-click confirm, clearly labelled as an exploring option.

### Maintenance

- Version bumped to **3.0.0** across the app, the Tauri desktop shell and the Rust crate.

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
