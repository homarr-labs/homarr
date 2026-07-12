import { z } from "zod/v4";

import { validateCustomJsxTemplate } from "./custom-jsx-template";

export const customWidgetAuthTypes = ["none", "bearer", "basic", "apiKeyHeader", "apiKeyQuery"] as const;
export type CustomWidgetAuthType = (typeof customWidgetAuthTypes)[number];

export const customWidgetDisplayTypes = [
  "singleValue",
  "keyValue",
  "table",
  "statGrid",
  "progressBars",
  "statusIndicator",
  "countGrid",
  "raw",
  "actionButton",
  "customJsx",
] as const;
export type CustomWidgetDisplayType = (typeof customWidgetDisplayTypes)[number];

export const customWidgetMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
export type CustomWidgetMethod = (typeof customWidgetMethods)[number];

export const customWidgetSecretKinds = ["apiKey", "username", "password"] as const;
export type CustomWidgetSecretKind = (typeof customWidgetSecretKinds)[number];

const singleValueDisplayConfigSchema = z.object({
  type: z
    .literal("singleValue")
    .describe("Display type discriminator — must be 'singleValue' when displayType is singleValue"),
  jsonPath: z
    .string()
    .min(1)
    .describe(
      "JSONPath expression to extract the value from the API response (e.g. $.data.count, $.items[0].name, $.status). Use $ for the root object.",
    ),
  label: z
    .string()
    .describe("Human-readable label shown alongside the extracted value (e.g. 'CPU Temperature', 'Total Users')"),
  unit: z
    .string()
    .describe("Unit suffix displayed after the value (e.g. '°C', '%', 'GB'). Leave empty string if no unit is needed."),
  valueSize: z
    .enum(["sm", "md", "lg", "xl"])
    .optional()
    .describe(
      "Font size of the displayed value: 'sm' (small), 'md' (medium), 'lg' (large, default), 'xl' (extra large)",
    ),
  labelPosition: z
    .enum(["above", "below"])
    .optional()
    .describe("Position of the label relative to the value: 'above' or 'below' (default: below)"),
});

const keyValueMappingSchema = z.object({
  label: z.string().min(1).describe("Label for this key-value pair (e.g. 'CPU', 'Memory', 'Uptime')"),
  jsonPath: z
    .string()
    .min(1)
    .describe(
      "JSONPath expression to extract this value from the API response (e.g. $.cpu.percent, $.memory.used). Use $ for the root object.",
    ),
  unit: z
    .string()
    .describe("Unit suffix for this value (e.g. '%', 'GB', 'ms'). Leave empty string if no unit is needed."),
});

const keyValueDisplayConfigSchema = z.object({
  type: z.literal("keyValue").describe("Display type discriminator — must be 'keyValue' when displayType is keyValue"),
  mappings: z
    .array(keyValueMappingSchema)
    .min(1)
    .describe("Array of label/jsonPath/unit mappings — each entry becomes one labeled value in the widget"),
  layout: z
    .enum(["list", "grid"])
    .optional()
    .describe("Layout style: 'list' (vertical stack, default) or 'grid' (multi-column grid)"),
  columns: z
    .number()
    .int()
    .min(1)
    .max(3)
    .optional()
    .describe("Number of columns when layout is 'grid' (1–3, default: 2)"),
});

const tableColumnSchema = z.object({
  header: z.string().min(1).describe("Column header text shown in the table (e.g. 'Name', 'Status', 'Size')"),
  jsonPath: z
    .string()
    .min(1)
    .describe(
      "JSONPath expression relative to each row object to extract the cell value (e.g. $.name, $.status, $.size). Do not include the array path here — that goes in tablePath.",
    ),
});

