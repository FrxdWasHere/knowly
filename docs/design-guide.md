# Knowly Design Guide

**Status:** current design language, derived from the implementation
**Applies to:** the marketing site, the authenticated workspace, every printable document
**Source of truth:** the code in `src/` — when this guide and the code disagree, the code wins and this guide should be corrected

This guide documents what Knowly already looks like and why. It is not a rebrand proposal. It covers the tokens, type, layout, components, motion, copy and print system that are actually shipped, with file references so any rule can be checked or changed at its source.

---

## 1. Product character

Knowly is a **local-first study workspace**. It is not a cloud service and it does not call an AI. The user copies Knowly's instructions into the AI they already use, then brings the finished file back. Everything else — decks, courses, modules, notebooks, papers, progress — lives on the device and can be exported as a portable backup.

The interface should feel like:

- **A serious study instrument.** Dense where it needs to be, calm everywhere else.
- **A private desk, not a dashboard demo.** The default is a deep navy workspace with one confident accent, not a rainbow of metrics.
- **Premium by default, adjustable by preference.** The shipped palette, spacing and typography are already the recommendation; settings exist so the learner can adapt the workspace, not so they have to assemble one.
- **Made of paper and ink metaphors.** Modules, courses, exams and the Paper Shelf are tangible documents. Print is a first-class product surface, not an afterthought.
- **Written for a learner under pressure.** Short sentences, concrete verbs, no hype, no promises the local app cannot keep.

The visual signature is: **deep Ocean/Arc surfaces, a single luminous blue accent, geometric display type over humanist body type, soft 12–18px corners, tinted glass panels, and a very restrained amount of glow.** Glow marks the active path; it is never decoration for its own sake.

---

## 2. Design principles

### 2.1 One accent, many tints

The theme supplies one `--primary` and one `--accent`. Everything else is derived with `color-mix(in oklab, …)` or alpha. Status colors keep their meaning but are tinted toward the active palette. Do not introduce a new hard-coded brand color into chrome.

### 2.2 Hierarchy comes from size, weight and position — not from letter-spacing

In the app shell, `.workspace` forces `letter-spacing: 0` on headings and on any element carrying a `tracking-*` utility. Treat tracking as a **marketing-only** tool. Inside the workspace, build hierarchy with `font-display`, size, weight, spacing and rules.

### 2.3 Surfaces are layered, not outlined

Panels use a subtle diagonal gradient (`--gradient-surface`), a 1px border and a soft shadow. Inputs recess to `--background`. Cards sit on `--surface`; raised inner boxes use `--surface-2`. Avoid flat white boxes on dark backgrounds and avoid stacking borders on borders.

### 2.4 Motion confirms, never delays

Every entrance is short (0.32–0.5s), every hover is shorter (0.25s), every press is instant (0.12s). Motion scales with the user's speed setting and is disabled by both the in-app switch and `prefers-reduced-motion`.

### 2.5 The default is the design

Presets are curated. Custom themes are supported, but every new screen must look correct with **no customization at all**, using only semantic tokens. Never depend on a specific palette being active.

### 2.6 Print is a separate medium with its own rules

Paper is measured in CSS pixels at 96dpi, paginated by a real DOM measurement pass, and protected by fixed header/footer bands. Screen patterns (sticky bars, hover states, scroll areas, viewport units) do not belong on paper.

### 2.7 Local-first is visible

The shell states it: _Everything saved on this device · export a copy to move it._ Copy should reinforce privacy and portability without turning every screen into a privacy lecture.

### 2.8 Actions never crush the title

Shared page headers wrap their action group **below** the title when space is tight. The title column keeps a minimum width and the actions wrap; the title is never squeezed into a narrow column to keep buttons on one line. See §5.5.

---

## 3. Foundations

### 3.1 Color tokens

All theme colors are CSS custom properties, mapped into Tailwind utilities in `src/styles.css` (`@theme inline`). The table below lists the semantic role and the built-in dark (Ocean Deep) and light values. Theme presets replace these at runtime; components must always reference the token, never the literal.

| Token                      | Role                                  | Dark default                        | Light override               |
| -------------------------- | ------------------------------------- | ----------------------------------- | ---------------------------- |
| `--background`             | page canvas                           | `oklch(0.165 0.048 250)`            | `oklch(0.98 0.006 220)`      |
| `--foreground`             | primary text                          | `oklch(0.975 0.012 220)`            | `oklch(0.22 0.02 265)`       |
| `--surface`                | panels, cards                         | `oklch(0.205 0.052 245)`            | `oklch(1 0 0)`               |
| `--surface-2`              | raised inner boxes, chips, code fills | `oklch(0.25 0.055 240)`             | `oklch(0.96 0.012 220)`      |
| `--card`                   | card surface                          | same as surface                     | `oklch(1 0 0)`               |
| `--card-foreground`        | text on cards                         | same as foreground                  | `oklch(0.22 0.02 265)`       |
| `--popover`                | menus, dialogs                        | same as surface                     | `oklch(1 0 0)`               |
| `--popover-foreground`     | text in popovers                      | same as foreground                  | `oklch(0.22 0.02 265)`       |
| `--primary`                | action, active state, focus           | `oklch(0.72 0.155 238)`             | `oklch(0.52 0.17 245)`       |
| `--primary-foreground`     | text on primary                       | `oklch(0.15 0.04 235)`              | `oklch(0.99 0.005 85)`       |
| `--primary-glow`           | gradient end, glow                    | `oklch(0.83 0.115 210)`             | `oklch(0.64 0.14 220)`       |
| `--secondary`              | secondary fill                        | `oklch(0.27 0.05 240)`              | `oklch(0.94 0.018 220)`      |
| `--secondary-foreground`   | text on secondary                     | `oklch(0.96 0.012 220)`             | `oklch(0.25 0.02 265)`       |
| `--muted`                  | quiet fill                            | `oklch(0.26 0.04 240)`              | `oklch(0.95 0.01 220)`       |
| `--muted-foreground`       | secondary text                        | `oklch(0.76 0.03 220)`              | `oklch(0.48 0.02 265)`       |
| `--accent`                 | secondary emphasis                    | `oklch(0.68 0.135 220)`             | `oklch(0.58 0.15 225)`       |
| `--accent-foreground`      | text on accent                        | `oklch(0.98 0.01 210)`              | `oklch(0.99 0.005 85)`       |
| `--destructive`            | destructive action                    | `oklch(0.58 0.2 265)`               | inherited                    |
| `--destructive-foreground` | text on destructive                   | `oklch(0.98 0.005 265)`             | inherited                    |
| `--success`                | saved / correct / present             | `oklch(0.78 0.12 210)`              | `oklch(0.54 0.14 220)`       |
| `--success-foreground`     | text on success                       | `oklch(0.16 0.04 230)`              | inherited                    |
| `--warning`                | caution / hard                        | `oklch(0.74 0.14 250)`              | `oklch(0.58 0.16 255)`       |
| `--warning-foreground`     | text on warning                       | `oklch(0.16 0.04 250)`              | inherited                    |
| `--border`                 | hairlines, card borders               | `oklch(0.85 0.03 220 / 16%)`        | `oklch(0.22 0.02 265 / 12%)` |
| `--input`                  | form control border                   | `oklch(0.85 0.03 220 / 22%)`        | `oklch(0.22 0.02 265 / 16%)` |
| `--ring`                   | focus ring                            | `var(--primary)`                    | `var(--primary)`             |
| `--sidebar`                | navigation rail                       | `oklch(0.145 0.04 250)`             | `oklch(0.96 0.012 220)`      |
| `--sidebar-foreground`     | nav text                              | `var(--foreground)`                 | `oklch(0.25 0.02 265)`       |
| `--sidebar-primary`        | active nav                            | `var(--primary)`                    | `var(--primary)`             |
| `--sidebar-accent`         | nav hover fill                        | `var(--secondary)`                  | `oklch(0.92 0.022 220)`      |
| `--sidebar-border`         | nav separators                        | `oklch(1 0 0 / 9%)`                 | `oklch(0.22 0.02 265 / 10%)` |
| `--chart-1…5`              | analytics                             | primary, accent, blue, cyan, violet | inherited                    |

Additional system tokens:

| Token                | Value / rule                                                           |
| -------------------- | ---------------------------------------------------------------------- |
| `--radius`           | `0.75rem` default, user-adjustable `0 → 1.5rem`                        |
| `--font-scale`       | `1` default, user-adjustable `0.85 → 1.3`                              |
| `--speed`            | `1` default, user-adjustable `0.5 → 2`                                 |
| `--gradient-ocean`   | `linear-gradient(135deg, var(--primary), var(--primary-glow))`         |
| `--gradient-surface` | `linear-gradient(155deg, surface 90% + primary 10%, surface)`          |
| `--shadow-forge`     | `0 22px 64px -44px` primary at 34%                                     |
| `--shadow-panel`     | dark: `0 14px 34px -28px` black 42%; light: `0 8px 26px -22px` ink 26% |
| `--deck-1…6`         | primary, accent, three mixes, and a deep primary/background mix        |

`--primary-glow` is a **lighter, cooler** stop used only in gradients and glows. It is not a second action color.

### 3.2 Using color

