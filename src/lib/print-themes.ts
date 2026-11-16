/**
 * Print theme metadata used by the design marketplace.
 *
 * Every theme prints for every content type — exams, course packs and module
 * study sheets — and at both hero sizes:
 * - page: the hero gets sheet 1 to itself
 * - compact: the hero stays in the flow at the top of page 1
 *
 * The marketplace never hides a theme because of the document being printed or
 * the hero size chosen in the studio.
 */

import { type ExamTheme } from "@/lib/exam-print";

export type HeroLayout = "page" | "compact";
export type PrintDocumentType = "course" | "exam" | "module";

export interface ThemeConfig {
  id: ExamTheme;
  label: string;
  description: string;
  category: "academic" | "creative" | "technical" | "nature" | "luxury" | "playful";
  /** Hero sizes this theme supports — every theme supports both. */
  heroLayouts: HeroLayout[];
  /** Recommended color schemes for this theme */
  recommendedPalettes: number; // number of palettes this theme pairs well with
  /** Document types this theme prints for — every theme prints for all three. */
  suitableFor: PrintDocumentType[];
  /** Visual mood/feel */
  mood: string[];
}

export const THEME_CONFIGS: Record<ExamTheme, ThemeConfig> = {
  classic: {
    id: "classic",
    label: "Classic exam",
    description: "Formal, clean black-and-white paper",
    category: "academic",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 12,
    suitableFor: ["course", "exam", "module"],
    mood: ["formal", "professional", "timeless"],
  },
  module: {
    id: "module",
    label: "Study sheet",
    description: "Knowly module cards, color accents and clear learning sections",
    category: "academic",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 11,
    suitableFor: ["course", "exam", "module"],
    mood: ["educational", "structured", "modern"],
  },
  "field-notes": {
    id: "field-notes",
    label: "Field notes",
    description: "Warm natural paper with observation-book details",
    category: "nature",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 10,
    suitableFor: ["course", "exam", "module"],
    mood: ["adventurous", "organic", "practical"],
  },
  "lab-report": {
    id: "lab-report",
    label: "Lab report",
    description: "Technical grid, instrument-style labels and data accents",
    category: "technical",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 9,
    suitableFor: ["course", "exam", "module"],
    mood: ["scientific", "analytical", "precise"],
  },
  workbook: {
    id: "workbook",
    label: "Revision workbook",
    description: "Friendly lesson workbook with bold prompts and writing space",
    category: "academic",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 10,
    suitableFor: ["course", "exam", "module"],
    mood: ["encouraging", "interactive", "warm"],
  },
  blueprint: {
    id: "blueprint",
    label: "Blueprint",
    description: "Drafting-table grid, measured rules and engineering stamps",
    category: "technical",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 8,
    suitableFor: ["course", "exam", "module"],
    mood: ["engineering", "methodical", "structured"],
  },
  manuscript: {
    id: "manuscript",
    label: "Illuminated manuscript",
    description: "Parchment, gold rule and a drop-cap opening the exam",
    category: "luxury",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 9,
    suitableFor: ["course", "exam", "module"],
    mood: ["elegant", "historical", "ornate"],
  },
  newspaper: {
    id: "newspaper",
    label: "Front page",
    description: "Broadsheet headlines, double rules and column-set questions",
    category: "creative",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 8,
    suitableFor: ["course", "exam", "module"],
    mood: ["journalistic", "bold", "classic"],
  },
  comic: {
    id: "comic",
    label: "Comic panel",
    description: "Ink outlines, halftone dots and punchy tilted captions",
    category: "playful",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 10,
    suitableFor: ["course", "exam", "module"],
    mood: ["fun", "energetic", "creative"],
  },
  botanical: {
    id: "botanical",
    label: "Botanical study",
    description: "Soft herbarium wash with pressed-flower corners and dotted numerals",
    category: "nature",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 8,
    suitableFor: ["course", "exam", "module"],
    mood: ["natural", "delicate", "scientific"],
  },
  terminal: {
    id: "terminal",
    label: "Terminal",
    description: "Dark screen with a phosphor grid; prints as light ink-saving paper",
    category: "technical",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 10,
    suitableFor: ["course", "exam", "module"],
    mood: ["digital", "modern", "technical"],
  },
  minimalist: {
    id: "minimalist",
    label: "Minimalist",
    description: "Clean sans-serif, generous margins, and subtle accents",
    category: "academic",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 9,
    suitableFor: ["course", "exam", "module"],
    mood: ["clean", "modern", "spacious"],
  },
  retro: {
    id: "retro",
    label: "Retro 70s",
    description: "Warm earth tones with a nostalgic serif aesthetic",
    category: "creative",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 8,
    suitableFor: ["course", "exam", "module"],
    mood: ["vintage", "warm", "nostalgic"],
  },
  neon: {
    id: "neon",
    label: "Neon glow",
    description: "Bold electric colors with high contrast black backgrounds",
    category: "playful",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 8,
    suitableFor: ["course", "exam", "module"],
    mood: ["bold", "modern", "energetic"],
  },
  watercolor: {
    id: "watercolor",
    label: "Watercolor",
    description: "Soft, flowing washes with subtle color blending",
    category: "creative",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 8,
    suitableFor: ["course", "exam", "module"],
    mood: ["artistic", "soft", "flowing"],
  },
  leather: {
    id: "leather",
    label: "Leather bound",
    description: "Rich brown with embossed details and aged paper feel",
    category: "luxury",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 8,
    suitableFor: ["course", "exam", "module"],
    mood: ["sophisticated", "substantial", "classic"],
  },
  chalkboard: {
    id: "chalkboard",
    label: "Chalkboard",
    description: "Dark slate with chalk-white text and colorful accents",
    category: "playful",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 8,
    suitableFor: ["course", "exam", "module"],
    mood: ["playful", "educational", "engaging"],
  },
  denim: {
    id: "denim",
    label: "Denim",
    description: "Classic blue denim texture with stitched details",
    category: "creative",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 8,
    suitableFor: ["course", "exam", "module"],
    mood: ["casual", "durable", "classic"],
  },
  marble: {
    id: "marble",
    label: "Marble",
    description: "Elegant veined marble with sophisticated monochrome styling",
    category: "luxury",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 8,
    suitableFor: ["course", "exam", "module"],
    mood: ["elegant", "timeless", "refined"],
  },
  "vintage-map": {
    id: "vintage-map",
    label: "Vintage map",
    description: "Antique cartography style with topographic lines",
    category: "creative",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 8,
    suitableFor: ["course", "exam", "module"],
    mood: ["adventurous", "historical", "exploratory"],
  },
  "forest-green": {
    id: "forest-green",
    label: "Forest green",
    description: "Deep green with natural wood grain and leaf accents",
    category: "nature",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 8,
    suitableFor: ["course", "exam", "module"],
    mood: ["natural", "calming", "grounded"],
  },
  sunset: {
    id: "sunset",
    label: "Sunset",
    description: "Warm gradient from orange to deep purple",
    category: "nature",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 7,
    suitableFor: ["course", "exam", "module"],
    mood: ["warm", "inspiring", "colorful"],
  },
  ocean: {
    id: "ocean",
    label: "Ocean",
    description: "Cool blues with wave patterns and maritime details",
    category: "nature",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 8,
    suitableFor: ["course", "exam", "module"],
    mood: ["calm", "refreshing", "deep"],
  },
  desert: {
    id: "desert",
    label: "Desert sand",
    description: "Sandy beige with terracotta accents and dry lines",
    category: "nature",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 6,
    suitableFor: ["course", "exam", "module"],
    mood: ["warm", "minimal", "vast"],
  },
  arctic: {
    id: "arctic",
    label: "Arctic ice",
    description: "Crisp white with cool blue accents and clean geometry",
    category: "nature",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 7,
    suitableFor: ["course", "exam", "module"],
    mood: ["clean", "crisp", "cool"],
  },
  autumn: {
    id: "autumn",
    label: "Autumn leaves",
    description: "Rich reds and oranges with organic patterns",
    category: "nature",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 7,
    suitableFor: ["course", "exam", "module"],
    mood: ["warm", "seasonal", "rich"],
  },
  "cherry-blossom": {
    id: "cherry-blossom",
    label: "Cherry blossom",
    description: "Soft pinks with delicate floral motifs",
    category: "nature",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 7,
    suitableFor: ["course", "exam", "module"],
    mood: ["delicate", "beautiful", "seasonal"],
  },
  concrete: {
    id: "concrete",
    label: "Concrete",
    description: "Industrial grey with bold typography and grid lines",
    category: "technical",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 7,
    suitableFor: ["course", "exam", "module"],
    mood: ["industrial", "bold", "structured"],
  },
  "gold-leaf": {
    id: "gold-leaf",
    label: "Gold leaf",
    description: "Luxury design with gold accents and rich blacks",
    category: "luxury",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 7,
    suitableFor: ["course", "exam", "module"],
    mood: ["luxurious", "prestigious", "ornate"],
  },
  indigo: {
    id: "indigo",
    label: "Indigo",
    description: "Deep indigo with gold stitching and traditional patterns",
    category: "luxury",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 7,
    suitableFor: ["course", "exam", "module"],
    mood: ["traditional", "rich", "sophisticated"],
  },
  coral: {
    id: "coral",
    label: "Coral reef",
    description: "Vibrant coral with ocean blues and sand tones",
    category: "nature",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 7,
    suitableFor: ["course", "exam", "module"],
    mood: ["vibrant", "tropical", "energetic"],
  },
  sage: {
    id: "sage",
    label: "Sage green",
    description: "Muted green with soft earth tone accents",
    category: "nature",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 8,
    suitableFor: ["course", "exam", "module"],
    mood: ["calming", "natural", "soft"],
  },
  charcoal: {
    id: "charcoal",
    label: "Charcoal",
    description: "Dark charcoal with metallic silver accents",
    category: "technical",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 7,
    suitableFor: ["course", "exam", "module"],
    mood: ["modern", "sophisticated", "professional"],
  },
  mint: {
    id: "mint",
    label: "Mint fresh",
    description: "Bright mint with crisp white and modern sans-serif",
    category: "playful",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 7,
    suitableFor: ["course", "exam", "module"],
    mood: ["fresh", "modern", "friendly"],
  },
  "burnt-sienna": {
    id: "burnt-sienna",
    label: "Burnt sienna",
    description: "Warm reddish-brown with cream and rust accents",
    category: "creative",
    heroLayouts: ["page", "compact"],
    recommendedPalettes: 7,
    suitableFor: ["course", "exam", "module"],
    mood: ["warm", "artistic", "earthy"],
  },
};

