import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { db, eq } from "@homarr/db";
import { medias } from "@homarr/db/schema";

// Lightweight SVG sanitizer (This replaces DOMPurify!!)
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject\b[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\s+on[a-z][a-z0-9]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "")
    .replace(/(href|xlink:href|src|action)\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, '$1="#"');
}

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const image = await db.query.medias.findFirst({
    where: eq(medias.id, params.id),
    columns: {
      content: true,
      contentType: true,
    },
  });

  if (!image) {
    notFound();
  }

  let content = new Uint8Array(image.content);

  if (image.contentType === "image/svg+xml" || image.contentType === "image/svg") {
    const svgText = new TextDecoder().decode(content);
    content = new TextEncoder().encode(sanitizeSvg(svgText));
  }

  const headers = new Headers();
  headers.set("Content-Type", image.contentType);
  headers.set("Content-Length", content.length.toString());
  headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  headers.set("X-Content-Type-Options", "nosniff");

  return new NextResponse(content, {
    status: 200,
    headers,
  });
}
