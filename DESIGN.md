# Knowly Design System & Neo-Brutalist Language Guide

## Overview

Knowly has been redesigned with a **Neo-Brutalist** aesthetic—a bold, unapologetic design language that rejects minimalism and embrace high-contrast, thick typography, geometric borders, hard shadows, and vibrant color blocking. This design system is intentionally designed to resonate with students and stand out from the sea of bland, corporate study apps.

The language is confident, playful, and deliberately chaotic—rotated elements, contrasting colors, thick 4px borders, hard-shadow effects, and expressive typography create a visual identity that feels human, energetic, and approachable.

## Core Principles

1. **High Contrast Everything** — Colors should pop against backgrounds; text should be bold and readable; borders should be thick and deliberate.
2. **Geometric and Intentional** — No accident in layout; rotations, shadows, and color placement are deliberate design choices, not noise.
3. **Thick Borders, Hard Shadows** — 4px black borders and 8px geometric shadows define spatial hierarchy and component boundaries.
4. **Vibrant Color Blocking** — Large, solid color areas create visual energy; colors are applied in blocks, not gradients or soft transitions.
5. **Bold Typography** — Use heavy, confident font weights (700–900); spacing should be generous and deliberate.
6. **Playful Chaos** — Rotations (±1–2 degrees), emoji accents, and intentional "messiness" make the design feel human and fun, not rigid or sterile.
7. **Accessibility & Readability** — Despite the boldness, all text must meet WCAG contrast standards; colors and shadows enhance, not obscure, readability.

## Color Palette

### Primary Colors

| Color | Hex | Usage | Tailwind |
|-------|-----|-------|----------|
| **Coral** | #FF6B6B | Primary action, energy, emphasis | g-[#FF6B6B] |
| **Lemon** | #FFE66D | Accent, highlights, secondary actions | g-[#FFE66D] |
| **Purple** | #A855F7 | Secondary brand, premium, depth | g-[#A855F7] |
| **Mint** | #34D399 | Success, positive state, growth | g-[#34D399] |
| **Blue** | #60A5FA | Information, calm, secondary | g-[#60A5FA] |
| **Pink** | #EC4899 | Accent, attention, playfulness | g-[#EC4899] |

### Neutral Colors

| Color | Hex | Usage | Tailwind |
|-------|-----|-------|----------|
| **Off-White** | #FFFBF5 | Background, breathing room | g-[#FFFBF5] |
| **Black** | #000000 | Text, borders, shadows | order-black / 	ext-black |
| **Dark Gray** | #1F2937 | Secondary text, muted elements | 	ext-gray-800 |

## Typography

### Font Families

- **Display/Headlines**: Space Grotesk (900, 700 weights) — bold, geometric, confident
- **Body/UI**: DM Sans (600, 500 weights) — clean, modern, legible
- **Fallback**: System sans-serif (Arial, Helvetica)

### Font Sizing & Weights

| Usage | Size | Weight | Notes |
|-------|------|--------|-------|
| Page Title | 48–56px | 900 | Bold, commanding presence |
| Section Heading | 32–40px | 900 | Eye-catching, hierarchy |
| Subsection | 20–24px | 700 | Clear separation, readable |
| Button/Label | 14–16px | 700 | Solid, clickable appearance |
| Body Text | 16px | 500 | Comfortable reading, high legibility |
| Small/Caption | 12–14px | 600 | Supporting information, still readable |

## Spacing & Layout

- **Padding**: 16px (1rem), 24px (1.5rem), 32px (2rem), 48px (3rem)
- **Margin**: 16px, 24px, 32px, 48px (align with padding)
- **Gap (flex/grid)**: 16px (default), 24px (components), 32px (sections)
- **Line Height**: 1.5 (comfortable reading), 1.3 (headers, dense info)

## Borders & Shadows

### Borders

