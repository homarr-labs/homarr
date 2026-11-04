import z from "zod";
import { zfd } from "zod-form-data";

import { createCustomErrorParams } from "./form/i18n";

export const supportedImageUploadFormats = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
export const supportedVideoUploadFormats = ["video/mp4", "video/webm"];
export const supportedMediaUploadFormats = [...supportedImageUploadFormats, ...supportedVideoUploadFormats];

export const mediaUploadMaxSize = { bytes: 1024 * 1024 * 32, label: "32 MiB" };

const matchesMediaContentType = (header: Uint8Array, contentType: string) => {
  const startsWith = (...bytes: number[]) => bytes.every((value, index) => header[index] === value);
  if (contentType === "image/png") return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (contentType === "image/jpeg") return startsWith(0xff, 0xd8, 0xff);
  const text = new TextDecoder("latin1").decode(header);
  if (contentType === "image/gif") return ["GIF87a", "GIF89a"].includes(text.slice(0, 6));
  if (contentType === "image/webp") return text.startsWith("RIFF") && text.slice(8, 12) === "WEBP";
  if (contentType === "image/svg+xml") return true;
  if (contentType === "video/mp4") {
    if (text.slice(4, 8) !== "ftyp" || header.length < 16) return false;
    const boxSize = new DataView(header.buffer, header.byteOffset, header.byteLength).getUint32(0);
    if (boxSize < 16 || boxSize > header.length) return false;
    for (let offset = 8; offset + 4 <= boxSize; offset += 4) {
      if (offset === 12) continue;
      if (/^(isom|iso[2-9]|mp4[12]|avc1|dash|M4V |MSNV)$/.test(text.slice(offset, offset + 4))) return true;
    }
    return false;
  }
  return (
    header[0] === 0x1a &&
    header[1] === 0x45 &&
    header[2] === 0xdf &&
    header[3] === 0xa3 &&
    header.some(
      (value, index) =>
        value === 0x42 &&
        header[index + 1] === 0x82 &&
        header[index + 2] === 0x84 &&
        text.slice(index + 3, index + 7) === "webm",
    )
  );
};

export const mediaUploadSchema = zfd.formData({
  files: zfd.repeatable(
    z.array(
      zfd.file().check(async (context) => {
        if (!supportedMediaUploadFormats.includes(context.value.type)) {
          context.issues.push({
            code: "custom",
            params: createCustomErrorParams({
              key: "invalidFileType",
              params: { expected: `one of ${supportedMediaUploadFormats.join(", ")}` },
            }),
            input: context.value.type,
          });
          return;
        }

        if (context.value.size > mediaUploadMaxSize.bytes) {
          context.issues.push({
            code: "custom",
            params: createCustomErrorParams({
              key: "fileTooLarge",
              params: { maxSize: mediaUploadMaxSize.label },
            }),
            input: context.value.size,
          });
          return;
        }

        const header = new Uint8Array(await context.value.slice(0, 4096).arrayBuffer());
        if (!matchesMediaContentType(header, context.value.type)) {
          context.issues.push({
            code: "custom",
            params: createCustomErrorParams({
              key: "invalidFileType",
              params: { expected: `one of ${supportedMediaUploadFormats.join(", ")}` },
            }),
            input: context.value.type,
          });
        }
      }),
    ),
  ),
});
