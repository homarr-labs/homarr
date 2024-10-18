import type { z } from "zod";
import { zfd } from "zod-form-data";

import { createCustomErrorParams } from "./form/i18n";

const supportedImageFormats = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];

export const uploadMediaSchema = zfd.formData({
  file: zfd.file().superRefine((value: File | null, context: z.RefinementCtx) => {
    if (!value) {
      return context.addIssue({
        code: "invalid_type",
        expected: "object",
        received: "null",
      });
    }

    if (!supportedImageFormats.includes(value.type)) {
      return context.addIssue({
        code: "custom",
        params: createCustomErrorParams({
          key: "invalidFileType",
          params: { expected: `one of ${supportedImageFormats.join(", ")}` },
        }),
      });
    }

    if (value.size > 1024 * 1024 * 32) {
      return context.addIssue({
        code: "custom",
        params: createCustomErrorParams({
          key: "fileTooLarge",
          params: { maxSize: "32 MB" },
        }),
      });
    }

    return null;
  }),
});

export const mediaSchemas = {
  uploadMedia: uploadMediaSchema,
};
