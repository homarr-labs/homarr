import { NextResponse } from "next/server";

import { getCustomWidgetJsonSchema } from "@homarr/custom-widgets/core";

import { requireCustomWidgetAdmin } from "../admin";

export async function GET() {
  const denied = await requireCustomWidgetAdmin();
  if (denied) return denied;
  return NextResponse.json(getCustomWidgetJsonSchema());
}
