"use client";

import { useDeferredValue, useMemo } from "react";

import type { CustomWidgetAiDiagnostic, CustomWidgetAiDraft } from "@homarr/custom-widgets/authoring-prompt";
import { customWidgetOptionsSchema } from "@homarr/custom-widgets/core";
import { analyzeJsxTemplate, analyzeRequestManifest } from "@homarr/custom-widgets/workbench";
import type { CustomWidgetFormValues, EditorDiagnostic } from "@homarr/custom-widgets/workbench";

import { createCustomWidgetCompletions, getInvalidCustomWidgetSections } from "./_custom-widget-form-analysis";
import { buildDefinition, isRecord, parseJson } from "./_custom-widget-form-utils";

function normalizeEditorDiagnostics(
  section: "requests" | "template",
  diagnostics: readonly EditorDiagnostic[],
): CustomWidgetAiDiagnostic[] {
  return diagnostics.map((diagnostic) => ({
    section,
    severity: diagnostic.severity,
    code: diagnostic.code,
    line: diagnostic.line,
    column: diagnostic.column,
    message: diagnostic.value,
  }));
}

export function useCustomWidgetFormAnalysis(values: CustomWidgetFormValues) {
  const analysisValues = useDeferredValue(values);
  const candidate = useMemo(() => buildDefinition(analysisValues), [analysisValues]);
  const parsedOptions = useMemo(
    () => customWidgetOptionsSchema.safeParse(parseJson(analysisValues.options)),
    [analysisValues.options],
  );
  const requestIds = useMemo(() => {
    const parsedRequests = parseJson(analysisValues.requests);
    return isRecord(parsedRequests) ? Object.keys(parsedRequests) : [];
  }, [analysisValues.requests]);
  const requestIdsSignature = requestIds.join("\0");
  const jsxCompletions = useMemo(
    () =>
      createCustomWidgetCompletions(
        { options: analysisValues.options, sources: analysisValues.sources },
        requestIdsSignature ? requestIdsSignature.split("\0") : [],
      ),
    [analysisValues.options, analysisValues.sources, requestIdsSignature],
  );
  const templateDiagnostics = useMemo(
    () => analyzeJsxTemplate(analysisValues.template, { requestIds }),
    [analysisValues.template, requestIds],
  );
  const requestDiagnostics = useMemo(() => analyzeRequestManifest(analysisValues.requests), [analysisValues.requests]);
  const hasDiagnostics = [...templateDiagnostics, ...requestDiagnostics].some((entry) => entry.severity === "error");
  const invalidSections = useMemo(
    () =>
      getInvalidCustomWidgetSections(
        candidate.success ? [] : candidate.error.issues,
        requestDiagnostics,
        templateDiagnostics,
      ),
    [candidate, requestDiagnostics, templateDiagnostics],
  );
  const aiDraft = useMemo<CustomWidgetAiDraft>(
    () => ({
      name: values.name,
      description: values.description,
      iconUrl: values.iconUrl,
      sources: values.sources,
      requests: values.requests,
      options: values.options,
      template: values.template,
    }),
    [values.description, values.iconUrl, values.name, values.options, values.requests, values.sources, values.template],
  );
  const aiDiagnostics = useMemo<CustomWidgetAiDiagnostic[]>(() => {
    const diagnostics = [
      ...normalizeEditorDiagnostics("requests", requestDiagnostics),
      ...normalizeEditorDiagnostics("template", templateDiagnostics),
    ];
    if (candidate.success) return diagnostics;
    return [
      ...candidate.error.issues.map((issue) => ({
        section: String(issue.path[0] ?? "definition"),
        severity: "error" as const,
        path: issue.path.map(String).join(".") || undefined,
        message: issue.message,
      })),
      ...diagnostics,
    ];
  }, [candidate, requestDiagnostics, templateDiagnostics]);
  const previewValidationIssues = useMemo(
    () =>
      candidate.success
        ? []
        : candidate.error.issues.map((issue) => ({
            path: issue.path.map(String).join(".") || undefined,
            message: issue.message,
          })),
    [candidate],
  );

  return {
    candidate,
    parsedOptions,
    jsxCompletions,
    templateDiagnostics,
    requestDiagnostics,
    hasDiagnostics,
    invalidSections,
    aiDraft,
    aiDiagnostics,
    previewValidationIssues,
  };
}
