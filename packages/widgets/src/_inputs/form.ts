"use client";

import { createFormContext } from "@homarr/form";

type FormType = Record<string, unknown>;

export const [FormProvider, useFormContext, useForm] =
  createFormContext<FormType>();
