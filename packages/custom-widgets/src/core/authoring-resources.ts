import { customJsxAuthoringCatalog, getCustomJsxComponentProps } from "./component-catalog";
import { customJsxExamples } from "./examples";
import { CUSTOM_WIDGET_SKILL_MD, CUSTOM_WIDGET_SKILL_VERSION } from "./embedded-ai-prompt";
import { customJsxTablerIconNames } from "./tabler-icons";

export const CUSTOM_WIDGET_SKILLS_SH_URL = "https://www.skills.sh/homarr-labs/homarr/homarr-custom-widget";
export const CUSTOM_WIDGET_SKILL_SOURCE_URL =
  "https://github.com/homarr-labs/homarr/tree/HEAD/.agents/skills/homarr-custom-widget";
export const CUSTOM_WIDGET_SKILL_INSTALL_COMMAND =
  "npx skills add https://github.com/homarr-labs/homarr --skill homarr-custom-widget";

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
  return customJsxAuthoringCatalog;
}

export function getCustomWidgetComponent(name: string) {
  const component = customJsxAuthoringCatalog.components.find((candidate) => candidate.name === name);
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
    props: getCustomJsxComponentProps(name),
    blockedProps: component.blockedProps,
    bind: component.bind,
    subcomponents: component.subcomponents,
    accessibilityRequirements: component.accessibilityRequirements,
    documentationUrl: component.documentationUrl,
    knownValues: component.name === "TablerIcon" ? { name: customJsxTablerIconNames } : undefined,
    deniedReason: component.deniedReason,
    blockedCapabilities: customJsxAuthoringCatalog.blockedCapabilities,
  };
}

export function getCustomWidgetExample(name: string) {
  return customJsxExamples.find((example) => example.id === name) ?? null;
}
