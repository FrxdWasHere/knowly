# Knowly

> Turn AI-generated JSON question banks into study sessions, structured courses and handwritten notebooks — flashcards, quizzes, an XP arena, and real analytics.

Knowly is a local-first study workspace. It does **not** call any AI service itself. Instead, it provides **Prompt Forge** tools that write strict prompts for the user's preferred LLM (ChatGPT, Gemini, Claude, OpenRouter, Ollama, etc.). The user brings the resulting JSON back, Knowly validates it, and keeps the library in this browser. JSON export is how you back it up or move it.

---

## Features

- **Local storage** — decks, courses, progress, XP, streaks, notes, and quiz history stay in this browser.
- **JSON import & export** — paste or upload decks and courses with validation, and download a full backup whenever you want a portable copy.
- **Prompt Forge** — generate, copy, and customize prompts for any LLM.
- **Deck library** — search, sort, favorites, tags, colors, completion stats.
- **Courses** — independent modules, lessons, markdown content, checkpoint questions, module quizzes, a timed final exam, progress tracking and optional linked practice decks.
- **Notebooks** — a GoodNotes-style canvas with pressure-sensitive pen, pencil and highlighter, lasso selection, shapes, text, sticky notes, study tape, images, audio recordings, page templates, zoom, PDF import/annotation, search, course links, and PNG/PDF/JSON export.
- **Study mode** — flashcards, multiple choice, true/false, fill-in-the-blank, short answer; bookmarks, notes, hints.
- **Quiz engine** — configurable timers, shuffle, difficulty filters, instant feedback, review mode.
- **Deck Arena** — timed rounds, lives, combo multipliers, and XP rewards.
- **XP & achievements** — levels, streaks, perfect quizzes, and unlockable badges.
- **Analytics** — concept heatmaps, weak topics, accuracy trends, quiz reports.
- **Deep customization** — themes, accent colors, wallpapers, fonts, density, dashboard layout, reduced motion, high contrast.

---

## Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) v1 + [React](https://react.dev) 19 + [TypeScript](https://www.typescriptlang.org/)
- **Build tool:** [Vite](https://vitejs.dev/) 8
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) v4 + shadcn/ui primitives (Radix)
- **State & data:** in-memory store persisted to `localStorage` (`src/store/knowly.tsx`); notebooks, pages and wallpapers live in IndexedDB
- **Notebooks:** custom canvas rendering + [perfect-freehand](https://github.com/steveruizok/perfect-freehand), [pdf.js](https://mozilla.github.io/pdf.js/) for PDF import, [jsPDF](https://github.com/parallax/jsPDF) for export
- **UI:** Radix/shadcn primitives, Sonner toasts, Zod validation, Lucide icons
- **Desktop:** [Tauri](https://tauri.app/) 2 (Rust) in `src-tauri/`

---

## Getting Started

### Prerequisites

- Node.js 22+
- npm 10+

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

The dev server starts at `http://localhost:8080`.

### Build

```bash
npm run build
```

### Desktop app

The Tauri shell needs the Rust toolchain and the Visual Studio C++ build tools. Once those are installed:

```bash
npx tauri build
```

`beforeBuildCommand` runs the frontend build automatically.

---

## Project Structure

```text
src/
  routes/              # TanStack Start file-based routes
    __root.tsx         # Root layout, providers, global head meta
    index.tsx          # Landing page
    _authenticated/    # App routes (dashboard, decks, quiz, etc.)
  components/          # Reusable UI components
  store/               # Global state persisted to localStorage
  lib/                 # Utilities, types, gamification, validators, prompts
  lib/notes/           # Notebook types, IndexedDB storage, canvas renderer, PDF import
  server.ts            # Server entry
  start.ts             # TanStack Start config
public/                # Static assets
```

---

## Available Scripts

| Script              | Description                  |
| ------------------- | ---------------------------- |
| `npm run dev`       | Start the Vite dev server    |
| `npm run build`     | Build for production         |
| `npm run build:dev` | Build in development mode    |
| `npm run preview`   | Preview the production build |
| `npm run typecheck` | Typecheck with TypeScript    |
| `npm run lint`      | Run ESLint                   |
| `npm test`          | Run the Vitest suite         |
| `npm run format`    | Format with Prettier         |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and run `npm run lint` and `npm test`
4. Open a pull request

Please keep changes focused and follow the existing TypeScript/React conventions.

---

## License

MIT — see [LICENSE](./LICENSE).

---

Built with [Lovable](https://lovable.dev).
