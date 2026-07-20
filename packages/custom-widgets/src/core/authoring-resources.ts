import {
  customJsxBindableComponentNames,
  customJsxComponentByName,
  enabledCustomJsxComponents,
} from "./component-registry";
import { customJsxExamples } from "./examples";
import { customJsxTablerIconNames } from "./tabler-icons";

export const CUSTOM_WIDGET_SKILL_VERSION = "2.0.0";
export const CUSTOM_WIDGET_SKILLS_SH_URL = "https://www.skills.sh/homarr-labs/homarr/homarr-custom-widget";
export const CUSTOM_WIDGET_SKILL_SOURCE_URL =
  "https://github.com/homarr-labs/homarr/tree/dev/.agents/skills/homarr-custom-widget";
export const CUSTOM_WIDGET_SKILL_INSTALL_COMMAND =
  "npx skills add https://github.com/homarr-labs/homarr --skill homarr-custom-widget";

export const CUSTOM_WIDGET_SKILL_MD = `---
name: homarr-custom-widget
description: Author safe Homarr Custom JSX v2 widgets from API documentation. Use when creating or fixing Homarr custom widgets, including multi-source dashboards, queries, actions, options, temporary inputs, and Mantine JSX.
license: Apache-2.0
metadata:
  version: "2.0.0"
---

# Homarr Custom Widget

Create one widget at a time. Repeat the workflow when the user asks for several widgets; do not invent packs or shared connections.

## Authoring workflow

1. Read the API documentation supplied by the user. Ask for a missing base URL only when it cannot be inferred safely.
2. Build one credential-free \`homarr-custom-widget-v2\` manifest and one safe JSX template.
3. Return the complete manifest and JSX in the exact fenced-block format requested by the authoring prompt.
4. When the user supplies Homarr diagnostics, correct every reported issue while preserving unrelated fields.

## Output rules

- Use inline sources, named requests, definition-owned options, temporary bound inputs, and one safe JSX template.
- Use \`kind\`, not the HTTP method, to distinguish reads from user-triggered actions.
- Give every declared request parameter an explicit source. Load queries use \`optionsBinding\` with an option reference or primitive literal; manual queries and actions receive values only from the invoking component's \`params\` prop. Never infer bindings from matching names.
- Never put a credential in JSX, options, headers, URLs, examples, exports, logs, or chat output.
- Use declarative \`bind\` controls and Homarr request components; never emit imports, hooks, callbacks, browser requests, or arbitrary JavaScript.
- Include responsive loading, empty, error, and success states.
- Keep actions explicit, permission-scoped, confirmed when destructive, and followed by targeted invalidation.

Follow this document and the supplied authoring prompt as the complete authoring reference. Do not assume access to repository-relative files.
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

export function getCustomWidgetComponentCatalog() {
  return enabledCustomJsxComponents.map(({ name, package: packageName, category, supportedProps, subcomponents }) => ({
    name,
    package: packageName,
    category,
    propCount: supportedProps.filter((prop) => prop !== "bind").length,
    bindSupported: customJsxBindableComponentNames.has(name),
    subcomponents,
    detailUri: `homarr://custom-widgets/components/${encodeURIComponent(name)}`,
  }));
}

export function getCustomWidgetComponent(name: string) {
  const component = customJsxComponentByName.get(name);
  if (!component) return null;
  return {
    name: component.name,
    package: component.package,
    category: component.category,
    safety: component.safety,
    knownProps: component.supportedProps.filter((prop) => prop !== "bind"),
    bindSupported: customJsxBindableComponentNames.has(component.name),
    subcomponents: component.subcomponents,
    accessibilityRequirements: component.accessibilityRequirements,
    documentationUrl: component.documentationUrl,
    knownValues: component.name === "TablerIcon" ? { name: customJsxTablerIconNames } : undefined,
    deniedReason: component.safety === "denied" ? component.reason : undefined,
    propPolicy:
      component.safety === "denied"
        ? "This component is blocked."
        : "Ordinary serializable Mantine props pass through. Unsafe capabilities, callbacks, polymorphic roots, and escaping styles are blocked.",
  };
}

export function getCustomWidgetExample(name: string) {
  return customJsxExamples.find((example) => example.id === name) ?? null;
}
