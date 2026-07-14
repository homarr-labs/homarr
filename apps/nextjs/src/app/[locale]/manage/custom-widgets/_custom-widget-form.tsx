"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Group, Paper, SegmentedControl, Stack, Text } from "@mantine/core";
import { clientApi } from "@homarr/api/client";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

import type { CustomWidgetAuthType, CustomWidgetDisplayType } from "@homarr/custom-widgets/core";
import { buildDisplayConfigFromFormValues, CUSTOM_JSX_STARTER } from "@homarr/custom-widgets/core";
import {
  analyzeJsxTemplate,
  analyzeRequestManifest,
  DEFAULT_CUSTOM_WIDGET_FORM_VALUES,
  customWidgetFormSchema,
  parseRequestManifest,
} from "@homarr/custom-widgets/workbench";
import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";
import { CopyAiPromptButton } from "./_copy-ai-prompt-button";
import { CustomWidgetPreview } from "./_custom-widget-preview";
import { ConfigureSection, ConnectionSection, FormatSection } from "./_custom-widget-form-sections";
import { extractServerErrors } from "./_custom-widget-form-errors";
import { useCustomWidgetClipboard } from "./_use-custom-widget-clipboard";
import { useCustomWidgetPreview } from "./_use-custom-widget-preview";
import classes from "./_custom-widget-form.module.css";

interface CustomWidgetFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<CustomWidgetFormValues>;
  definitionId?: string;
}