const tableDisplayConfigSchema = z.object({
  type: z.literal("table").describe("Display type discriminator — must be 'table' when displayType is table"),
  tablePath: z
    .string()
    .min(1)
    .describe(
      "JSONPath expression to the array of row objects in the API response (e.g. $.data.items, $.results, $.users[*])",
    ),
  columns: z
    .array(tableColumnSchema)
    .min(1)
    .describe("Column definitions — each column has a header and a jsonPath relative to each row"),
  striped: z
    .boolean()
    .optional()
    .describe("Whether to alternate row background colors for readability (default: true)"),
  compact: z.boolean().optional().describe("Whether to use compact row spacing (default: false)"),
});

const statGridItemSchema = z.object({
  label: z.string().min(1).describe("Label for this stat card (e.g. 'Movies', 'Series', 'Episodes')"),
  jsonPath: z
    .string()
    .min(1)
    .describe(
      "JSONPath expression to extract the stat value from the API response (e.g. $.library.movies, $.counts.series)",
    ),
  unit: z.string().describe("Unit suffix for the stat (e.g. '', 'GB', '%'). Leave empty string if no unit is needed."),
  color: z
    .string()
    .optional()
    .describe("Mantine color name for the stat card (e.g. 'blue', 'green', 'red', 'orange', 'violet'). Default: blue"),
});

const statGridDisplayConfigSchema = z.object({
  type: z.literal("statGrid").describe("Display type discriminator — must be 'statGrid' when displayType is statGrid"),
  items: z
    .array(statGridItemSchema)
    .min(1)
    .describe("Array of stat cards — each item shows a labeled value in a colored card"),
  columns: z.number().int().min(1).max(4).optional().describe("Number of columns in the stat grid (1–4, default: 2)"),
  cardStyle: z
    .enum(["filled", "outline", "subtle"])
    .optional()
    .describe(
      "Visual style of stat cards: 'filled' (solid background, default), 'outline' (border only), 'subtle' (light tint)",
    ),
});

const progressBarItemSchema = z.object({
  label: z.string().min(1).describe("Label for this progress bar (e.g. 'Disk Usage', 'Memory', 'Quota')"),
  valuePath: z
    .string()
    .min(1)
    .describe(
      "JSONPath expression to extract the current value (numerator) from the API response (e.g. $.disk.used, $.memory.used_bytes)",
    ),
  maxPath: z
    .string()
    .optional()
    .describe(
      "JSONPath expression to extract the maximum value (denominator). If omitted, defaults to 100. Use for ratios like used/total (e.g. $.disk.total)",
    ),
  unit: z
    .string()
    .describe("Unit suffix shown alongside values (e.g. 'GB', 'MB', '%'). Leave empty string if no unit is needed."),
  color: z
    .string()
    .optional()
    .describe("Mantine color name for the progress bar fill (e.g. 'blue', 'green', 'red'). Default: blue"),
});

const progressBarsDisplayConfigSchema = z.object({
  type: z
    .literal("progressBars")
    .describe("Display type discriminator — must be 'progressBars' when displayType is progressBars"),
  bars: z
    .array(progressBarItemSchema)
    .min(1)
    .describe("Array of progress bar definitions — each bar shows value/max as a visual progress indicator"),
  showPercentage: z.boolean().optional().describe("Whether to display the percentage next to each bar (default: true)"),
  barSize: z
    .enum(["sm", "md", "lg"])
    .optional()
    .describe("Height of progress bars: 'sm' (small), 'md' (medium, default), 'lg' (large)"),
});

const statusIndicatorItemSchema = z.object({
  label: z.string().min(1).describe("Label for this status indicator (e.g. 'Web Server', 'Database', 'API')"),
  jsonPath: z
    .string()
    .min(1)
    .describe(
      "JSONPath expression to extract the status value from the API response (e.g. $.services.web.status, $.health.database)",
    ),
  goodValues: z
    .array(z.string())
    .min(1)
    .describe(
      "Array of string values considered 'healthy/good' — case-insensitive match (e.g. ['online', 'up', 'true', 'healthy', 'ok'])",
    ),
});

