import { z } from "zod";

import { createCustomErrorParams } from "./form/i18n";

const validFileNameSchema = z.string().regex(/^[\w\-. ]+$/);

export const superRefineCertificateFile = (value: File | null, context: z.RefinementCtx) => {
  if (!value) {
    return context.addIssue({
      code: "invalid_type",
      expected: "object",
      received: "null",
    });
  }

  const result = validFileNameSchema.safeParse(value.name);
  if (!result.success) {
    return context.addIssue({
      code: "custom",
      params: createCustomErrorParams({
        key: "invalidFileName",
        params: {},
      }),
    });
  }

  if (value.type !== "application/x-x509-ca-cert") {
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

export const certificateSchemas = {
  validFileNameSchema,
};
