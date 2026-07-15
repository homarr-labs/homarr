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

const displayConfigBuilders: Record<string, (values: z.infer<typeof formSchema>) => Record<string, unknown>> = {
  singleValue: (v) => ({
    type: "singleValue",
    jsonPath: v.jsonPath,
    label: v.label,
    unit: v.unit,
    valueSize: v.valueSize,
    labelPosition: v.labelPosition,
  }),
  keyValue: (v) => ({
    type: "keyValue",
    mappings: v.mappings,
    layout: v.kvLayout,
    columns: v.kvColumns,
  }),
  table: (v) => ({
    type: "table",
    tablePath: v.tablePath,
    columns: v.columns,
    striped: v.striped,
    compact: v.compact,
  }),
  statGrid: (v) => ({
    type: "statGrid",
    items: v.statGridItems,
    columns: v.statGridColumns,
    cardStyle: v.cardStyle,
  }),
  progressBars: (v) => ({
    type: "progressBars",
    bars: v.progressBars.map((b) => ({
      ...b,
      maxPath: b.maxPath || undefined,
    })),
    showPercentage: v.showPercentage,
    barSize: v.barSize,
  }),
  statusIndicator: (v) => ({
    type: "statusIndicator",
    items: v.statusItems.map((item) => ({
      ...item,
      goodValues: item.goodValues
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    })),
    layout: v.statusLayout,
    dotSize: v.dotSize,
  }),
  countGrid: (v) => ({
    type: "countGrid",
    items: v.countGridItems,
    columns: v.countGridColumns,
    valueSize: v.countValueSize,
  }),
  raw: (v) => ({
    type: "raw",
    jsonPath: v.rawJsonPath,
    maxHeight: v.rawMaxHeight,
  }),
  actionButton: (v) => ({
    type: "actionButton",
    buttonLabel: v.buttonLabel,
    buttonColor: v.buttonColor,
    confirmText: v.confirmText || undefined,
    successMessage: v.successMessage || undefined,
  }),
  customJsx: (v) => ({ type: "customJsx", template: v.template }),
};

const serverToFormFieldMap: Record<string, Record<string, string>> = {
  statGrid: { items: "statGridItems" },
  countGrid: { items: "countGridItems" },
  statusIndicator: { items: "statusItems" },
  progressBars: { bars: "progressBars" },
  keyValue: { mappings: "mappings" },
  table: { columns: "columns", tablePath: "tablePath" },
  singleValue: { jsonPath: "jsonPath", label: "label", unit: "unit" },
  raw: { jsonPath: "rawJsonPath" },
  actionButton: { buttonLabel: "buttonLabel" },
  customJsx: { template: "template" },
};

function extractServerErrors(err: unknown, displayType: string): Record<string, string> {
  const errors: Record<string, string> = {};
  const trpcErr = err as {
    data?: { zodError?: { fieldErrors?: Record<string, string[]> } };
    message?: string;
  };

  if (trpcErr?.data?.zodError?.fieldErrors) {
    for (const [field, messages] of Object.entries(trpcErr.data.zodError.fieldErrors)) {
      if (messages?.[0]) {
        errors[field] = messages[0];
      }
    }
    return errors;
  }

  try {
    const issues = JSON.parse(trpcErr?.message ?? "[]") as Array<{
      path: (string | number)[];
      message: string;
    }>;
    const fieldMap = serverToFormFieldMap[displayType] ?? {};

    for (const issue of issues) {
      const path = [...issue.path];
      if (path[0] === "displayConfig") {
        path.shift();
        const serverField = String(path[0]);
        const formField = fieldMap[serverField] ?? serverField;
        path[0] = formField;
      }
      errors[path.join(".")] = issue.message;
    }
  } catch {
    // not parseable, ignore
  }

  return errors;
}

const listItemDefaults = {
  mapping: { label: "", jsonPath: "$", unit: "" },
  column: { header: "", jsonPath: "$" },
  statGridItem: { label: "", jsonPath: "$", unit: "", color: "blue" },
  progressBar: {
    label: "",
    valuePath: "$",
    maxPath: "",
    unit: "",
    color: "blue",
  },
  statusItem: { label: "", jsonPath: "$", goodValues: "online,true" },
  countGridItem: { label: "", jsonPath: "$", unit: "" },
} as const;

function cloneLast<T extends Record<string, unknown>>(arr: T[], fallback: T): T {
  const last = arr[arr.length - 1];
  return last ? { ...last } : { ...fallback };
}

const ALL_DISPLAY_TYPES = [
  "singleValue",
  "keyValue",
  "table",
  "statGrid",
  "progressBars",
  "statusIndicator",
  "countGrid",
  "raw",
  "actionButton",
  "customJsx",
] as const;
const MANTINE_COLORS = [
  "blue",
  "teal",
  "green",
  "red",
  "orange",
  "yellow",
  "violet",
  "pink",
  "cyan",
  "grape",
  "indigo",
  "lime",
] as const;

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
