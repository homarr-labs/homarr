"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { UseFormReturnType } from "@mantine/form";

import { clientApi } from "@homarr/api/client";
import { formatCustomWidgetImportIssues } from "@homarr/custom-widgets/core";
import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";
import { showErrorNotification, showSuccessNotification, showWarningNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import {
  applyCustomWidgetAiResponse,
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

interface FormActionsInput {
  mode: "create" | "edit";
  definitionId?: string;
  form: UseFormReturnType<CustomWidgetFormValues>;
  documentStore: CustomWidgetFormDocumentStore;
  setPreview: Dispatch<SetStateAction<PreviewState>>;
  setMobilePane: Dispatch<SetStateAction<"configure" | "preview">>;
  optionsSnapshot: Record<string, unknown>;
  setOptionsSnapshot: Dispatch<SetStateAction<Record<string, unknown>>>;
}

export function useCustomWidgetFormActions(input: FormActionsInput) {
  const t = useI18n("customWidget");
  const tCommon = useI18n("common");
  const w = useI18n("customWidget.workbench");
  const utils = clientApi.useUtils();
  const createMutation = clientApi.customWidget.create.useMutation();
  const updateMutation = clientApi.customWidget.update.useMutation();
  const previewMutation = clientApi.customWidget.previewCreate.useMutation();
  const [saveIssues, setSaveIssues] = useState<CustomWidgetSaveIssue[]>([]);
  const [previewPending, setPreviewPending] = useState(false);
  const setPreview = input.setPreview;
  const previewGeneration = useRef(0);
  const activePreviewGeneration = useRef<number | null>(null);
  const invalidatePreview = useCallback(() => {
    previewGeneration.current += 1;
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
  useLayoutEffect(() => {
    invalidatePreview();
  }, [input.optionsSnapshot, invalidatePreview]);
  useEffect(() => input.documentStore.subscribe(invalidatePreview), [input.documentStore, invalidatePreview]);
  useEffect(
    () => () => {
      previewGeneration.current += 1;
      activePreviewGeneration.current = null;
    },
    [],
  );
  let actionLabel = tCommon("action.save");
  if (input.mode === "create") actionLabel = tCommon("action.create");

  const save = input.form.onSubmit(async (values) => {
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
        const result = await createMutation.mutateAsync({ ...definition.data, secrets: changedSecrets });
        await utils.customWidget.list.invalidate();
        showSuccessNotification({
          title: tCommon("action.create"),
          message: t("notification.created", { name: values.name }),
        });
        input.form.setInitialValues(values);
        input.form.resetDirty();
        input.documentStore.markSaved(values);
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        window.location.assign(result.managementPath);
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
      if (issues.length > 0) {
        reportSaveIssues(input.form, issues, setSaveIssues, actionLabel, (count) => w("saveError.more", { count }));
      } else {
        showErrorNotification({ title: actionLabel, message: t("notification.updateError") });
      }
    }
  });

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
    const optionsAtStart = input.optionsSnapshot;
    const optionIssues = getCustomWidgetPreviewOptionIssues(candidateAtStart.data, optionsAtStart);
    if (optionIssues.length > 0) {
      const issue = optionIssues[0];
      showErrorNotification({
        title: w("section.preview"),
        message: issue ? `${issue.path}: ${issue.message}` : w("invalidWidget"),
      });
      return;
    }
    const secretsAtStart = getChangedSecrets(valuesAtStart);
    const generation = previewGeneration.current + 1;
    previewGeneration.current = generation;
    activePreviewGeneration.current = generation;
    const isCurrent = () => previewGeneration.current === generation;
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
    } catch {
      if (!isCurrent()) return;
      input.setPreview((current) => ({ ...current, outcome: "error" }));
      showErrorNotification({ title: w("section.preview"), message: t("notification.previewError") });
    } finally {
      if (activePreviewGeneration.current === generation) {
        activePreviewGeneration.current = null;
        setPreviewPending(false);
        if (!isCurrent()) setPreview({ data: {}, status: {}, session: null, outcome: "idle" });
      }
    }
  };

  const pasteAiResponse = async () => {
    try {
      const result = applyCustomWidgetAiResponse(input.form, await navigator.clipboard.readText());
      if (!result.success) {
        throw new Error(formatCustomWidgetImportIssues(result.issues));
      }
      input.setOptionsSnapshot(getDefinitionDefaults(result.widget));
      showSuccessNotification({
        title: w("ai.response"),
        message:
          result.warnings.length > 0
            ? `${w("ai.loaded")} ${formatCustomWidgetImportIssues(result.warnings)}`
            : w("ai.loaded"),
      });
    } catch (error) {
      showErrorNotification({
        title: w("ai.response"),
        message:
          error instanceof Error ? w("ai.invalidResponseDetail", { message: error.message }) : w("ai.invalidResponse"),
      });
    }
  };

  return {
    save,
    runPreview,
    pasteAiResponse,
    saveIssues,
    savePending: createMutation.isPending || updateMutation.isPending,
    previewPending,
  };
}
