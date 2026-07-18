import { z } from "zod/v4";

import { CUSTOM_WIDGET_STARTER } from "../core";

const jsonObjectString = z.string().superRefine((value, ctx) => {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
  } catch {
    ctx.addIssue({ code: "custom", message: "Must be a JSON object" });
  }
});

const jsonArrayString = z.string().superRefine((value, ctx) => {
  try {
    if (!Array.isArray(JSON.parse(value))) throw new Error();
  } catch {
    ctx.addIssue({ code: "custom", message: "Must be a JSON array" });
  }
});

export const customWidgetFormSchema = z.object({
  name: z.string().trim().min(1).max(128),
  description: z.string().max(512),
  iconUrl: z.union([z.literal(""), z.string().url()]),
  sources: jsonArrayString,
  requests: jsonArrayString,
  optionsSchema: jsonObjectString,
  defaultOptions: jsonObjectString,
  stateSchema: jsonObjectString,
  defaultState: jsonObjectString,
  template: z.string().min(1).max(50_000),
  secrets: z.array(
    z.object({ sourceId: z.string(), kind: z.string(), value: z.string(), hasValue: z.boolean().optional() }),
  ),
});

export type CustomWidgetFormValues = z.infer<typeof customWidgetFormSchema>;

export const CUSTOM_WIDGET_AUTH_SECRET_FIELDS: Record<
  string,
  Array<{ kind: string; labelKey: string; isPassword: boolean }>
> = {
  bearer: [{ kind: "apiKey", labelKey: "apiKey", isPassword: true }],
  basic: [
    { kind: "username", labelKey: "username", isPassword: false },
    { kind: "password", labelKey: "password", isPassword: true },
  ],
  apiKeyHeader: [{ kind: "apiKey", labelKey: "apiKey", isPassword: true }],
  apiKeyQuery: [{ kind: "apiKey", labelKey: "apiKey", isPassword: true }],
};

export const DEFAULT_CUSTOM_WIDGET_FORM_VALUES: CustomWidgetFormValues = {
  name: CUSTOM_WIDGET_STARTER.name,
  description: CUSTOM_WIDGET_STARTER.description ?? "",
  iconUrl: CUSTOM_WIDGET_STARTER.iconUrl ?? "",
  sources: JSON.stringify(CUSTOM_WIDGET_STARTER.sources, null, 2),
  requests: JSON.stringify(CUSTOM_WIDGET_STARTER.requests, null, 2),
  optionsSchema: JSON.stringify(CUSTOM_WIDGET_STARTER.optionsSchema, null, 2),
  defaultOptions: JSON.stringify(CUSTOM_WIDGET_STARTER.defaultOptions, null, 2),
  stateSchema: JSON.stringify(CUSTOM_WIDGET_STARTER.stateSchema ?? {}, null, 2),
  defaultState: JSON.stringify(CUSTOM_WIDGET_STARTER.defaultState ?? {}, null, 2),
  template: CUSTOM_WIDGET_STARTER.template,
  secrets: [],
};