const statusIndicatorDisplayConfigSchema = z.object({
  type: z
    .literal("statusIndicator")
    .describe("Display type discriminator — must be 'statusIndicator' when displayType is statusIndicator"),
  items: z
    .array(statusIndicatorItemSchema)
    .min(1)
    .describe("Array of status indicators — each shows a green dot if the value matches goodValues, red otherwise"),
  layout: z
    .enum(["list", "grid"])
    .optional()
    .describe("Layout style: 'list' (vertical, default) or 'grid' (multi-column)"),
  dotSize: z
    .enum(["sm", "md", "lg"])
    .optional()
    .describe("Size of status dots: 'sm' (small), 'md' (medium, default), 'lg' (large)"),
});

const countGridItemSchema = z.object({
  label: z.string().min(1).describe("Label for this count (e.g. 'Movies', 'Shows', 'Albums')"),
  jsonPath: z
    .string()
    .min(1)
    .describe(
      "JSONPath expression to extract the count value from the API response (e.g. $.counts.movies, $.stats.total)",
    ),
  unit: z.string().describe("Unit suffix for the count (e.g. '', 'items'). Leave empty string if no unit is needed."),
});

const countGridDisplayConfigSchema = z.object({
  type: z
    .literal("countGrid")
    .describe("Display type discriminator — must be 'countGrid' when displayType is countGrid"),
  items: z
    .array(countGridItemSchema)
    .min(1)
    .describe("Array of count items — each shows a number with a label in a simple grid (no colors)"),
  columns: z.number().int().min(2).max(4).optional().describe("Number of columns in the count grid (2–4, default: 2)"),
  valueSize: z
    .enum(["sm", "md", "lg"])
    .optional()
    .describe("Font size of count values: 'sm' (small), 'md' (medium, default), 'lg' (large)"),
});

const rawDisplayConfigSchema = z.object({
  type: z.literal("raw").describe("Display type discriminator — must be 'raw' when displayType is raw"),
  jsonPath: z
    .string()
    .min(1)
    .describe(
      "JSONPath expression to extract the data to display (e.g. $ for entire response, $.data, $.result). The extracted value is pretty-printed as JSON.",
    ),
  maxHeight: z
    .number()
    .int()
    .min(50)
    .max(1000)
    .optional()
    .describe("Maximum height of the raw JSON display area in pixels (50–1000, default: 300)"),
});

export const customJsxNetworkScopes = ["public", "private", "loopback"] as const;
export type CustomJsxNetworkScope = (typeof customJsxNetworkScopes)[number];

export const customJsxRequestParameterTypes = ["string", "number", "boolean"] as const;
export type CustomJsxRequestParameterType = (typeof customJsxRequestParameterTypes)[number];

const requestIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-z][a-z0-9_-]*$/,
    "Request IDs must start with a letter and contain only lowercase letters, numbers, - or _",
  );

const requestParametersSchema = z
  .record(requestIdSchema, z.enum(customJsxRequestParameterTypes))
  .refine((parameters) => Object.keys(parameters).length <= 32, "A request can declare at most 32 parameters");

const reservedRequestHeaders = new Set([
  "authorization",
  "connection",
  "content-length",
  "cookie",
  "expect",
  "forwarded",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "via",
]);

const staticHeadersSchema = z
  .record(z.string().min(1).max(128), z.string().max(8192))
  .refine((headers) => Object.keys(headers).length <= 32, "A request can declare at most 32 static headers")
  .refine(
    (headers) =>
      Object.keys(headers).every((name) => {
        const normalized = name.trim().toLowerCase();
        return (
          !reservedRequestHeaders.has(normalized) &&
          !normalized.startsWith("proxy-") &&
          !normalized.startsWith("sec-") &&
          !normalized.startsWith("x-forwarded-")
        );
      }),
    "Static headers cannot override authentication, cookies, routing, forwarding, proxy, or hop-by-hop headers",
  );

const collectBodyParameterNames = (value: unknown, result = new Set<string>()): Set<string> => {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectBodyParameterNames(entry, result));
    return result;
  }
  if (value === null || typeof value !== "object") return result;
  const entries = Object.entries(value);
  if (entries.length === 1 && entries[0]?.[0] === "$param" && typeof entries[0][1] === "string") {
    result.add(entries[0][1]);
    return result;
  }
  entries.forEach(([, entry]) => collectBodyParameterNames(entry, result));
  return result;
};

