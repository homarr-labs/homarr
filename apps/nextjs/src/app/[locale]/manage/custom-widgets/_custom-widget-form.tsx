"use client";

import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, FormEventHandler, SetStateAction } from "react";
import { Box, Paper, SegmentedControl, Stack } from "@mantine/core";

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
import { useCustomWidgetFormActions } from "./_use-custom-widget-form-actions";
import { analyzeCustomWidgetAiDiagnostics, CustomWidgetFormAnalysisProvider } from "./_use-custom-widget-form-analysis";
import classes from "./_custom-widget-form.module.css";

interface CustomWidgetFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<CustomWidgetFormValues>;
  definitionId?: string;
}

type MobilePane = "configure" | "preview";

interface CustomWidgetFormViewProps {
  mode: "create" | "edit";
  definitionId?: string;
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
  onPasteAiResponse(): void;
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
  const readAiDraft = useCallback(() => getAiDraft(documentStore.getValues()), [documentStore]);
  const readAiDiagnostics = useCallback(
    () => analyzeCustomWidgetAiDiagnostics(documentStore.getValues()),
    [documentStore],
  );
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

  return (
    <CustomWidgetFormDocumentProvider store={documentStore}>
      <CustomWidgetFormAnalysisProvider>
        <form onSubmit={props.onSubmit} className={classes.form}>
          <CustomWidgetUnsavedChangesGuard />
          <CustomWidgetOptionsSnapshotSync setOptionsSnapshot={props.setOptionsSnapshot} />
          <SegmentedControl
            className={classes.paneSwitcher}
            fullWidth
            value={props.mobilePane}
            onChange={(value) => props.setMobilePane(value as MobilePane)}
            data={[
              { value: "configure", label: w("configure") },
              { value: "preview", label: w("section.preview") },
            ]}
          />
          <CustomWidgetSaveIssuesAlert issues={props.saveIssues} />
          <CustomWidgetSectionNavigation onSelect={handleSectionSelect} />
          <div className={classes.workbench} data-mobile-pane={props.mobilePane}>
            <Stack gap="lg" className={classes.configuration}>
              <CustomWidgetAiSection
                getDraft={readAiDraft}
                getDiagnostics={readAiDiagnostics}
                onPaste={props.onPasteAiResponse}
              />
              <CustomWidgetAdvancedManifest form={form} />
              <CustomWidgetGeneralSection form={form} formRevision={props.formRevision} mode={props.mode} />
              <CustomWidgetSourcesSection form={form} definitionId={props.definitionId} />
              <CustomWidgetRequestsSection form={form} onRename={renameRequest} />
              <CustomWidgetOptionsSection form={form} onRename={renameOption} />
              <CustomWidgetTemplateSection form={form} />
              <Paper p="md" className={classes.mobileSaveBar} shadow="sm">
                <CustomWidgetSaveActions
                  mode={props.mode}
                  savePending={props.savePending}
                  previewPending={props.previewPending}
                  onPreview={props.onPreview}
                />
              </Paper>
            </Stack>
            <Box id="preview" component="aside" className={classes.previewPane} aria-label={w("widgetPreview")}>
              <Paper p="md" className={classes.actionBar} shadow="sm">
                <CustomWidgetSaveActions
                  mode={props.mode}
                  savePending={props.savePending}
                  previewPending={props.previewPending}
                  onPreview={props.onPreview}
                />
              </Paper>
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

export function CustomWidgetForm({ mode, initialValues, definitionId }: CustomWidgetFormProps) {
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
  const [optionsSnapshot, setOptionsSnapshot] = useState<Record<string, unknown>>(() => {
    const initialDefinition = buildDefinition(formInitialValues);
    return initialDefinition.success ? getDefinitionDefaults(initialDefinition.data) : {};
  });
  const actions = useCustomWidgetFormActions({
    mode,
    definitionId,
    form,
    documentStore,
    setPreview,
    setMobilePane,
    optionsSnapshot,
    setOptionsSnapshot,
  });
  const latestActions = useRef(actions);
  useLayoutEffect(() => {
    latestActions.current = actions;
  }, [actions]);
  const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>((event) => latestActions.current.save(event), []);
  const handlePreview = useCallback(() => void latestActions.current.runPreview(), []);
  const handlePasteAiResponse = useCallback(() => void latestActions.current.pasteAiResponse(), []);

  return (
    <CustomWidgetFormView
      mode={mode}
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
      setOptionsSnapshot={setOptionsSnapshot}
      saveIssues={actions.saveIssues}
      savePending={actions.savePending}
      previewPending={actions.previewPending}
      onSubmit={handleSubmit}
      onPreview={handlePreview}
      onPasteAiResponse={handlePasteAiResponse}
    />
  );
}
