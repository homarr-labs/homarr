import { useForm } from "@mantine/form";
import { zod4Resolver } from "mantine-form-zod-resolver";
import type { ZodObject } from "zod/v4";
import { z } from "zod/v4";

import { useI18n } from "@homarr/translation/client";
import { zodErrorMap } from "@homarr/validation/form/i18n";

export const useZodForm = <TSchema extends ZodObject>(
  schema: TSchema,
  options: Omit<
    Exclude<Parameters<typeof useForm<z.infer<TSchema>>>[0], undefined>,
    "validate" | "validateInputOnBlur" | "validateInputOnChange"
  >,
) => {
  const t = useI18n();

  z.config({
    customError: zodErrorMap(t),
  });
  return useForm<z.infer<TSchema>>({
    ...options,
    validateInputOnBlur: true,
    validateInputOnChange: true,
    validate: zod4Resolver(schema),
  });
};
