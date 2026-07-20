import { z } from "zod/v4";

import { customWidgetOptionsSchemaSchema } from "./options-schema";
import { customJsxRequestSchema } from "./request-schema";

let requestsSchema: Record<string, unknown> | undefined;
let optionsSchema: Record<string, unknown> | undefined;
let defaultOptionsSchema: Record<string, unknown> | undefined;

export function getCustomWidgetRequestsJsonSchema() {
  requestsSchema ??= {
    ...z.toJSONSchema(customJsxRequestSchema.array()),
    title: "Named Custom Widget queries and actions",
  };
  return requestsSchema;
}

export function getCustomWidgetOptionsJsonSchema() {
  optionsSchema ??= {
    ...z.toJSONSchema(customWidgetOptionsSchemaSchema),
    title: "Custom Widget options schema",
  };
  return optionsSchema;
}

export function getCustomWidgetDefaultOptionsJsonSchema() {
  defaultOptionsSchema ??= {
    ...z.toJSONSchema(z.record(z.string(), z.unknown())),
    title: "Custom Widget default option values",
    description: "Values must validate against the widget options schema.",
  };
  return defaultOptionsSchema;
}

export const CUSTOM_WIDGET_REQUEST_EXAMPLES = {
  minimal: [
    {
      id: "data",
      sourceId: "default",
      kind: "query",
      method: "GET",
      pathTemplate: "/api/status",
      parameters: {},
      auth: "inherit",
      minimumBoardPermission: "view",
      trigger: "load",
    },
  ],
  full: [
    {
      id: "environments",
      sourceId: "default",
      kind: "query",
      method: "GET",
      pathTemplate: "/api/environments",
      parameters: {},
      auth: "inherit",
      minimumBoardPermission: "view",
      trigger: "load",
      cacheTtlSeconds: 60,
    },
    {
      id: "search",
      sourceId: "default",
      kind: "query",
      method: "POST",
      pathTemplate: "/api/search",
      parameters: { query: "string", limit: "number" },
      queryTemplate: { limit: { $param: "limit" } },
      bodyTemplate: { term: { $param: "query" } },
      auth: "inherit",
      minimumBoardPermission: "view",
      trigger: "manual",
      cacheTtlSeconds: 30,
    },
    {
      id: "restart",
      sourceId: "default",
      kind: "action",
      method: "POST",
      pathTemplate: "/api/containers/{id}/restart",
      parameters: { id: "string" },
      auth: "inherit",
      minimumBoardPermission: "modify",
      trigger: "manual",
      confirmation: {
        title: "Restart container",
        message: "Restart this container now?",
        confirmLabel: "Restart",
      },
      invalidates: ["search"],
    },
  ],
} as const;

export const CUSTOM_WIDGET_OPTIONS_EXAMPLES = {
  minimal: {
    schema: { type: "object", properties: {}, additionalProperties: false },
    defaults: {},
  },
  full: {
    schema: {
      type: "object",
      properties: {
        title: { type: "string", title: "Title", "x-homarr": { control: "text" } },
        limit: { type: "number", title: "Result limit", minimum: 1, maximum: 100 },
        environmentId: {
          type: "number",
          title: "Environment",
          "x-homarr": {
            control: "select",
            optionsSource: {
              requestId: "environments",
              itemsPath: "items",
              valuePath: "Id",
              labelPath: "Name",
            },
          },
        },
      },
      required: ["limit"],
      additionalProperties: false,
    },
    defaults: { title: "Overview", limit: 20 },
  },
} as const;
