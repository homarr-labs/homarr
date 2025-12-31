import { openApiDocument } from "@homarr/api";
import { extractBaseUrlFromHeaders } from "@homarr/common";
import { NextResponse } from "next/server";

export function GET(request: Request) {
  return NextResponse.json(openApiDocument(extractBaseUrlFromHeaders(request.headers)));
}
