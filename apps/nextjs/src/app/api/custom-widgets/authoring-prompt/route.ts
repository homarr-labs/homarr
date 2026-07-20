import { NextResponse } from "next/server";

import { CUSTOM_WIDGET_MCP_AUTHORING_PROMPT } from "@homarr/custom-widgets/authoring-prompt";

export const dynamic = "force-static";

export function GET() {
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