- **Action:** primary gradient (default button), primary text link, primary ring.
- **Navigation:** active row uses a primary wash plus a 3px inset primary bar.
- **State:** success, warning, destructive — always paired with text or an icon, never color alone.
- **Module / course / deck identity:** user data colors (`module.color`, `course.color`, `deck.color`) are applied as small bars, dots, progress fills and paper covers. They are not theme tokens.
- **Binder labels:** fixed six-color set (blue, green, amber, rose, violet, cyan) with tinted chips that work in both themes (`src/lib/labels.ts`).
- **Charts:** `--chart-1` through `--chart-5`, in that order.

Never use `--primary` as a large page fill. The only broad primary fill is the printed cover gradient; elsewhere primary appears as glows, washes and small fills.

### 3.3 Typography

Fonts are loaded once in `src/routes/__root.tsx`:

- **Display — Space Grotesk** (500, 600, 700): page titles, section headings, card titles, big numbers, marketing display.
- **Body — DM Sans** (400, 500, 700): everything else.
- **Mono — JetBrains Mono** (400, 500): hex inputs, code, numeric metadata where alignment matters.

`h1–h4` use the display family globally. Body text uses the sans family and is antialiased.

| Role                 | Recipe                                                                                          | Approx. px at 1× |
| -------------------- | ----------------------------------------------------------------------------------------------- | ---------------- |
| Marketing hero       | `font-display font-bold leading-[0.96] tracking-[-0.05em] text-[clamp(2.45rem,6.15vw,4.75rem)]` | 39 → 76          |
| Marketing section    | `font-display text-3xl font-bold tracking-[-0.035em] sm:text-4xl lg:text-5xl`                   | 30 → 48          |
| App page title       | `font-display text-3xl font-semibold sm:text-4xl`                                               | 30 / 36          |
| Card / section title | `font-display text-lg font-semibold` (large cards `text-xl`)                                    | 18 / 20          |
| Body                 | `text-sm` (14px) with `leading-6` for prose                                                     | 14 / 24          |
| UI label             | `text-[15px]` in settings rows; `text-sm` in most controls                                      | 15 / 14          |
| Secondary copy       | `text-sm text-muted-foreground`, `leading-6` or `leading-7`                                     | 14               |
| Caption              | `text-xs` / `text-[13px]` muted                                                                 | 12–13            |
| Micro-label          | `text-[10px] font-semibold uppercase`                                                           | 10               |
| Metadata             | `text-[11px]` or `text-xs`, `tabular-nums` for figures                                          | 11–12            |

Rules:

- **Do not use `font-light` or weights below 400.** The app is read under pressure.
- **Do not rely on 600.** DM Sans is loaded at 400/500/700; `font-semibold` is common in components but will be synthesized or resolved by the browser. When precision matters, use 500 or 700.
- **Prose measure:** page descriptions cap at `max-w-2xl` (672px); long-form content caps at `max-w-3xl` (768px).
- **Numbers:** use `tabular-nums` for counters, XP, percentages and page numbers.
- **Wrapping:** use `text-pretty` on prose and `text-balance` on display headings where supported. Use `break-words` on page titles.
- **Letter-spacing:** marketing only. Inside `.workspace` it is reset to 0 (§2.2).
- **Ellipsis:** use the `…` character, not three periods.

### 3.4 Spacing

Tailwind's 4px scale is the unit. Common decisions:

| Intent              | Value                                                 |
| ------------------- | ----------------------------------------------------- |
| Icon ↔ label        | `gap-1.5` / `gap-2` (6 / 8px)                         |
| Button group        | `gap-2` (8px)                                         |
| Card inner padding  | `p-4` → `p-5` (16 → 20px); large panels `p-6` → `p-8` |
| Stacked form fields | `space-y-3` / `space-y-4` (12 / 16px)                 |
| Card grid           | `gap-4` (16px), `md:grid-cols-2 xl:grid-cols-3`       |
| Section rhythm      | `mb-6` under toolbars, `mt-4`–`mt-6` inside cards     |
| Page header         | `mb-8 pb-7` with a bottom border                      |
| Empty state         | `px-6 py-16`                                          |
| Settings group      | rows `px-4 py-2.5`, group `space-y-6`                 |

The page uses generous outer whitespace and tight inner rhythm: space separates **sections**, not every line.

### 3.5 Radius

| Class          | Default at `--radius: 0.75rem`           |
| -------------- | ---------------------------------------- |
| `rounded-sm`   | 8px (`radius - 4`)                       |
| `rounded-md`   | 10px (`radius - 2`)                      |
| `rounded-lg`   | 12px (`radius`)                          |
| `rounded-xl`   | **14px in the workspace** (`radius + 2`) |
| `rounded-2xl`  | **18px in the workspace** (`radius + 6`) |
| `rounded-3xl`  | 24px                                     |
| `rounded-4xl`  | 28px                                     |
| `rounded-full` | pills, switches, avatars, status dots    |

The workspace overrides `rounded-xl` and `rounded-2xl` slightly upward. Marketing cards use larger bespoke radii (`rounded-[1.75rem]`, `rounded-[2rem]`). Inputs, selects and small icon tiles stay at 6–10px; panels and cards use 14–18px; featured marketing cards use 28–32px.

Because `--radius` is user-adjustable, never hard-code a panel radius in a new component unless it is intentionally fixed (pills, dots, avatars).

### 3.6 Elevation and gradients

- **Panel:** surface gradient + 1px border + `--shadow-panel`.
- **Forge lift:** `hover-lift` = `translateY(-3px)` + `--shadow-forge`; used on marketing cards and theme swatches, not on dense list rows.
- **Primary button:** primary → primary-glow gradient with `0 12px 30px -16px` primary shadow; hover brightness 110%.
- **Glow:** `anim-glow` and the sidebar logo tile use a soft primary halo. Use at most one glowing element per view.
- **Ambient:** app background layers a static `app-aurora` at 40%, a 44px `grid-forge` at 7%, and a radial vignette at 65%. With a wallpaper, the aurora is suppressed and the image sits under a `bg-background/55` wash.

### 3.7 Iconography

- **Library:** Lucide (`lucide-react`). No second icon set.
- **Default sizes:** 16px (`size-4`) in buttons and rows; 14px (`size-3.5`) in dense chrome; 18px (`size-[18px]`, stroke 2.2) inside settings tiles; 20–24px in empty-state and feature tiles.
- **Stroke:** 2 default; 2.2 is reserved for tinted 32px setting tiles to keep them from looking thin.
- **Color:** icons inherit text color; active icons use primary. Decorative icons are `aria-hidden`; icon-only buttons need `aria-label` and a `title` where useful.
- **Emoji:** used as identity (avatar, module/course/deck emoji), never as a UI icon.
- **Status dots:** 6px (`size-1.5`) with a soft glow for "saved/local"; 4px dots in compact lists.

---

## 4. Theme system

### 4.1 Model

`src/lib/themes.ts` defines 27 preset palettes; the built-in default (Ocean Deep) makes **28 themes** as marketed. Each palette supplies six colors: `background`, `surface`, `surface2`, `foreground`, `primary`, `accent`. `themeCssVars()` derives every other token:

- `--primary-foreground` / `--accent-foreground`: `readableOn()` — luminance > 0.5 → near-black `#0b0b0b`, otherwise white.
- `--muted-foreground`: foreground mixed 66% toward background.
- `--border`: foreground at 16% alpha; `--input` at 22%.
- `--sidebar`: background 82% + surface 18%.
- `--shadow-panel`: foreground at 20% alpha.
- Status colors: green/red/amber mixed toward the palette's primary/accent so they belong in every theme.
- Deck colors: six derived mixes for deck identity.

`applyThemeToRoot()` (`src/lib/theme-dom.ts`) writes the variables to `<html>`, toggles `light`/`dark`, `contrast-high`, `colorblind`, `reduce-motion`, `focus-strong`, sets `data-btn`, `--font-scale`, `--radius` and `--speed`, and caches the resolved theme. A pre-paint bootstrap script applies the cached theme to avoid a flash.

### 4.2 Preset palettes

Hex values are the palette source; CSS variables are derived from them.

