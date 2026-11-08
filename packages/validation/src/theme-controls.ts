import { z } from "zod/v4";

import type { CustomTheme } from "./theme";

export const themeControlGroups = ["layout", "typography", "colors", "surfaces", "overlays", "accessibility"] as const;
const sizes = ["xs", "sm", "md", "lg", "xl"] as const;

export interface ThemeControl {
  path: string;
  group: (typeof themeControlGroups)[number];
  label: string;
  labelKey: string;
  suffix?: string;
  component?: string;
  type: "text" | "number" | "boolean" | "color" | "select";
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  defaultValue?: string | number | boolean;
}

const control = (
  path: string,
  group: ThemeControl["group"],
  labelKey: string,
  label: string,
  extra: Partial<ThemeControl> = {},
): ThemeControl => ({ path, group, labelKey, label, type: "text", ...extra });

export const themeControls: ThemeControl[] = [
  control("theme.defaultRadius", "layout", "defaultRadius", "Default roundness"),
  control("theme.scale", "layout", "scale", "UI scale", { type: "number", min: 0.5, max: 3, step: 0.05 }),
  ...sizes.flatMap((size) => [
    control(`theme.spacing.${size}`, "layout", "spacing", `Spacing ${size.toUpperCase()}`, {
      suffix: size.toUpperCase(),
    }),
    control(`theme.radius.${size}`, "layout", "radius", `Radius ${size.toUpperCase()}`, { suffix: size.toUpperCase() }),
    control(`theme.breakpoints.${size}`, "layout", "breakpoint", `Breakpoint ${size.toUpperCase()}`, {
      suffix: size.toUpperCase(),
    }),
    control(`theme.fontSizes.${size}`, "typography", "fontSizes", `Font size ${size.toUpperCase()}`, {
      suffix: size.toUpperCase(),
    }),
    control(`theme.lineHeights.${size}`, "typography", "lineHeight", `Line height ${size.toUpperCase()}`, {
      suffix: size.toUpperCase(),
    }),
    control(`theme.shadows.${size}`, "surfaces", "shadow", `Shadow ${size.toUpperCase()}`, {
      suffix: size.toUpperCase(),
    }),
  ]),
  control("theme.fontFamily", "typography", "fontFamily", "Body font"),
  control("theme.headings.fontFamily", "typography", "headingFont", "Heading font"),
  control("theme.fontFamilyMonospace", "typography", "monoFont", "Monospace font"),
  control("theme.headings.fontWeight", "typography", "headingWeight", "Heading weight"),
  control("theme.fontSmoothing", "typography", "fontSmoothing", "Font smoothing", { type: "boolean" }),
  ...(["h1", "h2", "h3", "h4", "h5", "h6"] as const).flatMap((heading) => [
    control(`theme.headings.sizes.${heading}.fontSize`, "typography", "headingSize", `${heading.toUpperCase()} size`, {
      suffix: heading.toUpperCase(),
    }),
    control(
      `theme.headings.sizes.${heading}.fontWeight`,
      "typography",
      "headingWeight",
      `${heading.toUpperCase()} weight`,
      { suffix: heading.toUpperCase() },
    ),
    control(
      `theme.headings.sizes.${heading}.lineHeight`,
      "typography",
      "lineHeight",
      `${heading.toUpperCase()} line height`,
      { suffix: heading.toUpperCase() },
    ),
  ]),
  ...(["light", "dark"] as const).flatMap((scheme) =>
    ["body", "surface", "hover", "border", "text", "dimmed", "primary", "secondary"].map((key) =>
      control(`${scheme}.${key}`, "colors", key, `${scheme} ${key}`, { type: "color", suffix: scheme }),
    ),
  ),
  control("theme.autoContrast", "colors", "autoContrast", "Automatic contrast", { type: "boolean" }),
  control("theme.luminanceThreshold", "colors", "luminanceThreshold", "Contrast threshold", {
    type: "number",
    min: 0,
    max: 1,
    step: 0.05,
  }),
  control("theme.primaryShade.light", "colors", "primaryShade", "Primary shade (light)", {
    type: "number",
    min: 0,
    max: 9,
    suffix: "light",
  }),
  control("theme.primaryShade.dark", "colors", "primaryShade", "Primary shade (dark)", {
    type: "number",
    min: 0,
    max: 9,
    suffix: "dark",
  }),
  ...[
    "Button",
    "ActionIcon",
    "Input",
    "Card",
    "Paper",
    "Badge",
    "Menu",
    "Popover",
    "Tooltip",
    "Tabs",
    "Accordion",
    "Notification",
  ].flatMap((name) => {
    const selectors: Record<string, string> = {
      Input: "input",
      Menu: "dropdown",
      Popover: "dropdown",
      Tooltip: "tooltip",
      Tabs: "tab",
      Accordion: "item",
    };
    const selector = selectors[name] ?? "root";
    const fields = [
      control(`theme.components.${name}.defaultProps.radius`, "surfaces", "componentRadius", `${name} radius`, {
        component: name,
      }),
      control(
        `theme.components.${name}.styles.${selector}.borderWidth`,
        "surfaces",
        "borderWidth",
        `${name} border width`,
        {
          component: name,
        },
      ),
      control(
        `theme.components.${name}.styles.${selector}.backgroundColor`,
        "surfaces",
        "surfaceBackground",
        `${name} background`,
        { component: name },
      ),
      control(`theme.components.${name}.styles.${selector}.color`, "surfaces", "surfaceText", `${name} text`, {
        component: name,
      }),
      control(
        `theme.components.${name}.styles.${selector}.borderColor`,
        "surfaces",
        "surfaceBorder",
        `${name} border color`,
        {
          component: name,
        },
      ),
    ];
    if (["Card", "Paper", "Menu", "Popover"].includes(name)) {
      fields.push(
        control(`theme.components.${name}.defaultProps.shadow`, "surfaces", "componentShadow", `${name} shadow`, {
          component: name,
        }),
      );
    }
    if (name === "Tooltip" || name === "Notification") {
      let defaultValue = "none";
      if (name === "Notification") defaultValue = "var(--mantine-shadow-lg)";
      fields.push(
        control(
          `theme.components.${name}.styles.${selector}.boxShadow`,
          "surfaces",
          "componentShadow",
          `${name} shadow`,
          { component: name, defaultValue },
        ),
      );
    }
    if (["Card", "Paper"].includes(name)) {
      fields.push(
        control(`theme.components.${name}.defaultProps.withBorder`, "surfaces", "componentBorder", `${name} border`, {
          component: name,
          type: "boolean",
        }),
      );
      fields.push(
        control(`theme.components.${name}.styles.root.padding`, "surfaces", "componentPadding", `${name} padding`, {
          component: name,
        }),
      );
    }
    if (["Button", "ActionIcon", "Input", "Badge"].includes(name)) {
      fields.push(
        control(`theme.components.${name}.defaultProps.size`, "surfaces", "componentSize", `${name} size`, {
          component: name,
        }),
      );
    }
    if (["Button", "ActionIcon", "Input", "Badge", "Tabs", "Accordion"].includes(name)) {
      fields.push(
        control(`theme.components.${name}.defaultProps.variant`, "surfaces", "componentVariant", `${name} variant`, {
          component: name,
        }),
      );
    }
    if (name === "Button" || name === "ActionIcon") {
      let prefix = "button";
      if (name === "ActionIcon") prefix = "ai";
      fields.push(
        control(
          `theme.components.${name}.vars.root.--${prefix}-hover`,
          "surfaces",
          "hoverBackground",
          `${name} hover background`,
          { component: name },
        ),
      );
      fields.push(
        control(
          `theme.components.${name}.vars.root.--${prefix}-hover-color`,
          "surfaces",
          "hoverText",
          `${name} hover text`,
          { component: name },
        ),
      );
    }
    return fields;
  }),
  ...["Modal", "Drawer"].flatMap((name) => [
    control(
      `theme.components.${name}.defaultProps.overlayProps.blur`,
      "overlays",
      "overlayBlur",
      `${name} backdrop blur`,
      { component: name, type: "number", min: 0, max: 40, defaultValue: 0 },
    ),
    control(
      `theme.components.${name}.defaultProps.overlayProps.backgroundOpacity`,
      "overlays",
      "overlayOpacity",
      `${name} backdrop opacity`,
      { component: name, type: "number", min: 0, max: 1, step: 0.05, defaultValue: 0.6 },
    ),
    control(
      `theme.components.${name}.defaultProps.overlayProps.color`,
      "overlays",
      "overlayColor",
      `${name} backdrop color`,
      { component: name, type: "color", defaultValue: "#000000" },
    ),
    control(`theme.components.${name}.defaultProps.radius`, "overlays", "componentRadius", `${name} radius`, {
      component: name,
    }),
    control(`theme.components.${name}.defaultProps.shadow`, "overlays", "componentShadow", `${name} shadow`, {
      component: name,
    }),
    control(`theme.components.${name}.defaultProps.padding`, "overlays", "componentPadding", `${name} padding`, {
      component: name,
    }),
    control(
      `theme.components.${name}.defaultProps.transitionProps.duration`,
      "overlays",
      "transitionDuration",
      `${name} transition duration`,
      { component: name, type: "number", min: 0, max: 1500, step: 25, defaultValue: 200 },
    ),
    control(
      `theme.components.${name}.styles.content.backgroundColor`,
      "overlays",
      "surfaceBackground",
      `${name} background`,
      { component: name },
    ),
    control(
      `theme.components.${name}.styles.header.backgroundColor`,
      "overlays",
      "headerBackground",
      `${name} header background`,
      { component: name },
    ),
  ]),
  control("theme.respectReducedMotion", "accessibility", "respectReducedMotion", "Respect reduced motion", {
    type: "boolean",
  }),
  control("theme.focusRing", "accessibility", "focusRing", "Focus ring", {
    type: "select",
    options: ["auto", "always", "never"],
  }),
  control("theme.cursorType", "accessibility", "cursorType", "Cursor", {
    type: "select",
    options: ["default", "pointer"],
  }),
];

