import { customJsxAuthoringCatalog, getCustomJsxComponentProps } from "./component-catalog";
import { customJsxExamples } from "./examples";
import { customJsxTablerIconNames } from "./tabler-icons";

export const CUSTOM_WIDGET_SKILLS_SH_URL = "https://www.skills.sh/homarr-labs/homarr/homarr-custom-widget";
export const CUSTOM_WIDGET_SKILL_SOURCE_URL =
  "https://github.com/homarr-labs/homarr/tree/HEAD/.agents/skills/homarr-custom-widget";
export const CUSTOM_WIDGET_SKILL_INSTALL_COMMAND =
  "npx skills add https://github.com/homarr-labs/homarr --skill homarr-custom-widget";
export const CUSTOM_WIDGET_SKILL_VERSION = "2.0.0";

export const CUSTOM_WIDGET_SKILL_MD = `---
name: homarr-custom-widget
description: Author safe Homarr Custom JSX v2 widgets from API documentation.
---

# Homarr Custom Widget

Author one widget at a time. When connected to Homarr, retrieve \`homarr://custom-widgets/schema\` and only the component resources needed for the design. The live resources are authoritative for the installed release.

1. Read the API documentation.
2. Create one credential-free widget with keyed \`sources\`, keyed \`requests\`, optional keyed \`options\`, and safe JSX \`template\`.
3. Validate, preview, test queries and simulated actions, visually inspect, and iterate.
4. Request credentials through Homarr and never repeat plaintext.
5. Save only after narrow/wide, light/dark, loading, empty, error, and success states work.

Use \`{option:name}\` or \`$option\` for saved options. Use \`{param:name}\` or \`$param\` for values supplied by \`SubFetch\`, \`ActionButton\`, or \`ToggleSwitch\`. Load queries cannot use invocation parameters. Templates read \`data\`, \`status\`, \`options\`, and temporary \`inputs\`.

\`SubFetch\` with \`trigger="manual"\` renders its own load button. Its callback is \`(result, meta)\`; never author \`onClick\` or a fetch callback.

Use standard Mantine compound names and deliberate visual hierarchy, spacing, restrained semantic color, and responsive layouts. Avoid excessive nested cards.

Do not use imports, hooks, refs, raw HTML, raw event callbacks, browser requests, arbitrary functions, eval, bigint, npm packages, authored statement blocks, IIFEs, or recursion. Do not pretend MCP tools exist in an offline chat session.

When this skill is installed from the repository, optional offline details are in \`references/schema.md\`, \`references/runtime.md\`, and \`references/security.md\`. MCP-only clients should use the live Homarr resources instead.
`;

export function getCustomWidgetSkill() {
  return {
    name: "homarr-custom-widget",
    version: CUSTOM_WIDGET_SKILL_VERSION,
    skillMd: CUSTOM_WIDGET_SKILL_MD,
    skillsShUrl: CUSTOM_WIDGET_SKILLS_SH_URL,
    sourceUrl: CUSTOM_WIDGET_SKILL_SOURCE_URL,
    installCommand: CUSTOM_WIDGET_SKILL_INSTALL_COMMAND,
  };
}

export function getCustomWidgetSkillContent() {
  return CUSTOM_WIDGET_SKILL_MD;
}

export function getCustomWidgetComponentCatalog() {
  return customJsxAuthoringCatalog;
}

export function getCustomWidgetComponent(name: string) {
  const canonicalName = name === "Icon" ? "TablerIcon" : name;
  const component = customJsxAuthoringCatalog.components.find((candidate) => candidate.name === canonicalName);
  if (!component) return null;
  return {
    schemaVersion: customJsxAuthoringCatalog.schemaVersion,
    mantineVersion: customJsxAuthoringCatalog.mantineVersion,
    customWidgetVersion: customJsxAuthoringCatalog.customWidgetVersion,
    name: component.name,
    package: component.package,
    category: component.category,
    safety: component.safety,
    description: component.description,
    props: getCustomJsxComponentProps(canonicalName),
    blockedProps: component.blockedProps,
    bind: component.bind,
    subcomponents: component.subcomponents,
    accessibilityRequirements: component.accessibilityRequirements,
    documentationUrl: component.documentationUrl,
    knownValues: component.name === "TablerIcon" ? { name: customJsxTablerIconNames } : undefined,
    deniedReason: component.deniedReason,
  };
}

export function getCustomWidgetExample(name: string) {
  return customJsxExamples.find((example) => example.id === name) ?? null;
}
