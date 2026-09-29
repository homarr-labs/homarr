import { NextResponse } from "next/server";

import { normalizeRecursiveJsonSchemasForScalar, openApiDocument } from "@homarr/api/open-api";
import { extractBaseUrlFromHeaders } from "@homarr/common";

export function GET(request: Request) {
  const document = openApiDocument(extractBaseUrlFromHeaders(request.headers));
  if (new URL(request.url).searchParams.get("format") === "scalar") {
    return NextResponse.json(normalizeRecursiveJsonSchemasForScalar(document));
  }
  return NextResponse.json(document);
}
