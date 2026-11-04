import { fetchApi } from "@homarr/api/client";
import { isRecord } from "@homarr/common";
import {
  customWidgetDefinitionSchema,
  customWidgetRequestsSchema,
  customWidgetSourcesSchema,
  getCustomWidgetDefaultOptions,
  parseCustomWidgetAiResponse,
  validateCustomWidgetOptions,
} from "@homarr/custom-widgets/core";
import type { HomarrCustomWidgetV2, CustomWidgetSecretKind } from "@homarr/custom-widgets/core";
import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";
import type { UseFormReturnType } from "@mantine/form";

export type CustomWidgetWorkbenchForm = UseFormReturnType<CustomWidgetFormValues>;

export { isRecord };
export { filterSecretsForSourceAuthentication, parseSources } from "@homarr/custom-widgets/workbench";

const PREVIEW_QUERY_CONCURRENCY = 4;

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

export function getChangedSecrets(values: Pick<CustomWidgetFormValues, "secrets">) {
  return values.secrets
    .filter((secret) => secret.value.trim())
    .map(({ sourceId, kind, value }) => ({
      sourceId,
      kind: kind as CustomWidgetSecretKind,
      value,
    }));
}

export function isSimpleCustomWidgetQuerySetup(values: Pick<CustomWidgetFormValues, "sources" | "requests">) {
  const sources = customWidgetSourcesSchema.safeParse(parseJson(values.sources));
  const requests = customWidgetRequestsSchema.safeParse(parseJson(values.requests));
  if (!sources.success || !requests.success) return false;
  if (Object.keys(sources.data).length !== 1 || Object.keys(requests.data).length !== 1) return false;
  const request = Object.values(requests.data)[0];
  return (
    request?.source === "default" &&
    request.kind === "query" &&
    request.method === "GET" &&
    request.trigger === "load" &&
    request.permission === "view" &&
    request.auth === "inherit" &&
    request.body === undefined &&
    request.headers === undefined &&
    request.confirmation === undefined &&
    request.invalidates === undefined &&
    request.cacheSeconds === undefined
  );
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
    secrets: form.getValues().secrets.filter((secret) => Object.hasOwn(widget.sources, secret.sourceId)),
  });
}

export function applyCustomWidgetAiResponse(form: CustomWidgetWorkbenchForm, response: string) {
  const result = parseCustomWidgetAiResponse(response);
  if (result.success) applyDefinition(form, result.widget);
  return result;
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
  const requests = Object.entries(definition.requests).filter(
    ([, entry]) => entry.kind === "query" && entry.trigger === "load",
  );
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
      const [requestId] = request;
      try {
        const result = await fetchApi.customWidget.previewQuery.query({ sessionId, requestId, params: {} });
        const { data, ...status } = result;
        results[index] = { requestId, data, status: { loading: false, ...status } };
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
