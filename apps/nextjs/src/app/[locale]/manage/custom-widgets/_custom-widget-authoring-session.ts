import {
  customWidgetOptionsSchema,
  customWidgetRequestsSchema,
  customWidgetSourcesSchema,
  hasSameCustomWidgetSourceAuthentication,
} from "@homarr/custom-widgets/core";
import type { CustomWidgetSource, HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";

import { parseJson } from "./_custom-widget-form-utils";
import { areCustomWidgetValuesEqual } from "./_custom-widget-value-equality";

function sourceDestination(source: CustomWidgetSource) {
  if (source.type === "integration") return [source.integrationKind, source.integrationId];
  return new URL(source.baseUrl).href;
}

export function getIncompatibleCustomWidgetImportSources(values: CustomWidgetFormValues, widget: HomarrCustomWidgetV2) {
  const sources = customWidgetSourcesSchema.safeParse(parseJson(values.sources));
  const credentialSourceIds = new Set(
    values.secrets.filter((secret) => secret.hasValue || secret.value.trim()).map((secret) => secret.sourceId),
  );
  if (!sources.success) return null;
  return Object.entries(sources.data).flatMap(([id, source]) => {
    const next = widget.sources[id];
    if (!next || (!credentialSourceIds.has(id) && source.type !== "integration")) return [];
    if (
      hasSameCustomWidgetSourceAuthentication(source, next) &&
      areCustomWidgetValuesEqual(sourceDestination(source), sourceDestination(next))
    )
      return [];
    return [id];
  });
}

function responseIdentity(values: CustomWidgetFormValues, options: Record<string, unknown>) {
  const sources = customWidgetSourcesSchema.safeParse(parseJson(values.sources));
  const requests = customWidgetRequestsSchema.safeParse(parseJson(values.requests));
  const optionDefinitions = customWidgetOptionsSchema.safeParse(parseJson(values.options));
  if (!sources.success || !requests.success || !optionDefinitions.success) return null;
  return {
    sources: Object.fromEntries(
      Object.entries(sources.data).map(([id, source]) => [
        id,
        { destination: sourceDestination(source), auth: source.auth },
      ]),
    ),
    requests: requests.data,
    optionDefinitions: Object.fromEntries(
      Object.entries(optionDefinitions.data).map(([id, option]) => [
        id,
        {
          control: option.control,
          default: option.default,
          min: option.min,
          max: option.max,
          step: option.step,
          choices: option.choices?.map(({ value }) => value),
          choicesFrom: option.choicesFrom,
        },
      ]),
    ),
    options,
    credentials: values.secrets,
  };
}

export function createCustomWidgetAuthoringSession(assisted: boolean) {
  let imported = false;
  let sample: { identity: NonNullable<ReturnType<typeof responseIdentity>>; response: string } | null = null;
  let finalPreview: {
    values: CustomWidgetFormValues;
    options: Record<string, unknown>;
    session: { id: string; expiresAt: number };
  } | null = null;

  const invalidate = (values: CustomWidgetFormValues, options: Record<string, unknown>) => {
    finalPreview = null;
    if (sample && !areCustomWidgetValuesEqual(sample.identity, responseIdentity(values, options))) sample = null;
  };

  return {
    invalidate,
    isAssisted: () => assisted,
    enableAssisted: () => {
      if (assisted) return;
      assisted = true;
      finalPreview = null;
    },
    markImported: () => {
      imported = true;
      finalPreview = null;
    },
    needsImport: () => assisted && !imported,
    captureSample: (
      values: CustomWidgetFormValues,
      options: Record<string, unknown>,
      data: Record<string, unknown>,
    ) => {
      const identity = responseIdentity(values, options);
      const entries = Object.entries(data).filter(([, value]) => value !== null && value !== undefined);
      if (!identity || entries.length === 0) return;
      sample = { identity: structuredClone(identity), response: JSON.stringify(Object.fromEntries(entries)) };
    },
    readSample: (values: CustomWidgetFormValues, options: Record<string, unknown>) => {
      if (!sample || !areCustomWidgetValuesEqual(sample.identity, responseIdentity(values, options))) return null;
      return sample.response;
    },
    captureFinalPreview: (
      values: CustomWidgetFormValues,
      options: Record<string, unknown>,
      session: { id: string; expiresAt: number },
    ) => {
      if (assisted && !imported) return;
      finalPreview = { values: structuredClone(values), options: structuredClone(options), session };
    },
    getFinalPreview: (values: CustomWidgetFormValues, options: Record<string, unknown>) => {
      if (
        !finalPreview ||
        finalPreview.session.expiresAt <= Date.now() ||
        !areCustomWidgetValuesEqual(finalPreview.values, values) ||
        !areCustomWidgetValuesEqual(finalPreview.options, options)
      )
        return null;
      return finalPreview.session;
    },
  };
}
