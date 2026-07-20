"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import type { UseFormReturnType } from "@mantine/form";

import { clientApi, fetchApi } from "@homarr/api/client";
import {
  buildCustomWidgetFixPrompt,
  customWidgetDefinitionSchema,
  formatCustomWidgetImportIssues,
  parseCustomWidgetAiResponse,
} from "@homarr/custom-widgets/core";
import type { EditorDiagnostic, CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";
import { showErrorNotification, showSuccessNotification, showWarningNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import { applyDefinition, buildDefinition, isRecord, loadPreviewQueries } from "./_custom-widget-form-utils";
import type { PreviewState } from "./_custom-widget-preview-panel";

interface FormActionsInput {
  mode: "create" | "edit";
  definitionId?: string;
  form: UseFormReturnType<CustomWidgetFormValues>;
  candidate: ReturnType<typeof buildDefinition>;
  templateDiagnostics: EditorDiagnostic[];
  requestDiagnostics: EditorDiagnostic[];
  preview: PreviewState;
  setPreview: Dispatch<SetStateAction<PreviewState>>;
  setMobilePane: Dispatch<SetStateAction<"configure" | "preview">>;
  setOptionsSnapshot: Dispatch<SetStateAction<Record<string, unknown>>>;
  request: string;
  documentationUrl: string;
}

export function useCustomWidgetFormActions(input: FormActionsInput) {
  const router = useRouter();
  const t = useScopedI18n("customWidget");
  const w = useScopedI18n("customWidget.workbench");
  const utils = clientApi.useUtils();
  const createMutation = clientApi.customWidget.create.useMutation();
  const updateMutation = clientApi.customWidget.update.useMutation();
  const previewMutation = clientApi.customWidget.previewCreate.useMutation();
  const [importIssues, setImportIssues] = useState<string[]>([]);
  const [previewPending, setPreviewPending] = useState(false);

  const save = input.form.onSubmit(async (values) => {
    const definition = buildDefinition(values);
    if (!definition.success) {
      showErrorNotification({
        title: t("action.save"),
        message: definition.error.issues[0]?.message ?? w("invalidWidget"),
      });
      return;
    }
    const changedSecrets = values.secrets
      .filter((secret) => secret.value.trim())
      .map(({ sourceId, kind, value }) => ({
        sourceId,
        kind: kind as "apiKey" | "username" | "password",
        value,
      }));
    try {
      if (input.mode === "create") {
        const result = await createMutation.mutateAsync({ ...definition.data, secrets: changedSecrets });
        await utils.customWidget.list.invalidate();
        showSuccessNotification({
          title: t("action.create"),
          message: t("notification.created", { name: values.name }),
        });
        router.push(`/manage/custom-widgets/edit/${result.id}`);
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
          title: t("action.save"),
          message: t("notification.updated", { name: values.name }),
        });
      }
    } catch {
      showErrorNotification({ title: t("action.save"), message: t("notification.updateError") });
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
    input.setMobilePane("preview");
    input.setPreview({ data: {}, status: {}, session: null, outcome: "loading" });
    setPreviewPending(true);
    try {
      const created = await previewMutation.mutateAsync({
        definition: input.candidate.data,
        definitionId: input.definitionId,
        secrets: input.form.values.secrets
          .filter((secret) => secret.value.trim())
          .map(({ sourceId, kind, value }) => ({
            sourceId,
            kind: kind as "apiKey" | "username" | "password",
            value,
          })),
      });
      input.setOptionsSnapshot(input.candidate.data.defaultOptions);
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
      const result = parseCustomWidgetAiResponse(await navigator.clipboard.readText());
      if (!result.success) {
        setImportIssues(result.issues.map((issue) => `${issue.path?.join(".") ?? "widget"}: ${issue.message}`));
        throw new Error(formatCustomWidgetImportIssues(result.issues));
      }
      setImportIssues([]);
      applyDefinition(input.form, customWidgetDefinitionSchema.parse(result.widget));
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

  const copyDiagnostics = async () => {
    try {
      const diagnostics = [...input.templateDiagnostics, ...input.requestDiagnostics]
        .map((entry) => `${entry.severity.toUpperCase()} ${entry.code}: ${entry.value ?? ""}`)
        .concat(importIssues.map((issue) => `IMPORT: ${issue}`))
        .join("\n");
      const journal = input.preview.session
        ? await fetchApi.customWidget.previewJournal.query({ sessionId: input.preview.session.id }).catch(() => [])
        : [];
      await navigator.clipboard.writeText(
        buildCustomWidgetFixPrompt({
          currentConfig: input.candidate.success ? input.candidate.data : input.form.values,
          request: input.request,
          documentationUrl: input.documentationUrl,
          diagnostics,
          journal,
        }),
      );
      showSuccessNotification({ title: w("ai.diagnostics"), message: w("ai.diagnosticsCopied") });
    } catch {
      showErrorNotification({ title: w("ai.diagnostics"), message: t("notification.aiPromptCopyError") });
    }
  };

  return {
    save,
    runPreview,
    pasteAiResponse,
    copyDiagnostics,
    savePending: createMutation.isPending || updateMutation.isPending,
    previewPending,
  };
}