| ID              | Label          | Mode  | Background | Primary   | Accent    |
| --------------- | -------------- | ----- | ---------- | --------- | --------- |
| `ocean`         | Ocean Deep     | dark  | `#08111f`  | `#5aa9f8` | `#49c2e8` |
| `midnight`      | Midnight Ink   | dark  | `#0b0b12`  | `#8b7cff` | `#b98cff` |
| `forest`        | Forest Night   | dark  | `#0c1712`  | `#43c98a` | `#7ddba7` |
| `ember`         | Ember          | dark  | `#141010`  | `#ff8a4c` | `#ffb066` |
| `rose`          | Rose Noir      | dark  | `#150e14`  | `#ff6fa5` | `#ff9ec4` |
| `mono`          | Graphite       | dark  | `#101010`  | `#d4d4d4` | `#9a9a9a` |
| `terminal`      | Terminal       | dark  | `#05080a`  | `#3ef08a` | `#7cf5c0` |
| `paper`         | Paper          | light | `#f7f9fc`  | `#2563eb` | `#0ea5e9` |
| `sepia`         | Sepia          | light | `#f6efe3`  | `#a4632a` | `#c98a4b` |
| `mint`          | Mint Light     | light | `#f2faf5`  | `#0f9b6c` | `#3cc48f` |
| `lavender`      | Lavender       | light | `#f7f5fd`  | `#6d4aff` | `#9a7bff` |
| `high-contrast` | High Contrast  | dark  | `#000000`  | `#ffd400` | `#00e5ff` |
| `nord`          | Nord Frost     | dark  | `#2e3440`  | `#88c0d0` | `#81a1c1` |
| `dracula`       | Dracula        | dark  | `#282a36`  | `#bd93f9` | `#ff79c6` |
| `solarized`     | Solarized Dusk | dark  | `#002b36`  | `#b58900` | `#2aa198` |
| `cyberpunk`     | Cyberpunk      | dark  | `#0a0118`  | `#ff2fd0` | `#26f7fd` |
| `blueprint`     | Blueprint      | dark  | `#0a2540`  | `#7fd3ff` | `#ffffff` |
| `coffee`        | Coffee House   | dark  | `#1a1310`  | `#c98f5b` | `#e0b98c` |
| `grape`         | Grape Soda     | dark  | `#1b0f2b`  | `#a855f7` | `#a3e635` |
| `abyss`         | Deep Abyss     | dark  | `#04161a`  | `#14b8a6` | `#67e8f9` |
| `crimson`       | Crimson Noir   | dark  | `#0f0709`  | `#e11d48` | `#fb7185` |
| `vapor`         | Vaporwave      | dark  | `#1a1033`  | `#ff6ec7` | `#7af5ff` |
| `sakura`        | Sakura         | light | `#fdf4f6`  | `#e35d8a` | `#f0a0bb` |
| `arctic`        | Arctic         | light | `#f1f6fb`  | `#0b7ea8` | `#56b4d3` |
| `honey`         | Honey          | light | `#fdf7e7`  | `#c9901a` | `#e8b44a` |
| `matcha`        | Matcha         | light | `#f3f6ec`  | `#5b8c2a` | `#8bbf4d` |
| `newsprint`     | Newsprint      | light | `#f2f2ef`  | `#c0392b` | `#5a5a5a` |
| `tangerine`     | Tangerine      | light | `#fff6ef`  | `#f06a20` | `#ff9d5c` |

`default` is the stylesheet's Ocean Deep, presented in the picker as **Knowly Default — Arc blue on deep navy**. The picker also offers **Custom** (six editable hex fields) and any user-created themes.

### 4.3 Accents

The six accent presets apply **only when the default theme is active**; every other palette owns its primary/accent pair. Source: `src/lib/defaults.ts`, applied in `resolveTheme()`.

| ID          | Label     | Primary                 | Glow                    |
| ----------- | --------- | ----------------------- | ----------------------- |
| `ocean`     | Ocean     | `oklch(0.72 0.155 238)` | `oklch(0.83 0.115 210)` |
| `deep-blue` | Deep Blue | `oklch(0.62 0.18 255)`  | `oklch(0.74 0.15 245)`  |
| `cyan`      | Arc Blue  | `oklch(0.75 0.12 220)`  | `oklch(0.84 0.09 215)`  |
| `azure`     | Azure     | `oklch(0.68 0.17 235)`  | `oklch(0.79 0.13 225)`  |
| `midnight`  | Midnight  | `oklch(0.55 0.2 270)`   | `oklch(0.68 0.17 260)`  |
| `tidal`     | Tidal     | `oklch(0.66 0.15 205)`  | `oklch(0.78 0.12 210)`  |

### 4.4 Theme picker

`src/components/theme-picker.tsx`:

- Swatch grid: one column by default, 3 at `sm`, 4 at `xl`; compact mode stays 3 at `sm`.
- Each swatch previews four chips: surface, surface 2, primary, accent; active swatch gets `ring-2 ring-primary/40` and a primary check badge.
- Copy & edit creates a user theme (`… (copy)`) from any preset.
- Custom editing exposes six fields with a native color square, a hex input in mono, and a one-line hint. Invalid hex turns the border destructive.
- Icon buttons in swatches are at least 44×44px and use `currentColor` so they remain legible on the swatch background.

### 4.5 Appearance controls

`Settings → Appearance` (`src/routes/_authenticated/settings.tsx`):

| Control         | Range / options                                         | Default             |
| --------------- | ------------------------------------------------------- | ------------------- |
| Theme mode      | Light / Dark                                            | Dark                |
| Palette         | 28 themes (default + 27 presets) + custom + user themes | Knowly Default      |
| Accent          | 6 presets (default theme only)                          | Ocean               |
| Animation speed | `0.5× → 2×`, step `0.25`                                | `1×`                |
| Font scale      | `0.85× → 1.3×`, step `0.05`                             | `1×`                |
| Corner radius   | `0 → 1.5rem`, step `0.05`                               | `0.75rem`           |
| Density         | Compact / Cozy / Spacious                               | Cozy                |
| Button size     | Small / Medium / Large                                  | Medium              |
| Progress bars   | on / off                                                | on                  |
| Wallpaper       | image; opacity and blur                                 | none, `0.35`, `4px` |

Density currently changes the main content padding: compact `p-4`; cozy and spacious both `p-5 md:p-8`. Button size is applied through `:root[data-btn]` overrides in `src/styles.css` (§6.1).

### 4.6 Accessibility modifiers

| Toggle                  | Class / effect                                                                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reduced motion          | `.reduce-motion` + `prefers-reduced-motion`: all animations/transitions reduced to `0.001ms`                                                        |
| High contrast           | `.contrast-high` fallback plus the resolver: border = foreground 42% (CSS fallback 40%), input 50%, muted text = foreground 88%, sidebar border 36% |
| Colorblind-safe palette | `.colorblind`: success → `oklch(0.76 0.1 210)`, destructive → `oklch(0.5 0.19 270)`; theme-tinted status vars are dropped so the safe pair wins     |
| Strong focus indicators | `.focus-strong`: 3px primary outline, 2px offset, 5px 30% primary halo, panel radius                                                                |

### 4.7 Wallpapers

A wallpaper is stored locally, rendered `fixed inset-0` with `bg-cover bg-center`, at the user's opacity (default 0.35) and blur (default 4px), under a `bg-background/55` wash. When a wallpaper is present the aurora is suppressed. Wallpaper must never reduce text contrast; the wash is not optional.

---

## 5. Layout and shell

### 5.1 App frame

`AppShell` (`src/components/app-shell.tsx`) is the authenticated frame:

```
.workspace  min-h-screen flex
├─ ambient layers (aurora, grid, vignette)   fixed, z-0
├─ aside    sticky, h-screen, z-10, 256 / 76 / 304 px
└─ column  relative z-10
   ├─ header  sticky top-0 z-30
   ├─ mobile nav (below md)
   └─ main   key=pathname, flex-1, density padding
```

- The shell is `position: relative`; ambient layers are `pointer-events-none` and hidden in print.
- The sidebar is sticky, full viewport height, and scrolls its nav independently.
- The header is sticky and shares the page background, with a 1px gradient hairline at its bottom edge.
- `main` is keyed by pathname, so each route entrance replays `anim-fade-up`.
- `AppPage` shows a centered spinner until local state hydrates, then renders the shell. It redirects to onboarding when onboarding is incomplete.

### 5.2 Sidebar

- Width: `256px` expanded (`w-64`), `76px` collapsed, `304px` in course mode.
- Background: `--sidebar` plus a primary radial wash at 14% opacity.
- Logo tile: 44px, 1.1rem radius, gradient primary/30 → primary/10, primary ring, one soft shadow.
- Brand block: display 16px bold; a 6px success dot; profile line at 10px uppercase muted.
- Groups: 10px semibold labels, `0.18em` tracking (neutralized inside `.workspace` — see §2.2), separated by 1px rules; Home has no rule above it. Group headers collapse with `aria-expanded`.
- Nav row: `rounded-[0.9rem]`, `px-2.5 py-2`, icon tile 28px, 13px semibold label, 10px hint. Active: primary gradient wash, inset 3px primary bar, primary ring, primary icon tile, and a 6px dot. Hover: slide 2px right.
- Due badge on Daily Review: pill, primary/15, 10px bold, `99+` cap.
- Footer: level card with XP progress and a full-width collapse control.
- Course mode replaces the global nav with a course header (cover color, emoji, subject, title, progress) and an expandable curriculum. Lesson rows show completion icons; quizzes show question counts.

### 5.3 Header and mobile navigation

Header:

- Height is content-driven (`py-3`), padding `px-4 md:px-8`.
- Left: local-first pill — success pulse, hard-drive icon, _Everything saved on this device · export a copy to move it_ (hidden below `md`).
- Right: command palette trigger (`Jump to…`, `Ctrl K`), streak pill, XP pill (hidden below 480px).
- Pills: `rounded-full`, 1px border, `bg-foreground/[0.04]`, 12px text; hover border primary/50.
- On mobile, a compact logo + wordmark replaces the pill.

Mobile navigation (below `md`):

- Horizontal scroll strip under the header, `bg-surface/60`, 1px bottom border.
- Every visible item is a pill with icon + label; groups are separated by a 1px vertical rule.
- Active pill: primary/30 border, primary/12 fill, subtle primary shadow.
- Course routes replace this strip with a course bar that opens the curriculum in a scrollable panel.

### 5.4 Page container and widths

`.workspace main > *` is `width: 100%; max-width: 1440px; margin-inline: auto`. Pages then choose an inner measure:

