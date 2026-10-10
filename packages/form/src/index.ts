import { useForm } from "@mantine/form";
import type { ZodDiscriminatedUnion, ZodIntersection, ZodObject, ZodPipe } from "zod/v4";
import type { z } from "zod/v4";

import { useI18n } from "@homarr/translation/client";

import { createZodFormResolver } from "./resolver";

type inferPossibleSchema<
  TSchema extends
    | ZodObject
    | ZodPipe<ZodObject>
    | ZodIntersection<ZodObject | ZodDiscriminatedUnion<ZodObject[]>, ZodObject>,
> = z.infer<TSchema> extends Record<string, unknown> ? z.infer<TSchema> : never;

export const useZodForm = <
  TSchema extends
    | ZodObject
    | ZodPipe<ZodObject>
    | ZodIntersection<ZodObject | ZodDiscriminatedUnion<ZodObject[]>, ZodObject>,
>(
  schema: TSchema,
  options: Omit<
    Exclude<Parameters<typeof useForm<inferPossibleSchema<TSchema>>>[0], undefined>,
    "validate" | "validateInputOnBlur"
  >,
) => {
  const t = useI18n();

  return useForm<inferPossibleSchema<TSchema>>({
    ...options,
    validateInputOnBlur: true,
    validateInputOnChange: options.validateInputOnChange ?? true,
    validate: createZodFormResolver(schema, t),
  });
};
