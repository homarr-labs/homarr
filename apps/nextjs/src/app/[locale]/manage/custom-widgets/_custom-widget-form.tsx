"use client";

import { useEffect, useMemo, useState } from "react";
import { Accordion, Box, Button, Paper, SegmentedControl, Stack, TextInput, Textarea } from "@mantine/core";
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
} from "@homarr/custom-widgets/workbench";
import { customWidgetOptionsSchema, getCustomWidgetDefaultOptions } from "@homarr/custom-widgets/core";
import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";
import { useZodForm } from "@homarr/form";
import { IconPicker } from "@homarr/forms-collection";
import { useI18n } from "@homarr/translation/client";

import { CodeEditor } from "./_code-editor";
import { CustomWidgetAiCard } from "./_custom-widget-ai-card";
import { CustomWidgetAdvancedManifest } from "./_custom-widget-advanced-manifest";
import { createCustomWidgetCompletions, getInvalidCustomWidgetSections } from "./_custom-widget-form-analysis";
import { EditorSection, SaveActions } from "./_custom-widget-form-layout";
import { customWidgetOptionsSchemaReference, customWidgetRequestReference } from "./_custom-widget-form-references";
import { buildDefinition, getDefinitionDefaults, isRecord, parseJson } from "./_custom-widget-form-utils";
import { CustomWidgetOptionsEditor } from "./_custom-widget-options-editor";
import { CustomWidgetPreviewPanel } from "./_custom-widget-preview-panel";
import type { PreviewState } from "./_custom-widget-preview-panel";
import { CustomWidgetRequestsEditor } from "./_custom-widget-requests-editor";
import { createCustomWidgetRenameHandlers } from "./_custom-widget-rename-handlers";
import { CustomWidgetSaveIssuesAlert } from "./_custom-widget-save-issues-alert";
import { CustomWidgetSourcesEditor } from "./_custom-widget-sources-editor";
import { useCustomWidgetFormActions } from "./_use-custom-widget-form-actions";
import { useUnsavedChangesGuard } from "./_use-unsaved-changes-guard";
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
  ["jsx", "section.jsx", IconCode],
  ["preview", "section.preview", IconEye],
] as const;

