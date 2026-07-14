import { z } from "zod/v4";

import type { CustomJsxDisplayConfigV2 } from "./custom-jsx-schema";
import { displayConfigSchema } from "./display-config-schema";
import type { DisplayConfig } from "./display-config-schema";
import {
  customWidgetAuthTypes,
  customWidgetDisplayTypes,
  customWidgetMethods,
  customWidgetSecretKinds,
} from "./schema-types";
import type { CustomWidgetMethod } from "./schema-types";

const displayTypesMatch = (displayType?: string, configType?: string): boolean => {
  if (!displayType) return true;
  if (!configType) return true;
  return displayType === configType;
};

const displayTypeMatchMessage = {
  message: "displayType must match displayConfig.type",
  path: ["displayConfig", "type"],
};

const isCustomJsxV2 = (config: DisplayConfig | undefined): config is CustomJsxDisplayConfigV2 =>
  config?.type === "customJsx" && "jsxApiVersion" in config && config.jsxApiVersion === 2;

const validateDefinitionDisplay = (
  definition: { method?: CustomWidgetMethod; displayType?: string; displayConfig?: DisplayConfig },
  ctx: z.RefinementCtx,
) => {
  if (!displayTypesMatch(definition.displayType, definition.displayConfig?.type)) {
    ctx.addIssue({
      code: "custom",
      message: displayTypeMatchMessage.message,
      path: displayTypeMatchMessage.path,
    });
  }

  if (isCustomJsxV2(definition.displayConfig) && definition.method !== undefined && definition.method !== "GET") {
    ctx.addIssue({
      code: "custom",
      message: "Custom JSX v2 base data requests must use GET; mutations belong in named actions",
      path: ["method"],
    });
  }
};

const baseDefinitionSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(128)
    .describe("Human-readable name for the widget, displayed in the dashboard and management UI"),
  description: z
    .string()
    .max(512)
    .optional()
    .describe("Optional longer description of what this widget shows, shown in tooltips and management UI"),
  iconUrl: z
    .string()
    .url()
    .optional()
    .describe(
      "Optional URL to an icon image for the widget (e.g. https://example.com/icon.png). Shown in widget picker.",
    ),
  url: z
    .string()
    .min(1)
    .describe(
      "Full URL to the API endpoint to fetch data from (e.g. https://myapp.local/api/stats). Must include protocol.",
    ),
  authType: z
    .enum(customWidgetAuthTypes)
    .describe(
      "Authentication method: 'none' for public APIs, 'bearer' for Bearer token, 'basic' for Basic auth, 'apiKeyHeader' for API key sent as a custom header, 'apiKeyQuery' for API key as query parameter. Secrets are configured separately in the UI.",
    ),
  headerName: z
    .string()
    .max(256)
    .optional()
    .describe(
      "Custom header or query parameter name for API key auth. For apiKeyHeader: the HTTP header name (default: X-API-Key). For apiKeyQuery: the query param name (default: api_key). Ignored for other auth types.",
    ),
  method: z
    .enum(customWidgetMethods)
    .describe(
      "HTTP method for the API request: 'GET' (fetch data, most common), 'POST'/'PUT'/'PATCH' (with optional requestBody), 'DELETE' (destructive actions)",
    ),
  requestBody: z
    .string()
    .optional()
    .describe(
      'JSON string body sent with POST/PUT/PATCH requests. Must be valid JSON as a string (e.g. \'{"action":"restart"}\'). Omit for GET requests.',
    ),
  displayType: z
    .enum(customWidgetDisplayTypes)
    .describe(
      "How to render the API response: 'singleValue' (one big number/text), 'keyValue' (labeled pairs), 'table' (rows/columns), 'statGrid' (colored stat cards), 'progressBars' (usage bars), 'statusIndicator' (health dots), 'countGrid' (simple counts), 'raw' (JSON debug view), 'actionButton' (clickable action), 'customJsx' (custom JSX template with Mantine components)",
    ),
  displayConfig: displayConfigSchema,
});

const secretsInputSchema = z.array(
  z.object({
    kind: z
      .enum(customWidgetSecretKinds)
      .describe(
        "Secret type: 'apiKey' (token/key for bearer/apiKey auth), 'username' (for basic auth), 'password' (for basic auth)",
      ),
    value: z
      .string()
      .min(1)
      .describe("The secret value. Never include in exported JSON — configure in the UI after import."),
  }),
);

export const customWidgetCreateSchema = baseDefinitionSchema
  .extend({ secrets: secretsInputSchema })
  .superRefine(validateDefinitionDisplay);

export const customWidgetUpdateSchema = baseDefinitionSchema
  .partial()
  .extend({ id: z.string(), secrets: secretsInputSchema.optional() })
  .superRefine(validateDefinitionDisplay);

const customWidgetImportFieldsSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(128)
    .describe("Human-readable name for the widget, displayed in the dashboard and management UI"),
  description: z
    .string()
    .max(512)
    .nullish()
    .describe("Optional longer description of what this widget shows. Use null or omit if not needed."),
  iconUrl: z
    .string()
    .url()
    .nullish()
    .describe("Optional URL to an icon image for the widget. Use null or omit if not needed."),
  authType: z
    .enum(customWidgetAuthTypes)
    .describe(
      "Authentication method: 'none' for public APIs, 'bearer' for Bearer token, 'basic' for Basic auth, 'apiKeyHeader' for API key sent as a custom header, 'apiKeyQuery' for API key as query parameter",
    ),
  headerName: z
    .string()
    .max(256)
    .nullish()
    .describe(
      "Custom header or query parameter name for API key auth. For apiKeyHeader: HTTP header name (default: X-API-Key). For apiKeyQuery: query param name (default: api_key).",
    ),
  method: z
    .enum(customWidgetMethods)
    .describe(
      "HTTP method: 'GET' (fetch data), 'POST'/'PUT'/'PATCH' (with requestBody), 'DELETE' (destructive). Use GET unless the API requires otherwise.",
    ),
  requestBody: z.string().nullish().describe("JSON string body for POST/PUT/PATCH. Use null or omit for GET requests."),
  displayType: z
    .enum(customWidgetDisplayTypes)
    .describe(
      "How to render the API response: 'singleValue', 'keyValue', 'table', 'statGrid', 'progressBars', 'statusIndicator', 'countGrid', 'raw', 'actionButton', or 'customJsx'",
    ),
  displayConfig: displayConfigSchema,
});

export const customWidgetImportSchema = customWidgetImportFieldsSchema
  .extend({
    $schema: z
      .enum(["homarr-custom-widget-v2", "homarr-custom-widget-v3"])
      .optional()
      .describe("Schema version identifier. New exports use 'homarr-custom-widget-v3'; v2 remains importable."),
    url: z
      .string()
      .min(1)
      .describe(
        "Full URL to the API endpoint to fetch data from (e.g. https://myapp.local/api/stats). Must include protocol.",
      ),
  })
  .superRefine(validateDefinitionDisplay);

export type CustomWidgetImport = z.infer<typeof customWidgetImportSchema>;
