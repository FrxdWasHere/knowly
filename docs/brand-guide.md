# Knowly Brand & Design Guide

**The homepage language: paper, ink, colour blocks and hard shadows.**

| | |
| --- | --- |
| **Status** | Current marketing language, reverse-engineered from the shipped homepage |
| **Applies to** | The public surface: landing page, campaign pages, social cards, decks, stickers, print promos |
| **Source of truth** | `src/routes/index.tsx` — if this guide and the page disagree, the page wins and this guide gets corrected |
| **Does not apply to** | The authenticated workspace, which has its own language in [`docs/design-guide.md`](./design-guide.md) (Ocean surfaces, hairline borders, soft glow) |
| **Last reviewed** | November 2026 |

This is a working guide, not a mood board. Every rule below is traceable to a class string, a token, or a measured contrast ratio. Where the shipped page breaks its own rules, that is written down in §14 instead of being quietly copied.

---

## Contents

1. [Brand foundation](#1-brand-foundation)
2. [Design principles](#2-design-principles)
3. [Colour](#3-colour)
4. [Typography](#4-typography)
5. [Layout & page rhythm](#5-layout--page-rhythm)
6. [Shape, borders & elevation](#6-shape-borders--elevation)
7. [Components](#7-components)
8. [Iconography & emoji](#8-iconography--emoji)
9. [Motion](#9-motion)
10. [Voice, tone & copy](#10-voice-tone--copy)
11. [Logo, imagery & social assets](#11-logo-imagery--social-assets)
12. [Accessibility](#12-accessibility)
13. [Tokens & implementation](#13-tokens--implementation)
14. [Governance, known gaps & QA](#14-governance-known-gaps--qa)
15. [Appendix A — homepage copy deck](#appendix-a--homepage-copy-deck)
16. [Appendix B — one-page cheat sheet](#appendix-b--one-page-cheat-sheet)

---

## 1. Brand foundation

### 1.1 In one line

**Knowly is the study app that refuses to be another subscription.** Everything a student needs to learn — cards, notes, review scheduling, progress — in one place, free, and on their own device.

### 1.2 Positioning

> For students who are tired of juggling five apps and paying for all of them, Knowly is a single, free, offline-first study workspace that shows you what you actually don't know — without an account, a subscription, or a data trail.

The competitive frame is not "another flashcard app". It is **the pile of apps**, the **$9.99/month**, and the **all-nighter**. The homepage names those enemies directly, and the brand's confidence comes from picking fights a student recognises rather than from feature lists.

### 1.3 The four promise pillars

Every section on the homepage is a proof of one of these. New pages should attach to at least one.

| Pillar | The promise | Proof the page must show |
| --- | --- | --- |
| **Free, actually** | No trial, no premium tier, no card | "Free forever" stated plainly, with what the catch *isn't* |
| **One place** | Cards, notes, review and progress together | A concrete list of the tools it replaces |
| **Yours alone** | On-device, offline, no account, no tracking | The backup file, the offline claim, the privacy story |
| **Honest about the work** | Studying is hard; Knowly makes it shorter, not magic | Real numbers, weak-spot detection, no "effortless" language |

### 1.4 Audience

Students aged roughly 16–26: sixth form, college, university. Broke, busy, sceptical, extremely fluent in app UI and ad language. They can smell hype at ten paces and they have already been burned by a study app that paywalled their own notes.

What lands: specificity, self-deprecation, visible effort, a screenshot that looks like a real product.
What backfires: corporate reassurance, stock photography, gradients-and-blur "AI" imagery, the word *seamless*.

### 1.5 Personality

The brand is **the friend two years ahead of you who is annoyingly good at exams and genuinely wants you to pass** — loud, funny, a little chaotic, never condescending.

| We sound like | We never sound like |
| --- | --- |
| A poster on a dorm wall | A SaaS landing page |
| A study buddy who has also cried over a chemistry exam | A tutor who is disappointed in you |
| Someone who says "here's the actual trick" | Someone who says "unlock your potential" |
| Confident, specific, a bit blunt | Hypey, vague, breathless |
| Warm about the student, merciless about the problem | Warm about the company |

### 1.6 Brand story (reusable, ~80 words)

> Every study app starts free and ends up charging you rent on your own notes. So we built the opposite: one workspace for cards, notes and review, running on your device, with no account to create and nothing to cancel. It is loud, it is friendly, and it costs nothing — because the person who needs it most is the person with the least money and the least time. That is the whole business model.

### 1.7 Name and wordmark

- The name is **Knowly**, always one word, always capital K, never `Know.ly`, `Knowly™` in body copy, or `KNOWLY` except in a deliberate display lockup.
- The wordmark is set in **Space Grotesk 700 at `text-2xl`, `tracking-tight`**, paired with the mark inside a 56px tile (§11.1). It is never letter-spaced, never italicised, never given a shadow of its own (the tile owns the shadow).
- Naming a feature: title case in navigation and headings ("Smart Study System"), ALL CAPS only when it is a badge or a button ("TRY IT FREE").

### 1.8 Tagline system

| Level | Line | Where |
| --- | --- | --- |
| **Primary tagline** | *Study smarter, not harder.* | Footer, bios, app stores, print |
| **Campaign line** | *STOP juggling apps. Study SMARTER.* | Hero, paid social, posters |
| **Belief line** | *Study smarter, not harder. Free forever, works offline, respects your privacy.* | Footer description |
| **Micro-tag** | *100% FREE & LOCAL* | Chips, stickers, badge lockups |

Rules: the primary tagline is sentence case with a full stop and is never broken across lines. The campaign line keeps its mixed casing — `STOP` in caps inside a colour block, `SMARTER` in caps inside the gradient device, connectives lowercase. Do not "fix" that into title case; the casing *is* the rhythm.

---

## 2. Design principles

**1. Ink first.**
Black is structural, not decorative. Text, borders, and shadows are all pure `#000000`. If a layout is not readable in black and paper alone, colour cannot save it.

**2. Paper, not glass.**
The base is warm off-white `#FFFBF5`. No blur, no translucency, no glassmorphism, no soft ambient shadows. Depth is drawn, not simulated.

**3. One loud block per idea.**
Colour lives in discrete rectangles with hard edges. A card is one colour. A badge is one colour. Nothing gradients softly behind text.

**4. Rotate, then stop.**
Containers tilt ±1–2°. Body copy never tilts. Rotation is a wink, not a theme.

**5. Shadows report elevation.**
The shadow offset tells you how high a thing sits. A bigger offset means a bigger lift, and hover *increases the lift* by moving the object away from its shadow.

**6. Emoji is punctuation, not iconography.**
One emoji closes a headline like an exclamation mark. It never replaces an icon in a control.

**7. Every claim is keepable.**
The design is loud, so the copy must be true. A page that shouts "10K students" and "87% better grades" without a source spends the brand's credibility (§10.4).

**8. Borders do the hierarchy work.**
A 4px rule separates sections; a 3px rule separates details. There are no hairlines, no shadow-only dividers, no "just some space" between major areas.

---

## 3. Colour

### 3.1 Palette

Eight colours, no more. Values are the ones shipped on the homepage.

| Swatch | Name | Hex | Role | Ink on it | Measured contrast |
| --- | --- | --- | --- | --- | --- |
| ⬜ | **Paper** | `#FFFBF5` | Page canvas | Ink | **20.37:1** |
| ⬛ | **Ink** | `#000000` | All text, all borders, all shadows | Paper `#FFFBF5` | **20.37:1** |
| 🟥 | **Coral** | `#FF6B6B` | Primary action, urgency, "the problem" | Ink (7.57) or white (2.78 ✗) | **7.57:1** with ink |
| 🟨 | **Lemon** | `#FFE66D` | Highlighter, markers, mobile nav bar | Ink | **16.79:1** |
| 🟪 | **Grape** | `#A855F7` | Brand depth, "premium without paying" | White (large only) 3.96 / ink 5.31 | **5.31:1** with ink |
| 🟩 | **Mint** | `#34D399` | Success, promises, "this is fine" | Ink | **10.92:1** |
| 🟦 | **Sky** | `#60A5FA` | Information, features, "student" | Ink | **8.26:1** |
| 🩷 | **Bubblegum** | `#EC4899` | Playful accent, gradient partner | White (large only) 3.53 / ink 5.95 | **5.95:1** with ink |
| ⬜ | **White** | `#FFFFFF` | Cards inside colour sections, secondary buttons | Ink | **21:1** |

Contrast values are WCAG 2.x ratios computed from the hex pairs (recomputed November 2026). "Large only" means ≥18.66px bold / ≥24px regular.

### 3.2 Colour distribution

Think in areas, not accents:

- **~60% paper.** The canvas, and the inside of most cards.
- **~20% white.** Cards that sit inside a colour band, secondary buttons, the how-it-works section.
- **~15% colour blocks.** Badges, stat tiles, feature cards, the privacy band.
- **~5% black.** Type, borders, shadows, and one or two inverted headline blocks per page.

Two places may take a **full-width colour field**: the stats band (coral → grape → lemon, left to right) and the closing CTA (coral → grape → lemon, to bottom-right). The mint privacy band is a full field of a single flat colour. Those three are the loudest moments on the page and should stay rare — never stack a colour band directly against another colour band without a 4px black rule between them.

### 3.3 Pairing matrix

Use this instead of guessing. ✅ = any size, ⚠️ = large/bold text only, ❌ = never text.

| Fill ↓ / Ink → | Ink | White | Paper |
| --- | --- | --- | --- |
| Paper `#FFFBF5` | ✅ 20.37 | ❌ 1.03 | — |
| White `#FFFFFF` | ✅ 21.00 | ❌ 1.00 | ✅ 1.03 |
| Coral `#FF6B6B` | ✅ 7.57 | ❌ 2.78 | ❌ 2.69 |
| Lemon `#FFE66D` | ✅ 16.79 | ❌ 1.25 | ❌ 1.21 |
| Grape `#A855F7` | ✅ 5.31 | ⚠️ 3.96 | ❌ 3.84 |
| Mint `#34D399` | ✅ 10.92 | ❌ 1.92 | ❌ 1.86 |
| Sky `#60A5FA` | ✅ 8.26 | ❌ 2.54 | ❌ 2.47 |
| Bubblegum `#EC4899` | ✅ 5.95 | ⚠️ 3.53 | ❌ 3.42 |
| Black `#000000` | — | ✅ 21.00 | ✅ 20.37 |

**The rule that falls out of this table:** *ink goes on colour.* Black text on a coloured block is always the safest and most on-brand choice — it also matches the marker-pen aesthetic better than white text does. White is reserved for **grape**, **bubblegum**, and **black** blocks, and only at large display sizes.

### 3.4 If you need white on coral

The shipped primary button is white on coral at 2.78:1, which fails AA for every text size. Two legitimate fixes:

1. **Preferred — switch to ink.** `bg-[#FF6B6B] text-black` measures 7.57:1 and stays 100% recognisable as the Knowly button.
2. **If white is required** (e.g. paid social art), darken the fill to **Coral Deep `#D93636`** — white reaches 4.63:1 while the hue is unchanged.

Never fix it by increasing weight alone; weight does not change contrast.

### 3.5 Text-safe inks for paper

Coloured *text* on paper needs its own token. The display colours are fills, not inks.

| Name | Hex | Ratio on paper | Use |
| --- | --- | --- | --- |
| **Coral Ink** | `#C0272D` | **5.71:1** | links, inline emphasis, price/cost copy |
| **Grape Ink** | `#7E22CE` | **6.77:1** | secondary links, private/premium nods |
| **Bubblegum Ink** | `#C2185B` | **5.70:1** | playful emphasis |
| **Sky Ink** | `#1D4ED8` | **6.50:1** | informational links |
| **Mint Ink** | `#047857` | **5.32:1** | success copy ("Saved") |
| **Lemon Ink** | `#B8860B` | **3.16:1** | **not for text** — borders and UI marks only |

The homepage's footer link hover (`hover:text-[#FF6B6B]`) is currently a 2.69:1 instance of this problem; `Coral Ink` is the drop-in replacement.

### 3.6 Gradients

Three gradients exist. Do not invent more.

| Gradient | Recipe | Use |
| --- | --- | --- |
| **Mark gradient** | `linear-gradient(135deg, #FF6B6B, #A855F7)` | The 56px logo tile, and nothing else |
| **Spectrum band** | `linear-gradient(90deg, #FF6B6B, #A855F7, #FFE66D)` | Stats band only |
| **Spectrum wash** | `linear-gradient(to bottom right, #FF6B6B, #A855F7, #FFE66D)` | Closing CTA only |
| **Gradient type** | `linear-gradient(90deg, #A855F7, #EC4899)` + `-webkit-text-stroke: 2px black` | One display phrase per page, at ≥40px |

Gradient type is the brand's most distinctive device and its most fragile: it is **only** legal on display sizes with the black stroke, never on body copy, never without the stroke.

### 3.7 Colour do / don't

| Do | Don't |
| --- | --- |
| Give a whole card one colour | Tint a card's four corners differently |
| Use lemon as a marker behind a word | Use lemon as body text |
| Keep colour blocks flat | Add inner gradients, noise or blur to a block |
| Use black for every border | Use grey borders (`border-gray-300`) |
| Let black text carry a colour block | Assume white text is "cleaner" — measure it |

---

## 4. Typography

### 4.1 Families

| Role | Family | Loaded weights | Notes |
| --- | --- | --- | --- |
| Display | **Space Grotesk** | 500, 600, 700 | Geometric, slightly quirky, holds up at 88px |
| Body / UI | **DM Sans** | 400, 500, 700 | Humanist, wide apertures, good at 14px bold |
| Mono | **JetBrains Mono** | 400, 500 | Numbers in data, code, hex values; not used on the homepage |

Loaded once in `src/routes/__root.tsx` via the Google Fonts stylesheet, with `display=swap` and preconnect to both font hosts. `--font-display`, `--font-sans` and `--font-mono` are declared in `src/styles.css`; headings (`h1–h4`) inherit the display family automatically.

> **Weight caveat, worth knowing before you design a layout.** The homepage uses `font-black` (900) extensively, but **Space Grotesk has no 900** (its range ends at 700) and only 500/600/700 are loaded. So `font-black` displays as the 700 face — and in DM Sans, where 900 exists but is not loaded, the browser may synthesise it. The heavy look on the page comes from *size, tight tracking and 0.95 leading*, not from a 900 weight. **Write `font-bold` in new work**; treat `font-black` as a legacy alias.

### 4.2 Scale

| Token | Recipe | px | Use |
| --- | --- | --- | --- |
| **Display XL** | `font-display font-bold text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.95] tracking-tighter` | 40 → 88 | Hero headline |
| **Display L** | `font-display font-bold text-[clamp(2.5rem,6vw,5rem)] leading-[0.95]` | 40 → 80 | Closing CTA headline |
| **H2** | `font-display font-bold text-4xl sm:text-5xl lg:text-6xl` | 36 / 48 / 60 | Section headings |
| **H3** | `font-display font-bold text-2xl` | 24 | Card titles, feature names |
| **Stat** | `font-display font-bold text-4xl` | 36 | Numbers in stat cards |
| **Lead** | `text-lg sm:text-xl font-bold leading-relaxed` | 18 / 20 | Section intro paragraphs, hero subcopy |
| **Body** | `text-base font-bold` | 16 | Card descriptions, footer copy |
| **Body S** | `text-sm font-bold` | 14 | Card bullets, fine print, legal strip |
| **Micro-label** | `text-sm font-bold uppercase tracking-wider` | 14 | Stat labels, footer column heads |
| **Badge** | `text-base font-bold` (+ `uppercase` when it is a statement) | 16 | Eyebrow badges, chips |
| **Button L** | `font-bold text-xl` | 20 | Hero + closing CTA |
| **Button M** | `font-bold text-lg` | 18 | Secondary CTA, inline CTAs |
| **Button S** | `font-bold text-sm` | 14 | Header CTA, nav pills |

Rules:

- **Minimum weight is 700.** There is no light, regular or medium text on the public surface. This is not an accident — the page is designed to be read on a phone, in a lecture hall, at 1am.
- **Line height:** display 0.95–1.05; H2/H3 1.1–1.25; lead 1.625; body 1.375–1.5. Never set display leading above 1.1 — the blocky look depends on lines nearly touching.
- **Tracking:** `tracking-tighter` on display only; `tracking-wider` on ALL-CAPS micro-labels only; everything else `0`.
- **Measure:** lead paragraphs cap at `max-w-2xl` (672px). Card copy caps at its card. Never let a paragraph run the full 1280px container.
- **Numbers:** stat values and money are `tabular-nums`; never letter-space a number.
- **Ellipsis:** the `…` character. Ranges use `–`, multipliers use `×`, separators use `·`.

### 4.3 Casing

| Element | Case | Example |
| --- | --- | --- |
| Headlines | Mixed, with deliberate caps inside blocks | `STOP` / `juggling` / `10 apps` / `Study SMARTER` |
| Section headings | Sentence case | "We know studying SUCKS sometimes" |
| Badges | Title case or ALL CAPS | "Super Simple", "100% FREE", "Privacy That Doesn't Suck" |
| Buttons | ALL CAPS | "GET STARTED FREE", "TRY IT NOW — IT'S FREE" |
| Card titles | Title case | "AI Flashcard Magic", "Know What You Don't Know" |
| Body | Sentence case | "No account, no subscription, no BS." |
| Micro-labels | ALL CAPS, tracked | "FASTER STUDYING" |

The mixed casing inside headlines is a rhythm device: caps mark the stressed word, lowercase carries the connectives. When writing a new headline, read it aloud — the caps should land where your voice would rise.

### 4.4 Headline devices

Five devices are allowed. Use **at most three per headline** and **never two different devices on the same word**.

1. **Colour block** — a phrase sits in a rotated coral/black/blue rectangle. `rotate-[-1deg] bg-[#FF6B6B] px-4 py-2 text-white`
2. **Marker highlight** — a lemon (or white) bar sits *behind* the words, slightly rotated, at `h-2`–`h-4`. The text sits above it in a `relative z-10` span.
3. **Gradient type** — purple → pink fill, clipped to text, with a 2px black stroke, rotated ±1°, display size only.
4. **Inversion** — black block, white text, for the two or three most important words on the page.
5. **Emoji full stop** — one emoji at the end of a headline line, at the same optical size as the type, never in the middle of a word.

```
relative inline-block
├─ span.relative.z-10   ← the words
└─ span.absolute.bottom-0.left-0.right-0.h-3.bg-[#FFE66D]   ← the marker
```

### 4.5 Typography do / don't

| Do | Don't |
| --- | --- |
| Break display lines yourself with `<br />` | Let an 88px headline wrap wherever the browser likes |
| Keep display leading at 0.95 | Use 1.4 leading "for readability" at display size |
| Use one typeface pair | Add a third family for a "handwritten" accent |
| Use `text-pretty` / `text-balance` on prose and headings | Leave orphans and single-word last lines |
| Set emphasis with weight 700 + colour | Use italic; the brand has almost no italics |

---

## 5. Layout & page rhythm

### 5.1 Container and widths

| Purpose | Width | Class |
| --- | --- | --- |
| Primary container | 1280px | `mx-auto max-w-7xl px-5 sm:px-8` |
| Centred hero content | 1152px | `max-w-6xl` |
| Closing CTA content | 896px | `max-w-4xl` |
| Lead paragraph | 672px | `max-w-2xl` |
| Privacy proof grid | 768px | `max-w-3xl` |

Gutter is **20px below `sm`, 32px above**. Nothing full-bleeds except colour bands, the sticky header, and the footer.

### 5.2 Section anatomy

Every section follows the same skeleton, which is why a page assembled from these parts reads as one voice:

```
<section class="px-5 py-20 sm:px-8 sm:py-32">          ← rhythm
  <div class="mx-auto max-w-7xl">                       ← container
    badge        rotated, 4px border, hard shadow        ← eyebrow
    h2           display, 36→60px                        ← claim
    lead         max-w-2xl, 18→20px bold                 ← explanation
    grid         mt-12 / mt-16, gap-6 / gap-8            ← evidence
    cta          one primary button + microcopy          ← next step
```

- **Vertical rhythm:** `py-20` (80px) mobile, `py-32` (128px) desktop for content sections. Bands that only separate (`py-12`) are for the stats strip.
- **Gaps between heading and content:** `mt-12` for grids, `mt-16` for a heavier join.
- **Grid gaps:** `gap-6` (24px) for compact tiles, `gap-8` (32px) for cards.
- **Section separators** are `border-y-4 border-black` — a real 4px rule, never a subtle tint change.
- **Surface alternation:** paper → colour band → paper → white band → paper → dot paper → colour band → gradient → white footer. Never place two identical surfaces next to each other without a rule.

### 5.3 Grids and breakpoints

| Content | Mobile | Tablet | Desktop |
| --- | --- | --- | --- |
| Stats | 1 col | 2 col (`sm`) | 4 col (`lg`) |
| Pain points | 1 col | 2 col (`md`) | 2 col |
| How it works | 1 col | 3 col (`md`) | 3 col |
| Features | 1 col | 2 col (`md`) | 3 col (`lg`) |
| "Why Knowly" | 1 col | 2 col inner cards | 2 col asymmetric (`lg:grid-cols-[1.05fr_0.95fr]`) |
| Privacy proof | 1 col | 2 col (`sm`) | 2 col |

Breakpoints are Tailwind defaults: `sm` 640, `md` 768, `lg` 1024, `xl` 1280. The page has exactly one behaviour change at `md` — the horizontal nav becomes a stacked nav strip plus a lemon scroll bar — and one at `lg` — the two-column "Why Knowly" split appears.

### 5.4 Header

- Sticky, `top-0 z-40`, 80px tall (`h-20`), paper background, `border-b-4 border-black`. Opaque, not translucent: the border is the whole effect.
- Left: logo tile (56px) + wordmark. Centre/right: nav pills (desktop only). Far right: one primary CTA.
- Nav pills are **buttons, not links**: `rounded-xl border-3 border-black bg-white px-4 py-2 text-sm font-bold`, flat by default, lifting on hover.
- Below `md`, the nav becomes a horizontal scroll strip on a **lemon band** (`border-t-4`, `bg-[#FFE66D]`) with `text-xs` pills, and the CTA stays in the header.
- Sticky rules: the header is the only sticky element on the page. Nothing else competes for `z-30`–`z-40`.

### 5.5 Footer

Two columns at `md` (`1.2fr 1.8fr`), 64px of vertical padding, `border-t-4` above. Brand column carries the mark, a one-sentence description, and a mint "100% FREE & LOCAL" chip. The three link columns use `→` prefixes and slide 4px right on hover. A lemon bottom bar (`border-t-4`, `py-6`, `text-sm font-bold`) carries the copyright and the closing statement — always a statement, never just links.

---

## 6. Shape, borders & elevation

### 6.1 Radius ladder

| Radius | px | Use |
| --- | --- | --- |
| `rounded-lg` | 8 | Mobile nav pills — the only 8px radius on the page |
| `rounded-xl` | 12 | Badges, header CTA, nav pills, icon tiles |
| `rounded-2xl` | 16 | Logo tile, hero buttons, big badges, backup-file tile |
| `rounded-3xl` | 24 | All content cards (features, pain points, steps, privacy) |
| `rounded-full` | 999 | Check bullets, circular badges, dots |

Not one component on the homepage is square. The "brutalist" feel comes from the thick border and offset shadow, not from sharp corners — so a radius is expected, and a second radius on the same element is not. Nested elements step down one rung (a 24px card with a 16px inner well).

### 6.2 Border widths

| Width | Class | Use |
| --- | --- | --- |
| **4px** | `border-4` | Structural: cards, buttons, badges, section rules, header/footer, header CTA |
| **3px** | `border-3` | Detail: nav pills, chips, check bullets, tags, mini emoji tiles |
| **2px** | `border-2` | Reserved for controls under 32px tall (not yet on the homepage) |
| **1px** | — | Never on the public surface; hairlines belong to the workspace language |

Borders are always `border-black`. There is no coloured border except white/30 decorative shapes.

### 6.3 Hard shadow ladder

The shadow is a solid black offset with zero blur: `shadow-[Npx_Npx_0px_0px_rgba(0,0,0,1)]`.

| Offset | Use |
| --- | --- |
| **4px** | Logo tile, nav pills (on hover), small badges, chips |
| **5px** | Corner stickers |
| **6px** | Stat cards, sub-feature cards, secondary CTA, large badges |
| **8px** | Feature cards, pain-point cards, step cards, primary CTA, backup card |
| **10px** | Closing CTA button |
| **12px** | Hover state of 8px cards |
| **16px** | Hover state of the 10px CTA |

**The lift rule:** shadow offset ≈ how large and important the object is. On hover, move the object up and left by `N` and grow the shadow offset by `N` — so a small card goes `-2px / 4→6`, a large card `-4px / 8→12`, the hero CTA `-6px / 10→16`. The distance between object and shadow stays visually constant; only the height changes.

Always offset **down-right** (positive x, positive y). A negative offset reads as a printing error, not a style.

### 6.4 Rotation system

| Angle | Element |
| --- | --- |
| `0` | Body copy, lead paragraphs, long cards, forms, footer |
| `±1°` | Buttons, feature cards, inner feature cards, logo-adjacent chips |
| `±2°` | Stat cards, section badges, how-it-works cards, pain-point cards |
| `±7°` | Corner stickers ("STUDY ANYWHERE") |
| `12°–30°` | Decorative geometry only, at 20% opacity, never content |

Rules:

- Alternate direction across a row (odd cards tilt one way, even the other) — that is what makes the grid feel hand-placed instead of misaligned.
- A rotated element needs breathing room: parents that clip use `overflow-hidden` at the section level, and cards keep `p-6`–`p-8` so text never approaches a tilted edge.
- Never rotate anything a user must click at small sizes below `0°`/−2° on mobile — ±1° only.
- Text is never rotated on its own axis; only the container is.

### 6.5 Backgrounds and textures

Three devices, all cheap and all flat:

1. **Dot grid** — `radial-gradient(rgba(0,0,0,0.09) 1px, transparent 1px)` at `28px 28px` for the hero; `rgba(0,0,0,0.13)` at `26px 26px` where the section needs more teeth. Always on the section itself, always under content, never inside a card.
2. **Colour field** — a full-bleed flat colour (`bg-[#34D399]` privacy band) with a 4px rule top and bottom.
3. **Gradient band** — the two spectrum gradients in §3.6, with decorative shapes layered at 20–30% white.

Decorative geometry: 96–144px squares, rounded squares and circles, `border-4 border-black`, rotated 12°–30°, at 20% opacity, `pointer-events-none`, in a full-bleed absolute wrapper. **Two to four per section, maximum** — they are seasoning.

### 6.6 Layering rule

At most **three surface levels** on any screen: paper (canvas) → white (card) → colour block (emphasis). A fourth needs a black block, which is a hard stop. Never nest a bordered card inside a bordered card of the same colour; use white-on-colour instead.

---

## 7. Components

Every recipe below is the shipped class string. Copy it, don't approximate it.

### 7.1 Buttons

**Primary** — one per view region.

```
rounded-2xl border-4 border-black bg-[#FF6B6B] px-8 py-4 font-bold text-xl text-white
rotate-[-1deg] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]
```

Swap `text-white` for `text-black` in new work: the shipped button is white-on-coral at 2.78:1, which fails AA (§3.4). Ink keeps the look and passes at 7.57:1.

**Secondary** — same geometry, paper fill, one notch quieter (18px label, 6px shadow, `rotate-[1deg]`).

```
rounded-2xl border-4 border-black bg-white px-8 py-4 font-bold text-lg rotate-[1deg]
shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
```

**Header CTA** — compact variant: `rounded-xl border-4 border-black bg-[#FF6B6B] px-6 py-3 text-sm font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:bg-[#ff5555] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`. It is the one button that both lifts and darkens, because it is the only CTA competing with a sticky header. Do not copy that double effect onto buttons inside the page.

**Nav pill** — flat until hover: `rounded-xl border-3 border-black bg-white px-4 py-2 text-sm font-bold transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`.

Button rules:

- ALL CAPS on primary CTAs, sentence case on soft CTAs ("See how it works"). Mixing both on the same row is correct — caps = the thing you want done.
- Labels are verbs plus an object: "GET STARTED FREE", "TRY IT NOW — IT'S FREE", "Start studying smarter". Never "Submit", "Continue", "Learn more".
- Every primary CTA gets `ArrowUpRight`; inline flow CTAs get `ArrowRight`.
- Minimum touch target 44px: `px-8 py-4` clears it; the mobile nav pill (30px) does not — see §12.4.
- Focus is never removed. Use the focus recipe in §12.2.

### 7.2 Badges, chips and stickers

**Eyebrow badge** (above a section heading):

```
inline-block rotate-[-2deg] rounded-2xl border-4 border-black bg-[#FFE66D] px-6 py-3
font-bold uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
```

**Hero badge** (smaller, icon + label): `inline-flex items-center gap-2 rotate-[-2deg] rounded-xl border-4 border-black px-4 py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]` with a `size-5` Lucide icon.

**Sticker** (corner label, 14px): `rotate-[7deg] rounded-xl border-4 border-black bg-[#FF6B6B] px-4 py-2 text-sm font-bold shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]`.

**Inline tag** (inside a card): `rounded-lg border-3 border-black bg-[#FFFBF5] px-3 py-1 text-sm font-bold`, prefixed `✓`.

Badges are statements, not metadata: "100% FREE", "WORKS OFFLINE", "10K+ STUDENTS", "Super Simple", "Everything You Need". If the badge could be a tooltip, it is not a badge.

### 7.3 Cards

Five archetypes, one geometry. All: `border-4 border-black`, `rounded-3xl` (or `rounded-2xl` for compact), `p-8`, hard shadow, slight rotation, `transition-all` + hover lift.

| Archetype | Fill | Anatomy |
| --- | --- | --- |
| **Feature card** | one palette colour | 56–60px emoji → H3 uppercase → white/80 quote box (3px border) → check list |
| **Pain-point card** | one palette colour | 60px emoji → H3 uppercase → problem at 80% → white inner box with mint check + solution in caps |
| **Step card** | one palette colour, centred | numbered circle badge at `-top-3 -right-3` (rotated 12°) → 72px emoji → H3 → description → arrow connector |
| **Stat card** | one palette colour, centred | 48px emoji → 36px number → 14px uppercase tracked label |
| **Sub-card** | **white** | 44px colour icon tile (4px border) → H3 → 14px description |

Non-negotiable details:

- The **quote box** inside a feature card uses `bg-white/80` and `border-3`, in `text-sm font-bold uppercase` — it is the student's voice, not marketing's.
- **Check bullets** are `size-5 rounded-full border-3 border-black bg-white` with a `size-3` Check icon, `mt-0.5`, `gap-2`. Never a default `<ul>` bullet, never a coloured dot.
- Cards in a grid stretch to equal height (`h-full`), and the `Reveal` wrapper carries `className="h-full"` so the lift is consistent.
- Hover lift is **one step** (8px → 12px). Cards do not scale, do not change colour, do not reveal new content.

### 7.4 Lists

- Bulleted proof lists: check-in-circle markers, `space-y-2`, `text-sm font-bold`, one line each where possible.
- Footer link lists: `→` prefix, `space-y-2`, `font-bold`, hover slides 1 unit right and turns Coral Ink.
- No nested lists on the public surface. If a list needs sub-points, it is a table or a second card.

### 7.5 Comparison blocks (problem → solution)

The pain-point pattern is one of the brand's strongest assets and should be reused:

```
[emoji]  [TITLE IN CAPS]
[problem, 80% opacity, plain]

┌───────────────────────────────────────────┐
│ (✓)  [SOLUTION IN CAPS, 14px bold]        │   ← white box, 4px border, 16px radius
└───────────────────────────────────────────┘
```

The problem is stated in the student's words and never softened. The solution is short enough to fit two lines. Keep the ratio of problem to solution at roughly 1:1.5 — the page names the pain, then answers it.

### 7.6 Data & proof components

- **Backup-file card** (privacy section): white, `rounded-3xl`, 8px shadow, lemon 64px icon tile, mono-ish filename, size line, and a row of `rounded-lg border-3` tags. This is the proof pattern for "your data is yours": show the actual artefact.
- **Trust row**: four items, each a `size-6` mint circle with a check plus a bold label, `gap-4`, wrapping. Used directly under the hero CTAs.
- **Microcopy line**: one bold line under a CTA, items separated by `•`, with one phrase marker-highlighted in lemon. Example: "No download • No sign-up • No credit card • Start in 30 seconds".

### 7.7 Form controls (extrapolated — not yet on the homepage)

When a public page needs an input (newsletter, feedback), build it from the same primitives — do not borrow the workspace's hairline fields:

- Input: `rounded-xl border-4 border-black bg-white px-4 py-3 text-base font-bold`, `placeholder:text-black/40`, focus per §12.2, `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`.
- Label: `text-sm font-bold uppercase tracking-wider`, 8px above the field.
- Error: keep the black border, add a `bg-[#FF6B6B]` inline message with black text and a Check-style icon in a white circle — never a red hairline.
- Toggle: 4px black border, black fill when on, white when off; no shadow.

These are new work; validate them against §3.3 before shipping.

---

## 8. Iconography & emoji

**Icons — Lucide, exactly one set.**

| Size | Class | Where |
| --- | --- | --- |
| 16px | `size-4` | Inline in small text, check bullets |
| 20px | `size-5` | Badges, inline CTA arrows |
| 24px | `size-6` | Feature icon tiles, buttons |
| 32px | `size-8` | Logo inside the tile, backup-file icon |

Stroke is 2 by default, `stroke-[3]` only for connector arrows and large standalone glyphs. Icons inherit `currentColor`; on colour they are black, on black they are white. Decorative icons get `aria-hidden`; icon-only buttons get `aria-label`.

**Emoji — punctuation.**

| Use | Size | Rule |
| --- | --- | --- |
| End of a headline | Same optical size as the type | One per headline, at most two per page |
| Card illustration | 48–72px (`text-5xl`–`text-7xl`) | One per card, always in the same position |
| Stat card | `text-5xl`, above the number | Chosen from the stat's meaning, not its mood |
| Sticker / badge tail | Inline in the label | One, at the end |

Rules: an emoji never appears in the middle of a sentence, never in a button label, never in navigation, never twice in a row, and never as the only carrier of meaning. Multiple emoji on one line ("🎒 ... 🧠 ... ✨") is allowed **only** in the hero, where it is a deliberate rhythm.

**Hard rule — no face emoji.** Faces (and people, hands and body parts used as faces) are banned everywhere: the app, the homepage, settings, onboarding, docs, screenshots and store copy. They are the fastest way to make a study tool look like a group chat, and they carry mood instead of meaning. Substitute an object, a symbol or a weather glyph:

| Retired face | Replacement | Why it works |
| --- | --- | --- |
| 😫 (cramming pain) | 🎒 | The bag is the workload, not a person suffering it |
| 😰 / 😩 (anxiety, dread) | ❓ | Names the emotion as a question the product answers |
| 🤝 (the deal) | none — cut the glyph | The sentence carries it: "GETS YOU not your wallet" |
| 🙂 😐 😵 (mood check-in) | ☀️ ⛅ 🌧️ | Weather is a scale everyone already reads at a glance |
| 😴 (late night) | 🌙 | Time of day, no person implied |
| 🧗 (progress) | 🧭 | Direction, not effort-face |

What is allowed: objects (🎒 🔥 📚 🧠 ✨ 🌙 🧭 ☀️ ⛅ 🌧️), symbols (🔒 ❓ ✅ ⚡ ⭐), and the arrow/connector set. Avatars use objects and symbols for the same reason. If a string needs a face to make sense, the sentence needs rewriting instead.

---

## 9. Motion

Motion exists to confirm that the page is alive, not to show off. Everything is short, everything is one-shot, nothing loops except decoration.

| Behaviour | Spec |
| --- | --- |
| **Section reveal** | `anim-fade-up`: 0.45s, `cubic-bezier(0.22,1,0.36,1)`, translateY 12px → 0, fires once at 10% visibility with `rootMargin: 0 0 -8% 0` |
| **Stagger** | 60–80ms between siblings; delays used on the page run 60 → 320ms |
| **Hover lift** | 0.2–0.25s, translate up-left by 2/4/6px, shadow +2/+4/+6 |
| **Colour hover** | Header CTA darkens to `#ff5555`; footer links turn Coral Ink |
| **Link slide** | Footer arrows translate 4px right |
| **Connector arrow** | Static; no draw-on animation |

Implementation note: `Reveal` starts at `opacity-0` and only receives `anim-fade-up` when it intersects. That means **content is invisible without JavaScript and without IntersectionObserver** (there is a fallback for a missing observer, not for a never-firing one). Keep the reveal for above-and-near-fold content short, and never put the only copy of a claim inside a late reveal.

Reduced motion: the global `@media (prefers-reduced-motion: reduce)` rule in `src/styles.css` collapses all durations to 0.001ms, and `animation: ... both` still ends in the visible state. Honour it; do not add JS that re-enables motion.

Prohibited: parallax, scroll-jacking, cursor followers, marquees, autoplaying video, looping attention-seekers, anything that moves while the user reads.

---

## 10. Voice, tone & copy

### 10.1 Principles

1. **Say the thing.** Short declaratives. "Stop juggling apps." Not "Consolidate your study workflow."
2. **Be on the student's side, not the product's.** The enemy is cramming, app sprawl, and subscriptions — never the student.
3. **Concrete over abstract.** "724 KB" beats "lightweight". "Pen pressure (feels real!)" beats "natural input".
4. **Funny, then useful.** A joke buys attention; the next sentence must pay it back with information.
5. **Never punch down.** Self-deprecation is fine. Mocking a struggling student is not.
6. **Keep the claims.** §10.4.
7. **Punctuate consistently.** `·` between metadata items, `—` for an aside, `…` for ellipsis, `–` for ranges, `×` for multipliers, `•` between microcopy items.
8. **Spelling:** interface copy leans British/Australian (`colour`, `organise`, `personalise`); shipped US strings in product names ("Course Organization") are not worth a churn-only change. New copy uses British spelling.

### 10.2 Patterns

**Headline formula (claim + twist):**

```
[VERB/ADJECTIVE IN CAPS] + [lowercase connective] + [specific noun] + [emoji]
STOP juggling 10 apps. Study SMARTER in ONE place ✨
What you study is NOBODY'S BUSINESS 🔒
```

**CTA verb set:** GET STARTED FREE · TRY IT FREE · TRY IT NOW — IT'S FREE · Start studying smarter · See how it works. Every CTA contains either *free* or *start*; most contain both ideas.

**Proof microcopy:** always concrete, always short, always separated by `•`: "No download • No sign-up • No credit card • Start in 30 seconds".

**Card quote (student speak):** a second line under every feature title, in the student's voice, uppercase, in a white box. Examples: "Stop wasting 2 hours making cards", "Remember for the final, not just the quiz", "For when typing doesn't cut it". This is the single most repeatable device on the page — it converts a feature into a benefit without marketing language.

**Email/empty/error voice:** plain, kind, actionable. "That page took a wrong turn. The library is still on your device — head back to the dashboard."

### 10.3 Terminology

| Concept | Say | Never |
| --- | --- | --- |
| The product | Knowly | the app, the platform, our solution |
| The user | you / students | users, learners (in marketing) |
| The competitor set | the 10 apps | "competitors", naming a rival in ad copy |
| Pricing | free, free forever | freemium, free tier (implies a paid tier) |
| Data location | on your device, offline | the cloud, server-side |
| AI features | works with ChatGPT, Claude, any AI | powered by our AI (unless it truly is) |
| Backup | one file, JSON backup | sync |

### 10.4 Claims governance

The page shouts, so every number has to survive being asked "says who?". Current status of the shipping claims:

| Claim on the page | Status | Action |
| --- | --- | --- |
| "100% FREE", "Free forever" | **True and verifiable** — no paywall exists | Keep |
| "Works offline", "No account" | **True** — local-first, no account service | Keep; keep the service worker honest |
| "No tracking ever", "Your data stays yours" | **True** — no analytics shipped | Keep; this is the brand's spine |
| "10K+ STUDENTS" | **Unverifiable** — the product does not collect telemetry, so it cannot count them | Replace with a qualitative line ("Built with study groups") or publish a source |
| "87% BETTER GRADES", "5+ HOURS SAVED", "10× faster studying" | **Unsubstantiated** | Drop, footnote, or replace with a measurable product number (cards created, minutes to first review) |
| "AI flashcards in seconds", "PDF → flashcards instantly" | **Overpromises the architecture.** The privacy page is explicit: Knowly writes instructions you paste into your own AI and brings the file back | Reword to the real flow: "Paste your AI's output, get clean cards" |
| "Works with ChatGPT, Claude, ANY AI" | **True** — it is a file format | Keep; it is the strongest honest claim |
| "Import from Quizlet" | Verify against the importer before reusing | Keep only if the path exists |

Rule for new pages: **if a claim needs a footnote you don't have, it doesn't ship.** The brand's advantage is that its loudest lines are literally true; one invented statistic spends that.

### 10.5 Words we don't use

seamless · unleash · supercharge · revolutionary · game-changing · empower · elevate · next-generation · AI-powered (as a benefit) · best-in-class · effortless · transform your learning · journey · solution · disruptive · "10× your learning".

Also avoid: exclamation marks in body copy (they belong in buttons and badges), scare quotes around product features, and any sentence that starts with "Introducing".

### 10.6 Copy recipes

| Slot | Formula | Example |
| --- | --- | --- |
| Hero headline | stop + the pain + the fix | "STOP juggling 10 apps. Study SMARTER in ONE place" |
| Section heading | "we know X" or "here's how X" | "We know studying SUCKS sometimes" |
| Feature title | 2–4 words, title case | "Know What You Don't Know" |
| Feature quote | the complaint it removes | "Stop studying stuff you already know" |
| Stat label | 1–3 words, caps, no verb | "FASTER STUDYING" |
| CTA | verb + free | "GET STARTED FREE" |
| Microcopy | four reassurances | "No download • No sign-up • No credit card • Start in 30 seconds" |
| Footer statement | the promise in caps | "NO ACCOUNT • NO TRACKING • YOUR DATA STAYS YOURS" |
| Privacy badge | the promise, colloquially | "Privacy That Doesn't Suck" |

---

## 11. Logo, imagery & social assets

### 11.1 The mark

`src/assets/knowly-logo.png` — a **blue flame** on a deep navy rounded square, in two blue tones (a mid Arc-blue body with a paler core). It is the same artwork used for the desktop app icons (`src-tauri`), so it must not be redrawn, recoloured or outlined per surface.

| Property | Rule |
| --- | --- |
| File | `src/assets/knowly-logo.png` (bundled via Vite), `public/favicon.png` for the tab |
| Aspect | Square; always rendered with `object-contain` |
| Display size | 56px tile (`size-14`) with 32px mark (`size-8`); 36px tile with 16px mark in dense contexts |
| Tile | `rounded-2xl border-4 border-black bg-gradient-to-br from-[#FF6B6B] to-[#A855F7] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]` |
| Clear space | Minimum 8px of unbroken paper around the tile; 1× tile-width on marketing art |
| Minimum size | 24px tile for the mark; 20px tall for the wordmark |

**The colour tension is deliberate.** The mark is cool blue on navy — the workspace's identity — while the marketing surface is warm coral and paper. The **tile's coral→grape gradient is the bridge**: it is the only place the two palettes touch, which is why the tile must always be present when the mark appears on a marketing page. Never place the blue mark directly on a coral or lemon field; never re-colour the flame to match a section.

For one-colour contexts (single-colour print, embroidery, a dark photo), the flame may be rendered as a **solid black silhouette** on paper or a **solid white silhouette** on black — outline-only or gradient-filled variants are not approved.

### 11.2 Wordmark lockup

Tile + `Knowly` in Space Grotesk 700, `text-2xl`, `tracking-tight`, black, `gap-3`. Three approved arrangements:

1. **Horizontal** (default): tile left, wordmark right, optically centred against the tile.
2. **Stacked**: tile above wordmark, both centred — for square social crops.
3. **Tile only**: favicon, app icon, avatar, sticker.

Never: wordmark inside the tile, wordmark in a colour other than black/white, tagline baked into the lockup, drop shadow on the type.

### 11.3 Favicon and app icon

The favicon is the mark as-is. At 16–32px the navy field does the work; do not simplify the flame further. Any new icon size should be exported from the same master PNG rather than redrawn.

### 11.4 Social & OG cards

There is currently **no OG image asset** — the page declares `og:title`, `og:description`, `og:type` and `twitter:card`, so social shares render text-only. A proper card should be generated from this language:

| Property | Spec |
| --- | --- |
| Size | 1200 × 630 (also export 1200 × 1200 and 1080 × 1350 for feeds/stories) |
| Field | Paper `#FFFBF5` with the 28px dot grid at 9% ink |
| Structure | Badge top-left → headline (Display L, 3 lines max, one device) → lockup bottom-left |
| Rules | 4px black frame inset 24px; up to two decorative shapes at 20%; one emoji maximum |
| Text limit | Headline ≤ 8 words; no body copy on the card |
| Format | PNG, sRGB, ≤ 300 KB |

### 11.5 Imagery

There is **no photography** in this language, and no illustration system. The "imagery" is: flat colour fields, dot grids, black-outlined geometry, emoji, and screenshots of the real product in a 4px black frame with an 8–12px offset shadow. A product screenshot must show real content (real deck names, real progress) and must be framed, never floated.

If a future page needs an illustration, build it from the same kit — 4px black outlines, flat fills from the eight-colour palette, one accent per figure — rather than commissioning a different style.

### 11.6 Presentation & print

Slides, one-pagers and stickers use the same rules with these adjustments: paper background, 4px frame, one Display XL or H2 per slide, stat cards for numbers, and no rotation on body text. Print in CMYK with Coral `#FF6B6B` ≈ `C0 M65 Y60 K0`, Lemon `#FFE66D` ≈ `C0 M8 Y65 K0`, Grape `#A855F7` ≈ `C55 M70 Y0 K0`, Mint `#34D399` ≈ `C65 M0 Y55 K0`, Paper `#FFFBF5` as unprinted stock where possible.

---

## 12. Accessibility

Target: **WCAG 2.2 AA**, with the caveat that this language is loud on purpose — the job is to keep the loudness and lose the barriers.

### 12.1 Contrast debt to fix

Measured on the shipped page:

| Element | Current | Ratio | Fix |
| --- | --- | --- | --- |
| Primary CTA (hero, header, closing) | white on coral | **2.78** | Ink on coral (7.57) — or Coral Deep `#D93636` if white is required |
| "100% FREE" hero badge | white on coral | **2.78** | Same |
| Stats band, grape + coral tiles | white on colour | **3.96 / 2.78** | Ink on both (5.31 / 7.57) |
| Footer link hover | coral on paper | **2.69** | Coral Ink `#C0272D` (5.71) |
| "3 STEPS" inline emphasis | coral on paper | **2.69** | Coral Ink |
| Grape "not your wallet" block | white on grape, 40px bold | 3.96 | Acceptable as large text; keep ≥24px bold |

Everything else on the page — black on paper, black on lemon/mint/sky, black on white — is AAA and should stay that way.

### 12.2 Focus

The homepage currently has **no visible focus style** on its custom buttons and links. Required:

```
focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-black
```

On black or grape fields, switch the outline to white (or lemon) so it is visible against the fill. Never `outline-none` without a replacement, and never rely on the hover lift as focus feedback.

### 12.3 Screen readers

- Decorative emoji in headlines (`🎒`, `🧠`, `✨`, `🔒`) are currently announced; wrap them in `<span aria-hidden="true">`. Face emoji are banned outright (§8) — never reintroduce one as an accessible label either.
- Meaningful emoji (a card's illustration) get an adjacent text label — the card title already provides it, so mark the emoji `aria-hidden`.
- Decorative geometry wrappers are `pointer-events-none` — add `aria-hidden` as well.
- Section headings are real `h2`/`h3` in order; the hero is the only `h1`.
- Anchor links (`#how-it-works`, `#features`, `#for-you`, `#privacy`) must land on elements with matching `id`, and the sticky 80px header needs `scroll-margin-top: 96px` on those targets or the heading hides underneath.

### 12.4 Targets and text

- 44 × 44px minimum. The mobile nav strip pills (`px-3 py-2 text-xs` ≈ 30px tall) need `py-2.5`–`py-3` and `min-h-11`.
- Minimum text is 14px; the only 12px use is the mobile nav. Uppercase micro-labels stay ≥12px and `tracking-wider` — below that they lose word shape.
- Layouts must wrap, not clip: rotated cards, long ALL-CAPS titles and 88px headlines all need `break-words` and generous padding before truncation.
- Text never sits on decoration; the dot grid stays ≥20% lighter than the ink on top of it.

### 12.5 Motion and transparency

- Honour `prefers-reduced-motion` (already global) and never gate content behind an animation.
- No flashing, no parallax, no motion at the edge of the viewport while reading.
- The page is fully opaque — no glass, no scrims — so contrast is static and predictable. Keep it that way.

### 12.6 Not-by-colour-alone

Every coloured card carries an emoji, a title and a label, so meaning survives greyscale — keep that property. The stat band's four colours are decoration; the numbers and labels carry the data. The pain-point grid is distinguishable by emoji and title, not by fill.

---

## 13. Tokens & implementation

### 13.1 A token block you can paste

The homepage currently hard-codes hexes inline. Adding the tokens below (Tailwind v4 `@theme`) to `src/styles.css` would make the language enforceable without changing a single pixel:

```css
@theme {
  /* surfaces */
  --color-paper: #fffbf5;
  --color-ink: #000000;

  /* brand block colours */
  --color-coral: #ff6b6b;
  --color-lemon: #ffe66d;
  --color-grape: #a855f7;
  --color-mint: #34d399;
  --color-sky: #60a5fa;
  --color-bubblegum: #ec4899;

  /* text-safe inks for paper */
  --color-coral-ink: #c0272d;
  --color-grape-ink: #7e22ce;
  --color-bubblegum-ink: #c2185b;
  --color-sky-ink: #1d4ed8;
  --color-mint-ink: #047857;

  /* hard shadows: offset ladder */
  --shadow-pop-1: 4px 4px 0 0 #000;
  --shadow-pop-2: 6px 6px 0 0 #000;
  --shadow-pop-3: 8px 8px 0 0 #000;
  --shadow-pop-4: 10px 10px 0 0 #000;
  --shadow-pop-5: 12px 12px 0 0 #000;
  --shadow-pop-6: 16px 16px 0 0 #000;

  /* rotation */
  --tilt-a: -1deg;
  --tilt-b: 1deg;
  --tilt-c: -2deg;
  --tilt-d: 2deg;
}

@utility dot-grid {
  background-image: radial-gradient(rgba(0, 0, 0, 0.09) 1px, transparent 1px);
  background-size: 28px 28px;
}

@utility dot-grid-strong {
  background-image: radial-gradient(rgba(0, 0, 0, 0.13) 1px, transparent 1px);
  background-size: 26px 26px;
}
```

Note: the new names (`--color-paper`, `--color-coral`, …) are additive. They must not shadow the workspace's semantic tokens (`--color-background`, `--color-primary`, …) — the two languages stay separate on purpose.

### 13.2 Section skeleton

```tsx
<section id="features" className="bg-paper px-5 py-20 sm:px-8 sm:py-32">
  <div className="mx-auto max-w-7xl">
    <div className="text-center">
      <span className="inline-block rotate-[-2deg] rounded-2xl border-4 border-black bg-grape px-6 py-3 font-bold uppercase text-white shadow-pop-2">
        <Star className="mr-2 inline size-6" />
        Everything You Need
      </span>
      <h2 className="mt-8 font-display text-4xl font-bold sm:text-5xl lg:text-6xl">
        All your study tools in <span className="bg-gradient-to-r from-coral to-bubblegum bg-clip-text text-transparent [-webkit-text-stroke:2px_black]">ONE APP</span>
      </h2>
      <p className="mx-auto mt-6 max-w-2xl text-lg font-bold sm:text-xl">…</p>
    </div>
    <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">…</div>
  </div>
</section>
```

### 13.3 Where things live

| Thing | File |
| --- | --- |
| The whole marketing page (the language's origin) | `src/routes/index.tsx` |
| Fonts (Google Fonts link, favicon, meta) | `src/routes/__root.tsx` |
| Design tokens, animation utilities, global rules | `src/styles.css` |
| Logo component | `src/components/brand/logo.tsx` |
| Logo artwork | `src/assets/knowly-logo.png` |
| Button primitive | `src/components/ui/button.tsx` |
| App shell, sidebar, `PageHeader` | `src/components/app-shell.tsx` |
| Accent preset definitions | `src/lib/themes.ts`, `src/lib/defaults.ts` |
| Legacy workspace notes (superseded by this guide) | `docs/design-guide.md` |

### 13.4 Adding a page

1. Pick a pillar (§1.3) and one proof component (§7).
2. Choose the surface sequence — never two identical surfaces adjacent (§5.2).
3. Write the badge → heading → lead → evidence → CTA skeleton (§5.2).
4. Reuse a card archetype; do not invent a new card style for a new page.
5. Add one gradient or one full-bleed colour band, not both in the same viewport.
6. Rotate containers ±1–2°, body copy 0.
7. Run the checklist (§14.3).

---

## 14. Governance, known gaps & QA

### 14.1 One language, everywhere

This guide used to describe a public surface that deliberately diverged from the workspace. It does not any more: **the app is built in the same paper-and-ink language as the homepage.** Both run off one token layer (`src/styles.css`), so a change to `--block-lemon` or `--shadow-panel` moves marketing and product together.

| | Public surface | Workspace (app) |
| --- | --- | --- |
| Feeling | Printed poster, marker pen | The same poster, used as a desk |
| Surface | Paper `#FFFBF5` | Paper `#FFFBF5`, dot-grid texture, `surface` white panels |
| Border | 4px black structural, 3px detail | 3px structural (`--border` = `--foreground`), 3px detail |
| Shadow | Hard black offset | Same: `--shadow-panel` 4px, `--shadow-forge` 5px |
| Accent | Six flat blocks `--block-*`, black text | Identical blocks, always paired with `text-ink` |
| Action colour | Bright coral fill with ink text | **Coral Ink** `#C0272D` fill with white text (`--primary`) |
| Type | 700, display-tight | Same families; 700 for display and labels, body at 400–500 |
| Density | Roomy, one idea per band | Tighter: panels, tables, 13–14px metadata, same 3px rules |

Where the app deviates, it is for legibility at density, not for a different mood:

- **Actions are Coral Ink, decoration is bright coral.** White on `#C0272D` is 5.7:1; white on the hero's `#FF6B6B` is 2.78:1. Bright coral only ever carries black text on the homepage's display type, never small or actionable text.
- **Dark mode is night paper** — charcoal canvas, cream ink (`#EDE6D8`), the same blocks and hard shadows. It is not a second language.
- **Two rules per viewport maximum.** The app has to show a header rule, a panel rule and a card rule; they stay 3px and identical in colour so the page reads as one printed sheet.
- **Gradients, glass and glows are gone** from app chrome (§3.6). A wallpaper set by the user is the only photographic surface left, and it sits under a paper scrim.

### 14.2 Known gaps in the current page

Written down so nobody mistakes them for decisions:

1. **Legal pages are only half-converted.** `/privacy` and `/terms` now use the paper tokens and a 3px header rule, but their body copy still runs on `legal-copy` typography rather than the 4px/3px component set. They read as the same document, not yet as the same poster.
2. **`font-black` is a lie.** Space Grotesk tops out at 700; the class is cosmetic. Standardise on `font-bold`.
3. **Contrast debt** in §12.1 — the primary CTA is the most visible offender on the page.
4. **No focus styles** on the page's custom interactive elements.
5. **Emoji are not `aria-hidden`** in headlines.
6. **Mobile nav targets** are ~30px tall.
7. **Unverifiable hero stats** ("10K+", "87%", "10×") — see §10.4.
8. **Border widths drift.** `border-3` and `border-4` are both in use on comparable elements (nav pills vs header CTA). This guide assigns 4px = structural, 3px = detail; the page is roughly consistent, new work must be exactly consistent.
9. **No OG image** — social shares are text-only (§11.4).
10. **The reveal can hide content** if `IntersectionObserver` never fires (§9).

### 14.3 Pre-ship checklist

**Design**
- [ ] 4px black borders on structural elements, 3px on details, no hairlines
- [ ] Hard shadows only, offset down-right, one rung per elevation
- [ ] Radii from the ladder; nested elements step down
- [ ] Rotation only on containers, ±1–2° (stickers excepted)
- [ ] At most three surface levels; at most one colour band per viewport
- [ ] One emoji per headline, one per card
- [ ] No face, people, hand or mood emoji anywhere — app, marketing, docs (§8)

**Type**
- [ ] Space Grotesk display, DM Sans body, no third family
- [ ] Weight 700 minimum, `font-bold` not `font-black`
- [ ] Display leading ≤ 1.05; manual line breaks on the headline
- [ ] Leads capped at `max-w-2xl`

**Colour**
- [ ] Every text/fill pair checked against §3.3
- [ ] Coloured text uses an Ink variant, never a display hex
- [ ] Gradient type only at display size, with the 2px stroke

**Copy**
- [ ] Every number has a source or has been removed
- [ ] No banned words (§10.5)
- [ ] CTAs contain *free* or *start*
- [ ] Feature cards carry a student-voice quote

**Access**
- [ ] Focus visible on every interactive element
- [ ] 44px targets (including the mobile nav strip)
- [ ] Emoji and geometry marked `aria-hidden`
- [ ] Anchor targets clear the sticky header
- [ ] Reduced motion honoured; no content behind an animation

**Assets**
- [ ] Logo used from the master PNG, inside the gradient tile
- [ ] No photography, no new illustration style
- [ ] OG card present for new campaign pages

---

## Appendix A — homepage copy deck

Kept verbatim so writers can copy the rhythm.

**Meta**
- Title: `Knowly — STOP Juggling Apps. Study Smarter! 🎯`
- Description: `The study app that actually gets you. AI flashcards, handwritten notes, smart reviews — all in one place. 100% free, works offline, no BS.`
- OG description: `Study app for students who are tired of boring tools. Free forever, actually fun to use, and it works.`

**Hero**
- Badges: `100% FREE` · `WORKS OFFLINE` · `10K+ STUDENTS`
- H1: `STOP 🎒 / juggling 10 apps / Study SMARTER 🧠 / in ONE place ✨`
- Lead: `Create flashcards with AI in seconds. Take handwritten notes. Track what you actually know. Everything stays on your device — no account, no subscription, no BS.`
- CTAs: `GET STARTED FREE` · `See how it works`
- Trust row: `No credit card` · `No account` · `Works offline` · `Private forever`

**Stats** — `10x FASTER STUDYING` · `87% BETTER GRADES` · `5+ HOURS SAVED` · `10K+ STUDENTS DAILY`

**Pain points** — `☕ Cramming sucks` · `📱 App chaos` · `💸 Another $10/mo?!` · `❓ Am I ready?`

**How it works** — `Get your stuff in` · `Study smart` · `Ace the test`

**Features** — `AI Flashcard Magic` · `Smart Study System` · `Digital Notebooks` · `Know What You Don't Know` · `Course Organization` · `Your Data Stays YOURS`

**Why Knowly** — `Finally, an app that GETS YOU not your wallet` · cards: `Actually free` · `Works anywhere` · `Save time` · `Your privacy matters` · side cards: `Late night study mode` · `Before bed review` · `Exam prep mode` · sticker: `STUDY ANYWHERE ✈️`

**Privacy** — `Privacy That Doesn't Suck` · `What you study is NOBODY'S BUSINESS 🔒` · `No account needed` · `Works offline` · `Your data, your device` · `Easy backups` · `my-study-backup.json` · `724 KB • Everything you need` · `Fun fact: The entire app is smaller than one TikTok video 📱`

**Closing** — `Ready to Level Up?` · `Time to ACTUALLY study smarter 🚀` · `Join 10,000+ students who stopped wasting time. Free forever • Works offline • No BS` · `GET STARTED FREE`

**Footer** — `Study smarter, not harder. Free forever, works offline, respects your privacy.` · `100% FREE & LOCAL` · `© 2026 Knowly. Made with 💜 for students.` · `NO ACCOUNT • NO TRACKING • YOUR DATA STAYS YOURS`

---

## Appendix B — one-page cheat sheet

```
CANVAS      #FFFBF5 · dot grid 28px @ 9% ink · max-w-7xl, px-5 sm:px-8
INK         #000000 — text, borders, shadows. All of them.

BLOCKS      Coral #FF6B6B · Lemon #FFE66D · Grape #A855F7
            Mint #34D399 · Sky #60A5FA · Bubblegum #EC4899
INK ON      colour (always). White only on grape / bubblegum / black,
            and only at display size. Coral + white is banned.
TEXT ON     paper → ink, or an Ink variant (Coral Ink #C0272D, Grape Ink
            #7E22CE, Sky Ink #1D4ED8, Mint Ink #047857)

TYPE        Space Grotesk 700 display · DM Sans 700 body · 700 minimum
            Hero clamp(2.5rem,7vw,5.5rem)/0.95 · H2 36→60 · H3 24
            Lead 18→20 · Body 16/14 · Micro 14 caps tracked
            Never 900, never light, never italic, never >1.1 display leading

SHAPE       4px structural border · 3px detail · no 1px, no grey
            Radius 12 / 16 / 24 / full · never square
            Shadow 4 · 6 · 8 · 10 px hard black, offset down-right
            Hover: lift N px, shadow +N px

TILT        0 body · ±1 buttons & feature cards · ±2 stats & badges
            ±7 stickers · 12–30° decorative shapes only

RHYTHM      py-20 → py-32 · gap-6 / gap-8 · mt-8 heading · mt-12 grid
            Badge → heading → lead → evidence → CTA → microcopy
            Sections split by border-y-4, never by tint

MOTION      Reveal 0.45s cubic-bezier(.22,1,.36,1), 12px, once
            Stagger 60–80ms · no parallax, no loops, reduced-motion honoured

VOICE       Short. Specific. On the student's side. Funny, then useful.
            One emoji as punctuation. Every number sourced.

MUST        focus-visible outline 4px offset 4px · 44px targets
            emoji + geometry aria-hidden · Ink variants for coloured text
```

---

*Maintained alongside the page it describes. Change the page, change this guide in the same commit.*
