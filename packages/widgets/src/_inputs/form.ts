"use client";

import { createFormContext } from "@homarr/form";

export const [FormProvider, useFormContext, useForm] =
  createFormContext<Record<string, unknown>>();
