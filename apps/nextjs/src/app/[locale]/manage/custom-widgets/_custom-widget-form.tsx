"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Paper, SegmentedControl, Stack, Text, TextInput, Textarea } from "@mantine/core";
import {
  IconAlertCircle,
  IconApi,
  IconBraces,
  IconCode,
  IconDatabase,
  IconEye,
  IconSettings,
} from "@tabler/icons-react";

import {
  analyzeJsxTemplate,
  analyzeRequestManifest,
  customWidgetFormSchema,
  DEFAULT_CUSTOM_WIDGET_FORM_VALUES,
  renameCustomWidgetRequest,
} from "@homarr/custom-widgets/workbench";
import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";
import { useZodForm } from "@homarr/form";
import { IconPicker } from "@homarr/forms-collection";
import { useScopedI18n } from "@homarr/translation/client";

import { CodeEditor } from "./_code-editor";
import { CustomWidgetAiCard } from "./_custom-widget-ai-card";
import { createCustomWidgetCompletions, getInvalidCustomWidgetSections } from "./_custom-widget-form-analysis";
import { EditorSection, SaveActions } from "./_custom-widget-form-layout";
import { applyDefinition, buildDefinition, isRecord, parseJson, parseJsonArray } from "./_custom-widget-form-utils";
import { CustomWidgetPreviewPanel } from "./_custom-widget-preview-panel";
import type { PreviewState } from "./_custom-widget-preview-panel";
import { CustomWidgetRequestTools } from "./_custom-widget-request-tools";
import { CustomWidgetSourcesEditor } from "./_custom-widget-sources-editor";
import { useCustomWidgetFormActions } from "./_use-custom-widget-form-actions";
import classes from "./_custom-widget-form.module.css";

interface CustomWidgetFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<CustomWidgetFormValues>;
  definitionId?: string;
}

const sectionLinks = [
  ["general", "section.general", IconSettings],
  ["sources", "section.sources", IconApi],
  ["requests", "section.requests", IconDatabase],
  ["options", "section.options", IconBraces],
  ["state", "section.state", IconSettings],
  ["jsx", "section.jsx", IconCode],
  ["preview", "section.preview", IconEye],
] as const;