/**
 * Get themes by category
 */
export function getThemesByCategory(category: ThemeConfig["category"]): ThemeConfig[] {
  return Object.values(THEME_CONFIGS).filter((theme) => theme.category === category);
}

/**
 * Get themes suitable for a specific document type
 */
export function getThemesByDocumentType(type: PrintDocumentType): ThemeConfig[] {
  return Object.values(THEME_CONFIGS).filter((theme) => theme.suitableFor.includes(type));
}

/**
 * Get themes with a specific hero layout capability
 */
export function getThemesWithLayout(layout: HeroLayout): ThemeConfig[] {
  return Object.values(THEME_CONFIGS).filter((theme) => theme.heroLayouts.includes(layout));
}

/**
 * Categories for filtering in the marketplace
 */
export const THEME_CATEGORIES: {
  id: ThemeConfig["category"];
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    id: "academic",
    label: "Academic",
    icon: "📚",
    description: "Formal, educational, and professional",
  },
  {
    id: "creative",
    label: "Creative",
    icon: "🎨",
    description: "Artistic, stylish, and expressive",
  },
  {
    id: "technical",
    label: "Technical",
    icon: "⚙️",
    description: "Precise, modern, and structured",
  },
  {
    id: "nature",
    label: "Nature",
    icon: "🌿",
    description: "Organic, natural, and calming",
  },
  {
    id: "luxury",
    label: "Luxury",
    icon: "✨",
    description: "Elegant, refined, and sophisticated",
  },
  {
    id: "playful",
    label: "Playful",
    icon: "🎭",
    description: "Fun, engaging, and energetic",
  },
];
