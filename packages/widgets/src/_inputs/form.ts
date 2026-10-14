"use client";

import { createFormContext } from "@homarr/form";

import type { WidgetEditModalState } from "../edit-state";

export const [FormProvider, useFormContext, useForm] = createFormContext<WidgetEditModalState>();
