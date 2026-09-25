import type { stringOrTranslation } from "@homarr/translation";

const SYSTEM_SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SYSTEM_MONO = 'ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace';
const SYSTEM_SERIF = 'Georgia, Cambria, "Times New Roman", Times, serif';

const selfHostedFont = (variable: string, family: string, fallback: string) =>
  `var(${variable}, "${family}"), ${fallback}`;
const CYBERPUNK_FONT_STACK =
  `var(--font-hermes-share-tech-mono, "Share Tech Mono"), ` +
  `var(--font-hermes-jetbrains-mono, "JetBrains Mono"), ${SYSTEM_MONO}`;

const FONT_STACKS = {
  inter: selfHostedFont("--font-sans", "Inter", SYSTEM_SANS),
  ibmPlexSans: selfHostedFont("--font-hermes-ibm-plex-sans", "IBM Plex Sans", SYSTEM_SANS),
  workSans: selfHostedFont("--font-hermes-work-sans", "Work Sans", SYSTEM_SANS),
  atkinsonHyperlegible: selfHostedFont("--font-hermes-atkinson-hyperlegible", "Atkinson Hyperlegible", SYSTEM_SANS),
  dmSans: selfHostedFont("--font-hermes-dm-sans", "DM Sans", SYSTEM_SANS),
  spectral: selfHostedFont("--font-hermes-spectral", "Spectral", SYSTEM_SERIF),
  fraunces: selfHostedFont("--font-hermes-fraunces", "Fraunces", SYSTEM_SERIF),
  sourceSerif: selfHostedFont("--font-hermes-source-serif-4", "Source Serif 4", SYSTEM_SERIF),
  jetBrainsMono: selfHostedFont("--font-hermes-jetbrains-mono", "JetBrains Mono", SYSTEM_MONO),
  ibmPlexMono: selfHostedFont("--font-hermes-ibm-plex-mono", "IBM Plex Mono", SYSTEM_MONO),
  spaceMono: selfHostedFont("--font-hermes-space-mono", "Space Mono", SYSTEM_MONO),
  dmMono: selfHostedFont("--font-hermes-dm-mono", "DM Mono", SYSTEM_MONO),
} as const;

export interface HermesTheme {
  background: string;
  surface: string;
  surfaceRaised: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderStrong: string;
  success: string;
  warning: string;
  error: string;
  glow: string;
  radius: string;
  fontSans: string;
  fontMono: string;
  typographyScale: number;
}

interface CreateHermesThemeOptions {
  background: string;
  midground: string;
  glow: string;
  radius?: string;
  fontSans?: string;
  fontMono?: string;
  success?: string;
  warning?: string;
  error?: string;
  typographyScale?: number;
}

function createHermesTheme({
  background,
  midground,
  glow,
  radius = "0.5rem",
  fontSans = SYSTEM_SANS,
  fontMono = SYSTEM_MONO,
  success = "#4ade80",
  warning = "#ffbd38",
  error = "#fb2c36",
  typographyScale = 1,
}: CreateHermesThemeOptions): HermesTheme {
  return {
    background,
    surface: `color-mix(in srgb, ${midground} 4%, ${background})`,
    surfaceRaised: `color-mix(in srgb, ${midground} 8%, ${background})`,
    textPrimary: midground,
    textSecondary: `color-mix(in srgb, ${midground} 80%, transparent)`,
    textTertiary: `color-mix(in srgb, ${midground} 70%, transparent)`,
    border: `color-mix(in srgb, ${midground} 15%, transparent)`,
    borderStrong: `color-mix(in srgb, ${midground} 24%, transparent)`,
    success,
    warning,
    error,
    glow,
    radius,
    fontSans,
    fontMono,
    typographyScale,
  };
}

const hermesTealTheme = createHermesTheme({
  background: "#041c1c",
  midground: "#ffe6cb",
  glow: "rgba(255, 189, 56, 0.18)",
});

/**
 * Built-in presets from the Hermes Agent dashboard. Keep the stable IDs in
 * sync with web/src/themes/presets.ts in NousResearch/hermes-agent.
 */
