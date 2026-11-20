import type { ThemeId } from "@homarr/definitions";
import { themeIds } from "@homarr/definitions";
import Color from "color";
import { z } from "zod/v4";

export const themeSelectionSchema = z.enum([...themeIds, "custom"]);
export type ThemeSelectionId = z.infer<typeof themeSelectionSchema>;

export const customThemeMaxLength = 49_152;
export const themeCustomCssSchema = z.string().max(16_384);

const safeKey = z
  .string()
  .regex(/^[A-Za-z][A-Za-z\d-]{0,47}$/u)
  .refine(
    (key) => !["prototype", "constructor"].includes(key.toLowerCase()) && !Object.hasOwn(Object.prototype, key),
    "Reserved name",
  );

const cssFunctions = new Set([
  "calc",
  "clamp",
  "max",
  "min",
  "var",
  "rgb",
  "rgba",
  "hsl",
  "hsla",
  "oklab",
  "oklch",
  "lab",
  "lch",
  "color",
  "color-mix",
  "light-dark",
  "linear-gradient",
  "radial-gradient",
  "blur",
  "brightness",
  "saturate",
  "contrast",
  "drop-shadow",
]);

const isBalancedCssValue = (value: string) => {
  let depth = 0;
  let quote = "";
  for (const character of value) {
    if (quote) {
      if (quote === character) quote = "";
      continue;
    }
    if (character === "'" || character === '"') quote = character;
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (depth < 0 || depth > 8) return false;
  }
  return !quote && depth === 0;
};

