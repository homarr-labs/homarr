import { NextResponse } from "next/server";

import { getCustomWidgetSkill } from "@homarr/custom-widgets/core";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(getCustomWidgetSkill());
}
