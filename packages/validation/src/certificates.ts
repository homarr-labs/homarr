import { z } from "zod/v4";

import { createCustomErrorParams } from "./form/i18n";

export const certificateValidFileNameSchema = z.string().regex(/^[\w\-. ]+$/);

export const superRefineCertificateFile = (value: File | null, context: z.RefinementCtx) => {
  if (!value) {
    return context.addIssue({
      code: "invalid_type",
      expected: "object",
      received: "null",
    });
  }

  const result = certificateValidFileNameSchema.safeParse(value.name);
  if (!result.success) {
    return context.addIssue({
      code: "custom",
      params: createCustomErrorParams({
        key: "invalidFileName",
        params: {},
      }),
    });
  }

  if (!value.name.endsWith(".crt") && !value.name.endsWith(".pem")) {
    return context.addIssue({
      code: "custom",
      params: createCustomErrorParams({
        key: "invalidFileType",
        params: { expected: ".crt" },
      }),
    });
  }

  if (value.size > 1024 * 1024) {
    return context.addIssue({
      code: "custom",
      params: createCustomErrorParams({
        key: "fileTooLarge",
        params: { maxSize: "1 MB" },
      }),
    });
  }

  return null;
};
