import { NextResponse } from "next/server";

import { CUSTOM_WIDGET_MCP_AUTHORING_PROMPT } from "@homarr/custom-widgets/authoring-prompt";

import { requireCustomWidgetAdmin } from "../admin";

export async function GET() {
  const denied = await requireCustomWidgetAdmin();
  if (denied) return denied;
  return NextResponse.json({
    version: 2,
    prompt: CUSTOM_WIDGET_MCP_AUTHORING_PROMPT,
    resources: [
      "homarr://custom-widgets/schema",
      "homarr://custom-widgets/components",
      "homarr://custom-widgets/skill",
    ],
    httpResources: ["/api/custom-widgets/schema", "/api/custom-widgets/components", "/api/custom-widgets/skill"],
  });
}