- **Standard Border**: order-4 border-black — Thick, deliberate, visible
- **Border Radius**: Mostly ounded-none (sharp corners, brutalist), occasionally ounded-md for buttons/inputs
- **Edge Cases**: When rounding is needed, use ounded-md (6–8px) for softness, not ounded-lg

### Shadows

- **Hard Shadow** (primary): shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] — Offset 8px, no blur, full black opacity
- **Medium Shadow**: shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] — Offset 4px for smaller elements
- **Soft Shadow** (rare): shadow-md or shadow-lg for depth (use sparingly; hard shadows are preferred)

### Shadow Placement

- Shadows always offset down-right (positive x, positive y)
- No blur; hard geometric shadow creates the brutalist feel
- Use on cards, buttons, major components, and hover states

## Components

### Buttons

- **Style**: Solid background color (coral, mint, or brand color), thick black border (4px), hard shadow (8px)
- **Hover**: Slight shadow reduction (4px) and subtle shift (1–2px up) to suggest "press"
- **Text**: Bold, centered, white or black text depending on color contrast
- **Padding**: 12–16px horizontal, 10–12px vertical

### Cards

- **Border**: order-4 border-black
- **Shadow**: shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
- **Padding**: 24–32px
- **Rotation**: Optional ±1–2 degree tilt for playfulness
- **Accent**: Top or left border strip in primary color (optional)

### Inputs & Textareas

- **Border**: order-4 border-black
- **Background**: #FFFBF5 (off-white)
- **Focus**: Add shadow-[inset_0_0_0_2px] with brand color or highlight with colored border
- **Padding**: 12px
- **Font**: DM Sans, 16px, 500 weight

### Tabs / Toggles

- **Active Tab**: Solid background color (coral, lemon, mint), white or black text, thick border
- **Inactive Tab**: Transparent or light gray background, muted text
- **Transition**: Smooth color shift, no animation fade

### Modals / Overlays

