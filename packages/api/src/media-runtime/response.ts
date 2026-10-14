import { createHash } from "node:crypto";

export interface MediaBinaryRow {
  readonly content: Buffer;
  readonly contentType: string;
}

export type SanitizeSvg = (
  text: string,
  options: { readonly USE_PROFILES: { readonly svg: true; readonly svgFilters: true } },
) => string;

export class MediaSvgExecutionHeldError extends Error {
  constructor() {
    super("Media SVG execution requires the declared source sanitizer and accepted Bun security proof");
    this.name = "MediaSvgExecutionHeldError";
  }
}

export const hasMatchingMediaValidator = (ifNoneMatch: string | null, etag: string) => {
  if (!ifNoneMatch) return false;
  const value = ifNoneMatch.trim();
  if (value === "*") return true;
  let index = 0;
  let matches = false;
  while (index < value.length) {
    while (value[index] === " " || value[index] === "\t") index++;
    if (value.startsWith("W/", index)) index += 2;
    if (value[index] !== '"') return false;
    const start = index++;
    while (index < value.length && value[index] !== '"') {
      const characterCode = value.charCodeAt(index);
      if (
        characterCode !== 0x21 &&
        !(characterCode >= 0x23 && characterCode <= 0x7e) &&
        !(characterCode >= 0x80 && characterCode <= 0xff)
      )
        return false;
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

export function createMediaBinaryResponse(
  image: MediaBinaryRow | undefined,
  ifNoneMatch: string | null,
  sanitizeSvg?: SanitizeSvg,
): Response {
  if (!image) return new Response(null, { status: 404 });
  let content = new Uint8Array(image.content);
  if (image.contentType === "image/svg+xml" || image.contentType === "image/svg") {
    if (!sanitizeSvg) throw new MediaSvgExecutionHeldError();
    const sanitized = sanitizeSvg(new TextDecoder().decode(content), { USE_PROFILES: { svg: true, svgFilters: true } });
    content = new TextEncoder().encode(sanitized);
  }
  const headers = new Headers();
  const etag = `"${createHash("sha256").update(content).digest("base64url")}"`;
  headers.set("Cache-Control", "private, no-cache");
  headers.set("ETag", etag);
  headers.set("Content-Type", image.contentType);
  headers.set("Content-Length", content.byteLength.toString());
  headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  headers.set("X-Content-Type-Options", "nosniff");
  if (hasMatchingMediaValidator(ifNoneMatch, etag)) {
    headers.delete("Content-Length");
    return new Response(null, { status: 304, headers });
  }
  return new Response(content, { status: 200, headers });
}
