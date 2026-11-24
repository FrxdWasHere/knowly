# Knowly

> Turn AI-generated JSON question banks into study sessions, structured courses and handwritten notebooks — flashcards, quizzes, an XP arena, and real analytics.

Knowly is a local-first study workspace. It does **not** call any AI service itself. Instead, it provides **Prompt Forge** tools that write strict prompts for the user's preferred LLM (ChatGPT, Gemini, Claude, OpenRouter, Ollama, etc.). The user brings the resulting JSON back, Knowly validates it, and keeps the library in this browser. JSON export is how you back it up or move it.

---

## Features

- **Local-first storage** — decks, courses, progress, XP, streaks, notes, and quiz history work on this device. Optional account sync can keep the main study library on Supabase across devices.
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

### Optional Supabase sync

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in a root `.env.local` file to enable account sign-in and sync controls. Configure Google/email providers and auth redirect URLs in the Supabase dashboard.

Before using cloud sync, apply `supabase/migrations/20261124090000_create_user_app_state.sql` in the Supabase SQL Editor. The table is protected by row-level security and stores one private app-state snapshot per account.

Sync is automatic once you sign in. A device that is new to the account starts blank and adopts the copy stored in the account; the first sync for a brand-new account creates that copy from the device. Every change — decks, courses, modules, progress, study history, settings, notebooks, wallpapers and the profile photo — is written back a moment later. If another device saves first, this device reloads the account copy and keeps a local recovery backup. **Settings → Account & cloud sync** lets you deliberately push this device’s library over the account copy or reload the cloud copy, and can export either side as a JSON file.

### Build

```bash
npm run build
```

### Deploy to Vercel

Vercel sets `VERCEL` during builds, so Knowly automatically uses Nitro's Vercel output there
while keeping the Node server output for local and Tauri builds. In Vercel, use `npm run build`
and leave the Output Directory override disabled; do not set it to `dist`, since this is an
SSR app rather than a static-only Vite build. Set the Supabase URL and publishable key in
Vercel's environment settings, and allow the deployed callback URLs in Supabase Auth.

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
    login.tsx          # Optional Google/email sign-in
    account.tsx        # Account and cloud-sync controls
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

**Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International** (CC BY-NC-SA 4.0)

This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License. See [LICENSE](./LICENSE) for the full text.

**Summary:**

- ✅ You can **share, adapt, and remix** Knowly for educational purposes
- ✅ You must provide **attribution** (credit to Frederic Liam De Guzman and the School of Our Lady of La Salette)
- ❌ You **cannot use it for commercial purposes**
- ✅ Any derivative works must use the **same CC BY-NC-SA 4.0 license**

For more information, visit [creativecommons.org/licenses/by-nc-sa/4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)

**Made with love by Frederic Liam De Guzman, for the kind students of the School of Our Lady of La Salette.**
**All rights reserved. To God be all the glory! 🙏**

---

Built with [Lovable](https://lovable.dev).
