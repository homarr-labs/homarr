"use client";

import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, FormEventHandler, SetStateAction } from "react";
import { Alert, Box, Button, Paper, SegmentedControl, Stack, Text } from "@mantine/core";

import type { CustomWidgetAiDraft } from "@homarr/custom-widgets/authoring-prompt";
import { customWidgetFormSchema, DEFAULT_CUSTOM_WIDGET_FORM_VALUES } from "@homarr/custom-widgets/workbench";
import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";
import { useZodForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";

import { CustomWidgetAdvancedManifest } from "./_custom-widget-advanced-manifest";
import {
  CustomWidgetOptionsSnapshotSync,
  CustomWidgetSaveActions,
  CustomWidgetSectionNavigation,
  CustomWidgetUnsavedChangesGuard,
} from "./_custom-widget-form-layout";
import {
  CustomWidgetAiSection,
  CustomWidgetGeneralSection,
  CustomWidgetOptionsSection,
  CustomWidgetPreviewSection,
  CustomWidgetRequestsSection,
  CustomWidgetSourcesSection,
  CustomWidgetTemplateSection,
} from "./_custom-widget-form-sections";
import {
  createCustomWidgetFormDocumentStore,
  CustomWidgetFormDocumentProvider,
  useCustomWidgetFormDocumentBridge,
} from "./_custom-widget-form-state";
import type { CustomWidgetFormDocumentStore } from "./_custom-widget-form-state";
import { buildDefinition, getDefinitionDefaults } from "./_custom-widget-form-utils";
import type { CustomWidgetWorkbenchForm } from "./_custom-widget-form-utils";
import type { PreviewState } from "./_custom-widget-preview-panel";
import { createCustomWidgetRenameHandlers } from "./_custom-widget-rename-handlers";
import type { CustomWidgetSaveIssue } from "./_custom-widget-save-errors";
import { CustomWidgetSaveIssuesAlert } from "./_custom-widget-save-issues-alert";
import { areCustomWidgetValuesEqual } from "./_custom-widget-value-equality";
import { useCustomWidgetFormActions } from "./_use-custom-widget-form-actions";
import { analyzeCustomWidgetAiDiagnostics, CustomWidgetFormAnalysisProvider } from "./_use-custom-widget-form-analysis";
import classes from "./_custom-widget-form.module.css";

interface CustomWidgetFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<CustomWidgetFormValues>;
  definitionId?: string;
  initialAuthoringMode?: "assisted" | "advanced";
}

type MobilePane = "configure" | "preview";

interface CustomWidgetFormViewProps {
  mode: "create" | "edit";
  definitionId?: string;
  assistedOrigin: boolean;
  authoringMode: "assisted" | "advanced";
  setAuthoringMode(mode: "assisted" | "advanced"): void;
  hasGeneratedImport: boolean;
  getSampleResponse(): string | null;
  form: CustomWidgetWorkbenchForm;
  formErrors: CustomWidgetWorkbenchForm["errors"];
  formRevision: string;
  documentStore: CustomWidgetFormDocumentStore;
  mobilePane: MobilePane;
  setMobilePane: Dispatch<SetStateAction<MobilePane>>;
  preview: PreviewState;
  setPreview: Dispatch<SetStateAction<PreviewState>>;
  previewSize: string;
  setPreviewSize: Dispatch<SetStateAction<string>>;
  optionsSnapshot: Record<string, unknown>;
  setOptionsSnapshot: Dispatch<SetStateAction<Record<string, unknown>>>;
  saveIssues: CustomWidgetSaveIssue[];
  savePending: boolean;
  previewPending: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onPreview(): void;
  onPasteAiResponse(response: string): string | null;
}

function getAiDraft(values: CustomWidgetFormValues): CustomWidgetAiDraft {
  return {
    name: values.name,
    description: values.description,
    iconUrl: values.iconUrl,
    sources: values.sources,
    requests: values.requests,
    options: values.options,
    template: values.template,
  };
}