| Content                                 | Width                |
| --------------------------------------- | -------------------- |
| Settings, focused forms                 | `max-w-2xl` (672px)  |
| Reading / study flows, empty dashboards | `max-w-3xl` (768px)  |
| Module editor, paper shelf              | `max-w-4xl` (896px)  |
| Deck/import/forge editors               | `max-w-5xl` (1024px) |
| Two-column studios, prompter            | `max-w-6xl` (1152px) |
| Libraries and dashboards                | full 1440px          |

Common layouts:

- **Library:** header → toolbar (search + count badge) → responsive card grid `gap-4 md:grid-cols-2 xl:grid-cols-3`.
- **Detail/editor:** header → `space-y-6` stack of panels, often `max-w-4xl`/`5xl`.
- **Studio:** `grid gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]`; option rail is `self-start` and `panel p-5`.
- **Settings:** centered `max-w-2xl`, `space-y-6`, iOS-style grouped cards.

### 5.5 PageHeader contract

`PageHeader` (`src/components/app-shell.tsx`) is the only shared title block:

```tsx
<PageHeader
  title="Modules"
  description="Standalone one-off lessons — a single idea, fully editable…"
  action={
    <>
      <Button variant="outline">Import module</Button>
      <Button>Module Prompter</Button>
    </>
  }
/>
```

Rules:

- Outer: `mb-8 flex flex-wrap items-end gap-4 border-b border-border pb-7`.
- Title column: `min-w-0 flex-1 basis-64`; title `break-words font-display text-3xl font-semibold sm:text-4xl`.
- Description: `mt-3 max-w-2xl text-sm leading-6 text-muted-foreground`.
- Actions: `flex min-w-0 max-w-full flex-wrap items-center gap-2`.
- **Actions wrap below the title when space runs out; they never collapse the title column.** Do not replace this with a `justify-between` row containing an unwrappable action group.
- Primary action goes last (rightmost when inline); secondary/outline actions precede it.
- Override the default bottom margin only when a page needs a tighter join (`className` is not exposed — compose a custom header only for non-page surfaces such as print previews, and then follow the same wrap rule).

---

## 6. Components

Primitives live in `src/components/ui/` and are Radix/shadcn-based. Feature components compose them; feature pages should not fork primitive styling.

### 6.1 Buttons

`src/components/ui/button.tsx`

| Variant       | Recipe                                                                                            | Use                          |
| ------------- | ------------------------------------------------------------------------------------------------- | ---------------------------- |
| `default`     | primary → primary-glow gradient, `text-primary-foreground`, primary shadow, hover brightness 110% | the one main action          |
| `outline`     | `border-input bg-background`, hover primary/40 border + accent/20 fill                            | secondary actions            |
| `secondary`   | `bg-secondary/80`, hover full secondary                                                           | tertiary/segmented contexts  |
| `ghost`       | transparent, hover accent/30                                                                      | row actions, icon buttons    |
| `link`        | primary text, underline on hover                                                                  | inline navigation            |
| `destructive` | destructive fill                                                                                  | confirmed destructive action |

Sizes (base): `default h-9 px-4`, `sm h-8 px-3 text-xs`, `lg h-11 px-7 rounded-xl`, `icon h-9 w-9`.
Base: inline-flex, center, `gap-2`, `rounded-lg`, `text-sm`, semibold, `whitespace-nowrap`, focus ring 1, disabled opacity 50, SVG 16px.

Button-size preference (`data-btn`) overrides:

| Preference | `default`                   | `sm`                 | `lg`               | `icon`    |
| ---------- | --------------------------- | -------------------- | ------------------ | --------- |
| Small      | 32px / 12px pad / 12px text | —                    | 36px / 20px / 13px | 32px      |
| Medium     | base 36px                   | base 32px            | base 44px          | base 36px |
| Large      | 44px / 24px / 15.2px        | 36px / 16px / 13.6px | —                  | 40px      |

Rules:

- One primary button per view region. In a page header, it is the last action.
- Icon-only buttons always get `aria-label`; destructive icon actions are revealed on hover/focus in cards but remain reachable by keyboard.
- Use `asChild` for links so a link looks and behaves like a button without nesting interactive elements.
- Use `press` for tactile scaling (`active:scale-0.97`) on prominent controls; do not add it to every row.

### 6.2 Inputs, selects, textareas

| Control        | Shape                                                             | Notes                                |
| -------------- | ----------------------------------------------------------------- | ------------------------------------ |
| Input          | `h-9 rounded-md border-input px-3 text-base md:text-sm shadow-sm` | transparent background, focus ring 1 |
| Textarea       | `min-h-[60px] rounded-md px-3 py-2`                               | same border/focus language           |
| Select trigger | `h-9 rounded-md border-input px-3 text-sm`                        | chevron at 50% opacity               |
| Select content | `rounded-md border bg-popover shadow-md`                          | popper placement, 8rem min width     |
| Search field   | Input + absolute 16px search icon at `left-3`, `pl-9`             | used in library toolbars             |

In the workspace, `input`, `textarea` and `select` are forced to `background-color: var(--background)`. This recesses fields into their panels. Keep that behavior; do not switch fields to `bg-surface` on a whim.

Labels are `Label` (Radix), usually `text-xs` or `text-[15px]` in settings. Helper text is `text-[11px]`–`text-[13px] text-muted-foreground`. Errors use `border-destructive` plus a plain-language message; do not rely on red alone.

### 6.3 Selection controls

- **Switch:** 36×20px track, 16px thumb, checked primary, unchecked input color, visible focus ring.
- **Slider:** 6px track at primary/20, primary range, 16px thumb with primary/50 border and background fill. Always pair with a numeric readout (`tabular-nums`) and a short hint.
- **Segmented control:** `flex rounded-xl bg-muted p-1`; active option `bg-background font-medium shadow-sm`; every option is a real button with `aria-pressed`; the group has `role="group"` and an accessible label.
- **Chip / pill toggle:** `rounded-full border px-3 py-1.5 text-[13px]`; active = primary border, primary/15 fill, primary text. Include `aria-pressed`.
- **Checkbox/task list:** GFM task lists inside module markdown; 1.5 unit right margin, 0.15em baseline nudge.

### 6.4 Panels and cards

The base surface is the `panel` utility:

```css
background: var(--gradient-surface);
border: 1px solid var(--color-border);
border-radius: var(--radius);
box-shadow: var(--shadow-panel);
```

In the workspace, `.panel:hover` shifts the border to primary at 32%.

Patterns:

- **Library card** (`ModuleCard`): `panel group relative flex flex-col overflow-hidden`; a 6px identity bar in the module color; `p-5` body; emoji tile 48px `rounded-xl bg-surface2 ring-1 ring-border`; title in display 18px; metadata 12px muted; outline badges; progress label + 8px track; footer rule + "Open module" ghost button. Delete is a ghost icon button that appears on group hover/focus.
- **Dashboard widget:** `panel p-5`, 14px muted section title with a 16px primary icon, hide control on hover/focus, body below.
- **Form panel:** `panel p-5` or `p-6`, `space-y-4/5`, section labels in 12px semibold muted.
- **Marketing feature card:** larger radius (28px), gradient white overlay, 1px white/10 border, hover lift and primary border. This treatment is for the landing page only.
- **Stat block:** 10px uppercase label, display number 20–24px bold, 9–10px hint. Keep numbers tabular.

Never nest a panel inside a panel unless the inner surface is clearly `surface-2` and smaller (input well, code block, inset row group).

### 6.5 Badges, chips and status

- **Badge:** `rounded-md border px-2.5 py-0.5 text-xs font-semibold`; variants default/secondary/destructive/outline. In libraries, `outline` is the default choice for counts ("12 blocks").
- **Status chips:** rounded-full, tinted background + matching border + icon/text. Due, saved, local, complete.
- **Counts:** pluralize literally; `0` states are usually hidden rather than shown as "0 cards".
- **Binder labels:** six fixed colors; chips carry a dot and a name, not color alone.

### 6.6 Dialogs, command palette, toasts

- **Dialog:** overlay `bg-background/80`; content `max-w-lg`, `max-h-[85dvh]`, `rounded-2xl`, `bg-surface`, `p-6`, `shadow-panel`; enter/exit fade + 95% zoom, 200ms; close button top-right, 16px, labelled.
- **Alert dialog:** overlay `bg-foreground/45`; content `bg-background`, `rounded-lg`, max 85dvh; cancel is outline, action is the default/destructive button. Use for irreversible actions only.
- **Command palette:** opened with `Ctrl/Cmd K`; dialog `p-0`, max 80dvh; 48px input row with search icon; grouped results (Pages, Decks, Actions) with 12px muted headings; selected row primary/10; empty state _Nothing matches that._
- **Toasts:** Sonner, background/foreground/border tokens, large shadow, description in muted text. Use for confirmations (`Module deleted`, `Backup downloaded`), not for errors that need a decision.
- **Tooltip/title:** native `title` is used for dense nav hints; do not add a tooltip library.

### 6.7 Progress and data display

