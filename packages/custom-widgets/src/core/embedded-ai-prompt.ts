import generatedSkillContent from "./skill-content.generated.json";

import {
  buildCustomWidgetAiPrompt,
  CUSTOM_WIDGET_FINAL_OUTPUT_INSTRUCTION,
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
const componentCatalogFile = CUSTOM_WIDGET_SKILL_FILES.find(({ path }) => path === "references/component-catalog.json");
const examplesFile = CUSTOM_WIDGET_SKILL_FILES.find(({ path }) => path === "references/examples.json");
if (!componentCatalogFile || !examplesFile)
  throw new Error("The generated Custom Widget skill is missing its catalog or examples");

export const CUSTOM_WIDGET_CANONICAL_COMPONENT_CATALOG = componentCatalogFile.content.trim();
export const CUSTOM_WIDGET_CANONICAL_RUNTIME_EXAMPLES = examplesFile.content.trim();

const machineReferencePaths = new Set([componentCatalogFile.path, examplesFile.path]);

export const CUSTOM_WIDGET_OFFLINE_BUNDLE_CONTENT = [
  "# Homarr Custom Widget offline authoring bundle",
  [
    `Skill version: ${CUSTOM_WIDGET_SKILL_VERSION}`,
    `Custom Widget authoring version: ${CUSTOM_WIDGET_AUTHORING_VERSION}`,
    `Mantine version: ${CUSTOM_WIDGET_MANTINE_VERSION}`,
    `Component catalog schema: ${CUSTOM_JSX_AUTHORING_CATALOG_SCHEMA_VERSION}`,
  ].join("\n"),
  ...CUSTOM_WIDGET_SKILL_FILES.filter(({ path }) => !machineReferencePaths.has(path)).map(
    ({ path, content }) => `--- BEGIN SKILL FILE: ${path} ---\n${content.trimEnd()}\n--- END SKILL FILE: ${path} ---`,
  ),
  `--- BEGIN CANONICAL COMPONENT CATALOG ---\n${CUSTOM_WIDGET_CANONICAL_COMPONENT_CATALOG}\n--- END CANONICAL COMPONENT CATALOG ---`,
  `--- BEGIN CANONICAL RUNTIME EXAMPLES ---\n${CUSTOM_WIDGET_CANONICAL_RUNTIME_EXAMPLES}\n--- END CANONICAL RUNTIME EXAMPLES ---`,
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
    "This clipboard workflow has no Homarr MCP tools, repository access, or local files. The complete release-matched skill, schema, component catalog, and examples are embedded below. Author the best-effort widget now from this content; do not ask for tools or files. Homarr will validate it after paste.",
    CUSTOM_WIDGET_OFFLINE_BUNDLE_CONTENT,
    CUSTOM_WIDGET_FINAL_OUTPUT_INSTRUCTION,
  ].join("\n\n");
  return finalizeCustomWidgetOfflineContent(prompt);
}
