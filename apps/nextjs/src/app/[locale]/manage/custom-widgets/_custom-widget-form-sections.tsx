"use client";

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { TextInput, Textarea } from "@mantine/core";
import { IconApi, IconBraces, IconCode, IconDatabase, IconSettings } from "@tabler/icons-react";

import type { CustomWidgetAiDiagnostic, CustomWidgetAiDraft } from "@homarr/custom-widgets/authoring-prompt";
import { IconPicker } from "@homarr/forms-collection";
import { useI18n } from "@homarr/translation/client";

import { CodeEditor } from "./_code-editor";
import { CustomWidgetAiCard } from "./_custom-widget-ai-card";
import { EditorSection } from "./_custom-widget-form-layout";
import { customWidgetOptionsSchemaReference, customWidgetRequestReference } from "./_custom-widget-form-references";
import { useCustomWidgetFormDocumentField } from "./_custom-widget-form-state";
import type { CustomWidgetWorkbenchForm } from "./_custom-widget-form-utils";
import { CustomWidgetOptionsEditor } from "./_custom-widget-options-editor";
import { CustomWidgetPreviewPanel } from "./_custom-widget-preview-panel";
import type { PreviewState } from "./_custom-widget-preview-panel";
import { CustomWidgetRequestsEditor } from "./_custom-widget-requests-editor";
import { CustomWidgetSourcesEditor } from "./_custom-widget-sources-editor";
import { LazyOnceAccordion } from "./_lazy-once-accordion";
import { useCustomWidgetFormAnalysisField } from "./_use-custom-widget-form-analysis";

export function CustomWidgetAiSection({
  getDraft,
  getDiagnostics,
  onPaste,
}: {
  getDraft(): CustomWidgetAiDraft;
  getDiagnostics(): readonly CustomWidgetAiDiagnostic[];
  onPaste(): void;
}) {
  const [request, setRequest] = useState("");
  const [documentationUrl, setDocumentationUrl] = useState("");
  return (
    <CustomWidgetAiCard
      getDraft={getDraft}
      getDiagnostics={getDiagnostics}
      request={request}
      onRequestChange={setRequest}
      documentationUrl={documentationUrl}
      onDocumentationUrlChange={setDocumentationUrl}
      onPaste={onPaste}
    />
  );
}

export function CustomWidgetGeneralSection({
  form,
  formRevision,
  mode,
}: {
  form: CustomWidgetWorkbenchForm;
  formRevision: string;
  mode: "create" | "edit";
}) {
  const t = useI18n("customWidget");
  const tCommon = useI18n("common");
  const w = useI18n("customWidget.workbench");
  const [suggestedIconSearch, setSuggestedIconSearch] = useState(() => form.getValues().name);
  const iconUrl = useCustomWidgetFormDocumentField("iconUrl");
  const nameInputProps = form.getInputProps("name");
  useEffect(() => setSuggestedIconSearch(form.getValues().name), [form, formRevision]);
  return (
    <EditorSection id="general" title={w("generalInformation")} icon={IconSettings}>
      <TextInput
        key={form.key("name")}
        label={tCommon("field.name")}
        required
        {...nameInputProps}
        onBlur={(event) => {
          nameInputProps.onBlur?.(event);
          setSuggestedIconSearch(form.getValues().name);
        }}
      />
      <Textarea
        key={form.key("description")}
        label={t("field.description")}
        autosize
        minRows={2}
        {...form.getInputProps("description")}
      />
      <IconPicker
        key={form.key("iconUrl")}
        withAsterisk={false}
        suggestedSearch={mode === "create" ? suggestedIconSearch : undefined}
        {...form.getInputProps("iconUrl")}
        value={iconUrl}
      />
    </EditorSection>
  );
}

export function CustomWidgetSourcesSection({
  form,
  definitionId,
}: {
  form: CustomWidgetWorkbenchForm;
  definitionId?: string;
}) {
  const w = useI18n("customWidget.workbench");
  useCustomWidgetFormDocumentField("sources");
  useCustomWidgetFormDocumentField("requests");
  useCustomWidgetFormDocumentField("secrets");
  return (
    <EditorSection id="sources" title={w("sources.title")} icon={IconApi}>
      <CustomWidgetSourcesEditor form={form} definitionId={definitionId} />
    </EditorSection>
  );
}

