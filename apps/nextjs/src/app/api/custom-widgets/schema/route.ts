import { NextResponse } from "next/server";

import { getCustomWidgetJsonSchema } from "@homarr/custom-widgets/core";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(getCustomWidgetJsonSchema());
}