- **Progress track:** 6–8px high, `rounded-full`, `bg-surface2` or `bg-background/60`; fill in the identity color or primary gradient; width is inline style. Always show the numeric value nearby.
- **XP / level:** level card in the sidebar; 6px track with primary gradient; `Lv n`, `into/needed XP`.
- **Streak / XP pills:** 12px semibold, primary icon, tabular numbers.
- **Charts:** use chart tokens in order; grid lines at low opacity; labels 10–12px muted; no 3D, no gradients inside data marks unless already established.
- **Tables:** header 11–12px uppercase-ish bold, cells `px-[0.65em] py-[0.5em]`, top border per row, first column left aligned. On screen, tables scroll horizontally inside a rounded bordered container.

### 6.8 Loading, empty and error states

- **Hydration/loading:** centered `size-8` spinner, 2px border, border color + primary top.
- **Preview loading:** two paper skeletons with _Preparing print preview…_.
- **Empty state:** `panel px-6 py-16 text-center`; 64px icon tile `rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20`; display 20px title; `max-w-md` 14px copy; 1–3 actions. Search-empty states explain what to try; true-empty states offer the shortest path(s) to the first item.
- **Not found:** panel with icon, title, one primary action back to the collection.
- **Error boundary:** centered column, plain-language heading, _Try again_ + _Go home_, no stack traces.
- **Destructive confirmation:** alert dialog with the object named in the title and the consequence in the description.

### 6.9 Settings rows

`Settings` uses an iOS-inspired grouped list:

- Group: 13px muted title above, `divide-y` card `rounded-2xl border bg-card/80`, optional 13px footer below.
- Row: `flex items-center gap-3 px-4 py-2.5`.
- Icon tile: 32px, 9px radius, tinted `color-mix(var(--tint) 18%, transparent)` with the icon in the same token.
- Label 15px; hint 13px muted; trailing switch/chevron/readout.
- Sliders sit in a 3-row block: label + readout, control, optional hint; controls indent by 44px when an icon tile is present.
- Profile banner: 64px emoji avatar with primary gradient and ring, display 20px name, 13px subtitle.

---

## 7. Page patterns

### 7.1 Library pages

1. `PageHeader` with a one-sentence definition and two actions.
2. Toolbar: search (flex-1, min basis 256px) + count badge or filter chips.
3. Card grid, or an empty state.
4. Destructive actions live on the card. Small, recoverable deletions can be immediate with a toast (module delete); anything with a larger blast radius uses a confirmation.

### 7.2 Editors and detail pages

- Back link or breadcrumb at 11–12px muted with a 14px arrow.
- Title block with subject/meta at 10px uppercase muted, display title 24–30px.
- Content in `space-y-6` panels; sticky action bar only if the page is long.
- Autosave where possible; explicit Save for structural edits. Toasts confirm.
- Preview panes use the real rendered component, not a mock.

### 7.3 Studios (print, prompt)

- Left rail: `panel p-5`, `space-y-5`, option groups with a 16px primary icon + 12–13px label.
- Right: live preview or generated output.
- Chips for enumerated options, switches for booleans, sliders for continuous values.
- Sticky "Print" / "Copy" action in the header; secondary "Save as PDF" beside it.
- The rail is `self-start` so it does not stretch to the preview height.

### 7.4 Settings

Centered narrow column, profile banner, then groups in this order: **Profile, Appearance, Accessibility, Study, Gamification, Data & Storage**. Each group explains itself in one footer sentence. Data & Storage ends with usage, export/import and a two-step inline erase ("Tap again to confirm erasing").

### 7.5 Landing page

The landing page is the one place with an editorial voice:

- Warm-dark hero with layered radial glows, a 26px dot grid masked to fade, and a large two-column composition.
- Display headline in a fluid clamp, gradient span, tight leading and negative tracking.
- Eyebrow pills: 10px uppercase, primary/10 fill, primary/20 border.
- Sections separated by generous 80–112px padding; cards with 28px radii and hover lift.
- Product preview built from real UI fragments (due ring, notebook page, quiz card), not a generic mockup.
- Theme gallery shows real palette backgrounds/surfaces/primaries.
- Motion is scroll-reveal (`Reveal`, threshold 0.1, negative bottom root margin) and staggered.

Marketing may use tracking, large radii and lift. The app may not import those choices wholesale.

---

## 8. Motion

All durations are divided by `--speed`, so `0.5×` halves and `2×` doubles them.

| Utility            | Duration          | Easing / behavior                                     |
| ------------------ | ----------------- | ----------------------------------------------------- |
| `anim-fade-up`     | 0.45s             | `cubic-bezier(0.22, 1, 0.36, 1)`, translateY 12px → 0 |
| `anim-fade-in`     | 0.4s              | ease-out                                              |
| `anim-pop`         | 0.32s             | overshoot to 1.03 then settle                         |
| `anim-slide-left`  | 0.35s             | translateX 24px → 0                                   |
| `anim-shake`       | 0.45s             | error feedback, ±8px decaying                         |
| `anim-glow`        | 1.6s loop         | 10px primary halo fading out                          |
| `anim-float`       | 4s loop           | ±6px                                                  |
| `anim-float-fast`  | 2.2s loop         | landing orbs                                          |
| `anim-rise`        | 1.1s              | XP/score rise and fade                                |
| `anim-spin-slow`   | 9s loop           | decorative rings                                      |
| `anim-aurora`      | 18s loop          | background position                                   |
| `anim-aurora-fast` | 6s loop           | landing wash                                          |
| `anim-grid-drift`  | 26s / 38s reverse | two counter-drifting grid layers                      |
| `shimmer`          | 2.4s loop         | loading sheen                                         |
| `hover-lift`       | 0.25s             | translateY(-3px) + forge shadow                       |
| `press`            | 0.12s             | active scale 0.97                                     |
| `stagger`          | 0.5s + 40ms steps | children fade up, first at 20ms, cap at 340ms         |

Rules:

- Entrance animation belongs to the page shell and to first-load reveals, not to every list item.
- Do not animate layout properties (width/height/top/left) in the app; the sidebar width transition is the one deliberate exception.
- `prefers-reduced-motion` and the in-app switch reduce all animations to near-zero. Never gate essential information behind motion.
- No parallax, no cursor-follow effects, no autoplaying video.

---

## 9. Accessibility

Target: WCAG 2.2 AA where the medium allows it.

- **Contrast:** body text uses foreground on background or muted-foreground on panel; the default pair is high contrast. Never place muted text on a tinted status chip without checking.
- **Not by color alone:** status chips have text/icons; active nav has a bar, ring, icon fill and dot; progress has a number; labels have names.
- **Keyboard:** every interactive element is reachable; Radix primitives handle dialogs, selects and sliders. The command palette is `Ctrl/Cmd K`. Visible focus is mandatory.
- **Focus:** default ring 1px `--ring`; strong mode gives a 3px outline + 2px offset + 5px halo. Do not remove outlines without a replacement.
- **Targets:** 44×44px for standalone icon actions (theme swatch actions, dashboard hide, settings reorder). Dense rows may be 32–36px high but their hit area spans the row.
- **Labels:** icon-only buttons get `aria-label`; dialogs get a title (may be `sr-only`); search inputs get a placeholder plus an accessible name when the placeholder is the only label.
- **State:** `aria-pressed` on toggles/chips, `aria-current="page"` on nav, `aria-expanded`/`aria-controls` on collapsibles, `aria-label` on groups.
- **Text scaling:** root font size scales 0.85–1.3. Layouts must wrap rather than clip; avoid fixed heights around text; use `min-w-0` with truncation only where the full value is available elsewhere.
- **Reduced motion:** honor both the OS and the app setting.
- **Screen reader text:** decorative emoji, icons and ornament spans are `aria-hidden`; meaningful emoji identity is paired with a name.
- **Print accessibility:** paper remains readable in grayscale; headings are real headings; tables repeat headers.

---

## 10. Content and terminology

### 10.1 Voice

- **Second person, active, concrete.** "Bring the result back to Knowly." Not "Results can be imported."
- **Short.** One idea per sentence. Prefer the verb to the nominalization.
- **Calm.** No "unleash", "supercharge", "revolutionary", "10× your learning".
- **Honest about the architecture.** Knowly writes instructions; the user's AI does the generation; the user brings the file back.
- **Kind in failure.** Explain what happened and the next action. No blame, no error codes without a translation.
- **Consistent punctuation.** Use `·` between metadata items, `—` sparingly for an aside, `…` for ellipsis, `–` for ranges, `×` for multipliers.
- **Spelling:** interface copy leans British/Australian (`colour`, `recognise`, `organise`). Existing US spellings in shipped strings ("Module color", "colorful study sheet") are not worth a churn-only change; new copy should use `colour`.

### 10.2 Canonical names

| Concept                    | Use                              | Never                                   |
| -------------------------- | -------------------------------- | --------------------------------------- |
| Generated text for an LLM  | **instructions**                 | prompt (except the product names below) |
| Deck instruction builder   | **Prompt Forge**                 | Prompt Generator                        |
| Prompt Studio mode         | **Prompt Studio**                | —                                       |
| Deck builder               | **Deck Forge**                   | —                                       |
| Course builder             | **Course Forge**                 | —                                       |
| Module instruction builder | **Module Prompter**              | Module Prompt Forge                     |
| Module hand-builder        | **Module Forge**                 | —                                       |
| Backups                    | **Snapshots**                    | Backup Center                           |
| Extra practice             | **Cram Mode**                    | Cram Session                            |
| Timed deck battles         | **Deck Arena**                   | Arena                                   |
| Saved printable papers     | **Paper Shelf**                  | Paper Library                           |
| Hard cards                 | **Trouble Cards**                | Leeches                                 |
| Weak material              | **Weak Spots**                   | Weak Topics                             |
| Scheduling difficulty      | **difficulty**                   | ease / ease factor                      |
| Lapses                     | **missed {n}×**                  | lapses                                  |
| Review queue               | **Daily Review**                 | SRS / Anki review                       |
| Study collection           | **deck**                         | folder                                  |
| Standalone lesson          | **module**                       | unit                                    |
| Structured path            | **course**                       | class                                   |
| Lesson card                | **checkpoint**                   | card (in module context)                |
| Callout in a module        | **blurb** (UI count) / note card | callout (user-facing)                   |

