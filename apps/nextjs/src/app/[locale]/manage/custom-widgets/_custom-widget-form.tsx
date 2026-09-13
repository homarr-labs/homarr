"use client";

import { customWidgetEditorLayoutSchema, EMPTY_EDITOR_LAYOUT } from "@homarr/custom-widgets/core";
import { memo, useId, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, FormEventHandler, SetStateAction } from "react";

import type { CustomWidgetAiDraft } from "@homarr/custom-widgets/authoring-prompt";
import { customWidgetFormSchema, DEFAULT_CUSTOM_WIDGET_FORM_VALUES } from "@homarr/custom-widgets/workbench";
import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";
import { useZodForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";

import { CustomWidgetAdvancedManifest } from "./_custom-widget-advanced-manifest";
import {
  CustomWidgetOptionsSnapshotSync,
  CustomWidgetSaveActions,
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
import { FlowWorkbench } from "./_flow/workbench";
import classes from "./_custom-widget-form.module.css";

interface CustomWidgetFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<CustomWidgetFormValues>;
  definitionId?: string;
  editorLayout?: string | null;
  savedRevision?: string;
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
  onPreview(): Promise<unknown>;
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
    extensions: values.extensions,
    template: values.template,
  };
}

const CustomWidgetFormView = memo(function CustomWidgetFormView(props: CustomWidgetFormViewProps) {
  const w = useI18n("customWidget.workbench");
  const saveFormId = useId();
  const documentStore = props.documentStore;
  const form = props.form;
  const setPreview = props.setPreview;
  const { renameRequest, renameOption } = useMemo(
    () =>
      createCustomWidgetRenameHandlers({
        form,
        transaction: documentStore.transaction,
        renameRequestBinding: documentStore.renameRequestBinding,
        invalidWidgetMessage: w("invalidWidget"),
      }),
    [documentStore, form, w],
  );
  const readAiDraft = useCallback(() => getAiDraft(documentStore.getValues()), [documentStore]);
  const readAiDiagnostics = useCallback(
    () => analyzeCustomWidgetAiDiagnostics(documentStore.getValues()),
    [documentStore],
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
        <div className={classes.form}>
          <form id={saveFormId} onSubmit={props.onSubmit} />
          <CustomWidgetUnsavedChangesGuard />
          <CustomWidgetOptionsSnapshotSync setOptionsSnapshot={props.setOptionsSnapshot} />
          <FlowWorkbench
            feedback={<CustomWidgetSaveIssuesAlert issues={props.saveIssues} />}
            form={form}
            onPreview={props.onPreview}
            execution={props.preview}
            definitionId={props.definitionId}
            actions={
              <CustomWidgetSaveActions
                formId={saveFormId}
                mode={props.mode}
                savePending={props.savePending}
                previewPending={props.previewPending}
                onPreview={props.onPreview}
              />
            }
            general={<CustomWidgetGeneralSection form={form} formRevision={props.formRevision} mode={props.mode} />}
            sources={<CustomWidgetSourcesSection form={form} definitionId={props.definitionId} />}
            requests={<CustomWidgetRequestsSection form={form} onRename={renameRequest} />}
            options={<CustomWidgetOptionsSection form={form} onRename={renameOption} />}
            template={<CustomWidgetTemplateSection form={form} />}
            assistant={
              <CustomWidgetAiSection
                getDraft={readAiDraft}
                getDiagnostics={readAiDiagnostics}
                onPaste={props.onPasteAiResponse}
              />
            }
            advanced={<CustomWidgetAdvancedManifest form={form} />}
            preview={
              <CustomWidgetPreviewSection
                preview={props.preview}
                size={props.previewSize}
                onSizeChange={props.setPreviewSize}
                optionsSnapshot={props.optionsSnapshot}
                onOptionsChange={props.setOptionsSnapshot}
                onLiveActionsChange={handleLiveActionsChange}
              />
            }
          />
        </div>
      </CustomWidgetFormAnalysisProvider>
    </CustomWidgetFormDocumentProvider>
  );
});

export function CustomWidgetForm({
  mode,
  initialValues,
  definitionId,
  editorLayout,
  savedRevision,
}: CustomWidgetFormProps) {
  const flowT = useI18n("customWidget.flow");
  const [formInitialValues] = useState<CustomWidgetFormValues>(() => ({
    ...DEFAULT_CUSTOM_WIDGET_FORM_VALUES,
    sources: "{}",
    requests: "{}",
    template: `<Stack align="center" justify="center" h="100%"><Text size="xl" fw={600}>{${JSON.stringify(flowT("welcomeTemplate"))}}</Text></Stack>`,
    ...initialValues,
  }));
  const [documentStore] = useState(() =>
    createCustomWidgetFormDocumentStore(formInitialValues, parseEditorLayout(editorLayout)),
  );
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
    savedRevision,
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
  const handlePreview = useCallback(() => latestActions.current.runPreview(), []);
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

function parseEditorLayout(value?: string | null) {
  try {
    return customWidgetEditorLayoutSchema.parse(JSON.parse(value ?? "null"));
  } catch {
    return EMPTY_EDITOR_LAYOUT;
  }
}
