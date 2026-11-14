"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Dispatch, FormEventHandler, SetStateAction } from "react";
import type { UseFormReturnType } from "@mantine/form";

import { clientApi } from "@homarr/api/client";
import { formatCustomWidgetImportIssues, parseCustomWidgetAiResponse } from "@homarr/custom-widgets/core";
import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";
import { showErrorNotification, showSuccessNotification, showWarningNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import {
  applyDefinition,
  buildDefinition,
  getChangedSecrets,
  getDefinitionDefaults,
  getCustomWidgetPreviewOptionIssues,
  isRecord,
  loadPreviewQueries,
} from "./_custom-widget-form-utils";
import type { PreviewState } from "./_custom-widget-preview-panel";
import { extractCustomWidgetSaveIssues } from "./_custom-widget-save-errors";
import type { CustomWidgetSaveIssue } from "./_custom-widget-save-errors";
import { clearSaveIssues, reportSaveIssues } from "./_custom-widget-save-issue-utils";
import type { CustomWidgetFormDocumentStore } from "./_custom-widget-form-state";
import { CUSTOM_WIDGET_PREVIEW_DEBOUNCE_MS } from "./_custom-widget-form-state";
import {
  createCustomWidgetAuthoringSession,
  getIncompatibleCustomWidgetImportSources,
} from "./_custom-widget-authoring-session";

interface FormActionsInput {
  mode: "create" | "edit";
  assistedOrigin: boolean;
  definitionId?: string;
  form: UseFormReturnType<CustomWidgetFormValues>;
  documentStore: CustomWidgetFormDocumentStore;
  setPreview: Dispatch<SetStateAction<PreviewState>>;
  setMobilePane: Dispatch<SetStateAction<"configure" | "preview">>;
  getOptionsSnapshot(): Record<string, unknown>;
  setOptionsSnapshot: Dispatch<SetStateAction<Record<string, unknown>>>;
}

export function useCustomWidgetFormActions(input: FormActionsInput) {
  const t = useI18n("customWidget");
  const tCommon = useI18n("common");
  const w = useI18n("customWidget.workbench");
  const utils = clientApi.useUtils();
  const createMutation = clientApi.customWidget.create.useMutation();
  const updateMutation = clientApi.customWidget.update.useMutation();
  const createFromPreviewMutation = clientApi.customWidget.createFromPreview.useMutation();
  const previewMutation = clientApi.customWidget.previewCreate.useMutation();
  const [authoringSession] = useState(() => createCustomWidgetAuthoringSession(input.assistedOrigin));
  const [hasGeneratedImport, setHasGeneratedImport] = useState(false);
  useLayoutEffect(() => {
    if (input.assistedOrigin) authoringSession.enableAssisted();
  }, [authoringSession, input.assistedOrigin]);
  const [saveIssues, setSaveIssues] = useState<CustomWidgetSaveIssue[]>([]);
  const [previewPending, setPreviewPending] = useState(false);
  const documentStore = input.documentStore;
  const getOptionsSnapshot = input.getOptionsSnapshot;
  const setOptionsSnapshot = input.setOptionsSnapshot;
  const setPreview = input.setPreview;
  const previewGeneration = useRef(0);
  const activePreviewGeneration = useRef<number | null>(null);
  const previewInvalidationTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clearPreview = useCallback(() => {
    if (activePreviewGeneration.current !== null) return;
    setPreview((preview) => {
      if (
        preview.outcome === "idle" &&
        preview.session === null &&
        Object.keys(preview.data).length === 0 &&
        Object.keys(preview.status).length === 0
      )
        return preview;
      return { data: {}, status: {}, session: null, outcome: "idle" };
    });
  }, [setPreview]);
  const changeOptionsSnapshot = useCallback<Dispatch<SetStateAction<Record<string, unknown>>>>(
    (update) => {
      const previous = getOptionsSnapshot();
      setOptionsSnapshot(update);
      if (previous === getOptionsSnapshot()) return;
      previewGeneration.current += 1;
      authoringSession.invalidate(documentStore.getValues(), getOptionsSnapshot());
      clearTimeout(previewInvalidationTimeout.current);
      clearPreview();
    },
    [documentStore, getOptionsSnapshot, setOptionsSnapshot, authoringSession, clearPreview],
  );
  useEffect(() => {
    const unsubscribe = documentStore.subscribe(() => {
      previewGeneration.current += 1;
      authoringSession.invalidate(documentStore.getValues(), getOptionsSnapshot());
      clearTimeout(previewInvalidationTimeout.current);
      previewInvalidationTimeout.current = setTimeout(clearPreview, CUSTOM_WIDGET_PREVIEW_DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(previewInvalidationTimeout.current);
      unsubscribe();
    };
  }, [documentStore, getOptionsSnapshot, authoringSession, clearPreview]);
  useEffect(
    () => () => {
      previewGeneration.current += 1;
      activePreviewGeneration.current = null;
    },
    [],
  );
  let actionLabel = tCommon("action.save");
  if (input.mode === "create") actionLabel = tCommon("action.create");

  const submit = input.form.onSubmit(async (values) => {
    clearSaveIssues(input.form, saveIssues);
    setSaveIssues([]);
    const definition = buildDefinition(values);
    if (!definition.success) {
      reportSaveIssues(
        input.form,
        definition.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
        setSaveIssues,
        actionLabel,
        (count) => w("saveError.more", { count }),
      );
      return;
    }
    const changedSecrets = getChangedSecrets(values);
    try {
      if (input.mode === "create") {
        const persist = async () => {
          if (!authoringSession.isAssisted())
            return createMutation.mutateAsync({ ...definition.data, secrets: changedSecrets });
          if (authoringSession.needsImport()) {
            reportSaveIssues(
              input.form,
              [{ message: w("assisted.importRequired") }],
              setSaveIssues,
              actionLabel,
              (count) => w("saveError.more", { count }),
            );
            return null;
          }
          const session = authoringSession.getFinalPreview(values, input.getOptionsSnapshot());
          if (!session) {
            reportSaveIssues(
              input.form,
              [{ message: w("assisted.previewRequired") }],
              setSaveIssues,
              actionLabel,
              (count) => w("saveError.more", { count }),
            );
            return null;
          }
          return createFromPreviewMutation.mutateAsync({ previewSessionId: session.id });
        };
        const result = await persist();
        if (!result) return;
        await utils.customWidget.list.invalidate();
        showSuccessNotification({
          title: tCommon("action.create"),
          message: t("notification.created", { name: values.name }),
        });
        input.form.setInitialValues(values);
        input.form.resetDirty();
        input.documentStore.markSaved(values);
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        window.location.assign(`${result.managementPath}?created=1`);
      } else if (input.definitionId) {
        await updateMutation.mutateAsync({
          id: input.definitionId,
          ...definition.data,
          secrets: changedSecrets.length ? changedSecrets : undefined,
        });
        await Promise.all([
          utils.customWidget.list.invalidate(),
          utils.customWidget.get.invalidate({ id: input.definitionId }),
          utils.widget.customApi.getData.invalidate(),
        ]);
        input.form.setInitialValues(values);
        input.form.resetDirty();
        input.documentStore.markSaved(values);
        showSuccessNotification({
          title: tCommon("action.save"),
          message: t("notification.updated", { name: values.name }),
        });
      }
    } catch (error) {
      const issues = extractCustomWidgetSaveIssues(error);
      if (authoringSession.isAssisted() && issues.length > 0) issues.push({ message: w("assisted.evidenceHelp") });
      if (issues.length > 0) {
        reportSaveIssues(input.form, issues, setSaveIssues, actionLabel, (count) => w("saveError.more", { count }));
      } else {
        showErrorNotification({ title: actionLabel, message: t("notification.updateError") });
      }
    }
  });

  const save: FormEventHandler<HTMLFormElement> = (event) => {
    if (authoringSession.needsImport()) {
      event.preventDefault();
      reportSaveIssues(input.form, [{ message: w("assisted.importRequired") }], setSaveIssues, actionLabel, (count) =>
        w("saveError.more", { count }),
      );
      return;
    }
    submit(event);
  };

  const runPreview = async () => {
    if (activePreviewGeneration.current !== null) return;
    const valuesAtStart = input.documentStore.getValues();
    const candidateAtStart = buildDefinition(valuesAtStart);
    if (!candidateAtStart.success) {
      showErrorNotification({
        title: w("section.preview"),
        message: candidateAtStart.error.issues[0]?.message ?? w("invalidWidget"),
      });
      return;
    }
    const optionsAtStart = input.getOptionsSnapshot();
    const optionIssues = getCustomWidgetPreviewOptionIssues(candidateAtStart.data, optionsAtStart);
    if (optionIssues.length > 0) {
      const issue = optionIssues[0];
      showErrorNotification({
        title: w("section.preview"),
        message: issue ? `${issue.path}: ${issue.message}` : w("invalidWidget"),
      });
      return;
    }
    clearTimeout(previewInvalidationTimeout.current);
    const secretsAtStart = getChangedSecrets(valuesAtStart);
    const generation = previewGeneration.current + 1;
    previewGeneration.current = generation;
    authoringSession.invalidate(valuesAtStart, optionsAtStart);
    activePreviewGeneration.current = generation;
    const isCurrent = () =>
      previewGeneration.current === generation &&
      input.documentStore.getValues() === valuesAtStart &&
      input.getOptionsSnapshot() === optionsAtStart;
    input.setMobilePane("preview");
    input.setPreview({ data: {}, status: {}, session: null, outcome: "loading" });
    setPreviewPending(true);
    try {
      const created = await previewMutation.mutateAsync({
        definition: candidateAtStart.data,
        definitionId: input.definitionId,
        options: optionsAtStart,
        secrets: secretsAtStart,
      });
      if (!isCurrent()) return;
      const snapshot = await loadPreviewQueries(candidateAtStart.data, created.previewSession.id);
      if (!isCurrent()) return;
      const failed = Object.values(snapshot.status).filter((status) => isRecord(status) && status.ok === false).length;
      const successfulData = Object.fromEntries(
        Object.entries(snapshot.data).filter(([id]) => {
          const status = snapshot.status[id];
          return isRecord(status) && status.ok === true;
        }),
      );
      authoringSession.captureSample(valuesAtStart, optionsAtStart, successfulData);
      if (failed === 0) authoringSession.captureFinalPreview(valuesAtStart, optionsAtStart, created.previewSession);
      input.setPreview({
        ...snapshot,
        session: created.previewSession,
        outcome: failed > 0 ? "error" : "success",
      });
      if (failed > 0) {
        showWarningNotification({
          title: w("preview.result.error.title"),
          message: w("preview.result.error.description", {
            succeeded: Object.keys(snapshot.status).length - failed,
            failed,
          }),
        });
      } else {
        showSuccessNotification({
          title: w("preview.result.success.title"),
          message: w("preview.result.success.description", {
            succeeded: Object.keys(snapshot.status).length,
            failed: 0,
          }),
        });
      }
    } catch (error) {
      if (!isCurrent()) return;
      input.setPreview((current) => ({ ...current, outcome: "error" }));
      showErrorNotification({
        title: w("section.preview"),
        message: error instanceof Error ? error.message : t("notification.previewError"),
      });
    } finally {
      if (activePreviewGeneration.current === generation) {
        activePreviewGeneration.current = null;
        setPreviewPending(false);
        if (!isCurrent()) setPreview({ data: {}, status: {}, session: null, outcome: "idle" });
      }
    }
  };

  const pasteAiResponse = (response: string): string | null => {
    const result = parseCustomWidgetAiResponse(response);
    if (!result.success) return formatCustomWidgetImportIssues(result.issues);
    if (authoringSession.isAssisted()) {
      const incompatible = getIncompatibleCustomWidgetImportSources(input.documentStore.getValues(), result.widget);
      if (!incompatible) return w("assisted.invalidSources");
      if (incompatible.length > 0) return w("assisted.incompatibleSources", { sources: incompatible.join(", ") });
    }
    previewGeneration.current += 1;
    authoringSession.markImported();
    applyDefinition(input.form, result.widget);
    changeOptionsSnapshot(getDefinitionDefaults(result.widget));
    authoringSession.invalidate(input.documentStore.getValues(), input.getOptionsSnapshot());
    setHasGeneratedImport(true);
    clearPreview();
    showSuccessNotification({
      title: w("ai.response"),
      message:
        result.warnings.length > 0
          ? `${w("ai.loaded")} ${formatCustomWidgetImportIssues(result.warnings)}`
          : w("ai.loaded"),
    });
    return null;
  };

  return {
    save,
    runPreview,
    pasteAiResponse,
    hasGeneratedImport,
    activateAssisted: authoringSession.enableAssisted,
    getSampleResponse: () => authoringSession.readSample(input.documentStore.getValues(), input.getOptionsSnapshot()),
    setOptionsSnapshot: changeOptionsSnapshot,
    saveIssues,
    savePending: createMutation.isPending || updateMutation.isPending || createFromPreviewMutation.isPending,
    previewPending,
  };
}
