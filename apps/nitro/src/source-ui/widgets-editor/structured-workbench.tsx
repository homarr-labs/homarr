import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Fieldset, Stack, Textarea, TextInput } from "@mantine/core";
import { IconApi, IconBraces, IconCode, IconDatabase, IconSettings } from "@tabler/icons-react";
import {
  CUSTOM_WIDGET_OPTIONS_EXAMPLES,
  CUSTOM_WIDGET_REQUEST_EXAMPLES,
  customWidgetDefinitionSchema,
  getCustomWidgetOptionsJsonSchema,
  getCustomWidgetRequestsJsonSchema,
} from "@homarr/custom-widgets/core";
import { analyzeJsxTemplate, analyzeRequestManifest } from "@homarr/custom-widgets/workbench";
import {
  CustomWidgetSectionNavigation,
  EditorSection,
  LazyOnceAccordion,
} from "@homarr/ui/source-views/custom-workbench";
import type { CustomFormValues, WidgetEditorBindings } from "../../features/widgets-editor/contracts";
import { CodeEditor } from "./code-editor";
import { applyDefinition, buildDefinition, isRecord, parseJson } from "./form-utils";
import type { CustomWidgetWorkbenchForm } from "./form-utils";
import { createCustomWidgetCompletions, getInvalidCustomWidgetSections } from "./form-analysis";
import { createCustomWidgetRenameHandlers } from "./rename-handlers";
import { CustomWidgetSourcesEditor } from "./sources-editor";
import { CustomWidgetRequestsEditor } from "./requests-editor";
import { CustomWidgetOptionsEditor } from "./options-editor";
import { CustomWidgetWorkbenchProvider, useI18n, useWorkbenchBindings } from "./workbench-context";
import type { CustomWidgetWorkbenchBindings } from "./workbench-context";

const requestReference = {
  schema: getCustomWidgetRequestsJsonSchema(),
  minimal: CUSTOM_WIDGET_REQUEST_EXAMPLES.minimal,
  full: CUSTOM_WIDGET_REQUEST_EXAMPLES.full,
};
const optionsReference = {
  schema: getCustomWidgetOptionsJsonSchema(),
  minimal: CUSTOM_WIDGET_OPTIONS_EXAMPLES.minimal,
  full: CUSTOM_WIDGET_OPTIONS_EXAMPLES.full,
};

export interface StructuredCustomWidgetWorkbenchProps extends CustomWidgetWorkbenchBindings {
  values: CustomFormValues;
  errors: Record<string, string>;
  definitionId?: string;
  disabled: boolean;
  IconPicker?: WidgetEditorBindings["IconPicker"];
  onChange(values: CustomFormValues): void;
  onErrorsChange(errors: Record<string, string>): void;
  onSectionSelect(section: "configure" | "preview"): void;
}

export function StructuredCustomWidgetWorkbench(props: StructuredCustomWidgetWorkbenchProps) {
  return (
    <CustomWidgetWorkbenchProvider {...props}>
      <StructuredWorkbenchContent {...props} />
    </CustomWidgetWorkbenchProvider>
  );
}

