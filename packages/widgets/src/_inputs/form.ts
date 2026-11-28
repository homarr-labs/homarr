"use client";

import { createFormContext } from "@homarr/form";
import { createContext } from "react";

import type { WidgetEditModalState } from "../modals/widget-edit-modal";

export const [FormProvider, useFormContext, useForm] = createFormContext<WidgetEditModalState>();
export const WidgetResourceEditingContext = createContext(true);