export const HERMES_THEME_PRESETS = {
  default: hermesTealTheme,
  "default-large": {
    ...hermesTealTheme,
    typographyScale: 1.12,
  },
  "nous-blue": createHermesTheme({
    background: "#E8F2FD",
    midground: "#0053FD",
    glow: "rgba(0, 83, 253, 0.12)",
  }),
  midnight: createHermesTheme({
    background: "#0a0a1f",
    midground: "#d4c8ff",
    glow: "rgba(167, 139, 250, 0.18)",
    radius: "0.75rem",
    fontSans: FONT_STACKS.inter,
    fontMono: FONT_STACKS.jetBrainsMono,
  }),
  ember: createHermesTheme({
    background: "#1a0a06",
    midground: "#ffd8b0",
    glow: "rgba(249, 115, 22, 0.2)",
    radius: "0.25rem",
    fontSans: FONT_STACKS.spectral,
    fontMono: FONT_STACKS.ibmPlexMono,
    warning: "#f97316",
    error: "#c92d0f",
  }),
  mono: createHermesTheme({
    background: "#0e0e0e",
    midground: "#eaeaea",
    glow: "rgba(255, 255, 255, 0.08)",
    radius: "0",
    fontSans: FONT_STACKS.ibmPlexSans,
    fontMono: FONT_STACKS.ibmPlexMono,
  }),
  cyberpunk: createHermesTheme({
    background: "#040608",
    midground: "#9bffcf",
    glow: "rgba(0, 255, 136, 0.14)",
    radius: "0",
    fontSans: CYBERPUNK_FONT_STACK,
    fontMono: CYBERPUNK_FONT_STACK,
    success: "#00ff88",
    warning: "#ffd700",
    error: "#ff0055",
  }),
  rose: createHermesTheme({
    background: "#1a0f15",
    midground: "#ffd4e1",
    glow: "rgba(249, 168, 212, 0.16)",
    radius: "1rem",
    fontSans: FONT_STACKS.fraunces,
    fontMono: FONT_STACKS.dmMono,
  }),
} as const satisfies Record<string, HermesTheme>;

export type HermesThemePresetId = keyof typeof HERMES_THEME_PRESETS;

export const HERMES_THEME_PRESET_OPTIONS = [
  { value: "default", label: (t) => t("widget.hermesAgent.option.themePreset.option.default.label") },
  {
    value: "default-large",
    label: (t) => t("widget.hermesAgent.option.themePreset.option.default-large.label"),
  },
  { value: "nous-blue", label: (t) => t("widget.hermesAgent.option.themePreset.option.nous-blue.label") },
  { value: "midnight", label: (t) => t("widget.hermesAgent.option.themePreset.option.midnight.label") },
  { value: "ember", label: (t) => t("widget.hermesAgent.option.themePreset.option.ember.label") },
  { value: "mono", label: (t) => t("widget.hermesAgent.option.themePreset.option.mono.label") },
  { value: "cyberpunk", label: (t) => t("widget.hermesAgent.option.themePreset.option.cyberpunk.label") },
  { value: "rose", label: (t) => t("widget.hermesAgent.option.themePreset.option.rose.label") },
] as const satisfies ReadonlyArray<{ value: HermesThemePresetId; label: stringOrTranslation }>;

interface HermesFontChoice {
  id: string;
  label: stringOrTranslation;
  stack: string;
}

