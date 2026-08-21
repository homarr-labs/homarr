"use client";

import { useState } from "react";
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

interface FormActionsInput {
  mode: "create" | "edit";
  definitionId?: string;
  form: UseFormReturnType<CustomWidgetFormValues>;
  candidate: ReturnType<typeof buildDefinition>;
  preview: PreviewState;
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
    if (previewPending) return;
    if (!input.candidate.success) {
      showErrorNotification({
        title: w("section.preview"),
        message: input.candidate.error.issues[0]?.message ?? w("invalidWidget"),
      });
      return;
    }
    const optionIssues = getCustomWidgetPreviewOptionIssues(input.candidate.data, input.optionsSnapshot);
    if (optionIssues.length > 0) {
      const issue = optionIssues[0];
      showErrorNotification({
        title: w("section.preview"),
        message: issue ? `${issue.path}: ${issue.message}` : w("invalidWidget"),
      });
      return;
    }
    input.setMobilePane("preview");
    input.setPreview({ data: {}, status: {}, session: null, outcome: "loading" });
    setPreviewPending(true);
    try {
      const created = await previewMutation.mutateAsync({
        definition: input.candidate.data,
        definitionId: input.definitionId,
        options: input.optionsSnapshot,
        secrets: getChangedSecrets(input.form.values),
      });
      const snapshot = await loadPreviewQueries(input.candidate.data, created.previewSession.id);
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
      input.setPreview((current) => ({ ...current, outcome: "error" }));
      showErrorNotification({ title: w("section.preview"), message: t("notification.previewError") });
    } finally {
      setPreviewPending(false);
    }
  };

  const pasteAiResponse = async () => {
    try {
      const result = applyCustomWidgetAiResponse(input.form, await navigator.clipboard.readText());
      if (!result.success) {
        throw new Error(formatCustomWidgetImportIssues(result.issues));
      }
      input.setOptionsSnapshot(getDefinitionDefaults(result.widget));
      input.setPreview({ data: {}, status: {}, session: null, outcome: "idle" });
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

function reportSaveIssues(
  form: UseFormReturnType<CustomWidgetFormValues>,
  issues: CustomWidgetSaveIssue[],
  setIssues: Dispatch<SetStateAction<CustomWidgetSaveIssue[]>>,
  title: string,
  getRemainingLabel: (count: number) => string,
) {
  setIssues(issues);
  const messagesByPath = new Map<string, string[]>();
  for (const issue of issues) {
    if (!issue.path) continue;
    const field = issue.path.split(".")[0] ?? issue.path;
    messagesByPath.set(field, [...(messagesByPath.get(field) ?? []), issue.message]);
  }
  for (const [path, messages] of messagesByPath) {
    form.setFieldError(path, messages.join(" "));
  }
  const remaining = issues.length - 1;
  showErrorNotification({
    title,
    message: `${issues[0]?.message ?? ""}${remaining > 0 ? ` ${getRemainingLabel(remaining)}` : ""}`,
  });
}

function clearSaveIssues(form: UseFormReturnType<CustomWidgetFormValues>, issues: CustomWidgetSaveIssue[]) {
  for (const path of new Set(issues.flatMap((issue) => (issue.path ? [issue.path.split(".")[0] ?? issue.path] : [])))) {
    form.clearFieldError(path);
  }
}
