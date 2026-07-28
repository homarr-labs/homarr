import { NextResponse } from "next/server";

import { getCustomWidgetComponentCatalog } from "@homarr/custom-widgets/authoring-resources";

import { requireCustomWidgetAdmin } from "../admin";

export async function GET() {
  const denied = await requireCustomWidgetAdmin();
  if (denied) return denied;
  return NextResponse.json(getCustomWidgetComponentCatalog());
}
