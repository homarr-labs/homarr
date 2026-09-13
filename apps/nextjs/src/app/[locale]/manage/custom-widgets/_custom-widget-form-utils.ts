import { fetchApi } from "@homarr/api/client";
import { isRecord } from "@homarr/common";
import {
  customWidgetDefinitionSchema,
  getCustomWidgetDefaultOptions,
  getCustomWidgetRequiredSecretKinds,
  parseCustomWidgetAiResponse,
  validateCustomWidgetOptions,
} from "@homarr/custom-widgets/core";
import type { CustomWidgetSource, HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";
import type { UseFormReturnType } from "@mantine/form";

export type CustomWidgetWorkbenchForm = UseFormReturnType<CustomWidgetFormValues>;

export { isRecord };

const PREVIEW_QUERY_CONCURRENCY = 4;

export function buildDefinition(values: CustomWidgetFormValues) {
  return customWidgetDefinitionSchema.safeParse({
    $schema: values.extensions?.trim() ? "homarr-custom-widget-v3" : "homarr-custom-widget-v2",
    ...(values.extensions?.trim() ? { extensions: parseJson(values.extensions) } : {}),
    name: values.name,
    description: values.description || undefined,
    iconUrl: values.iconUrl || undefined,
    sources: parseJson(values.sources),
    requests: parseJson(values.requests),
    options: parseJson(values.options),
    template: values.template,
  });
}

export function getChangedSecrets(values: Pick<CustomWidgetFormValues, "secrets">) {
  return values.secrets
    .filter((secret) => secret.value.trim())
    .map(({ sourceId, kind, value }) => ({
      sourceId,
      kind: kind as "apiKey" | "username" | "password",
      value,
    }));
}

export function filterSecretsForSourceAuthentication(
  secrets: CustomWidgetFormValues["secrets"],
  sourceId: string,
  authType: Parameters<typeof getCustomWidgetRequiredSecretKinds>[0],
) {
  const requiredKinds = new Set<string>(getCustomWidgetRequiredSecretKinds(authType));
  return secrets.filter((secret) => secret.sourceId !== sourceId || requiredKinds.has(secret.kind));
}

export function applyDefinition(form: CustomWidgetWorkbenchForm, widget: HomarrCustomWidgetV2) {
  form.setValues({
    ...form.getValues(),
    name: widget.name,
    description: widget.description ?? "",
    iconUrl: widget.iconUrl ?? "",
    sources: JSON.stringify(widget.sources, null, 2),
    requests: JSON.stringify(widget.requests, null, 2),
    options: JSON.stringify(widget.options, null, 2),
    template: widget.template,
    extensions: widget.$schema === "homarr-custom-widget-v3" ? JSON.stringify(widget.extensions ?? {}, null, 2) : "",
  });
}

export function applyCustomWidgetAiResponse(form: CustomWidgetWorkbenchForm, response: string) {
  const result = parseCustomWidgetAiResponse(response);
  if (result.success) applyDefinition(form, result.widget);
  return result;
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
    const parsed: unknown = JSON.parse(value);
    return parsed;
  } catch {
    return null;
  }
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
  const requests = [
    ...Object.entries(definition.requests)
      .filter(([, entry]) => entry.kind === "query" && entry.trigger === "load")
      .map(([id]) => ({ id, native: false })),
    ...Object.entries(definition.extensions?.native ?? {})
      .filter(([, entry]) => entry.kind === "query" && entry.trigger === "load")
      .map(([id]) => ({ id, native: true })),
  ];
  const results: Array<{
    requestId: string;
    data: unknown;
    status: Record<string, unknown>;
  }> = [];
  let nextIndex = 0;
  const worker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      const request = requests[index];
      if (!request) return;
      const requestId = request.id;
      try {
        const result = await (request.native
          ? fetchApi.customWidget.nativeQuery.query({ previewSessionId: sessionId, nativeId: requestId, params: {} })
          : fetchApi.customWidget.previewQuery.query({ sessionId, requestId, params: {} }));
        results[index] = { requestId, data: result.data, status: { loading: false, ...result } };
      } catch (error) {
        results[index] = {
          requestId,
          data: null,
          status: {
            loading: false,
            ok: false,
            error: error instanceof Error ? error.message : "Request failed",
          },
        };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(PREVIEW_QUERY_CONCURRENCY, requests.length) }, () => worker()));
  return {
    data: Object.fromEntries(results.map((result) => [result.requestId, result.data])),
    status: Object.fromEntries(results.map((result) => [result.requestId, result.status])),
  };
}

export function getDefinitionDefaults(definition: HomarrCustomWidgetV2) {
  return getCustomWidgetDefaultOptions(definition.options);
}
