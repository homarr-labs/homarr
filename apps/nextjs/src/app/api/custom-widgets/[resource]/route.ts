import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { CUSTOM_WIDGET_MCP_AUTHORING_PROMPT } from "@homarr/custom-widgets/authoring-prompt";
import { getCustomWidgetComponentCatalog, getCustomWidgetSkill } from "@homarr/custom-widgets/authoring-resources";
import { getCustomWidgetJsonSchema } from "@homarr/custom-widgets/core";

import { adminRoute } from "../admin";

interface RouteContext {
  params: Promise<{ resource: string }>;
}

const resources = new Map<string, () => unknown>([
  ["schema", getCustomWidgetJsonSchema],
  ["components", getCustomWidgetComponentCatalog],
  ["skill", getCustomWidgetSkill],
  [
    "authoring-prompt",
    () => ({
      version: 2,
      prompt: CUSTOM_WIDGET_MCP_AUTHORING_PROMPT,
      resources: [
        "homarr://custom-widgets/schema",
        "homarr://custom-widgets/components",
        "homarr://custom-widgets/skill",
      ],
      httpResources: ["/api/custom-widgets/schema", "/api/custom-widgets/components", "/api/custom-widgets/skill"],
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