export function CustomWidgetRequestsSection({
  form,
  onRename,
}: {
  form: CustomWidgetWorkbenchForm;
  onRename(currentId: string, nextId: string): void;
}) {
  const w = useI18n("customWidget.workbench");
  const requests = useCustomWidgetFormDocumentField("requests");
  useCustomWidgetFormDocumentField("sources");
  useCustomWidgetFormDocumentField("options");
  const requestDiagnostics = useCustomWidgetFormAnalysisField("requestDiagnostics");
  return (
    <EditorSection id="requests" title={w("requests.title")} icon={IconDatabase}>
      <CustomWidgetRequestsEditor form={form} onRename={onRename} />
      <LazyOnceAccordion label={w("builder.advancedJson")}>
        <CodeEditor
          id="requests-editor"
          label={w("requests.label")}
          description={w("requests.description")}
          language="json"
          value={requests}
          onChange={(value) => form.setFieldValue("requests", value, { forceUpdate: false })}
          diagnostics={requestDiagnostics}
          error={form.errors.requests}
          reference={customWidgetRequestReference}
          required
        />
      </LazyOnceAccordion>
    </EditorSection>
  );
}

export function CustomWidgetOptionsSection({
  form,
  onRename,
}: {
  form: CustomWidgetWorkbenchForm;
  onRename(currentName: string, nextName: string): void;
}) {
  const w = useI18n("customWidget.workbench");
  const options = useCustomWidgetFormDocumentField("options");
  useCustomWidgetFormDocumentField("requests");
  return (
    <EditorSection id="options" title={w("options.title")} icon={IconBraces}>
      <CustomWidgetOptionsEditor form={form} onRename={onRename} />
      <LazyOnceAccordion label={w("builder.advancedJson")}>
        <CodeEditor
          id="options-editor"
          label={w("options.title")}
          language="json"
          value={options}
          onChange={(value) => form.setFieldValue("options", value, { forceUpdate: false })}
          error={form.errors.options}
          reference={customWidgetOptionsSchemaReference}
        />
      </LazyOnceAccordion>
    </EditorSection>
  );
}

export function CustomWidgetTemplateSection({ form }: { form: CustomWidgetWorkbenchForm }) {
  const w = useI18n("customWidget.workbench");
  const template = useCustomWidgetFormDocumentField("template");
  const jsxCompletions = useCustomWidgetFormAnalysisField("jsxCompletions");
  const templateDiagnostics = useCustomWidgetFormAnalysisField("templateDiagnostics");
  return (
    <EditorSection id="jsx" title={w("jsx.title")} icon={IconCode}>
      <CodeEditor
        id="jsx-editor"
        label={w("jsx.label")}
        language="jsx"
        value={template}
        onChange={(value) => form.setFieldValue("template", value, { forceUpdate: false })}
        diagnostics={templateDiagnostics}
        completions={jsxCompletions}
        error={form.errors.template}
        required
        maxLength={50_000}
      />
    </EditorSection>
  );
}

interface CustomWidgetPreviewSectionProps {
  preview: PreviewState;
  size: string;
  onSizeChange(size: string): void;
  optionsSnapshot: Record<string, unknown>;
  onOptionsChange: Dispatch<SetStateAction<Record<string, unknown>>>;
  onLiveActionsChange(enabled: boolean): void;
}

export function CustomWidgetPreviewSection(props: CustomWidgetPreviewSectionProps) {
  const previewCandidate = useCustomWidgetFormAnalysisField("previewCandidate");
  const previewValidationIssues = useCustomWidgetFormAnalysisField("previewValidationIssues");
  return (
    <CustomWidgetPreviewPanel
      candidate={previewCandidate}
      validationIssues={previewValidationIssues}
      preview={props.preview}
      size={props.size}
      onSizeChange={props.onSizeChange}
      optionsSnapshot={props.optionsSnapshot}
      onOptionsChange={props.onOptionsChange}
      onLiveActionsChange={props.onLiveActionsChange}
    />
  );
}
