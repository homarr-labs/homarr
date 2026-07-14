import { z } from "zod/v4";

import { buildDisplayFormValues } from "../core";

const requiredScalarFields: Record<string, string[]> = {
  singleValue: ["jsonPath"],
  table: ["tablePath"],
  raw: ["rawJsonPath"],
  actionButton: ["buttonLabel"],
  customJsx: ["template"],
};
const requiredCollectionFields: Record<string, { collection: string; fields: string[] }> = {
  keyValue: { collection: "mappings", fields: ["label", "jsonPath"] },
  table: { collection: "columns", fields: ["header", "jsonPath"] },
  statGrid: { collection: "statGridItems", fields: ["label", "jsonPath"] },
  progressBars: { collection: "progressBars", fields: ["label", "valuePath"] },
  statusIndicator: { collection: "statusItems", fields: ["label", "jsonPath", "goodValues"] },
  countGrid: { collection: "countGridItems", fields: ["label", "jsonPath"] },
};

const requiredString = z.string();
export const customWidgetFormSchema = z
  .object({
    name: z.string().trim().min(1).max(128),
    description: requiredString,
    iconUrl: requiredString,
    url: z.string().trim().min(1),
    authType: requiredString,
    headerName: requiredString,
    method: requiredString,
    requestBody: requiredString,
    displayType: requiredString,
    jsonPath: requiredString,
    label: requiredString,
    unit: requiredString,
    valueSize: requiredString,
    labelPosition: requiredString,
    mappings: z.array(z.object({ label: requiredString, jsonPath: requiredString, unit: requiredString })),
    kvLayout: requiredString,
    kvColumns: z.number(),
    tablePath: requiredString,
    columns: z.array(z.object({ header: requiredString, jsonPath: requiredString })),
    striped: z.boolean(),
    compact: z.boolean(),
    statGridItems: z.array(
      z.object({ label: requiredString, jsonPath: requiredString, unit: requiredString, color: requiredString }),
    ),
    statGridColumns: z.number(),
    cardStyle: requiredString,
    progressBars: z.array(
      z.object({
        label: requiredString,
        valuePath: requiredString,
        maxPath: requiredString,
        unit: requiredString,
        color: requiredString,
      }),
    ),
    showPercentage: z.boolean(),
    barSize: requiredString,
    statusItems: z.array(z.object({ label: requiredString, jsonPath: requiredString, goodValues: requiredString })),
    statusLayout: requiredString,
    dotSize: requiredString,
    countGridItems: z.array(z.object({ label: requiredString, jsonPath: requiredString, unit: requiredString })),
    countGridColumns: z.number(),
    countValueSize: requiredString,
    rawJsonPath: requiredString,
    rawMaxHeight: z.number(),
    buttonLabel: requiredString,
    buttonColor: requiredString,
    confirmText: requiredString,
    successMessage: requiredString,
    template: requiredString,
    jsxApiVersion: requiredString,
    networkScope: requiredString,
    requestManifest: requiredString,
    secrets: z.array(z.object({ kind: requiredString, value: requiredString, hasValue: z.boolean().optional() })),
  })
  .superRefine((data, ctx) => {
    for (const field of requiredScalarFields[data.displayType] ?? []) {
      if (!data[field as keyof typeof data]) addRequiredIssue(ctx, [field], data[field as keyof typeof data]);
    }
    const collection = requiredCollectionFields[data.displayType];
    if (collection) {
      const entries = data[collection.collection as keyof typeof data];
      if (Array.isArray(entries))
        entries.forEach((entry, index) => {
          for (const field of collection.fields) {
            const value = (entry as Record<string, unknown>)[field];
            if (!value) addRequiredIssue(ctx, [collection.collection, index, field], value);
          }
        });
    }
    if (data.displayType === "customJsx" && data.jsxApiVersion === "2" && !isJsonArray(data.requestManifest)) {
      ctx.addIssue({
        code: "custom",
        message: "invalidRequestManifest",
        input: data.requestManifest,
        path: ["requestManifest"],
      });
    }
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

export const CUSTOM_WIDGET_AUTH_USES_HEADER_NAME: Record<string, boolean> = { apiKeyHeader: true, apiKeyQuery: true };

export const DEFAULT_CUSTOM_WIDGET_FORM_VALUES: CustomWidgetFormValues = {
  name: "",
  description: "",
  iconUrl: "",
  url: "",
  authType: "none",
  headerName: "",
  method: "GET",
  requestBody: "",
  ...buildDisplayFormValues("singleValue", {}),
  secrets: [],
};

function addRequiredIssue(ctx: z.core.$RefinementCtx, path: PropertyKey[], input: unknown): void {
  ctx.addIssue({ code: "too_small", minimum: 1, origin: "string", inclusive: true, input, path });
}

function isJsonArray(value: string): boolean {
  try {
    return Array.isArray(JSON.parse(value));
  } catch {
    return false;
  }
}