export const customJsxRequestSchema = z
  .object({
    id: requestIdSchema,
    kind: z.enum(["query", "action"]),
    method: z.enum(customWidgetMethods),
    pathTemplate: z
      .string()
      .min(1)
      .max(2048)
      .startsWith("/")
      .refine((path) => !path.startsWith("//"), "Path templates must be same-origin paths")
      .refine((path) => !path.includes("\\"), "Path templates cannot contain backslashes")
      .refine((path) => !path.includes("#"), "Path templates cannot contain URL fragments"),
    parameters: requestParametersSchema,
    bodyTemplate: z.json().optional(),
    staticHeaders: staticHeadersSchema.optional(),
    auth: z.enum(["inherit", "none"]),
    minimumBoardPermission: z.enum(["view", "modify", "full"]),
    cacheTtlSeconds: z.number().int().min(0).max(3600).optional(),
    allowViewerExecution: z.literal(true).optional(),
  })
  .superRefine((request, ctx) => {
    if (request.kind === "query" && request.method !== "GET") {
      ctx.addIssue({
        code: "custom",
        path: ["method"],
        message: "Query requests must use GET",
      });
    }

    if (request.kind === "action" && request.method === "GET") {
      ctx.addIssue({
        code: "custom",
        path: ["method"],
        message: "Action requests must use POST, PUT, PATCH, or DELETE",
      });
    }

    if (request.kind === "query" && request.minimumBoardPermission !== "view") {
      ctx.addIssue({
        code: "custom",
        path: ["minimumBoardPermission"],
        message: "Query requests use view permission",
      });
    }

    if (request.method === "DELETE" && request.minimumBoardPermission !== "full") {
      ctx.addIssue({
        code: "custom",
        path: ["minimumBoardPermission"],
        message: "DELETE actions require full board permission",
      });
    }

    if (
      request.kind === "action" &&
      request.method !== "DELETE" &&
      request.minimumBoardPermission === "view" &&
      request.allowViewerExecution !== true
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["allowViewerExecution"],
        message: "Viewer actions require explicit allowViewerExecution approval",
      });
    }

    if (request.kind === "query" && request.bodyTemplate !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["bodyTemplate"],
        message: "GET query requests cannot define a request body",
      });
    }

    if (request.kind === "action" && request.cacheTtlSeconds !== undefined && request.cacheTtlSeconds !== 0) {
      ctx.addIssue({
        code: "custom",
        path: ["cacheTtlSeconds"],
        message: "Actions cannot be cached",
      });
    }

    const declaredParameters = new Set(Object.keys(request.parameters));
    const pathParameters = [...request.pathTemplate.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1] ?? "");
    for (const parameter of [...pathParameters, ...collectBodyParameterNames(request.bodyTemplate)]) {
      if (!declaredParameters.has(parameter)) {
        ctx.addIssue({
          code: "custom",
          path: [request.bodyTemplate === undefined ? "pathTemplate" : "parameters"],
          message: `Placeholder '${parameter}' is not declared in request parameters`,
        });
      }
    }
  });

export type CustomJsxRequest = z.infer<typeof customJsxRequestSchema>;

const customJsxTemplateSchema = z
  .string()
  .min(1)
  .max(50000)
  .superRefine((template, ctx) => {
    for (const diagnostic of validateCustomJsxTemplate(template)) {
      if (diagnostic.severity === "error") {
        ctx.addIssue({
          code: "custom",
          message: `${diagnostic.message} (line ${diagnostic.line}, column ${diagnostic.column})`,
        });
      }
    }
  })
  .describe(
    "JSX template string using whitelisted Mantine components. Access API data via {data.fieldName}. Direct fetch and XMLHttpRequest access are unavailable; v2 templates reference named requests.",
  );