const CustomWidgetFormView = memo(function CustomWidgetFormView(props: CustomWidgetFormViewProps) {
  const w = useI18n("customWidget.workbench");
  const documentStore = props.documentStore;
  const form = props.form;
  const assisted = props.authoringMode === "assisted";
  const saveDisabled =
    props.assistedOrigin &&
    (!props.hasGeneratedImport || !props.preview.session || props.preview.outcome !== "success");
  const setMobilePane = props.setMobilePane;
  const setPreview = props.setPreview;
  const { renameRequest, renameOption } = useMemo(
    () =>
      createCustomWidgetRenameHandlers({
        form,
        invalidWidgetMessage: w("invalidWidget"),
      }),
    [form, w],
  );
  const readAiDraft = useCallback(() => {
    const draft = getAiDraft(documentStore.getValues());
    if (props.assistedOrigin && !props.hasGeneratedImport) return { ...draft, template: "" };
    if (props.mode === "create" && areCustomWidgetValuesEqual(draft, getAiDraft(DEFAULT_CUSTOM_WIDGET_FORM_VALUES)))
      return null;
    return draft;
  }, [documentStore, props.mode, props.assistedOrigin, props.hasGeneratedImport]);
  const readAiDiagnostics = useCallback(() => {
    if (props.assistedOrigin && !props.hasGeneratedImport) return [];
    return analyzeCustomWidgetAiDiagnostics(documentStore.getValues());
  }, [documentStore, props.assistedOrigin, props.hasGeneratedImport]);
  const handleSectionSelect = useCallback(
    (section: string) => {
      setMobilePane(section === "preview" ? "preview" : "configure");
    },
    [setMobilePane],
  );
  const handleLiveActionsChange = useCallback(
    (enabled: boolean) =>
      setPreview((current) => ({
        ...current,
        session: current.session ? { ...current.session, liveActions: enabled } : null,
      })),
    [setPreview],
  );
  const compactSetup = assisted && !props.hasGeneratedImport;
  const configurationSections = {
    ai: (
      <Box key="ai" data-authoring-section="ai">
        <CustomWidgetAiSection
          assisted={assisted}
          getDraft={readAiDraft}
          getDiagnostics={readAiDiagnostics}
          getSampleResponse={props.getSampleResponse}
          onPaste={props.onPasteAiResponse}
        />
      </Box>
    ),
    manifest: (
      <Box key="manifest" hidden={assisted}>
        <CustomWidgetAdvancedManifest form={form} />
      </Box>
    ),
    general: (
      <Box key="general" hidden={assisted && !props.hasGeneratedImport}>
        <CustomWidgetGeneralSection form={form} formRevision={props.formRevision} mode={props.mode} />
      </Box>
    ),
    sources: (
      <Box key="sources" data-authoring-section="sources">
        <CustomWidgetSourcesSection form={form} definitionId={props.definitionId} compact={compactSetup} />
      </Box>
    ),
    requests: (
      <Box key="requests" data-authoring-section="requests">
        <CustomWidgetRequestsSection form={form} onRename={renameRequest} compact={compactSetup} />
      </Box>
    ),
    test: (
      <Box key="test" hidden={!assisted} data-authoring-section="test">
        <Stack gap="xs">
          <Button
            type="button"
            variant="light"
            onClick={props.onPreview}
            loading={props.previewPending}
            disabled={props.savePending}
          >
            {props.hasGeneratedImport ? w("action.preview") : w("assisted.test")}
          </Button>
          <Text size="sm" c="dimmed">
            {w("assisted.testDescription")}
          </Text>
        </Stack>
      </Box>
    ),
    options: (
      <Box key="options" hidden={assisted}>
        <CustomWidgetOptionsSection form={form} onRename={renameOption} />
      </Box>
    ),
    template: (
      <Box key="template" hidden={assisted}>
        <CustomWidgetTemplateSection form={form} />
      </Box>
    ),
    save: (
      <Paper key="save" p="md" className={classes.mobileSaveBar} shadow="sm">
        <CustomWidgetSaveActions
          mode={props.mode}
          savePending={props.savePending}
          previewPending={props.previewPending}
          onPreview={props.onPreview}
          saveDisabled={saveDisabled}
          previewLabel={assisted && !props.hasGeneratedImport ? w("assisted.test") : undefined}
        />
      </Paper>
    ),
  };
  const sectionOrder: Array<keyof typeof configurationSections> = assisted
    ? ["sources", "requests", "test", "ai", "general", "manifest", "options", "template", "save"]
    : ["ai", "manifest", "general", "sources", "requests", "test", "options", "template", "save"];

  return (
    <CustomWidgetFormDocumentProvider store={documentStore}>
      <CustomWidgetFormAnalysisProvider>
        <form onSubmit={props.onSubmit} className={classes.form}>
          <CustomWidgetUnsavedChangesGuard />
          <CustomWidgetOptionsSnapshotSync setOptionsSnapshot={props.setOptionsSnapshot} />
          {props.mode === "create" && (
            <Stack gap="xs" mb="md">
              <SegmentedControl<"assisted" | "advanced">
                aria-label={w("assisted.modeLabel")}
                value={props.authoringMode}
                onChange={props.setAuthoringMode}
                data={[
                  { value: "assisted", label: w("assisted.mode") },
                  { value: "advanced", label: w("assisted.advancedMode") },
                ]}
              />
              {assisted && (
                <Text size="sm" c="dimmed">
                  {w("assisted.description")}
                </Text>
              )}
            </Stack>
          )}
          <SegmentedControl
            className={classes.paneSwitcher}
            fullWidth
            value={props.mobilePane}
            onChange={(value) => {
              if (value === "configure" || value === "preview") props.setMobilePane(value);
            }}
            data={[
              { value: "configure", label: w("configure") },
              { value: "preview", label: w("section.preview") },
            ]}
          />
          <CustomWidgetSaveIssuesAlert issues={props.saveIssues} />
          <CustomWidgetSectionNavigation onSelect={handleSectionSelect} assisted={assisted} />
          <div className={classes.workbench} data-mobile-pane={props.mobilePane}>
            <Stack gap="lg" className={classes.configuration} data-authoring-mode={props.authoringMode}>
              {sectionOrder.map((section) => configurationSections[section])}
            </Stack>
            <Box id="preview" component="aside" className={classes.previewPane} aria-label={w("widgetPreview")}>
              <Paper p="md" className={classes.actionBar} shadow="sm">
                <CustomWidgetSaveActions
                  mode={props.mode}
                  savePending={props.savePending}
                  previewPending={props.previewPending}
                  onPreview={props.onPreview}
                  saveDisabled={saveDisabled}
                  previewLabel={assisted && !props.hasGeneratedImport ? w("assisted.test") : undefined}
                />
              </Paper>
              {props.assistedOrigin && (
                <Alert color="blue">
                  {props.hasGeneratedImport ? w("assisted.finalPreview") : w("assisted.importRequired")}
                </Alert>
              )}
              <CustomWidgetPreviewSection
                preview={props.preview}
                size={props.previewSize}
                onSizeChange={props.setPreviewSize}
                optionsSnapshot={props.optionsSnapshot}
                onOptionsChange={props.setOptionsSnapshot}
                onLiveActionsChange={handleLiveActionsChange}
              />
            </Box>
          </div>
        </form>
      </CustomWidgetFormAnalysisProvider>
    </CustomWidgetFormDocumentProvider>
  );
});