- **Background**: Semi-transparent black (gba(0,0,0,0.5))
- **Modal**: Off-white background (#FFFBF5), thick black border (4px), hard shadow (8px)
- **Close Button**: Coral (#FF6B6B), thick border, small size

## Rotation & Playfulness

- **Subtle Rotation**: ±1–2 degrees on cards, buttons, stat blocks
- **Emoji Accents**: Use contextual emojis (⚡, 🎯, 💜, 🔥, 🎓, 📚) to add personality and break text heaviness
- **Intent**: Rotation should feel intentional, not random; use sparingly on hero elements, stat cards, and call-to-action sections
- **Consistency**: Establish a pattern (e.g., all stat cards rotate the same direction) for cohesion despite "chaos"

## Usage by Page/Feature

### Landing Page

- **Hero Section**: Large title (56px, 900 weight), thick borders, hard shadows, vibrant color blocking
- **Navigation**: Subtle links (not buttons), high contrast text, hover underline
- **Stats Section**: Four stat blocks, each in a different primary color, with ±2 degree rotation, emoji, value, and label
- **Features**: Grid layout, each feature in a card with title, icon, description
- **CTA Button**: Large coral button with white text, thick border, hard shadow, hover press effect

### Exam Builder (Print Route)

- **Mode Toggle**: Two buttons ("Create 1 Paper" / "Create Multiple Papers"), thick border, hover press
- **Single Paper UI**: Existing sidebar, options panel, preview (minimal change)
- **Bulk Paper UI**: 
  - Number of papers input (with label)
  - Distribution strategy radio/select (same-for-all, random-per-paper, sequential, custom-per-paper)
  - Questions per paper input (dynamic based on strategy)
  - Auto-numbering toggle + naming prefix input
  - Download format (ZIP or individual)
  - Generate button (mint or coral color, thick border, shadow)
  - Progress bar (coral fill, mint background) during generation

### Configuration Panels

- **Section Title**: 20–24px, 700 weight, bold color (e.g., coral, purple)
- **Labels**: 14px, 600 weight, dark gray text
- **Input Groups**: Generous padding (12–16px), clear separation with borders or spacing
- **Help Text**: 12px, muted color, below input

## Accessibility Notes

1. **Color Contrast**: All text meets WCAG AA (4.5:1) minimum; prefer high contrast combos (black on coral, white on purple)
2. **Borders & Shadows**: Help users distinguish interactive elements; do not rely on color alone
3. **Typography Size**: Minimum 14px for body text, 16px on mobile (readable without zoom)
4. **Focus States**: Visible focus ring (colored border, outline, or shadow change) on all interactive elements
5. **Emoji**: Decorative only; do not rely on emoji for critical information; include text label
6. **Responsive**: Borders, shadows, and spacing scale down on mobile; maintain legibility and tap targets (44px minimum)

## Responsive Design

### Mobile (< 768px)

- **Borders**: Reduce to order-2 or order-4 (test for legibility)
- **Shadows**: Reduce to shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] (8px may feel heavy)
- **Padding**: Reduce by ~25% (e.g., 24px → 18px, 32px → 24px)
- **Font Sizes**: Reduce by ~10% (e.g., 48px title → 40px)
- **Rotation**: Reduce to ±0.5–1 degree (less "chaos" on small screens for legibility)
- **Grid**: Stack to single column; maintain visual hierarchy with color and borders

### Tablet (768px–1024px)

- **Borders & Shadows**: Use full 4px borders and 8px shadows
- **Padding**: 20–24px (between desktop and mobile)
- **Font Sizes**: Use desktop sizes
- **Rotation**: ±1–1.5 degrees

### Desktop (> 1024px)

- **Full Implementation**: All borders (4px), shadows (8px), padding (24–32px), rotations (±1–2 degrees), emoji accents

## Implementation Checklist

- [ ] Update all primary buttons with coral background, black border (4px), hard shadow (8px), bold text
- [ ] Add thick black borders (4px) to cards, inputs, modals
- [ ] Replace soft shadows with hard 8px geometric shadows
- [ ] Apply Space Grotesk 700–900 to headings; DM Sans 500–600 to body
- [ ] Add subtle ±1–2 degree rotations to stat cards and hero elements
- [ ] Use 6-color primary palette consistently (coral, lemon, purple, mint, blue, pink)
- [ ] Replace off-white backgrounds with #FFFBF5 (off-white)
- [ ] Add emoji accents to stat labels, section headers (⚡, 🎯, 💜, 🔥, etc.)
- [ ] Audit all interactive elements for WCAG AA contrast (4.5:1 minimum)
- [ ] Test responsive design on mobile, tablet, desktop
- [ ] Update component library (buttons, cards, inputs, modals) to match design system
- [ ] Update brand colors in Tailwind config (if not already done)

## Tools & Resources

- **Fonts**: [Space Grotesk (Google Fonts)](https://fonts.google.com/specimen/Space+Grotesk), [DM Sans (Google Fonts)](https://fonts.google.com/specimen/DM+Sans)
- **Colors**: Use hex values provided in Palette section; Tailwind custom classes (g-[#FF6B6B], etc.)
- **Icons**: Lucide React for consistent, clean iconography
- **Shadows**: Custom Tailwind shadow classes or CSS ox-shadow: 8px 8px 0px 0px rgba(0,0,0,1)

## Example Component: CTA Button

\\\	sx
export function CTAButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-8 py-4 rounded-none border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]",
        "bg-[#FF6B6B] text-white font-bold text-lg",
        "hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 transition-all",
        "active:shadow-none active:translate-y-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
      )}
    >
      {children}
    </button>
  );
}
\\\

## Conclusion

The Neo-Brutalist design language is an intentional departure from minimalism and corporate design. It's bold, playful, and built to capture attention while remaining accessible and functional. Consistency, high contrast, and deliberate geometric choices define the system. When in doubt, favor boldness over subtlety—thick borders over thin ones, hard shadows over soft ones, and vibrant colors over pastels.

