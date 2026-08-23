"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  const previewOptions = input.optionsSnapshot;
  const previewOptionsFingerprint = useMemo(() => JSON.stringify(previewOptions), [previewOptions]);
  const previewSecretValues = input.form.values.secrets;
  const previewSecrets = useMemo(() => getChangedSecrets({ secrets: previewSecretValues }), [previewSecretValues]);
  const previewSecretsFingerprint = useMemo(() => JSON.stringify(previewSecrets), [previewSecrets]);
  const previewDefinitionValues = useMemo(
    () => ({
      name: input.form.values.name,
      description: input.form.values.description,
      iconUrl: input.form.values.iconUrl,
      sources: input.form.values.sources,
      requests: input.form.values.requests,
      options: input.form.values.options,
      template: input.form.values.template,
    }),
    [
      input.form.values.description,
      input.form.values.iconUrl,
      input.form.values.name,
      input.form.values.options,
      input.form.values.requests,
      input.form.values.sources,
      input.form.values.template,
    ],
  );
  const setPreview = input.setPreview;
  const previewGeneration = useRef(0);
  const latestPreviewInput = useRef({
    definitionValues: previewDefinitionValues,
    optionsFingerprint: previewOptionsFingerprint,
    secretsFingerprint: previewSecretsFingerprint,
  });
  useLayoutEffect(() => {
    const previous = latestPreviewInput.current;
    const current = {
      definitionValues: previewDefinitionValues,
      optionsFingerprint: previewOptionsFingerprint,
      secretsFingerprint: previewSecretsFingerprint,
    };
    latestPreviewInput.current = current;
    if (
      previous.definitionValues === current.definitionValues &&
      previous.optionsFingerprint === current.optionsFingerprint &&
      previous.secretsFingerprint === current.secretsFingerprint
    )
      return;
    previewGeneration.current += 1;
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
    setPreviewPending(false);
  }, [previewDefinitionValues, previewOptionsFingerprint, previewSecretsFingerprint, setPreview]);
  useEffect(
    () => () => {
      previewGeneration.current += 1;
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
    const candidateAtStart = buildDefinition(input.form.values);
    if (!candidateAtStart.success) {
      showErrorNotification({
        title: w("section.preview"),
        message: candidateAtStart.error.issues[0]?.message ?? w("invalidWidget"),
      });
      return;
    }
    const optionIssues = getCustomWidgetPreviewOptionIssues(candidateAtStart.data, input.optionsSnapshot);
    if (optionIssues.length > 0) {
      const issue = optionIssues[0];
      showErrorNotification({
        title: w("section.preview"),
        message: issue ? `${issue.path}: ${issue.message}` : w("invalidWidget"),
      });
      return;
    }
    const definitionValuesAtStart = previewDefinitionValues;
    const optionsAtStart = input.optionsSnapshot;
    const optionsFingerprintAtStart = previewOptionsFingerprint;
    const secretsAtStart = previewSecrets;
    const secretsFingerprintAtStart = previewSecretsFingerprint;
    const generation = previewGeneration.current + 1;
    previewGeneration.current = generation;
    const isCurrent = () => {
      const latest = latestPreviewInput.current;
      return (
        previewGeneration.current === generation &&
        latest.definitionValues === definitionValuesAtStart &&
        latest.optionsFingerprint === optionsFingerprintAtStart &&
        latest.secretsFingerprint === secretsFingerprintAtStart
      );
    };
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
      if (isCurrent()) {
        setPreviewPending(false);
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
