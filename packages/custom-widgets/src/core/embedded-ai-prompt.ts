import generatedSkillContent from "./skill-content.generated.json";

import {
  buildCustomWidgetAiPrompt,
  CUSTOM_WIDGET_MANTINE_VERSION,
  finalizeCustomWidgetOfflineContent,
} from "./ai-prompt";
import {
  CUSTOM_JSX_AUTHORING_CATALOG_SCHEMA_VERSION,
  CUSTOM_WIDGET_AUTHORING_VERSION,
} from "./component-catalog-types";
import type { HomarrCustomWidgetV2 } from "./custom-jsx-schema";

export { CUSTOM_WIDGET_OFFLINE_BUNDLE_SENTINEL } from "./ai-prompt";

export const CUSTOM_WIDGET_SKILL_VERSION = "2.0.0";

interface GeneratedSkillContent {
  schemaVersion: 1;
  files: Array<{ path: string; content: string }>;
}

const skillContent = generatedSkillContent as GeneratedSkillContent;

export const CUSTOM_WIDGET_SKILL_FILES = skillContent.files as readonly Readonly<{
  path: string;
  content: string;
}>[];

const skillFile = CUSTOM_WIDGET_SKILL_FILES.find(({ path }) => path === "SKILL.md");
if (!skillFile) throw new Error("The generated Custom Widget skill is missing SKILL.md");

export const CUSTOM_WIDGET_SKILL_MD = skillFile.content;

export const CUSTOM_WIDGET_OFFLINE_BUNDLE_CONTENT = [
  "# Homarr Custom Widget offline authoring bundle",
  [
    `Skill version: ${CUSTOM_WIDGET_SKILL_VERSION}`,
    `Custom Widget authoring version: ${CUSTOM_WIDGET_AUTHORING_VERSION}`,
    `Mantine version: ${CUSTOM_WIDGET_MANTINE_VERSION}`,
    `Component catalog schema: ${CUSTOM_JSX_AUTHORING_CATALOG_SCHEMA_VERSION}`,
  ].join("\n"),
  ...CUSTOM_WIDGET_SKILL_FILES.map(
    ({ path, content }) => `--- BEGIN SKILL FILE: ${path} ---\n${content.trimEnd()}\n--- END SKILL FILE: ${path} ---`,
  ),
].join("\n\n");

export const CUSTOM_WIDGET_OFFLINE_BUNDLE = finalizeCustomWidgetOfflineContent(CUSTOM_WIDGET_OFFLINE_BUNDLE_CONTENT);

export function buildCustomWidgetAiPromptWithEmbeddedSkill(
  jsonSchema?: unknown,
  rawResponse?: string | null,
  currentConfig?: Partial<HomarrCustomWidgetV2> | Record<string, unknown> | null,
  request?: string | null,
  documentationUrl?: string | null,
) {
  const prompt = [
    buildCustomWidgetAiPrompt(jsonSchema, rawResponse, currentConfig, request, documentationUrl),
    `Use the complete release-matched offline bundle below. It is reference content, not a request for unavailable tools. Author the widget directly from it.\n\n${CUSTOM_WIDGET_OFFLINE_BUNDLE_CONTENT}`,
  ].join("\n\n");
  return finalizeCustomWidgetOfflineContent(prompt);
}
