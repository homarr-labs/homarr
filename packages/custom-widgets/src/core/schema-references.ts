import { z } from "zod/v4";

import { customWidgetOptionsSchema } from "./options-schema";
import { customWidgetRequestsSchema } from "./request-schema";

let requestsSchema: Record<string, unknown> | undefined;
let optionsSchema: Record<string, unknown> | undefined;

export function getCustomWidgetRequestsJsonSchema() {
  requestsSchema ??= {
    ...z.toJSONSchema(customWidgetRequestsSchema, { io: "input" }),
    title: "Named Custom Widget queries and actions",
  };
  return requestsSchema;
}

export function getCustomWidgetOptionsJsonSchema() {
  optionsSchema ??= { ...z.toJSONSchema(customWidgetOptionsSchema, { io: "input" }), title: "Custom Widget options" };
  return optionsSchema;
}

export const CUSTOM_WIDGET_REQUEST_EXAMPLES = {
  minimal: { data: { path: "/api/status" } },
  full: {
    environments: { path: "/api/environments", cacheSeconds: 60 },
    summary: {
      path: "/api/environments/{option:environmentId}/summary",
      query: { includeStopped: { $option: "includeStopped" } },
      cacheSeconds: 60,
    },
    search: {
      trigger: "manual",
      method: "POST",
      path: "/api/search",
      query: { limit: { $param: "limit" } },
      body: { term: { $param: "query" } },
    },
    restart: {
      kind: "action",
      method: "POST",
      path: "/api/containers/{param:id}/restart",
      confirmation: "Restart this container?",
      invalidates: ["summary"],
    },
  },
} as const;

export const CUSTOM_WIDGET_OPTIONS_EXAMPLES = {
  minimal: {},
  full: {
    title: { label: "Title", control: "text", default: "Overview" },
    limit: { label: "Result limit", control: "number", default: 20, min: 1, max: 100 },
    environmentId: {
      label: "Environment",
      control: "select",
      default: 1,
      choicesFrom: { request: "environments", itemsPath: "items", valuePath: "Id", labelPath: "Name" },
    },
  },
} as const;
