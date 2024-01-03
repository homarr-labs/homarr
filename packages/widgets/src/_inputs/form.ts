"use client";

import { createFormContext } from "@homarr/form";

import type { WidgetEditModalState } from "../WidgetEditModal";

export const [FormProvider, useFormContext, useForm] =
  createFormContext<WidgetEditModalState>();