### 10.3 Forbidden phrasing

- **"AI-powered", "AI-generated for you", "our AI"** — Knowly has no AI. Say "the AI you use", "copy these instructions into your AI".
- **"Prompt" as a generic noun** — use "instructions". Product names are the exception.
- **Anki vocabulary** — no "leech", "ease factor", "graduating interval", "mature card".
- **Scheduled reviews / reminders / notifications** — the app computes what is due locally when opened. Never promise background scheduling, push reminders or email digests. Say "due today", "the daily review plan", "on a review schedule" only as a description of ordering, never as a notification promise.
- **Cloud, sync, account** — never imply them. Say "saved on this device", "export a copy".
- **"Free forever", "unlimited"** as marketing absolutes — not established by the product.
- **Fake urgency** — no countdowns, no "only today".

### 10.4 Microcopy patterns

| Situation            | Pattern                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page description     | What it is + what it is for, one sentence: "Standalone one-off lessons — a single idea, fully editable, with blurbs, checkpoints and activity squares." |
| Empty state          | Name the absence, then the three ways forward: "Your first module starts here."                                                                         |
| Confirmation toast   | Past tense + object: "Module deleted", "Backup downloaded".                                                                                             |
| Destructive dialog   | Verb + object in title; consequence in description; destructive action repeats the verb.                                                                |
| Field hint           | Why it matters, not what the field is: "Boxes sitting on the background."                                                                               |
| Slider hint          | What changes and which direction: "Starts at the margin — drag either way…"                                                                             |
| Error                | What failed + what to do: "That file needs a valid Knowly backup. Try exporting a fresh copy."                                                          |
| Local-first reminder | "Everything saved on this device · export a copy to move it."                                                                                           |

---

## 11. Print and document design

Print is implemented twice: the **course paper** (`src/components/print/course-paper.tsx`) and the **module paper** (`src/components/print/module-paper.tsx`), plus the **exam paper** (`src/components/print/exam-paper.tsx`). They share paper sizes, typefaces, spacing and footer styles, but the module pipeline has the stricter banded layout described below.

### 11.1 Principles

- **Paper is white, ink is dark.** Screen themes do not print.
- **Color is tint, not text.** Accents survive as bars, borders, chips and cover gradients; body ink is neutralized.
- **Every page is the same height.** Header and footer bands are always reserved, even when empty.
- **Content can never touch the footer.** A hard `max-height` plus a bottom clearance enforces it.
- **Break by meaning, not by pixel luck.** Headings keep with the next unit; tables/code split at safe boundaries; the answer key starts a new page.
- **No viewport units, no sticky elements, no hover-only information.**

### 11.2 Module paper geometry

Constants:

```ts
HEADER_H = 28;
FOOTER_H = 28;
CONTENT_BOTTOM_CLEAR = 14;
PRINT_MARGIN_PX = 48; // 0.5in, shared with the course paper
```

Paper sizes (CSS px at 96dpi):

| ID       | Size         | Portrait   |
| -------- | ------------ | ---------- |
| `a4`     | 210 × 297 mm | 794 × 1123 |
| `letter` | 8.5 × 11 in  | 816 × 1056 |
| `legal`  | 8.5 × 13 in  | 816 × 1248 |
| `b5`     | 176 × 250 mm | 665 × 945  |
| `a5`     | 148 × 210 mm | 559 × 794  |

Landscape swaps width and height.

Margins are fixed at `0.5in` (48px) on all four sides for every paper size and orientation, shared with the course paper (`PRINT_MARGIN_PX` in `course-paper.tsx`). The paper art bleeds to the sheet edge, so printing with the dialog's **Margins: None** produces the finished document. There is no margin control: a per-sheet margin choice would move the measured pagination and break the preview/print match.

Header/footer insets:

```
headerInset = max(4 − padTop, round(headerTopPct × height × 0.01))
footerInset = max(4 − padBottom, round(footerTopPct × height × 0.01))
contentHeight = max(200, height − padTop − padBottom − HEADER_H − FOOTER_H
                        − headerInset − footerInset − CONTENT_BOTTOM_CLEAR)
```

- The slider range is `−4 → +4`, step `0.5`, default `0`.
- `0` is "At the margin"; positive moves the header down / footer up (inward); negative moves them toward the paper edge.
- The clamps keep both bands at least 4px on the sheet at extreme values and small papers.
- The content row gives up exactly the inset, so the bands never overlap the flow.
- The header band has `marginTop: headerInset`; the footer has `marginBottom: footerInset` and `marginTop: auto`, which pins it to the bottom of the padded area.
- Both bands are `28px` and always rendered, so content height does not change when the header text or page number is turned off.
- Type sizes: 11.5px small, 12.5px normal, 13.5px large; line-height `1.55 × spacing` where compact `0.9`, normal `1`, relaxed `1.14`.

Sheet chrome:

- Preview sheet: `position: relative`, fixed px dimensions, `overflow: hidden`, `bg-card`, a 1px ring drawn with `box-shadow` (so the content box matches print), and a large soft shadow.
- Preview scaling: the sheet is scaled by `min(1, stageWidth / sheetWidth)` with `transform-origin: top left`; the wrapper reserves the scaled dimensions.
- Print: `@page { size: Wpx Hpx; margin: 0 }`, sheet height `H − 0.5px`, `break-after: page`, `break-inside: avoid`, no shadow, last page no break.

### 11.3 Pagination

The paginator measures a hidden flow at the true content width, font size, family and line height, then packs units:

- `clearance = round(contentHeight × 0.075)` — extra reserve below tables, code, display math, images, objectives, checkpoints, activities, and the opening card of a callout/example/notes.
- A unit that would exceed the page height moves to the next page.
- **Orphan control:** if a heading fits but the next unit would not fit with it, the heading moves too.
- **Forced breaks:** the answer-key header and user-inserted "Your page" blocks always start a new sheet.
- The first unit on a page drops its leading gap (`flush`).
- Re-pagination runs after fonts load, after images load, and whenever a `ResizeObserver` sees the hidden flow change (KaTeX and late font swaps).
- A no-op comparison prevents observer loops.

Splitting rules:

| Content           | Rule                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| Table             | Only if body rows > 16; chunks of **10 rows**; header + separator repeated on every chunk                      |
| Code fence        | Only if body lines > 38; chunks of **38 lines**; opening fence repeated and a closing fence added              |
| Paragraph         | Split at blank lines; hard-wrapped continuation lines stay with their paragraph                                |
| List              | Each item is its own unit; numbering continues across units; nested indented lines stay with the item          |
| Blockquote        | Consecutive `>` lines stay together                                                                            |
| Display math      | `$$…$$` stays glued; unclosed fences/math fall back to plain text rather than swallowing the document          |
| Callout / example | Split by paragraph; label and card shell only on the first piece; continuation pieces sit on the normal rhythm |

Unclosed fences are handled by a second pass that disables fences and math, so a stray triple-backtick never eats the rest of the module.

### 11.4 Unit rhythm

Vertical space above each unit, in px (the first unit on a page drops it):

| Unit                               | Space                       |
| ---------------------------------- | --------------------------- |
| Hero                               | 0                           |
| Objectives                         | 14                          |
| Markdown paragraph                 | 8                           |
| Markdown list item — first in list | 8                           |
| Markdown list item — subsequent    | 2                           |
| Callout / example                  | 10                          |
| Callout / example continuation     | 3                           |
| Image                              | 8                           |
| Divider                            | 12                          |
| Checkpoint                         | 14                          |
| Activity                           | 10                          |
| Notes                              | 16                          |
| Notes continuation                 | 4                           |
| Answer header                      | 22 (plus forced page break) |
| Answer item                        | 6                           |

Lists deliberately use **regular line rhythm**: each item is a unit, subsequent items are 2px apart, and the list as a whole gets the normal 8px from the prose above. Do not add extra list padding to make items look like cards.

Markdown typography on paper:

- Base 0.98em / 1.72, paragraphs `0.55em` vertical margins, no first/last margins.
- H1 1.32em bold with a 2px accent underline; H2 1.16em with a rotated 0.4em accent diamond; H3 1.03em; H4 0.95em uppercase; generous space above, tight below.
- Links: underlined with a dotted accent decoration.
- Lists: 1.9em indent, accent markers, 0.3em item margin.
- Blockquote: 3px accent bar, italic, 0.95em.
- Inline code: muted fill, 0.87em mono. Code blocks: 0.88em, muted fill, 0.5em radius, 12px padding.
- Tables: 0.72em uppercase bold headers with accent-tinted background; 0.95em cells; top borders; 0.65em horizontal padding; wrapped in a rounded bordered scroll container on screen and a plain bordered block on paper.
- Images: max-width 100%, centered, small radius.
- Horizontal rule: two hairlines with a small rotated accent diamond.

