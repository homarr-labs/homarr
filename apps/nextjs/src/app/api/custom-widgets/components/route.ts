import { NextResponse } from "next/server";

import { getCustomWidgetComponentCatalog } from "@homarr/custom-widgets/authoring-resources";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(getCustomWidgetComponentCatalog());
}