const controlPathSchema = z.enum(themeControls.map(({ path }) => path) as [string, ...string[]]);
export const themeControlChangeSchema = z.strictObject({
  path: controlPathSchema.describe("A control path returned by theme_getControls. Use null to reset this override."),
  value: z.union([z.string().max(300), z.number().finite(), z.boolean(), z.null()]),
});

export const getThemeControlValue = (value: unknown, path: string): unknown => {
  let current = value;
  for (const key of path.split(".")) {
    if (!current || typeof current !== "object" || !Object.hasOwn(current, key)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
};

/** Patch only registered paths. Validate the complete result before applying or saving a draft. */
export const updateThemeDraft = (
  document: CustomTheme,
  changes: z.infer<typeof themeControlChangeSchema>[],
): CustomTheme => {
  const draft = JSON.parse(JSON.stringify(document)) as Record<string, unknown>;
  for (const input of changes) {
    const { path, value } = themeControlChangeSchema.parse(input);
    const keys = path.split(".");
    let current = draft;
    const parents: { object: Record<string, unknown>; key: string }[] = [];
    for (const key of keys.slice(0, -1)) {
      if (!current[key] || typeof current[key] !== "object") {
        // Mantine also accepts a single shade; expand it before editing either scheme.
        if (key === "primaryShade" && typeof current[key] === "number")
          current[key] = { light: current[key], dark: current[key] };
        else current[key] = {};
      }
      parents.push({ object: current, key });
      current = current[key] as Record<string, unknown>;
    }
    const last = keys.at(-1);
    if (!last) continue;
    if (value === null) delete current[last];
    else current[last] = value;
    const accent = /^(?:light|dark)\.(primary|secondary)$/u.exec(path)?.[1];
    if (accent && value !== null) {
      const theme = draft.theme as Record<string, unknown>;
      if (accent === "primary") delete theme.primaryColor;
      const colors = theme.colors as Record<string, unknown> | undefined;
      if (colors) {
        delete colors[`${accent}Color`];
        const title = accent.charAt(0).toUpperCase() + accent.slice(1);
        delete colors[`preset${title}Light`];
        delete colors[`preset${title}Dark`];
      }
    }
    if (path.endsWith(".boxShadow") && typeof value === "string" && sizes.includes(value as (typeof sizes)[number])) {
      current[last] = `var(--mantine-shadow-${value})`;
    }
    for (const { object, key } of parents.toReversed()) {
      if (key !== "theme" && Object.keys(object[key] as object).length === 0) delete object[key];
    }
  }
  return draft as CustomTheme;
};