function StructuredWorkbenchContent(props: StructuredCustomWidgetWorkbenchProps) {
  const w = useI18n("customWidget.workbench");
  const valuesRef = useRef(props.values);
  const errorsRef = useRef(props.errors);
  valuesRef.current = props.values;
  errorsRef.current = props.errors;
  const form: CustomWidgetWorkbenchForm = {
    get values() {
      return valuesRef.current;
    },
    get errors() {
      return errorsRef.current;
    },
    getValues: () => valuesRef.current,
    setValues: (values) => {
      if (props.disabled) return;
      valuesRef.current = values;
      props.onChange(values);
    },
    setFieldValue: (field, value) => {
      if (props.disabled) return;
      const next = { ...valuesRef.current, [field]: value };
      valuesRef.current = next;
      props.onChange(next);
    },
    setFieldError: (field, message) => {
      const next = { ...errorsRef.current, [field]: message };
      errorsRef.current = next;
      props.onErrorsChange(next);
    },
    clearFieldError: (field) => {
      const next = { ...errorsRef.current };
      delete next[field];
      errorsRef.current = next;
      props.onErrorsChange(next);
    },
  };
  const values = useDeferredValue(props.values);
  const candidate = useMemo(() => buildDefinition(values), [values]);
  const requestDiagnostics = useMemo(() => analyzeRequestManifest(values.requests), [values.requests]);
  const parsedRequests = parseJson(values.requests);
  const requestIds = isRecord(parsedRequests) ? Object.keys(parsedRequests) : [];
  const templateDiagnostics = analyzeJsxTemplate(values.template, { requestIds });
  const invalidSections = getInvalidCustomWidgetSections(
    candidate.success ? [] : candidate.error.issues,
    requestDiagnostics,
    templateDiagnostics,
  );
  const completions = createCustomWidgetCompletions(values, requestIds);
  const { renameRequest, renameOption } = createCustomWidgetRenameHandlers({
    form,
    invalidWidgetMessage: w("invalidWidget"),
  });
  const IconPicker = props.IconPicker;
  return (
    <Stack gap="lg">
      <CustomWidgetSectionNavigation
        invalidSections={invalidSections}
        onSelect={(section) => props.onSectionSelect(section === "preview" ? "preview" : "configure")}
        copy={{
          sectionNavigation: w("sectionNavigation"),
          invalid: w("status.invalid"),
          sections: {
            general: w("section.general"),
            sources: w("section.sources"),
            requests: w("section.requests"),
            options: w("section.options"),
            jsx: w("section.jsx"),
            preview: w("section.preview"),
          },
        }}
      />
      <Fieldset variant="unstyled" disabled={props.disabled}>
        <Stack gap="lg">
          <LazyOnceAccordion label={w("builder.advancedManifest")}>
            <CustomWidgetManifestEditor form={form} />
          </LazyOnceAccordion>
          <EditorSection id="general" title={w("generalInformation")} icon={IconSettings}>
            <TextInput
              label={props.t("common.field.name")}
              required
              value={props.values.name}
              error={props.errors.name}
              onChange={(event) => form.setFieldValue("name", event.currentTarget.value)}
            />
            <Textarea
              label={props.t("customWidget.field.description")}
              autosize
              minRows={2}
              value={props.values.description}
              error={props.errors.description}
              onChange={(event) => form.setFieldValue("description", event.currentTarget.value)}
            />
            {IconPicker ? (
              <IconPicker
                value={props.values.iconUrl}
                onChange={(value) => form.setFieldValue("iconUrl", value)}
                suggestedSearch={props.definitionId ? undefined : props.values.name}
                disabled={props.disabled}
              />
            ) : (
              <Alert color="yellow">
                {props.t("nitro.widgetEditor.specializedOptionUnavailable", { type: "icon" })}
              </Alert>
            )}
          </EditorSection>
          <EditorSection id="sources" title={w("sources.title")} icon={IconApi}>
            <CustomWidgetSourcesEditor form={form} definitionId={props.definitionId} />
          </EditorSection>
          <EditorSection id="requests" title={w("requests.title")} icon={IconDatabase}>
            <CustomWidgetRequestsEditor form={form} onRename={renameRequest} />
            <LazyOnceAccordion label={w("builder.advancedJson")}>
              <CodeEditor
                id="requests-editor"
                label={w("requests.label")}
                description={w("requests.description")}
                language="json"
                value={props.values.requests}
                onChange={(value) => form.setFieldValue("requests", value)}
                diagnostics={requestDiagnostics}
                error={props.errors.requests}
                reference={requestReference}
                readOnly={props.disabled}
                required
              />
            </LazyOnceAccordion>
          </EditorSection>
          <EditorSection id="options" title={w("options.title")} icon={IconBraces}>
            <CustomWidgetOptionsEditor form={form} onRename={renameOption} />
            <LazyOnceAccordion label={w("builder.advancedJson")}>
              <CodeEditor
                id="options-editor"
                label={w("options.title")}
                language="json"
                value={props.values.options}
                onChange={(value) => form.setFieldValue("options", value)}
                error={props.errors.options}
                reference={optionsReference}
                readOnly={props.disabled}
              />
            </LazyOnceAccordion>
          </EditorSection>
          <EditorSection id="jsx" title={w("jsx.title")} icon={IconCode}>
            <CodeEditor
              id="jsx-editor"
              label={w("jsx.label")}
              language="jsx"
              value={props.values.template}
              onChange={(value) => form.setFieldValue("template", value)}
              diagnostics={templateDiagnostics}
              completions={completions}
              error={props.errors.template}
              readOnly={props.disabled}
              required
              maxLength={50_000}
            />
          </EditorSection>
        </Stack>
      </Fieldset>
    </Stack>
  );
}

function CustomWidgetManifestEditor({ form }: { form: CustomWidgetWorkbenchForm }) {
  const t = useI18n("customWidget.workbench.builder");
  const values = useDeferredValue(form.values);
  const serialized = JSON.stringify(
    {
      $schema: "homarr-custom-widget-v2",
      name: values.name,
      ...(values.description ? { description: values.description } : {}),
      ...(values.iconUrl ? { iconUrl: values.iconUrl } : {}),
      sources: parseJson(values.sources),
      requests: parseJson(values.requests),
      options: parseJson(values.options),
      template: values.template,
    },
    null,
    2,
  );
  const [draft, setDraft] = useState(serialized);
  const [error, setError] = useState<string>();
  useEffect(() => setDraft(serialized), [serialized]);
  const bindings = useWorkbenchBindings();
  return (
    <CodeEditor
      id="raw-widget-manifest"
      label={t("manifestFilename")}
      language="json"
      value={draft}
      error={error}
      readOnly={bindings.disabled}
      onChange={(next) => {
        setDraft(next);
        try {
          const value: unknown = JSON.parse(next);
          const parsed = customWidgetDefinitionSchema.safeParse(value);
          if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? t("invalidWidget"));
            return;
          }
          setError(undefined);
          applyDefinition(form, parsed.data);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : t("invalidJson"));
        }
      }}
    />
  );
}
