import { openApiDocument } from "@homarr/api";
import { NextResponse } from "next/server";

export function GET() {
    return NextResponse.json(openApiDocument)
  }