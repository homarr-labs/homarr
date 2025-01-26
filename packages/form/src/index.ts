import { useForm, zodResolver } from "@mantine/form";
import { z } from "zod";
import type { AnyZodObject, ZodDiscriminatedUnion, ZodEffects, ZodIntersection } from "zod";

import { useI18n } from "@homarr/translation/client";
import { zodErrorMap } from "@homarr/validation/form";

export const useZodForm = <
  TSchema extends
    | AnyZodObject
    | ZodEffects<AnyZodObject>
    | ZodIntersection<AnyZodObject | ZodDiscriminatedUnion<string, AnyZodObject[]>, AnyZodObject>,
>(
  schema: TSchema,
  options: Omit<
    Exclude<Parameters<typeof useForm<z.infer<TSchema>>>[0], undefined>,
    "validate" | "validateInputOnBlur" | "validateInputOnChange"
  >,
) => {
  const t = useI18n();

  z.setErrorMap(zodErrorMap(t));
  return useForm<z.infer<TSchema>>({
    ...options,
    validateInputOnBlur: true,
    validateInputOnChange: true,
    validate: zodResolver(schema),
  });
};