const customJsxDisplayConfigV1Schema = z.object({
  type: z
    .literal("customJsx")
    .describe("Display type discriminator — must be 'customJsx' when displayType is customJsx"),
  template: customJsxTemplateSchema,
  jsxApiVersion: z.never().optional(),
  networkScope: z.never().optional(),
  requests: z.never().optional(),
});

export const customJsxDisplayConfigV2Schema = z
  .object({
    type: z.literal("customJsx"),
    jsxApiVersion: z.literal(2),
    template: customJsxTemplateSchema,
    networkScope: z.enum(customJsxNetworkScopes),
    requests: z.array(customJsxRequestSchema).max(64),
  })
  .superRefine((config, ctx) => {
    const requestsById = new Map<string, CustomJsxRequest>();
    for (const [index, request] of config.requests.entries()) {
      if (requestsById.has(request.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["requests", index, "id"],
          message: `Duplicate request ID: ${request.id}`,
        });
      }
      requestsById.set(request.id, request);
    }

    const networkComponentPattern = /<(SubFetch|ActionButton|ToggleSwitch)\b([^>]*)>/g;
    for (const match of config.template.matchAll(networkComponentPattern)) {
      const component = match[1] as "SubFetch" | "ActionButton" | "ToggleSwitch";
      const attributes = match[2] ?? "";
      const idMatch = attributes.match(/\brequestId\s*=\s*(?:"([^"]+)"|'([^']+)')/);
      const requestId = idMatch?.[1] ?? idMatch?.[2];
      if (!requestId) {
        ctx.addIssue({
          code: "custom",
          path: ["template"],
          message: `${component} must use a literal requestId`,
        });
        continue;
      }

      const request = requestsById.get(requestId);
      const expectedKind = component === "SubFetch" ? "query" : "action";
      if (!request) {
        ctx.addIssue({
          code: "custom",
          path: ["template"],
          message: `${component} references unknown request '${requestId}'`,
        });
      } else if (request.kind !== expectedKind) {
        ctx.addIssue({
          code: "custom",
          path: ["template"],
          message: `${component} requires a ${expectedKind} request, but '${requestId}' is ${request.kind}`,
        });
      }

      if (/\b(?:url|method|headers|body)\s*=/.test(attributes)) {
        ctx.addIssue({
          code: "custom",
          path: ["template"],
          message: `${component} cannot declare inline network settings`,
        });
      }
    }
  });

export type CustomJsxDisplayConfigV2 = z.infer<typeof customJsxDisplayConfigV2Schema>;

const actionButtonDisplayConfigSchema = z.object({
  type: z
    .literal("actionButton")
    .describe("Display type discriminator — must be 'actionButton' when displayType is actionButton"),
  buttonLabel: z
    .string()
    .min(1)
    .describe("Text shown on the action button (e.g. 'Restart Service', 'Clear Cache', 'Run Backup')"),
  buttonColor: z
    .string()
    .optional()
    .describe("Mantine color name for the button (e.g. 'blue', 'red', 'green'). Default: blue"),
  confirmText: z
    .string()
    .optional()
    .describe(
      "If set, shows a confirmation dialog with this message before executing the API request. Omit for immediate execution.",
    ),
  successMessage: z
    .string()
    .optional()
    .describe("Notification message shown after successful API execution. Omit for a generic success message."),
});

export const displayConfigSchema = z
  .union([
    singleValueDisplayConfigSchema,
    keyValueDisplayConfigSchema,
    tableDisplayConfigSchema,
    statGridDisplayConfigSchema,
    progressBarsDisplayConfigSchema,
    statusIndicatorDisplayConfigSchema,
    countGridDisplayConfigSchema,
    rawDisplayConfigSchema,
    actionButtonDisplayConfigSchema,
    customJsxDisplayConfigV2Schema,
    customJsxDisplayConfigV1Schema,
  ])
  .describe(
    "Configuration for how API response data is displayed. The 'type' field MUST match the top-level 'displayType' field exactly. Choose the variant that matches your displayType.",
  );

export type DisplayConfig = z.infer<typeof displayConfigSchema>;

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
