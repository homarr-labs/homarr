import { Buffer } from "node:buffer";

import { ApiError } from "../procedure";

const MAX_SOURCE_MEDIA_PIXELS = 16_000_000;
const MAX_SOURCE_MEDIA_DIMENSION = 8192;
const jpegFrames = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

function jpegDimensions(bytes: Buffer): [number, number] | undefined {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return;
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset++] !== 0xff) return;
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === undefined || marker === 0xda || marker === 0xd9) return;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) return;
    if (jpegFrames.has(marker) && length >= 8) return [bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3)];
    offset += length;
  }
}

function dimensions(bytes: Buffer, contentType: string): [number, number] | undefined {
  if (
    contentType === "image/png" &&
    bytes.length >= 24 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    bytes.toString("ascii", 12, 16) === "IHDR"
  ) {
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  }
  if (contentType === "image/gif" && bytes.length >= 10 && ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6)))
    return [bytes.readUInt16LE(6), bytes.readUInt16LE(8)];
  if (contentType === "image/jpeg") return jpegDimensions(bytes);
  if (
    contentType === "image/webp" &&
    bytes.length >= 30 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    const kind = bytes.toString("ascii", 12, 16);
    if (kind === "VP8X") return [bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1];
    if (kind === "VP8 " && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a)
      return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
    if (kind === "VP8L" && bytes[20] === 0x2f)
      return [
        1 + ((bytes[21] ?? 0) | (((bytes[22] ?? 0) & 0x3f) << 8)),
        1 + (((bytes[22] ?? 0) >> 6) | ((bytes[23] ?? 0) << 2) | (((bytes[24] ?? 0) & 0x0f) << 10)),
      ];
  }
}

export function assertSourceImageBounds(value: Uint8Array, contentType: string) {
  const result = dimensions(Buffer.from(value.buffer, value.byteOffset, value.byteLength), contentType);
  if (!result)
    throw new ApiError({ code: "BAD_GATEWAY", message: "Source media must be a PNG, JPEG, GIF, or WebP image" });
  const [width, height] = result;
  if (
    width < 1 ||
    height < 1 ||
    width > MAX_SOURCE_MEDIA_DIMENSION ||
    height > MAX_SOURCE_MEDIA_DIMENSION ||
    width * height > MAX_SOURCE_MEDIA_PIXELS
  )
    throw new ApiError({ code: "PAYLOAD_TOO_LARGE", message: "Source image dimensions exceed the pixel limit" });
}
