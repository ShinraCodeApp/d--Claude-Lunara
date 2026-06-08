/**
 * Lunara Design System — Tokens de diseño
 * Paleta: lavanda, violeta, rosa suave, blanco perla, dorado suave
 */

export const Colors = {
  // ─── Primary — Violeta/Lavanda ─────────────────────────────
  primary: {
    50:  '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',  // Main violet
    600: '#9333ea',
    700: '#7c3aed',
    800: '#6d28d9',
    900: '#5b21b6',
  },

  // ─── Secondary — Lavanda ──────────────────────────────────
  lavender: {
    50:  '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',  // Main lavender
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },

  // ─── Rose — Rosa suave ────────────────────────────────────
  rose: {
    50:  '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',  // Accent rose
    light: '#fce7f3',
    medium: '#fbcfe8',
    soft: '#fdf2f8',
  },

  // ─── Gold — Dorado suave ──────────────────────────────────
  gold: {
    soft:   '#fef3c7',
    medium: '#fde68a',
    main:   '#f59e0b',
    dark:   '#d97706',
  },

  // ─── Neutrals — Blanco perla ──────────────────────────────
  pearl: {
    50:  '#fefefe',
    100: '#fafaf9',
    200: '#f5f5f4',
    300: '#e7e5e4',
    400: '#d6d3d1',
    500: '#a8a29e',
  },

  // ─── Dark mode backgrounds ────────────────────────────────
  dark: {
    bg:      '#0d0118',   // Deep cosmic purple
    surface: '#1a0533',   // Dark violet
    card:    '#230742',   // Card background
    border:  '#3d1a6b',   // Subtle border
    text:    '#e9d5ff',   // Light lavender text
    muted:   '#a78bfa',   // Muted text
  },

  // ─── Light mode backgrounds ───────────────────────────────
  light: {
    bg:      '#fdfbff',   // Near-white with lavender tint
    surface: '#f5f3ff',   // Very light lavender
    card:    '#ffffff',
    border:  '#e9d5ff',   // Light lavender border
    text:    '#1a0533',   // Deep violet text
    muted:   '#6b21a8',   // Muted violet
  },

  // ─── Semantic ─────────────────────────────────────────────
  success:  '#10b981',
  warning:  '#f59e0b',
  error:    '#ef4444',
  info:     '#6366f1',

  // ─── Cycle phases ─────────────────────────────────────────
  phase: {
    menstrual:  '#ef4444',  // Red
    follicular: '#a855f7',  // Violet
    ovulatory:  '#10b981',  // Green (fertile)
    luteal:     '#f59e0b',  // Gold
  },
} as const

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  full: 9999,
} as const

export const Typography = {
  fontFamily: {
    regular: 'Nunito_400Regular',
    medium: 'Nunito_600SemiBold',
    bold: 'Nunito_700Bold',
    heading: 'Playfair_700Bold',
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 19,
    xl: 22,
    '2xl': 26,
    '3xl': 32,
    '4xl': 40,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const

export const Shadows = {
  sm: {
    shadowColor: Colors.lavender[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.lavender[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.primary[700],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: Colors.lavender[400],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 0,
  },
} as const

// Theme object for light/dark mode
export const createTheme = (mode: 'light' | 'dark') => ({
  colors: {
    background: mode === 'dark' ? Colors.dark.bg : Colors.light.bg,
    surface: mode === 'dark' ? Colors.dark.surface : Colors.light.surface,
    card: mode === 'dark' ? Colors.dark.card : Colors.light.card,
    border: mode === 'dark' ? Colors.dark.border : Colors.light.border,
    text: mode === 'dark' ? Colors.dark.text : Colors.light.text,
    textMuted: mode === 'dark' ? Colors.dark.muted : Colors.light.muted,
    primary: Colors.primary[500],
    primaryLight: Colors.primary[200],
    lavender: Colors.lavender[500],
    rose: Colors.rose.soft,
    gold: Colors.gold.main,
    ...Colors.phase,
  },
  spacing: Spacing,
  borderRadius: BorderRadius,
  typography: Typography,
  shadows: mode === 'dark' ? {
    ...Shadows,
    sm: { ...Shadows.sm, shadowOpacity: 0.2 },
    md: { ...Shadows.md, shadowOpacity: 0.25 },
  } : Shadows,
})

export type Theme = ReturnType<typeof createTheme>
