import { schemaResolver } from "@mantine/form";
import type { z } from "zod/v4";

import type { TranslationFunction } from "@homarr/translation";
import { zodErrorMap } from "@homarr/validation/form/i18n";

export const createZodFormResolver = (schema: z.ZodType, translate: TranslationFunction) =>
  schemaResolver(
    {
      "~standard": {
        ...schema["~standard"],
        validate: (values: unknown) => {
          const result = schema.safeParse(values, { error: zodErrorMap(translate) });
          return result.success ? { value: result.data } : { issues: result.error.issues };
        },
      },
    },
    { sync: true },
  );
