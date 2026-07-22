import { fetchApi } from "@homarr/api/client";
import {
  customWidgetDefinitionSchema,
  getCustomWidgetDefaultOptions,
  validateCustomWidgetOptions,
} from "@homarr/custom-widgets/core";
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
    options: parseJson(values.options),
    template: values.template,
  });
}

export function getChangedSecrets(values: CustomWidgetFormValues) {
  return values.secrets
    .filter((secret) => secret.value.trim())
    .map(({ sourceId, kind, value }) => ({
      sourceId,
      kind: kind as "apiKey" | "username" | "password",
      value,
    }));
}

export function applyDefinition(form: CustomWidgetWorkbenchForm, widget: HomarrCustomWidgetV2) {
  form.setValues({
    ...form.values,
    name: widget.name,
    description: widget.description ?? "",
    iconUrl: widget.iconUrl ?? "",
    sources: JSON.stringify(widget.sources, null, 2),
    requests: JSON.stringify(widget.requests, null, 2),
    options: JSON.stringify(widget.options, null, 2),
    template: widget.template,
  });
}

export function parseSources(value: string): Array<CustomWidgetSource & { id: string }> {
  const parsed = parseJson(value);
  return isRecord(parsed)
    ? Object.entries(parsed)
        .flatMap(([id, entry]) => (isRecord(entry) ? [{ id, ...(entry as CustomWidgetSource) }] : []))
        .toSorted((left, right) => Number(right.id === "default") - Number(left.id === "default"))
    : [];
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

export function getCustomWidgetPreviewOptionIssues(definition: HomarrCustomWidgetV2, options: Record<string, unknown>) {
  return validateCustomWidgetOptions(definition.options, options);
}

export function isRuntimeParams(
  value: unknown,
  expectedNames: readonly string[],
): value is Record<string, string | number | boolean> {
  if (!isRecord(value)) return false;
  const names = Object.keys(value).toSorted();
  return (
    names.length === expectedNames.length &&
    names.every((name, index) => name === expectedNames[index]) &&
    Object.values(value).every((entry) => ["string", "number", "boolean"].includes(typeof entry))
  );
}

export async function loadPreviewQueries(definition: HomarrCustomWidgetV2, sessionId: string) {
  const data: Record<string, unknown> = {};
  const status: Record<string, unknown> = {};
  for (const [requestId] of Object.entries(definition.requests).filter(
    ([, entry]) => entry.kind === "query" && entry.trigger === "load",
  )) {
    try {
      const result = await fetchApi.customWidget.previewQuery.query({ sessionId, requestId, params: {} });
      data[requestId] = result.data;
      status[requestId] = { loading: false, ...result };
    } catch (error) {
      data[requestId] = null;
      status[requestId] = {
        loading: false,
        ok: false,
        error: error instanceof Error ? error.message : "Request failed",
      };
    }
  }
  return { data, status };
}

export function getDefinitionDefaults(definition: HomarrCustomWidgetV2) {
  return getCustomWidgetDefaultOptions(definition.options);
}