/** Curated font IDs from the Hermes dashboard font picker. */
export const HERMES_FONT_CHOICES = [
  {
    id: "system-sans",
    label: (t) => t("widget.hermesAgent.option.fontFamily.option.system-sans.label"),
    stack: SYSTEM_SANS,
  },
  {
    id: "system-serif",
    label: (t) => t("widget.hermesAgent.option.fontFamily.option.system-serif.label"),
    stack: SYSTEM_SERIF,
  },
  {
    id: "system-mono",
    label: (t) => t("widget.hermesAgent.option.fontFamily.option.system-mono.label"),
    stack: SYSTEM_MONO,
  },
  {
    id: "inter",
    label: (t) => t("widget.hermesAgent.option.fontFamily.option.inter.label"),
    stack: FONT_STACKS.inter,
  },
  {
    id: "ibm-plex-sans",
    label: (t) => t("widget.hermesAgent.option.fontFamily.option.ibm-plex-sans.label"),
    stack: FONT_STACKS.ibmPlexSans,
  },
  {
    id: "work-sans",
    label: (t) => t("widget.hermesAgent.option.fontFamily.option.work-sans.label"),
    stack: FONT_STACKS.workSans,
  },
  {
    id: "atkinson-hyperlegible",
    label: (t) => t("widget.hermesAgent.option.fontFamily.option.atkinson-hyperlegible.label"),
    stack: FONT_STACKS.atkinsonHyperlegible,
  },
  {
    id: "dm-sans",
    label: (t) => t("widget.hermesAgent.option.fontFamily.option.dm-sans.label"),
    stack: FONT_STACKS.dmSans,
  },
  {
    id: "spectral",
    label: (t) => t("widget.hermesAgent.option.fontFamily.option.spectral.label"),
    stack: FONT_STACKS.spectral,
  },
  {
    id: "fraunces",
    label: (t) => t("widget.hermesAgent.option.fontFamily.option.fraunces.label"),
    stack: FONT_STACKS.fraunces,
  },
  {
    id: "source-serif",
    label: (t) => t("widget.hermesAgent.option.fontFamily.option.source-serif.label"),
    stack: FONT_STACKS.sourceSerif,
  },
  {
    id: "jetbrains-mono",
    label: (t) => t("widget.hermesAgent.option.fontFamily.option.jetbrains-mono.label"),
    stack: FONT_STACKS.jetBrainsMono,
  },
  {
    id: "ibm-plex-mono",
    label: (t) => t("widget.hermesAgent.option.fontFamily.option.ibm-plex-mono.label"),
    stack: FONT_STACKS.ibmPlexMono,
  },
  {
    id: "space-mono",
    label: (t) => t("widget.hermesAgent.option.fontFamily.option.space-mono.label"),
    stack: FONT_STACKS.spaceMono,
  },
] as const satisfies readonly HermesFontChoice[];

export type HermesFontChoiceId = "theme" | (typeof HERMES_FONT_CHOICES)[number]["id"];

export const HERMES_FONT_OPTIONS = [
  { value: "theme", label: (t) => t("widget.hermesAgent.option.fontFamily.option.theme.label") },
  ...HERMES_FONT_CHOICES.map(({ id, label }) => ({ value: id, label })),
] satisfies ReadonlyArray<{ value: HermesFontChoiceId; label: stringOrTranslation }>;

export const HERMES_BRAND_THEME = HERMES_THEME_PRESETS.default;

export const HERMES_NEUTRAL_THEME: HermesTheme = {
  background: "var(--mantine-color-body)",
  surface: "var(--mantine-color-default)",
  surfaceRaised: "var(--mantine-color-default-hover)",
  textPrimary: "var(--mantine-color-text)",
  textSecondary: "var(--mantine-color-dimmed)",
  textTertiary: "var(--mantine-color-dimmed)",
  border: "var(--mantine-color-default-border)",
  borderStrong: "var(--mantine-color-default-border)",
  success: "var(--mantine-color-green-6)",
  warning: "var(--mantine-color-yellow-6)",
  error: "var(--mantine-color-red-6)",
  glow: "transparent",
  radius: "var(--mantine-radius-md)",
  fontSans: FONT_STACKS.inter,
  fontMono: SYSTEM_MONO,
  typographyScale: 1,
};

export function resolveHermesTheme(brandTheme: boolean, presetId: string, fontId: string): HermesTheme {
  const baseTheme = brandTheme
    ? (HERMES_THEME_PRESETS[presetId as HermesThemePresetId] ?? HERMES_BRAND_THEME)
    : HERMES_NEUTRAL_THEME;
  const fontChoice = HERMES_FONT_CHOICES.find((choice) => choice.id === fontId);

  if (!fontChoice) return baseTheme;

  return {
    ...baseTheme,
    fontSans: fontChoice.stack,
  };
}
