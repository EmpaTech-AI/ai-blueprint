// ─── AI Assist BG Unified Design System — canonical token layer (WS0) ───────────
//
// SINGLE SOURCE OF TRUTH for every renderer (DOCX / PDF / HTML / TXT). Derived verbatim from
// `ai_assist_bg_design_tokens.json` (Design System v1.0.0). No renderer defines a colour or size
// locally (design doc §7 no-drift rule) — they all import from here.
//
// Colours are stored WITHOUT the leading `#` (the form the `docx` library and pdfmake fill props
// want); use `hex()` for the `#RRGGBB` form CSS/pdfmake text props want.

export const TOKENS_VERSION = '1.0.0';

export const COLORS = {
  navy: '1B2A4A',      // H1, table-header bg, TOC1, title elements
  blue: '2E5090',      // H2, H1 rule, accents, callout left border
  teal: '4A6FA5',      // H3, TOC3
  charcoal: '2D3748',  // body + table body text
  h4gray: '4B5563',    // H4 text
  muted: '999999',     // header/footer metadata (decorative on web)
  subtitle: '666666',  // subtitle, secondary metadata
  border: 'BDC3CB',    // cell/box borders
  altRow: 'F0F4F8',    // table alternating row
  callout: 'F7F9FC',   // callout box background
  lightBg: 'F5F5F5',   // alt callout background
  white: 'FFFFFF',     // page bg, table-header text
  gold: 'C17B2C',      // callout headers ONLY (uppercase spaced caps)
  critical: 'CC0000',
  high: 'E67E22',
  medium: '27AE60',
  low: '1ABC9C',
} as const;

// On-white BODY text variants where the brand hue would be the text itself (design doc §1.3 a11y).
// Web uses these for severity text; the label word is always kept so colour is never the sole signal.
export const TEXT_VARIANTS = {
  highText: 'B5611A',
  mediumText: '1E8449',
} as const;

export type ColorToken = keyof typeof COLORS;

export function hex(token: ColorToken): string {
  return `#${COLORS[token]}`;
}

// Severity → fill hue (DOCX/PDF) and on-white text hue (web). The label word always accompanies it.
export const SEVERITY_FILL: Record<string, ColorToken> = {
  critical: 'critical', high: 'high', medium: 'medium', low: 'low',
};
export function severityWebTextHex(level: string): string {
  // critical/low are legible on white as-is; high/medium darken to the a11y variants (§1.3).
  if (level === 'high') return `#${TEXT_VARIANTS.highText}`;
  if (level === 'medium') return `#${TEXT_VARIANTS.mediumText}`;
  return hex(level as ColorToken);
}

// Type scale. `pt` = on-screen point size; `half` = OOXML w:sz value (= pt × 2) for the `docx` lib.
export const TYPE = {
  title:    { pt: 28, half: 56, font: 'arial',   weight: 'normal' },
  subtitle: { pt: 24, half: 48, font: 'georgia', weight: 'italic' },
  h1:       { pt: 20, half: 40, font: 'calibri', weight: 'bold' },
  h2:       { pt: 15, half: 30, font: 'calibri', weight: 'bold' },
  h3:       { pt: 13, half: 26, font: 'calibri', weight: 'bold' },
  h4:       { pt: 12, half: 24, font: 'arial',   weight: 'bold' },
  normal:   { pt: 11, half: 22, font: 'calibri', weight: 'normal' },
  small:    { pt: 9,  half: 18, font: 'arial',   weight: 'normal' },
  toc1:     { pt: 12, half: 24, font: 'calibri', weight: 'bold' },
  toc2:     { pt: 11, half: 22, font: 'calibri', weight: 'normal' },
  toc3:     { pt: 10, half: 20, font: 'calibri', weight: 'normal' },
} as const;

// Three families, one role each (design doc §1.2). Do NOT add a fourth.
// `docx`/Word resolve these by name. PDF embedding of metric-compatible substitutes is WS3;
// until then the PDF path keeps its existing font and applies the colour tokens only.
export const FONT = {
  calibri: 'Calibri',
  georgia: 'Georgia',
  arial: 'Arial',
  webBody: 'Calibri, Carlito, Arial, sans-serif',
  webSerif: 'Georgia, "Times New Roman", serif',
  webUtil: 'Arial, sans-serif',
} as const;

export type FontRole = 'calibri' | 'georgia' | 'arial';
export function fontFamily(role: FontRole): string {
  return FONT[role];
}