export function CustomWidgetForm({ mode, initialValues, definitionId }: CustomWidgetFormProps) {
  const t = useI18n("customWidget");
  const tCommon = useI18n("common");
  const w = useI18n("customWidget.workbench");
  const formInitialValues: CustomWidgetFormValues = { ...DEFAULT_CUSTOM_WIDGET_FORM_VALUES, ...initialValues };
  const form = useZodForm(customWidgetFormSchema, { initialValues: formInitialValues });
  const [mobilePane, setMobilePane] = useState<"configure" | "preview">("configure");
  const [request, setRequest] = useState("");
  const [documentationUrl, setDocumentationUrl] = useState("");
  const [preview, setPreview] = useState<PreviewState>({ data: {}, status: {}, session: null, outcome: "idle" });
  const [previewSize, setPreviewSize] = useState("standard");
  const [optionsSnapshot, setOptionsSnapshot] = useState<Record<string, unknown>>(() => {
    const initialDefinition = buildDefinition(formInitialValues);
    return initialDefinition.success ? getDefinitionDefaults(initialDefinition.data) : {};
  });
  useUnsavedChangesGuard(form.isDirty());

  const candidate = useMemo(() => buildDefinition(form.values), [form.values]);
  const parsedOptions = useMemo(
    () => customWidgetOptionsSchema.safeParse(parseJson(form.values.options)),
    [form.values.options],
  );
  const requestIds = useMemo(
    () =>
      Object.keys(
        isRecord(parseJson(form.values.requests)) ? (parseJson(form.values.requests) as Record<string, unknown>) : {},
      ),
    [form.values.requests],
  );
  const jsxCompletions = useMemo(
    () => createCustomWidgetCompletions(form.values, requestIds),
    [form.values, requestIds],
  );
  const templateDiagnostics = useMemo(
    () => analyzeJsxTemplate(form.values.template, { requestIds }),
    [form.values.template, requestIds],
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

  const { save, runPreview, pasteAiResponse, saveIssues, savePending, previewPending } = useCustomWidgetFormActions({
    mode,
    definitionId,
    form,
    candidate,
    preview,
    setPreview,
    setMobilePane,
    optionsSnapshot,
    setOptionsSnapshot,
  });
  useEffect(() => {
    if (parsedOptions.success) setOptionsSnapshot(getCustomWidgetDefaultOptions(parsedOptions.data));
  }, [parsedOptions]);

  const invalid = hasDiagnostics || !candidate.success;
  const { renameRequest, renameOption } = createCustomWidgetRenameHandlers({
    form,
    candidate,
    invalidWidgetMessage: w("invalidWidget"),
  });
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
      <CustomWidgetSaveIssuesAlert issues={saveIssues} />
      <nav className={classes.sectionNav} aria-label={w("sectionNavigation")}>
        {sectionLinks.map(([id, key, SectionIcon]) => (
          <Button
            key={id}
            component="a"
            href={`#${id}`}
            onClick={() => setMobilePane(id === "preview" ? "preview" : "configure")}
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
          <CustomWidgetAiCard
            candidate={candidate.success ? candidate.data : null}
            request={request}
            onRequestChange={setRequest}
            documentationUrl={documentationUrl}
            onDocumentationUrlChange={setDocumentationUrl}
            onPaste={() => void pasteAiResponse()}
          />
          <CustomWidgetAdvancedManifest form={form} />
          <EditorSection id="general" title={w("generalInformation")} icon={IconSettings}>
            <TextInput label={tCommon("field.name")} required {...form.getInputProps("name")} />
            <Textarea label={t("field.description")} autosize minRows={2} {...form.getInputProps("description")} />
            <IconPicker
              withAsterisk={false}
              suggestedSearch={mode === "create" ? form.values.name : undefined}
              {...form.getInputProps("iconUrl")}
            />
          </EditorSection>
          <EditorSection id="sources" title={w("sources.title")} icon={IconApi}>
            <CustomWidgetSourcesEditor form={form} definitionId={definitionId} />
          </EditorSection>
          <EditorSection id="requests" title={w("requests.title")} icon={IconDatabase}>
            <CustomWidgetRequestsEditor form={form} onRename={renameRequest} />
            <Accordion variant="contained">
              <Accordion.Item value="raw">
                <Accordion.Control>{w("builder.advancedJson")}</Accordion.Control>
                <Accordion.Panel>
                  <CodeEditor
                    id="requests-editor"
                    label={w("requests.label")}
                    description={w("requests.description")}
                    language="json"
                    value={form.values.requests}
                    onChange={(value) => form.setFieldValue("requests", value)}
                    diagnostics={requestDiagnostics}
                    error={form.errors.requests}
                    reference={customWidgetRequestReference}
                    required
                  />
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </EditorSection>
          <EditorSection id="options" title={w("options.title")} icon={IconBraces}>
            <CustomWidgetOptionsEditor form={form} onRename={renameOption} />
            <Accordion variant="contained">
              <Accordion.Item value="raw">
                <Accordion.Control>{w("builder.advancedJson")}</Accordion.Control>
                <Accordion.Panel>
                  <CodeEditor
                    id="options"
                    label={w("options.title")}
                    language="json"
                    value={form.values.options}
                    onChange={(value) => form.setFieldValue("options", value)}
                    error={form.errors.options}
                    reference={customWidgetOptionsSchemaReference}
                  />
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
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
          <Paper p="md" className={classes.mobileSaveBar} shadow="sm">
            <SaveActions
              dirty={form.isDirty()}
              savePending={savePending}
              previewPending={previewPending}
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
              savePending={savePending}
              previewPending={previewPending}
              invalid={invalid}
              mode={mode}
              onPreview={() => void runPreview()}
            />
          </Paper>
          <CustomWidgetPreviewPanel
            candidate={candidate.success ? candidate.data : null}
            validationIssues={
              candidate.success
                ? []
                : candidate.error.issues.map((issue) => ({
                    path: issue.path.map(String).join(".") || undefined,
                    message: issue.message,
                  }))
            }
            preview={preview}
            size={previewSize}
            onSizeChange={setPreviewSize}
            optionsSnapshot={optionsSnapshot}
            onOptionsChange={setOptionsSnapshot}
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
