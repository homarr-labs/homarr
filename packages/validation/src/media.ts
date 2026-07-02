import z from "zod";
import { zfd } from "zod-form-data";

import { createCustomErrorParams } from "./form/i18n";

export const supportedImageUploadFormats = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
export const supportedVideoUploadFormats = ["video/mp4", "video/webm"];
export const supportedMediaUploadFormats = [...supportedImageUploadFormats, ...supportedVideoUploadFormats];
const supportedMediaUploadFormatSet = new Set<string>(supportedMediaUploadFormats);

export const mediaUploadSchema = zfd.formData({
  files: zfd.repeatable(
    z.array(
      zfd.file().check((context) => {
        if (!supportedMediaUploadFormatSet.has(context.value.type)) {
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

        if (context.value.size > 1024 * 1024 * 32) {
          // Don't forget to update the limit in nginx.conf (client_max_body_size)
          context.issues.push({
            code: "custom",
            params: createCustomErrorParams({
              key: "fileTooLarge",
              params: { maxSize: "32 MB" },
            }),
            input: context.value.size,
          });
          return;
        }
      }),
    ),
  ),
});