export function CustomWidgetForm({ mode, initialValues, definitionId }: CustomWidgetFormProps) {
  const t = useScopedI18n("customWidget");
  const w = useScopedI18n("customWidget.workbench");
  const form = useZodForm(customWidgetFormSchema, {
    initialValues: { ...DEFAULT_CUSTOM_WIDGET_FORM_VALUES, ...initialValues },
  });
  const [mobilePane, setMobilePane] = useState<"configure" | "preview">("configure");
  const [request, setRequest] = useState("");
  const [documentationUrl, setDocumentationUrl] = useState("");
  const [preview, setPreview] = useState<PreviewState>({ data: {}, status: {}, session: null });
  const [previewSize, setPreviewSize] = useState("standard");
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("dark");
  const [optionsSnapshot, setOptionsSnapshot] = useState<Record<string, unknown>>({});
  const [stateSnapshot, setStateSnapshot] = useState<Record<string, unknown>>({});
  const [revealedRequest, setRevealedRequest] = useState({ text: "", key: 0 });
  const dirtyRef = useRef(false);
  dirtyRef.current = form.isDirty();

  const candidate = useMemo(() => buildDefinition(form.values), [form.values]);
  const requestIds = useMemo(
    () =>
      parseJsonArray(form.values.requests).flatMap((entry) =>
        isRecord(entry) && typeof entry.id === "string" ? [entry.id] : [],
      ),
    [form.values.requests],
  );
  const stateKeys = useMemo(() => {
    const state = parseJson(form.values.stateSchema);
    return Object.keys(isRecord(state) ? state : {});
  }, [form.values.stateSchema]);
  const jsxCompletions = useMemo(
    () => createCustomWidgetCompletions(form.values, requestIds),
    [form.values, requestIds],
  );
  const templateDiagnostics = useMemo(
    () => analyzeJsxTemplate(form.values.template, { requestIds, stateKeys }),
    [form.values.template, requestIds, stateKeys],
  );
  const requestDiagnostics = useMemo(() => analyzeRequestManifest(form.values.requests), [form.values.requests]);
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

  const { save, runPreview, pasteAiResponse, copyDiagnostics, pending } = useCustomWidgetFormActions({
    mode,
    definitionId,
    form,
    candidate,
    templateDiagnostics,
    requestDiagnostics,
    preview,
    setPreview,
    setMobilePane,
    setOptionsSnapshot,
    setStateSnapshot,
    request,
    documentationUrl,
  });

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  const invalid = hasDiagnostics || !candidate.success;
  const renameRequest = (currentId: string, nextId: string) => {
    if (!candidate.success) throw new Error(w("invalidWidget"));
    applyDefinition(form, renameCustomWidgetRequest(candidate.data, currentId, nextId));
    setRevealedRequest((current) => ({ text: `"id": "${nextId}"`, key: current.key + 1 }));
  };
  const revealRequest = (requestId: string) => {
    setRevealedRequest((current) => ({ text: `"id": "${requestId}"`, key: current.key + 1 }));
  };
  return (
    <form onSubmit={save} className={classes.form}>
      <SegmentedControl
        className={classes.paneSwitcher}
        fullWidth
        value={mobilePane}
        onChange={(value) => setMobilePane(value as typeof mobilePane)}
        data={[
          { value: "configure", label: w("configure") },
          { value: "preview", label: w("section.preview") },
        ]}
      />
      <nav className={classes.sectionNav} aria-label={w("sectionNavigation")}>
        {sectionLinks.map(([id, key, SectionIcon]) => (
          <Button
            key={id}
            component="a"
            href={`#${id}`}
            size="compact-sm"
            variant="subtle"
            color={invalidSections.has(id) ? "red" : undefined}
            leftSection={<SectionIcon size={14} />}
            rightSection={
              invalidSections.has(id) ? <IconAlertCircle size={13} aria-label={w("status.invalid")} /> : undefined
            }
          >
            {w(key)}
          </Button>
        ))}
      </nav>
      <div className={classes.workbench} data-mobile-pane={mobilePane}>
        <Stack gap="lg" className={classes.configuration}>
          <EditorSection id="general" title={w("generalInformation")} icon={IconSettings}>
            <TextInput label={t("field.name")} required {...form.getInputProps("name")} />
            <Textarea label={t("field.description")} autosize minRows={2} {...form.getInputProps("description")} />
            <IconPicker withAsterisk={false} {...form.getInputProps("iconUrl")} />
          </EditorSection>
          <EditorSection id="sources" title={w("sources.title")} icon={IconApi}>
            <CustomWidgetSourcesEditor form={form} definitionId={definitionId} />
          </EditorSection>
          <EditorSection id="requests" title={w("requests.title")} icon={IconDatabase}>
            <CustomWidgetRequestTools requestIds={requestIds} onGoTo={revealRequest} onRename={renameRequest} />
            <CodeEditor
              id="requests-editor"
              label={w("requests.label")}
              description={w("requests.description")}
              language="json"
              value={form.values.requests}
              onChange={(value) => form.setFieldValue("requests", value)}
              diagnostics={requestDiagnostics}
              error={form.errors.requests}
              revealText={revealedRequest.text}
              revealKey={revealedRequest.key}
              required
            />
          </EditorSection>
          <EditorSection id="options" title={w("options.title")} icon={IconBraces}>
            <CodeEditor
              id="options-schema"
              label={w("options.schema")}
              language="json"
              value={form.values.optionsSchema}
              onChange={(value) => form.setFieldValue("optionsSchema", value)}
              error={form.errors.optionsSchema}
            />
            <CodeEditor
              id="default-options"
              label={w("options.defaults")}
              language="json"
              value={form.values.defaultOptions}
              onChange={(value) => form.setFieldValue("defaultOptions", value)}
              error={form.errors.defaultOptions}
            />
          </EditorSection>
          <EditorSection id="state" title={w("state.title")} icon={IconSettings}>
            <Text size="sm" c="dimmed">
              {w("state.description")}
            </Text>
            <CodeEditor
              id="state-schema"
              label={w("state.schema")}
              language="json"
              value={form.values.stateSchema}
              onChange={(value) => form.setFieldValue("stateSchema", value)}
              error={form.errors.stateSchema}
            />
            <CodeEditor
              id="default-state"
              label={w("state.defaults")}
              language="json"
              value={form.values.defaultState}
              onChange={(value) => form.setFieldValue("defaultState", value)}
              error={form.errors.defaultState}
            />
          </EditorSection>
          <EditorSection id="jsx" title={w("jsx.title")} icon={IconCode}>
            <CodeEditor
              id="jsx-editor"
              label={w("jsx.label")}
              language="jsx"
              value={form.values.template}
              onChange={(value) => form.setFieldValue("template", value)}
              diagnostics={templateDiagnostics}
              completions={jsxCompletions}
              error={form.errors.template}
              required
              maxLength={50_000}
            />
          </EditorSection>
          <CustomWidgetAiCard
            candidate={candidate.success ? candidate.data : null}
            request={request}
            onRequestChange={setRequest}
            documentationUrl={documentationUrl}
            onDocumentationUrlChange={setDocumentationUrl}
            onPaste={() => void pasteAiResponse()}
            onCopyDiagnostics={() => void copyDiagnostics()}
          />
          <Paper p="md" className={classes.mobileSaveBar} shadow="sm">
            <SaveActions
              dirty={form.isDirty()}
              pending={pending}
              invalid={invalid}
              mode={mode}
              onPreview={() => void runPreview()}
            />
          </Paper>
        </Stack>
        <Box id="preview" component="aside" className={classes.previewPane} aria-label={w("widgetPreview")}>
          <Paper p="md" className={classes.actionBar} shadow="sm">
            <SaveActions
              dirty={form.isDirty()}
              pending={pending}
              invalid={invalid}
              mode={mode}
              onPreview={() => void runPreview()}
            />
          </Paper>
          <CustomWidgetPreviewPanel
            candidate={candidate.success ? candidate.data : null}
            preview={preview}
            size={previewSize}
            onSizeChange={setPreviewSize}
            theme={previewTheme}
            onThemeChange={setPreviewTheme}
            optionsSnapshot={optionsSnapshot}
            onOptionsChange={setOptionsSnapshot}
            stateSnapshot={stateSnapshot}
            onStateChange={setStateSnapshot}
            onLiveActionsChange={(enabled) =>
              setPreview((current) => ({
                ...current,
                session: current.session ? { ...current.session, liveActions: enabled } : null,
              }))
            }
          />
        </Box>
      </div>
    </form>
  );
}
