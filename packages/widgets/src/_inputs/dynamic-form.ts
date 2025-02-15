"use client";

import { createFormContext } from "@homarr/form";

import type { DynamicEditModalState } from "../modals/dynamic-edit-modal";

export const [FormProvider, useFormContext, useForm] = createFormContext<DynamicEditModalState>();
