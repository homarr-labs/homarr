"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useDeferredValue,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";

import type { CustomWidgetAiDiagnostic } from "@homarr/custom-widgets/authoring-prompt";
import { customWidgetOptionsSchema } from "@homarr/custom-widgets/core";
import { analyzeJsxTemplate, analyzeRequestManifest } from "@homarr/custom-widgets/workbench";
import type { CustomWidgetFormValues, EditorDiagnostic } from "@homarr/custom-widgets/workbench";

import { createCustomWidgetCompletions, getInvalidCustomWidgetSections } from "./_custom-widget-form-analysis";
import { buildDefinition, isRecord, parseJson } from "./_custom-widget-form-utils";
import { useDeferredCustomWidgetFormDocumentValues } from "./_custom-widget-form-state";

const emptyPreviewValidationIssues: Array<{ path?: string; message: string }> = [];
const emptyCandidateIssues: Array<{ path: PropertyKey[] }> = [];

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

function createAiDiagnostics(
  candidate: ReturnType<typeof buildDefinition>,
  requestDiagnostics: readonly EditorDiagnostic[],
  templateDiagnostics: readonly EditorDiagnostic[],
) {
  const editorDiagnostics = [
    ...normalizeEditorDiagnostics("requests", requestDiagnostics),
    ...normalizeEditorDiagnostics("template", templateDiagnostics),
  ];
  if (candidate.success) return editorDiagnostics;
  return [
    ...candidate.error.issues.map((issue) => ({
      section: String(issue.path[0] ?? "definition"),
      severity: "error" as const,
      path: issue.path.map(String).join(".") || undefined,
      message: issue.message,
    })),
    ...editorDiagnostics,
  ];
}

export function analyzeCustomWidgetAiDiagnostics(values: CustomWidgetFormValues): CustomWidgetAiDiagnostic[] {
  const parsedRequests = parseJson(values.requests);
  const requestIds = isRecord(parsedRequests) ? Object.keys(parsedRequests) : [];
  return createAiDiagnostics(
    buildDefinition(values),
    analyzeRequestManifest(values.requests),
    analyzeJsxTemplate(values.template, { requestIds }),
  );
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
  const candidateIssues = candidate.success ? emptyCandidateIssues : candidate.error.issues;
  const invalidSections = useMemo(
    () => getInvalidCustomWidgetSections(candidateIssues, requestDiagnostics, templateDiagnostics),
    [candidateIssues, requestDiagnostics, templateDiagnostics],
  );
  const previewCandidate = useMemo(
    () => (candidate.success ? candidate.data : null),
    // The preview renderer consumes only these definition fields; other fields affect the validity boolean below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [analysisValues.requests, analysisValues.template, candidate.success],
  );
  const previewValidationIssues = useMemo(
    () =>
      candidate.success
        ? emptyPreviewValidationIssues
        : candidate.error.issues.map((issue) => ({
            path: issue.path.map(String).join(".") || undefined,
            message: issue.message,
          })),
    [candidate],
  );

  return useMemo(
    () => ({
      candidate,
      candidateValid: candidate.success,
      parsedOptions,
      jsxCompletions,
      templateDiagnostics,
      requestDiagnostics,
      hasDiagnostics,
      invalidSections,
      previewCandidate,
      previewValidationIssues,
    }),
    [
      candidate,
      hasDiagnostics,
      invalidSections,
      jsxCompletions,
      parsedOptions,
      previewCandidate,
      previewValidationIssues,
      requestDiagnostics,
      templateDiagnostics,
    ],
  );
}

type CustomWidgetFormAnalysis = ReturnType<typeof useCustomWidgetFormAnalysis>;

interface CustomWidgetFormAnalysisStore {
  getAnalysis(): CustomWidgetFormAnalysis;
  setAnalysis(analysis: CustomWidgetFormAnalysis): void;
  subscribe(listener: () => void): () => void;
}

function createCustomWidgetFormAnalysisStore(initialAnalysis: CustomWidgetFormAnalysis): CustomWidgetFormAnalysisStore {
  let analysis = initialAnalysis;
  const listeners = new Set<() => void>();
  return {
    getAnalysis: () => analysis,
    setAnalysis: (nextAnalysis) => {
      if (Object.is(analysis, nextAnalysis)) return;
      analysis = nextAnalysis;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const CustomWidgetFormAnalysisContext = createContext<CustomWidgetFormAnalysisStore | null>(null);

export function CustomWidgetFormAnalysisProvider({ children }: { children: ReactNode }) {
  const values = useDeferredCustomWidgetFormDocumentValues();
  const analysis = useCustomWidgetFormAnalysis(values);
  const [store] = useState(() => createCustomWidgetFormAnalysisStore(analysis));
  useLayoutEffect(() => store.setAnalysis(analysis), [analysis, store]);
  return createElement(CustomWidgetFormAnalysisContext.Provider, { value: store }, children);
}

export function useCustomWidgetFormAnalysisField<Key extends keyof CustomWidgetFormAnalysis>(field: Key) {
  const store = useContext(CustomWidgetFormAnalysisContext);
  if (!store) throw new Error("Custom widget form analysis provider is missing");
  const getSnapshot = useCallback(() => store.getAnalysis()[field], [field, store]);
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
