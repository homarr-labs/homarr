import { createHash } from "node:crypto";

import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sanitize } from "isomorphic-dompurify";

import { db, eq } from "@homarr/db";
import { medias } from "@homarr/db/schema";

const hasMatchingValidator = (ifNoneMatch: string | null, etag: string) => {
  if (!ifNoneMatch) return false;

  const value = ifNoneMatch.trim();
  if (value === "*") return true;

  let index = 0;
  let matches = false;
  while (index < value.length) {
    while (value[index] === " " || value[index] === "\t") index++;

    const isWeak = value.startsWith("W/", index);
    if (isWeak) index += 2;
    if (value[index] !== '"') return false;

    const start = index++;
    while (index < value.length && value[index] !== '"') {
      const characterCode = value.charCodeAt(index);
      if (
        characterCode !== 0x21 &&
        !(characterCode >= 0x23 && characterCode <= 0x7e) &&
        !(characterCode >= 0x80 && characterCode <= 0xff)
      ) {
        return false;
      }
      index++;
    }
    if (index === value.length) return false;

    const candidate = value.slice(start, ++index);
    if (candidate === etag) matches = true;

    while (value[index] === " " || value[index] === "\t") index++;
    if (index === value.length) return matches;
    if (value[index++] !== "," || index === value.length) return false;
  }

  return false;
};

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
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

  // Sanitize SVG content to prevent XSS attacks
  if (image.contentType === "image/svg+xml" || image.contentType === "image/svg") {
    const svgText = new TextDecoder().decode(content);
    const sanitized = sanitize(svgText, {
      USE_PROFILES: { svg: true, svgFilters: true },
    });
    content = new TextEncoder().encode(sanitized);
  }

  const headers = new Headers();
  const etag = `"${createHash("sha256").update(content).digest("base64url")}"`;
  headers.set("Cache-Control", "private, no-cache");
  headers.set("ETag", etag);
  headers.set("Content-Type", image.contentType);
  headers.set("Content-Length", content.length.toString());
  headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  headers.set("X-Content-Type-Options", "nosniff");

  if (hasMatchingValidator(request.headers.get("if-none-match"), etag)) {
    headers.delete("Content-Length");
    return new NextResponse(null, { status: 304, headers });
  }

  return new NextResponse(content, {
    status: 200,
    headers,
  });
}