### 11.5 Cover themes

The module title sheet (page 1) and the in-flow hero (when the title page is off) use `coverTone(moduleColor, themeId)`:

- `"module"` — the module's own color; middle mixed 52% with `#0d131b`, deep `#0d131b`, glow mixed 78% accent + 24% white.
- Dark palette — start = palette primary, middle = primary 52% + palette background, deep = palette background, glow = palette accent 74% + white 26%.
- Light palette — all stops are **deepened** so white cover ink stays legible: start = primary 78% + `#10161f` 22%, middle = primary 34% + `#0d131b` 66%, deep = primary 30% + `#0d131b` 70%; glow = accent 62% + white 38%.

The gradient stack, top to bottom:

1. Top scrim: `linear-gradient(180deg, rgba(8,12,20,.26), transparent 26%)`.
2. Glow: `radial-gradient(130% 120% at 88% -15%, glow, transparent 55%)`.
3. Body: `linear-gradient(158deg, start, middle 62%, deep 100%)`.

Cover composition:

- Full-bleed sheet, inner padding 13% horizontal / 9% vertical.
- Double thin white frame, inset `padX × 0.55` and `+7px`.
- Ghost emoji at top right, 9em, 12% opacity.
- Top line: `KNOWLY` left, `Module · {subject}` right, 0.72em uppercase, wide spacing.
- Center block: 80px emoji tile, title 2.5em bold / 1.14 leading, ornament rule, chips (minutes, Intro/Core/Advanced, checkpoint count), up to four objectives with diamond bullets.
- In-flow hero: 24px radius, 6em/5em padding, 14px emoji tile, title 1.68em, meta chips. It carries no running header on its page.

Difficulty labels are `Intro`, `Core`, `Advanced` (index 1–3). Never print "easy/medium/hard" on a cover.

### 11.6 Print palette

`modulePrintStylesheet()` does not force every element gray. It pins the theme variables to a light reading palette:

```css
--foreground: #1f2937;
--muted: #eef1f5;
--muted-foreground: #6b7280;
--border: #9ca3af;
--card: #ffffff;
```

It also pins `.text-foreground`, `.text-muted-foreground`, `.border-border` and `.border-foreground`, keeps images unfiltered, sets `print-color-adjust: exact`, and hides the editor panel. Inline accents (labels, callout borders, badges, cover gradients, white-on-color text) remain colored.

Callout tones on paper:

| Tone         | Label     | Border     | Background | Ink       |
| ------------ | --------- | ---------- | ---------- | --------- |
| `info`       | Note      | indigo 35% | indigo 8%  | `#3b5bdb` |
| `tip`        | Tip       | green 40%  | green 10%  | `#127a4a` |
| `warning`    | Watch out | amber 45%  | amber 11%  | `#a05e0a` |
| `definition` | Key idea  | violet 40% | violet 10% | `#7048c8` |
| `example`    | Example   | green 40%  | green 10%  | `#127a4a` |

Footer styles: `3 / 9` (count), `Page 3 of 9` (formal), `3` (minimal), `None`. The left footer always carries the module title when a page number is shown.

### 11.7 Course and exam papers

**Course paper options** (`src/components/print/course-paper.tsx`):

- Sizes: A4, US Letter, Legal, B5, A5; portrait/landscape.
- Margins: a fixed `0.5in` (48px) on all four sides, shared with the module paper. The sheet is exactly the printed page, so the themed wash and accent edge reach the edge while the words keep their margin.
- Footer safety: `FOOTER_KEEPCLEAR = 25`, footer height `20`, bottom offset `max(25, round(padBottom × 0.32))`, floor `offset + 20 + 25` = 70px minimum from the sheet bottom. Content height uses `max(padBottom, footerFloor(padBottom))`.
- Covers: **Themed** (the paper theme designs the cover) or **Plain** (white title page with accent rules).
- **Covers are per theme, not one gradient for everyone.** `coverDesign()` in `src/components/print/cover-designs.tsx` returns `{ dark, surface, ink, muted, line, fill }` for the selected paper theme and `CoverOrnament()` draws its art. `dark` is the contract: light themes (lab report, workbook, manuscript, newspaper, comic, botanical) print dark ink on a pale surface; dark themes (classic, module, field notes, blueprint, terminal) print light ink. No combination can put pale type on a pale cover. The cover's own `--cover-ink` / `--cover-muted` / `--cover-line` / `--cover-fill` are set inline, so the cover reads them instead of the sheet palette. Print friendly replaces the paint with white paper and drops the ornament.

| theme | surface | ornament |
| ----- | ------- | -------- |
| `classic` | accent → deep navy gradient | double hairline frame, top rule |
| `module` | accent gradient, glow at top right | vertical accent spine, arc, centre rule |
| `field-notes` | ink-green gradient | dashed frame, masking tape, dot grid |
| `blueprint` | gridded deep blue | double frame, title-block rule |
| `terminal` | near-black with scanlines | monospace frame, prompt line |
| `lab-report` | white → pale blue grid | crop marks, "Specimen sheet" |
| `workbook` | cream/white with an accent edge | spine bar, punched holes, ruled lines |
| `manuscript` | parchment | twin frames, diamond corner marks |
| `newspaper` | newsprint | masthead rules, column rule, "Vol. I" |
| `comic` | cream with an accent halftone | heavy ink border, burst |
| `botanical` | pale green wash | leaf sprig, soft corner arc |

All covers are CSS and inline SVG: vector, offline, and identical to what prints.
- Breaks: Flow / new page per module / new page per lesson.
- Footer: count / "Page n of m" / plain / none.
- Typeface: Modern sans (`var(--font-sans)`, Segoe UI, Arial) or Classic serif (Georgia, Cambria, Palatino, Times).
- Font scale 11.5 / 12.5 / 13.5px; spacing compact 0.9 / normal 1 / relaxed 1.14.
- Includes: cover, table of contents, answer key, notes, running header.
- The course paper forces a page break before each section and before the answer key, keeps sections breakable, and prints callouts/chips in color.
- `Full design` prints the theme palette (accent ink, covers, washes); `Print friendly` flattens the sheet to neutral ink on white to save toner.
- **The sheet is paper, not UI.** `.paper-skin` (in `src/styles.css`) pins the whole reading palette — `--foreground: #1f2937`, `--card: #ffffff`, `--muted-foreground: #5b6472`, `--border: #9ca3af`, `--primary: var(--exam-accent)`, plus success/warning/destructive — **in both media**, not only inside `@media print`. This is the rule that keeps body text black: the app's default theme hands out a near-white `--foreground` on a dark card, and inheriting it painted the words white on white paper. Pinning only at print time also made the studio preview disagree with the printer. The sheet now declares `color: #1f2937` and `color-scheme: light` itself, so a theme can never make the words pale. The print stylesheets still repeat the palette and add explicit `.text-foreground` / `.text-muted-foreground` / `.text-card-foreground` overrides as a second line of defence.
- **Accent, corrected once.** Because `--exam-accent` is applied in both media, `readableAccent()` deepening (below) runs for the preview too, so the accent you see is the accent that prints. The resolution probe lives on `<body>`, not inside the sheet: `.paper-skin` maps `--primary` to the accent, so resolving a token like `var(--deck-1)` inside the sheet would walk a `var()` cycle. It runs in a layout effect so the unresolved token never paints.
- **Identity colours are measured, then deepened only if needed.** `course.color` / `module.color` are usually `var(--deck-1)`, which resolves to `--primary`: in a dark theme that is a pale colour (blueprint ships `#ffffff`), which would print invisible and make white-on-accent badges vanish. `readableAccent()` in `src/lib/print-colors.ts` resolves the token, checks WCAG contrast against white and mixes toward ink only until it reaches 4.5:1. Because the ratio is computed against white, white type on the accent fill is legible by the same number. Already-legible accents are returned untouched.
- The measured accent is written to `--exam-accent` (and mirrored to `--exam-accent-print` for the print stylesheets) on the `.paper-skin` root, so the preview and the printer share one value. Palettes that already pass are returned untouched. `resolveCssColor()` falls back to painting a pixel on a 1×1 canvas when the computed colour is in a space it does not parse (`oklch()`, `lab()`), so a token accent is never silently replaced by the default blue.
- **Save as Word file** builds the same composition through `src/lib/course-docx.ts` (the module studio shares that builder). Identity colours arrive as CSS tokens (`var(--deck-3)`), so they are resolved to hex through a DOM probe before docx sees them — docx rejects anything that is not a six-digit hex value.

**Exam paper** (`src/components/print/exam-paper.tsx` + `src/lib/exam-print.ts`):

- Always white paper, black ink, light color scheme, regardless of theme. Theme variables are pinned (`--foreground: #111`, `--border: #d4d4d4`, etc.).
- Five paper themes: Classic exam, Study sheet, Field notes, Lab report, Revision workbook. Each defines accent/soft/border and a distinct surface treatment (rule, card masthead, dashed field notes, technical grid, workbook spine).
- Seven offline font stacks: Normal, Classic, Book serif, Clean sans, Friendly, Typewriter, Handwritten. No downloaded fonts.
- Question blocks avoid breaking inside; the answer key always starts a new page.
- The sheet prints full bleed: the paper's own stylesheet zeroes the `@page` margin, `.exam-paper` carries a 0.5in content margin that `box-decoration-break: clone` repeats on every page, and a page-sized `::before` carries the theme art across the whole sheet (the paper's own background would stop at its last line on the final sheet). Printing with the dialog's **Margins: None** therefore produces the finished document. `print-friendly` drops that backdrop, since it has no art to bleed.
- Header/footer text, name/class lines, instructions, points, columns, spacing, answer lines, numbering and option case are all configurable.