export function CustomWidgetForm({
  mode,
  initialValues,
  definitionId,
  initialAuthoringMode = "advanced",
}: CustomWidgetFormProps) {
  const [authoringMode, setAuthoringMode] = useState(initialAuthoringMode);
  const [assistedOrigin, setAssistedOrigin] = useState(initialAuthoringMode === "assisted");
  const [formInitialValues] = useState<CustomWidgetFormValues>(() => ({
    ...DEFAULT_CUSTOM_WIDGET_FORM_VALUES,
    ...initialValues,
  }));
  const [documentStore] = useState(() => createCustomWidgetFormDocumentStore(formInitialValues));
  const mantineForm = useZodForm(customWidgetFormSchema, {
    initialValues: formInitialValues,
    mode: "uncontrolled",
    validateDebounce: 300,
    validateInputOnChange: false,
    onValuesChange: documentStore.setValues,
  });
  const form = useCustomWidgetFormDocumentBridge(mantineForm, documentStore);
  const [mobilePane, setMobilePane] = useState<MobilePane>("configure");
  const [preview, setPreview] = useState<PreviewState>({ data: {}, status: {}, session: null, outcome: "idle" });
  const [previewSize, setPreviewSize] = useState("standard");
  const [optionsSnapshot, updateOptionsSnapshot] = useState<Record<string, unknown>>(() => {
    const initialDefinition = buildDefinition(formInitialValues);
    return initialDefinition.success ? getDefinitionDefaults(initialDefinition.data) : {};
  });
  const optionsSnapshotRef = useRef(optionsSnapshot);
  const getOptionsSnapshot = useCallback(() => optionsSnapshotRef.current, []);
  const setOptionsSnapshot = useCallback<Dispatch<SetStateAction<Record<string, unknown>>>>((update) => {
    const current = optionsSnapshotRef.current;
    const next = typeof update === "function" ? update(current) : update;
    if (areCustomWidgetValuesEqual(current, next)) return;
    optionsSnapshotRef.current = next;
    updateOptionsSnapshot(next);
  }, []);
  const actions = useCustomWidgetFormActions({
    mode,
    assistedOrigin,
    definitionId,
    form,
    documentStore,
    setPreview,
    setMobilePane,
    getOptionsSnapshot,
    setOptionsSnapshot,
  });
  const latestActions = useRef(actions);
  useLayoutEffect(() => {
    latestActions.current = actions;
  }, [actions]);
  const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>((event) => latestActions.current.save(event), []);
  const handlePreview = useCallback(() => void latestActions.current.runPreview(), []);
  const handlePasteAiResponse = useCallback((response: string) => latestActions.current.pasteAiResponse(response), []);

  return (
    <CustomWidgetFormView
      mode={mode}
      assistedOrigin={assistedOrigin}
      authoringMode={authoringMode}
      setAuthoringMode={(next) => {
        if (next === "assisted") {
          latestActions.current.activateAssisted();
          setAssistedOrigin(true);
        }
        setAuthoringMode(next);
      }}
      hasGeneratedImport={actions.hasGeneratedImport}
      getSampleResponse={actions.getSampleResponse}
      definitionId={definitionId}
      form={form}
      formErrors={mantineForm.errors}
      formRevision={mantineForm.key("name")}
      documentStore={documentStore}
      mobilePane={mobilePane}
      setMobilePane={setMobilePane}
      preview={preview}
      setPreview={setPreview}
      previewSize={previewSize}
      setPreviewSize={setPreviewSize}
      optionsSnapshot={optionsSnapshot}
      setOptionsSnapshot={actions.setOptionsSnapshot}
      saveIssues={actions.saveIssues}
      savePending={actions.savePending}
      previewPending={actions.previewPending}
      onSubmit={handleSubmit}
      onPreview={handlePreview}
      onPasteAiResponse={handlePasteAiResponse}
    />
  );
}