export function CustomWidgetForm({ mode, initialValues, definitionId }: CustomWidgetFormProps) {
  const router = useRouter();
  const globalT = useI18n();
  const t = useScopedI18n("customWidget");
  const utils = clientApi.useUtils();
  const createMutation = clientApi.customWidget.create.useMutation();
  const updateMutation = clientApi.customWidget.update.useMutation();
  const [previewRefreshSignal, setPreviewRefreshSignal] = useState(0);
  const [mobilePane, setMobilePane] = useState<"configure" | "preview">("configure");
  const formatSectionRef = useRef<HTMLElement>(null);
  const connectionSectionRef = useRef<HTMLElement>(null);
  const configureSectionRef = useRef<HTMLElement>(null);
  const scrollToSection = useCallback((section: number) => {
    const element = [formatSectionRef.current, connectionSectionRef.current, configureSectionRef.current][section];
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => element.focus({ preventScroll: true }), 250);
  }, []);

  const mergedInitialValues = { ...DEFAULT_CUSTOM_WIDGET_FORM_VALUES, ...initialValues };
  if (mergedInitialValues.displayType === "customJsx" && !mergedInitialValues.template.trim()) {
    mergedInitialValues.template = CUSTOM_JSX_STARTER;
  }
  const form = useZodForm(customWidgetFormSchema, { initialValues: mergedInitialValues });
  const preview = useCustomWidgetPreview({
    form,
    definitionId,
    refreshSignal: previewRefreshSignal,
    onOpenPreview: () => setMobilePane("preview"),
    t,
  });
  useCustomWidgetClipboard({ enabled: mode === "edit", form, t, onReplace: preview.reset });

  const requestManifest = parseRequestManifest(form.values.requestManifest);
  const requestIds = requestManifest
    .map((request) => (request && typeof request === "object" && "id" in request ? request.id : null))
    .filter((id): id is string => typeof id === "string");
  const editorDiagnostics =
    form.values.displayType === "customJsx"
      ? analyzeJsxTemplate(form.values.template, {
          apiVersion: form.values.jsxApiVersion === "2" ? 2 : 1,
          requestIds,
        })
      : [];
  const requestDiagnostics =
    form.values.displayType === "customJsx" && form.values.jsxApiVersion === "2"
      ? analyzeRequestManifest(form.values.requestManifest)
      : [];
  const hasEditorErrors = [...editorDiagnostics, ...requestDiagnostics].some(
    (diagnostic) => diagnostic.severity === "error",
  );
  const isDirtyRef = useRef(false);
  isDirtyRef.current = form.isDirty();

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirtyRef.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (form.values.displayType === "customJsx" && form.values.jsxApiVersion === "2" && form.values.method !== "GET") {
      form.setFieldValue("method", "GET");
      form.setFieldValue("requestBody", "");
    }
  }, [form, form.values.displayType, form.values.jsxApiVersion, form.values.method]);

  const focusStepForErrors = (errors: Record<string, unknown>) => {
    const fields = Object.keys(errors);
    if (fields.some((field) => ["name", "description", "iconUrl", "displayType"].includes(field.split(".")[0] ?? ""))) {
      scrollToSection(0);
      return;
    }
    if (
      fields.some((field) =>
        ["url", "method", "authType", "headerName", "requestBody", "secrets"].includes(field.split(".")[0] ?? ""),
      )
    ) {
      scrollToSection(1);
      return;
    }
    scrollToSection(2);
  };

  const handleSubmit = form.onSubmit(async (values) => {
    if (hasEditorErrors) return;
    const displayConfig = buildDisplayConfigFromFormValues(values);

    const payload = {
      name: values.name,
      description: values.description || undefined,
      iconUrl: values.iconUrl || undefined,
      url: values.url,
      authType: values.authType as CustomWidgetAuthType,
      headerName: values.headerName || undefined,
      method: values.method as "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
      requestBody: values.requestBody || undefined,
      displayType: values.displayType as CustomWidgetDisplayType,
      displayConfig: displayConfig as never,
      secrets: values.secrets
        .filter((s) => s.value)
        .map((s) => ({
          kind: s.kind as "apiKey" | "username" | "password",
          value: s.value,
        })),
    };

    try {
      if (mode === "create") {
        const result = await createMutation.mutateAsync(payload);
        showSuccessNotification({
          title: t("action.create"),
          message: t("notification.created", { name: values.name }),
        });
        await utils.customWidget.all.invalidate();
        router.push(`/manage/custom-widgets/edit/${result.id}`);
      } else if (definitionId) {
        await updateMutation.mutateAsync({ id: definitionId, ...payload });
        showSuccessNotification({
          title: t("action.save"),
          message: t("notification.updated", { name: values.name }),
        });
        setPreviewRefreshSignal((n) => n + 1);
        await utils.customWidget.all.invalidate();
        await utils.customWidget.byId.invalidate({ id: definitionId });
        await utils.widget.customApi.getData.invalidate();
        form.setInitialValues(values);
        form.resetDirty();
      }
    } catch (err) {
      const serverErrors = extractServerErrors(err, values.displayType);
      if (Object.keys(serverErrors).length > 0) {
        form.setErrors(serverErrors);
        focusStepForErrors(serverErrors);
      }
      const errorKey = mode === "create" ? "notification.createError" : "notification.updateError";
      showErrorNotification({
        title: t("action.save"),
        message: t(errorKey as never),
      });
    }
  }, focusStepForErrors);

  const continueToSection = (currentSection: number, field: string, nextSection: number) => {
    if (form.validateField(field).hasError) {
      scrollToSection(currentSection);
      return;
    }
    scrollToSection(nextSection);
  };

  return (
    <form onSubmit={handleSubmit} className={classes.form}>
      <SegmentedControl
        className={classes.paneSwitcher}
        fullWidth
        value={mobilePane}
        onChange={(value) => setMobilePane(value as "configure" | "preview")}
        data={[
          { value: "configure", label: t("workbench.configure") },
          { value: "preview", label: t("workbench.preview") },
        ]}
      />
      <div className={classes.workbench} data-mobile-pane={mobilePane}>
        <Stack gap="xl" className={classes.configuration}>
          <Stack gap={0} className={classes.formFlow}>
            <FormatSection
              form={form}
              t={t}
              previewJson={preview.json}
              sectionRef={formatSectionRef}
              onContinue={() => continueToSection(0, "name", 1)}
            />
            <ConnectionSection
              form={form}
              t={t}
              previewJson={preview.json}
              sectionRef={connectionSectionRef}
              isTesting={preview.isTesting}
              onTest={() => void preview.test()}
              onContinue={() => continueToSection(1, "url", 2)}
            />
            <ConfigureSection form={form} t={t} previewJson={preview.json} sectionRef={configureSectionRef} />
          </Stack>
          <Paper p="md" className={classes.mobileSaveBar} shadow="sm">
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm" fw={600}>
                {form.isDirty() ? globalT("common.unsavedChanges") : t("action.readyToSave")}
              </Text>
              <Button
                type="submit"
                size="md"
                loading={createMutation.isPending || updateMutation.isPending}
                disabled={hasEditorErrors}
              >
                {mode === "create" ? t("action.create") : t("action.save")}
              </Button>
            </Group>
          </Paper>
        </Stack>

        <Box component="aside" className={classes.previewPane} aria-label={t("preview.title")}>
          <Paper p="md" className={classes.actionBar} shadow="sm">
            <Group justify="space-between" wrap="nowrap">
              <div>
                <Text size="sm" fw={600}>
                  {form.isDirty() ? globalT("common.unsavedChanges") : t("action.readyToSave")}
                </Text>
                <Text size="xs" c="dimmed" visibleFrom="sm">
                  {hasEditorErrors ? t("editor.saveBlocked") : t("editor.saveReady")}
                </Text>
              </div>
              <Button
                type="submit"
                size="md"
                loading={createMutation.isPending || updateMutation.isPending}
                disabled={hasEditorErrors}
                miw={160}
              >
                {mode === "create" ? t("action.create") : t("action.save")}
              </Button>
            </Group>
          </Paper>
          <CopyAiPromptButton
            rawResponse={preview.fetchResult?.rawResponse}
            currentConfig={{
              $schema: "homarr-custom-widget-v3",
              name: form.values.name,
              description: form.values.description,
              iconUrl: form.values.iconUrl,
              url: form.values.url,
              authType: form.values.authType,
              headerName: form.values.headerName,
              method: form.values.method,
              requestBody: form.values.requestBody,
              displayType: form.values.displayType,
              displayConfig: preview.input.displayConfig,
            }}
          />
          <CustomWidgetPreview
            getFormValues={preview.getInput}
            formValues={preview.input}
            fetchResult={preview.fetchResult}
            cachedJson={preview.json}
            onTest={() => void preview.test()}
            isTesting={preview.isTesting}
            isSampleStale={preview.isStale}
            testError={preview.testError ? t("notification.previewError") : null}
            onInsertDataPath={form.values.displayType === "customJsx" ? preview.insertDataPath : undefined}
            onSetPreviewLiveActions={preview.setLiveActions}
            isUpdatingPreviewActions={preview.isUpdatingLiveActions}
            onSampleDataChange={preview.setSampleData}
          />
        </Box>
      </div>
    </form>
  );
}
