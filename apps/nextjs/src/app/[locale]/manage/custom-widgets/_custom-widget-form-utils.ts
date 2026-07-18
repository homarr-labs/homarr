import { fetchApi } from "@homarr/api/client";
import { customWidgetDefinitionSchema } from "@homarr/custom-widgets/core";
import type { CustomWidgetSource, HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";
import type { UseFormReturnType } from "@mantine/form";

export type CustomWidgetWorkbenchForm = UseFormReturnType<CustomWidgetFormValues>;

export function buildDefinition(values: CustomWidgetFormValues) {
  return customWidgetDefinitionSchema.safeParse({
    $schema: "homarr-custom-widget-v2",
    name: values.name,
    description: values.description || undefined,
    iconUrl: values.iconUrl || undefined,
    sources: parseJson(values.sources),
    requests: parseJson(values.requests),
    optionsSchema: parseJson(values.optionsSchema),
    defaultOptions: parseJson(values.defaultOptions),
    stateSchema: parseJson(values.stateSchema),
    defaultState: parseJson(values.defaultState),
    template: values.template,
  });
}

export function applyDefinition(form: CustomWidgetWorkbenchForm, widget: HomarrCustomWidgetV2) {
  form.setValues({
    ...form.values,
    name: widget.name,
    description: widget.description ?? "",
    iconUrl: widget.iconUrl ?? "",
    sources: JSON.stringify(widget.sources, null, 2),
    requests: JSON.stringify(widget.requests, null, 2),
    optionsSchema: JSON.stringify(widget.optionsSchema, null, 2),
    defaultOptions: JSON.stringify(widget.defaultOptions, null, 2),
    stateSchema: JSON.stringify(widget.stateSchema ?? {}, null, 2),
    defaultState: JSON.stringify(widget.defaultState ?? {}, null, 2),
    template: widget.template,
  });
}

export function parseSources(value: string): CustomWidgetSource[] {
  const parsed = parseJson(value);
  return Array.isArray(parsed)
    ? parsed.filter((entry): entry is CustomWidgetSource => isRecord(entry) && typeof entry.id === "string")
    : [];
}

export function parseJsonArray(value: string): unknown[] {
  const parsed = parseJson(value);
  return Array.isArray(parsed) ? parsed : [];
}

export function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isRuntimeParams(
  value: unknown,
  schema: Record<string, "string" | "number" | "boolean">,
): value is Record<string, string | number | boolean> {
  if (!isRecord(value)) return false;
  return Object.entries(schema).every(([name, type]) => typeof value[name] === type);
}

export async function loadPreviewQueries(definition: HomarrCustomWidgetV2, sessionId: string) {
  const data: Record<string, unknown> = {};
  const status: Record<string, unknown> = {};
  for (const request of definition.requests.filter((entry) => entry.kind === "query" && entry.trigger === "load")) {
    const params = Object.fromEntries(
      Object.entries(request.parameters).flatMap(([name, type]) => {
        const value = definition.defaultOptions[name];
        return typeof value === type ? [[name, value as string | number | boolean]] : [];
      }),
    );
    try {
      const result = await fetchApi.customWidget.previewQuery.query({ sessionId, requestId: request.id, params });
      data[request.id] = result.data;
      status[request.id] = { loading: false, ...result };
    } catch (error) {
      data[request.id] = null;
      status[request.id] = {
        loading: false,
        ok: false,
        error: error instanceof Error ? error.message : "Request failed",
      };
    }
  }
  return { data, status };
}