// Mantine serializes tokens into a style element. Keep the CSS value grammar free of
// declaration/markup delimiters, escapes, comments and resource-loading functions.
const cssValue = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .regex(/^[\p{L}\p{M}\p{N}_ .,%#()*+/'"-]+$/u, "Enter a CSS value without markup or declarations")
  .refine((value) => {
    if (Object.hasOwn(Object.prototype, value) || /\/\*|\*\//u.test(value) || !isBalancedCssValue(value)) return false;
    return Array.from(value.matchAll(/([a-z][\w-]*)\s*\(/giu)).every((match) =>
      cssFunctions.has(match[1]?.toLowerCase() ?? ""),
    );
  }, "Use balanced CSS values without comments or external resources");

// Mantine's color math expects normalized channels. Convert named and functional colors
// so CSS and Mantine agree on the color used for contrast and hover states.
const normalizeColor = (input: string) => {
  const value = input.toLowerCase();
  if (/^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/u.test(value)) return value;
  const oklch =
    /^oklch\((\d*\.?\d+(?:e[+-]?\d+)?)(%?) +(\d*\.?\d+(?:e[+-]?\d+)?%?) +(-?\d*\.?\d+(?:e[+-]?\d+)?)(?:deg)?(?:\s*\/\s*(\d*\.?\d+(?:e[+-]?\d+)?)(%?))?\)$/u.exec(
      value,
    );
  if (oklch) {
    const channels = [oklch[1], oklch[3], oklch[4], oklch[5] ?? "1"].map((channel) => Number.parseFloat(channel ?? ""));
    if (!channels.every(Number.isFinite)) return "";
    let lightness = Math.min(1, Number(oklch[1])) * 100;
    if (oklch[2]) lightness = Math.min(100, Number(oklch[1]));
    let alpha = "";
    if (oklch[5]) {
      let opacity = Math.min(1, Number(oklch[5]));
      if (oklch[6]) opacity = Math.min(100, Number(oklch[5])) / 100;
      alpha = ` / ${opacity}`;
    }
    return `oklch(${lightness}% ${oklch[3]} ${oklch[4]}${alpha})`;
  }
  try {
    const color = Color(value);
    if (!Number.isFinite(color.alpha())) return "";
    let hex = color.hex().toLowerCase();
    if (color.alpha() !== 1) hex = color.hexa().toLowerCase();
    if (/^#[\da-f]{6}(?:[\da-f]{2})?$/u.test(hex)) return hex;
    return "";
  } catch {
    return "";
  }
};

const cssColor = cssValue.overwrite(normalizeColor).refine(Boolean, "Enter a hex, named, rgb, hsl or oklch color");
const hexColor = z.string().regex(/^#[\da-f]{6}$/iu, "Enter a six-digit hex color");

const colorScale = z
  .tuple([cssColor, cssColor, cssColor, cssColor, cssColor, cssColor, cssColor, cssColor, cssColor, cssColor])
  .rest(cssColor)
  .refine((colors) => colors.length <= 20, "Use 10–20 shades per color");

const tokenMap = z.record(safeKey, cssValue).refine((values) => Object.keys(values).length <= 32, "Too many tokens");
const breakpoint = z.string().regex(/^\d{1,3}(?:\.\d{1,3})?em$/u, "Use a breakpoint in em");
const shade = z.literal([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
const classNames = z
  .string()
  .max(160)
  .regex(/^[\w -]*$/u, "Use space-separated CSS class names");
const headingSize = z.strictObject({
  fontSize: cssValue.optional(),
  fontWeight: cssValue.optional(),
  lineHeight: cssValue.optional(),
});

const styleValue = z.union([cssValue, z.number().finite()]);
const componentStyle = z.strictObject({
  background: cssValue.optional(),
  backgroundImage: cssValue.optional(),
  backgroundColor: cssValue.optional(),
  backdropFilter: cssValue.optional(),
  color: cssValue.optional(),
  border: cssValue.optional(),
  borderColor: cssValue.optional(),
  borderRadius: styleValue.optional(),
  borderWidth: styleValue.optional(),
  borderStyle: cssValue.optional(),
  boxShadow: cssValue.optional(),
  fontFamily: cssValue.optional(),
  fontSize: styleValue.optional(),
  fontStyle: cssValue.optional(),
  fontWeight: styleValue.optional(),
  letterSpacing: styleValue.optional(),
  lineHeight: styleValue.optional(),
  margin: styleValue.optional(),
  padding: styleValue.optional(),
  paddingBlock: styleValue.optional(),
  paddingInline: styleValue.optional(),
  gap: styleValue.optional(),
  opacity: z.number().min(0).max(1).optional(),
  textDecoration: cssValue.optional(),
  textTransform: z.enum(["none", "uppercase", "lowercase", "capitalize"]).optional(),
});

const componentTheme = z.strictObject({
  vars: z
    .record(
      safeKey,
      z
        .record(z.string().regex(/^--[a-z][a-z\d-]{0,63}$/u), styleValue)
        .refine((value) => Object.keys(value).length <= 32, "Too many component variables"),
    )
    .refine((value) => Object.keys(value).length <= 16, "Too many component selectors")
    .optional(),
  classNames: z.record(safeKey, classNames).optional(),
  styles: z.record(safeKey, componentStyle).optional(),
  defaultProps: z
    .strictObject({
      autoContrast: z.boolean().optional(),
      color: cssValue.optional(),
      radius: z.union([cssValue, z.number().min(0).max(256)]).optional(),
      size: z.union([cssValue, z.number().min(0).max(256)]).optional(),
      shadow: cssValue.optional(),
      variant: safeKey.optional(),
      withBorder: z.boolean().optional(),
      padding: z.union([cssValue, z.number().min(0).max(256)]).optional(),
      blur: z.number().min(0).max(40).optional(),
      backgroundOpacity: z.number().min(0).max(1).optional(),
      overlayProps: z
        .strictObject({
          blur: z.number().min(0).max(40).optional(),
          backgroundOpacity: z.number().min(0).max(1).optional(),
          color: cssColor.optional(),
        })
        .optional(),
      transitionProps: z
        .strictObject({
          duration: z.number().min(0).max(1500).optional(),
          transition: z
            .enum([
              "fade",
              "pop",
              "scale",
              "fade-up",
              "fade-down",
              "slide-up",
              "slide-down",
              "slide-left",
              "slide-right",
            ])
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

export const customMantineThemeSchema = z.strictObject({
  focusRing: z.enum(["auto", "always", "never"]).optional(),
  scale: z.number().min(0.5).max(3).optional(),
  fontSmoothing: z.boolean().optional(),
  white: cssColor.optional(),
  black: cssColor.optional(),
  colors: z
    .record(safeKey, colorScale)
    .refine((values) => Object.keys(values).length <= 32, "Too many colors")
    .optional(),
  primaryColor: safeKey.optional(),
  primaryShade: z.union([shade, z.strictObject({ light: shade.optional(), dark: shade.optional() })]).optional(),
  autoContrast: z.boolean().optional(),
  luminanceThreshold: z.number().min(0).max(1).optional(),
  fontFamily: cssValue.optional(),
  fontFamilyMonospace: cssValue.optional(),
  headings: z
    .strictObject({
      fontFamily: cssValue.optional(),
      fontWeight: cssValue.optional(),
      textWrap: z.enum(["wrap", "nowrap", "balance", "pretty", "stable"]).optional(),
      sizes: z
        .strictObject({
          h1: headingSize.optional(),
          h2: headingSize.optional(),
          h3: headingSize.optional(),
          h4: headingSize.optional(),
          h5: headingSize.optional(),
          h6: headingSize.optional(),
        })
        .optional(),
    })
    .optional(),
  radius: tokenMap.optional(),
  defaultRadius: z.union([cssValue, z.number().min(0).max(256)]).optional(),
  spacing: tokenMap.optional(),
  fontSizes: tokenMap.optional(),
  lineHeights: tokenMap.optional(),
  fontWeights: tokenMap.optional(),
  breakpoints: z
    .strictObject({
      xs: breakpoint.optional(),
      sm: breakpoint.optional(),
      md: breakpoint.optional(),
      lg: breakpoint.optional(),
      xl: breakpoint.optional(),
    })
    .optional(),
  shadows: tokenMap.optional(),
  respectReducedMotion: z.boolean().optional(),
  cursorType: z.enum(["default", "pointer"]).optional(),
  defaultGradient: z
    .strictObject({
      from: cssValue.optional(),
      to: cssValue.optional(),
      deg: z.number().min(-360).max(360).optional(),
    })
    .optional(),
  activeClassName: classNames.optional(),
  focusClassName: classNames.optional(),
  components: z
    .record(safeKey, componentTheme)
    .refine((values) => Object.keys(values).length <= 32, "Too many components")
    .optional(),
  other: z.record(safeKey, z.union([cssValue, z.number().finite(), z.boolean(), z.null()])).optional(),
});

const paletteSchema = z.strictObject({
  body: hexColor.optional(),
  surface: hexColor.optional(),
  hover: hexColor.optional(),
  border: hexColor.optional(),
  text: hexColor.optional(),
  dimmed: hexColor.optional(),
  primary: hexColor.optional(),
  secondary: hexColor.optional(),
});

const defaultColorNames = new Set([
  "dark",
  "gray",
  "red",
  "pink",
  "grape",
  "violet",
  "indigo",
  "blue",
  "cyan",
  "teal",
  "green",
  "lime",
  "yellow",
  "orange",
  "primaryColor",
  "secondaryColor",
]);
const presetColorNames = new Set([
  "presetPrimaryLight",
  "presetPrimaryDark",
  "presetSecondaryLight",
  "presetSecondaryDark",
]);

export const customThemeSchema = z
  .strictObject({
    preset: z.enum(themeIds),
    theme: customMantineThemeSchema,
    light: paletteSchema.optional(),
    dark: paletteSchema.optional(),
    customCss: themeCustomCssSchema.optional(),
  })
  .superRefine((value, context) => {
    const primary = value.theme.primaryColor;
    if (
      primary &&
      !Object.hasOwn(value.theme.colors ?? {}, primary) &&
      !defaultColorNames.has(primary) &&
      !(value.preset !== "default" && presetColorNames.has(primary))
    ) {
      context.addIssue({
        code: "custom",
        path: ["theme", "primaryColor"],
        message: "Choose a color defined by Mantine or in colors",
      });
    }
    const { customCss: _css, ...configuration } = value;
    if (JSON.stringify(configuration).length > 32_768) {
      context.addIssue({ code: "custom", message: "Theme configuration exceeds 32 KB" });
    }
    if (JSON.stringify(value).length > customThemeMaxLength) {
      context.addIssue({ code: "custom", message: "Theme bundle exceeds 48 KB" });
    }
  });

export type CustomTheme = z.infer<typeof customThemeSchema>;

export interface ThemeSelection {
  themeId: ThemeSelectionId;
  customTheme: CustomTheme | null;
}

export const resolveThemeSelection = (server: ThemeSelection, selection?: ThemeSelection) => {
  const themeId = selection?.themeId ?? server.themeId ?? "default";
  let customTheme: CustomTheme | null = null;
  let preset: ThemeId = "default";
  if (themeId === "custom") {
    customTheme = server.customTheme;
    if (selection?.themeId === "custom") customTheme = selection.customTheme;
    preset = customTheme?.preset ?? "default";
  } else preset = themeId;
  const document: CustomTheme = customTheme ?? { preset, theme: {} };
  return { themeId, preset, customTheme, document };
};

export const parseStoredCustomTheme = (value: unknown): CustomTheme | null => {
  try {
    let input = value;
    if (typeof input === "string") {
      if (input.length > customThemeMaxLength) return null;
      input = JSON.parse(input) as unknown;
    }
    const parsed = customThemeSchema.safeParse(input);
    if (!parsed.success) return null;
    // Remove explicit undefined values that a transport like SuperJSON can preserve.
    return JSON.parse(JSON.stringify(parsed.data)) as CustomTheme;
  } catch {
    return null;
  }
};
