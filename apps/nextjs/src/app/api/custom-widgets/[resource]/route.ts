import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { CUSTOM_WIDGET_MCP_AUTHORING_PROMPT } from "@homarr/custom-widgets/authoring-prompt";
import {
  CUSTOM_WIDGET_SKILL_REFERENCE_NAMES,
  getCustomWidgetComponentCatalog,
  getCustomWidgetSkillEntrypoint,
  getCustomWidgetSkillReference,
} from "@homarr/custom-widgets/authoring-resources";
import { getCustomWidgetJsonSchema } from "@homarr/custom-widgets/core";

import { adminRoute } from "../admin";

interface RouteContext {
  params: Promise<{ resource: string }>;
}

const resources = new Map<string, () => unknown>([
  ["schema", getCustomWidgetJsonSchema],
  ["components", getCustomWidgetComponentCatalog],
  ["skill", getCustomWidgetSkillEntrypoint],
  ...CUSTOM_WIDGET_SKILL_REFERENCE_NAMES.map(
    (name) => [`reference-${name}`, () => getCustomWidgetSkillReference(name)] as const,
  ),
  [
    "authoring-prompt",
    () => ({
      version: 2,
      prompt: CUSTOM_WIDGET_MCP_AUTHORING_PROMPT,
      resources: [
        "homarr://custom-widgets/schema",
        "homarr://custom-widgets/components",
        "homarr://custom-widgets/skill",
        "homarr://custom-widgets/references/{schema|runtime|security}",
      ],
      httpResources: [
        "/api/custom-widgets/schema",
        "/api/custom-widgets/components",
        "/api/custom-widgets/skill",
        "/api/custom-widgets/reference-{schema|runtime|security}",
      ],
    }),
  ],
]);

const getAuthoringResource = async (_request: NextRequest, context: RouteContext): Promise<Response> => {
  const { resource } = await context.params;
  const loadResource = resources.get(resource);
  if (!loadResource) {
    return NextResponse.json({ error: "Custom Widget authoring resource not found." }, { status: 404 });
  }
  return NextResponse.json(loadResource());
};

export const GET = adminRoute(getAuthoringResource);