### 11.8 Print QA checklist

Before shipping a print change:

1. Build and open the real print studio; do not judge from CSS alone.
2. Print to PDF and inspect every page at 100%.
3. Confirm the content bottom is above the footer top with at least 14px clearance (module) or 25px (course).
4. Include a stress document: a table > 16 rows, a code fence > 38 lines, a split callout, a heading at a page floor, and a long unbroken word.
5. Toggle every footer style and both header/footer insets to ±4.
6. Check A5 and landscape, the smallest supported geometry.
7. Confirm the answer key starts on a fresh page and every table chunk repeats its header.
8. Confirm grayscale legibility: no meaning is carried by color alone.
9. Confirm no `.print-hide` chrome, editor panel, hover state or scrollbar appears.
10. Confirm the last page does not emit a blank trailing sheet.

---

## 12. Responsive behavior

Default Tailwind breakpoints: `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`.

| Range  | Behavior                                                                                                                                 |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `< md` | Sidebar hidden; mobile pill nav under the header; page padding `p-5`; cards stack; studio rails stack above previews; action groups wrap |
| `md`   | Sidebar visible (256px); header local-first pill appears; page padding `md:p-8`                                                          |
| `lg`   | Wider marketing grids; some two-column feature layouts                                                                                   |
| `xl`   | Studio rail + preview; library grids reach 3 columns; theme picker reaches 4 columns                                                     |
| Large  | Main content caps at 1440px and centers                                                                                                  |

Rules:

- Prefer wrapping (`flex-wrap`, `min-w-0`, `basis-64`) over hiding actions.
- Data tables scroll horizontally inside their own container; the page never scrolls sideways.
- Truncation is allowed for titles in dense rows, but the full value must be available via `title` or the detail view.
- Test at 320px wide and at 1.3× font scale. Neither may clip a primary action.

---

## 13. Do and don't

### Do

- Use `PageHeader` for every app page and let actions wrap below the title.
- Use the `panel` utility for card surfaces and `--surface-2` for inset wells.
- Use semantic tokens (`bg-primary`, `text-muted-foreground`, `border-border`) and `color-mix` for tints.
- Keep one primary button per region; put it last in the action group.
- Use display type for titles and numbers, body type for prose.
- Pair every color-coded state with text or an icon.
- Use 44px targets for standalone icon actions.
- Use `tabular-nums` for counters and page numbers.
- Write "instructions", not "prompt"; name the product surfaces exactly.
- Keep AI external in copy **and** code: no network AI calls, no keys, no hidden generation.
- Treat print as a measured document: reserve bands, split long tables/code, keep headings with their next unit.
- Make the default palette and spacing look finished before adding options.

### Don't

- Don't hand-roll a page header with `justify-between` that squeezes the title.
- Don't use `tracking-*` for hierarchy inside `.workspace`; it is neutralized.
- Don't hard-code Ocean blue, a hex, or a Tailwind palette color in chrome. (Binder labels and user data colors are the intentional exceptions.)
- Don't use `--primary` as a large fill outside the printed cover.
- Don't nest dialogs, or stack more than two surface elevations.
- Don't animate every card on scroll, and don't animate layout properties.
- Don't use color alone for correctness, due state, or selection.
- Don't promise scheduled reviews, notifications, sync, accounts or cloud storage.
- Don't say the app uses AI, is AI-powered, or generates content itself.
- Don't use Anki vocabulary ("leech", "ease", "mature").
- Don't let paper content rely on hover, sticky positioning, viewport units or theme colors for text.
- Don't add a table or code block to print without checking the split thresholds.

---

## 14. Contribution checklist

### Adding or changing a component

- [ ] Uses semantic tokens only; correct in dark, light and at least one high-contrast palette.
- [ ] Works at 0.85× and 1.3× font scale.
- [ ] Keyboard reachable with visible focus; labels on icon-only controls.
- [ ] States covered: default, hover, active, focus, disabled, loading, empty, error.
- [ ] Motion uses the shared utilities and respects reduced motion.
- [ ] Actions wrap; title column keeps its minimum width.
- [ ] No new hard-coded radius, shadow or duration unless it is a documented exception.

### Adding a color token

1. Add the light value in `:root`/`.light` and the dark value in the palette derivation if it is themeable.
2. Register it in `@theme inline` as `--color-<name>: var(--<name>)`.
3. Add it to `themeCssVars()` if presets must derive it.
4. Verify contrast in all 28 presets and in high-contrast mode.
5. Document it here.

### Adding a theme

- Provide all six palette colors, a mode, a label and a one-line blurb.
- Derive nothing by hand; `themeCssVars()` handles the rest.
- Check the theme picker swatch, sidebar, primary button, muted text, input border and print cover.
- Keep the marketing claim in sync (currently "28 themes" = default + 27 presets).

### Changing print

- Follow §11.8.
- Keep `HEADER_H`, `FOOTER_H`, `CONTENT_BOTTOM_CLEAR` and the `contentHeight` formula in sync across preview, paginator and print stylesheet.
- Never remove the print-time `max-height`/`overflow: hidden` guard on `.paper-content`.
- Re-check the 9-page stress document after any pagination change.

### Before committing

```bash
npm run build
npm test
npm run lint
```

`npm run typecheck` currently fails only on the remote Supabase stubs because `@supabase/supabase-js` is not in `package.json`. Do not treat that as a design regression; fix it separately if you touch that integration.

---

## Appendix A — Quick token reference

```
Surfaces      background · surface · surface-2 · card · popover · sidebar
Text          foreground · muted-foreground · card-foreground · popover-foreground
Action        primary · primary-foreground · primary-glow · accent · accent-foreground
State         success · warning · destructive (+ foregrounds)
Lines         border · input · ring · sidebar-border
Data          chart-1…5 · deck-1…6
Shape         --radius (0.75rem), radius-sm…4xl, rounded-full
Type          font-display (Space Grotesk) · font-sans (DM Sans) · font-mono (JetBrains Mono)
Motion        --speed (1), anim-fade-up/in, pop, slide-left, shake, glow, float, rise, aurora, grid-drift, shimmer
Layout        workspace max 1440px; page measures 672 / 768 / 896 / 1024 / 1152
Print         A4 794×1123 · Letter 816×1056 · Legal 816×1248 · B5 665×945 · A5 559×794
              HEADER_H 28 · FOOTER_H 28 · CONTENT_BOTTOM_CLEAR 14 · footer floor course 70
```

## Appendix B — Source map

| Area                                         | File                                                           |
| -------------------------------------------- | -------------------------------------------------------------- |
| Tokens, base styles, motion, print/exam CSS  | `src/styles.css`                                               |
| Palettes, derivation, contrast               | `src/lib/themes.ts`                                            |
| Theme application, bootstrap                 | `src/lib/theme-dom.ts`                                         |
| Accents, defaults, grading, subjects         | `src/lib/defaults.ts`                                          |
| App frame, sidebar, PageHeader               | `src/components/app-shell.tsx`                                 |
| Auth page wrapper / hydration                | `src/components/app-page.tsx`                                  |
| Buttons                                      | `src/components/ui/button.tsx`                                 |
| Inputs / textarea / select / switch / slider | `src/components/ui/{input,textarea,select,switch,slider}.tsx`  |
| Badge                                        | `src/components/ui/badge.tsx`                                  |
| Dialog / alert / command / toast             | `src/components/ui/{dialog,alert-dialog,command,sonner}.tsx`   |
| Theme picker and custom themes               | `src/components/theme-picker.tsx`                              |
| Command palette                              | `src/components/command-palette.tsx`                           |
| Module markdown typesetting                  | `src/components/module-markdown.tsx`                           |
| Landing page language                        | `src/routes/index.tsx`                                         |
| Settings patterns and controls               | `src/routes/_authenticated/settings.tsx`                       |
| Library card pattern                         | `src/routes/_authenticated/modules.index.tsx`                  |
| Dashboard widgets / stat blocks              | `src/routes/_authenticated/dashboard.tsx`                      |
| Prompt Studio mode switch                    | `src/components/prompt-studio-nav.tsx`                         |
| Course paper options and geometry            | `src/components/print/course-paper.tsx`                        |
| Module paper pagination, covers, bands       | `src/components/print/module-paper.tsx`                        |
| Module print studio                          | `src/routes/_authenticated/modules.$moduleId.print.tsx`        |
| Exam paper themes and fonts                  | `src/lib/exam-print.ts`, `src/components/print/exam-paper.tsx` |
| Question type labels                         | `src/lib/answers.ts`                                           |
| Binder label colors                          | `src/lib/labels.ts`                                            |
| Review grades and scheduling                 | `src/lib/srs.ts`                                               |
| Brand mark                                   | `src/components/brand/logo.tsx`, `src/assets/knowly-logo.png`  |
