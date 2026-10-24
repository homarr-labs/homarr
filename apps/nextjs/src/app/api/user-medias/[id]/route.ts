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

/**
 * The byte range a single-range `Range: bytes=…` header asks for, `"unsatisfiable"` when it lies outside the
 * content, or null when there is no usable range (absent, malformed, multiple ranges), so the whole body is sent.
 */
const parseRange = (header: string | null, size: number) => {
  // An empty file has no bytes to range over; it is sent whole.
  if (size === 0) return null;
  const match = header?.trim().match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;
  const [, startText = "", endText = ""] = match;
  if (startText === "" && endText === "") return null;

  if (startText === "") {
    // Suffix range: the last n bytes.
    const length = Number(endText);
    if (length === 0) return "unsatisfiable";
    return { start: Math.max(0, size - length), end: size - 1 };
  }

  const start = Number(startText);
  const end = endText === "" ? size - 1 : Math.min(Number(endText), size - 1);
  if (start >= size || end < start) return "unsatisfiable";
  return { start, end };
};

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  // Video URLs carry their extension so board backgrounds can tell them apart; the id is what precedes it.
  const id = params.id.replace(/\.(mp4|webm)$/, "");
  const image = await db.query.medias.findFirst({
    where: eq(medias.id, id),
    columns: {
      content: true,
      contentType: true,
    },
  });

  if (!image) {
    notFound();
  }

  let content = new Uint8Array(image.content);
  const isSvg = image.contentType === "image/svg+xml" || image.contentType === "image/svg";

  // Sanitize SVG content to prevent XSS attacks
  if (isSvg) {
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

  // Browsers stream video in byte ranges (Safari won't play it otherwise). Sanitized SVGs are always sent whole.
  if (!isSvg) {
    headers.set("Accept-Ranges", "bytes");
    // If-Range: the range is only wanted if the client's copy is still current; otherwise send it all.
    const ifRange = request.headers.get("if-range");
    const range =
      ifRange === null || ifRange.trim() === etag ? parseRange(request.headers.get("range"), content.length) : null;
    if (range === "unsatisfiable") {
      headers.delete("Content-Length");
      headers.set("Content-Range", `bytes */${content.length}`);
      return new NextResponse(null, { status: 416, headers });
    }
    if (range) {
      headers.set("Content-Range", `bytes ${range.start}-${range.end}/${content.length}`);
      headers.set("Content-Length", (range.end - range.start + 1).toString());
      return new NextResponse(content.subarray(range.start, range.end + 1), { status: 206, headers });
    }
  }

  return new NextResponse(content, {
    status: 200,
    headers,
  });
}
