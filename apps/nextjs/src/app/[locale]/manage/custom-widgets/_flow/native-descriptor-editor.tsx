"use client";

import { useState } from "react";
import { Alert, Button, Checkbox, Fieldset, Group, Select, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { useI18n } from "@homarr/translation/client";
import { CustomWidgetIntegrationOption } from "@homarr/widgets/custom-api/integration-option";
import { useCustomWidgetFormDocumentStore } from "../_custom-widget-form-state";
import { buildDefinition, isRecord, parseJson } from "../_custom-widget-form-utils";
import type { CustomWidgetWorkbenchForm } from "../_custom-widget-form-utils";
import { nativeInputFields, nativeParameterFields, renameNativeCapability } from "./native-editor-model";
import type { NativeInputSchema } from "./native-editor-model";
import { NativeInputField } from "./native-input-field";
import { NativeLiteralInput } from "./native-literal-input";
import { NativeRequestTest } from "./native-request-test";
import type { NativePreviewProps } from "./native-request-test";

export function NativeDescriptorEditor({
  form,
  id,
  entry,
  options,
  schema,
  disabled,
  onSelect,
  ...preview
}: NativePreviewProps & {
  form: CustomWidgetWorkbenchForm;
  id: string;
  entry: Record<string, unknown>;
  options: Record<string, unknown>;
  schema?: NativeInputSchema;
  disabled: boolean;
  onSelect?: (id: string) => void;
}) {
  const t = useI18n("customWidget.flow");
  const store = useCustomWidgetFormDocumentStore();
  const [nextName, setName] = useState(id);
  const [error, setError] = useState<string>();
  const input = isRecord(entry.input) ? entry.input : {};
  const fields = nativeInputFields(schema ?? {});
  const hasParams = nativeParameterFields(input, schema ?? {}).length > 0;
  const action = entry.kind === "action";
  const confirmation = isRecord(entry.confirmation) ? entry.confirmation : {};
  const optionId = String(entry.integrationOption ?? "");
  const option = options[optionId];
  const patch = (changes: Record<string, unknown>) => {
    if (disabled) return;
    const extensions = parseJson(form.values.extensions);
    if (!isRecord(extensions) || !isRecord(extensions.native)) return;
    const current = extensions.native[id];
    if (!isRecord(current)) return;
    form.setFieldValue(
      "extensions",
      JSON.stringify(
        {
          ...extensions,
          native: { ...extensions.native, [id]: { ...current, ...changes } },
        },
        null,
        2,
      ),
    );
  };
  const updateInput = (name: string, value: unknown) => {
    const next = { ...input, [name]: value };
    if (value === undefined) delete next[name];
    const changes: Record<string, unknown> = { input: next };
    if (nativeParameterFields(next, schema ?? {}).length) changes.trigger = "manual";
    patch(changes);
  };
  const rename = () => {
    if (disabled || id === nextName) return;
    try {
      const current = buildDefinition(form.values);
      if (!current.success) throw new Error(t("nativeRenameInvalidDraft"));
      const next = renameNativeCapability(current.data, id, nextName);
      store.transaction(() => {
        form.setFieldValue("extensions", JSON.stringify(next.extensions, null, 2));
        form.setFieldValue("template", next.template);
        const layout = store.getLayout();
        const position = layout.nodes[`native:${id}`];
        if (position) {
          const nodes = { ...layout.nodes, [`native:${nextName}`]: position };
          delete nodes[`native:${id}`];
          store.setLayout({ ...layout, nodes });
        }
      });
      setError(undefined);
      onSelect?.(`native:${nextName}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  const extras = Object.fromEntries(
    Object.entries(input).filter(([name]) => !fields.some((field) => field.name === name)),
  );
  return (
    <Stack gap="sm">
      <Text fw={600} size="sm">
        {String(entry.capability)} · {action ? t("kind.action") : t("kind.query")}
      </Text>
      <Group align="end" wrap="nowrap">
        <TextInput
          data-workbench-local-input
          label={t("nativeId")}
          value={nextName}
          onChange={(event) => setName(event.currentTarget.value)}
          disabled={disabled}
          style={{ flex: 1 }}
          error={error}
        />
        <Button variant="light" onClick={rename} disabled={disabled || nextName === id || !nextName}>
          {t("nativeRename")}
        </Button>
      </Group>
      {isRecord(option) && (
        <CustomWidgetIntegrationOption
          disabled={disabled}
          label={String(option.label ?? optionId)}
          value={option.default}
          kinds={Array.isArray(option.integrationKinds) ? (option.integrationKinds as string[]) : undefined}
          onChange={(value) => {
            if (disabled) return;
            const current = parseJson(form.values.options);
            if (!isRecord(current) || !isRecord(current[optionId])) return;
            form.setFieldValue(
              "options",
              JSON.stringify({ ...current, [optionId]: { ...current[optionId], default: value } }, null, 2),
            );
          }}
        />
      )}
      <Select
        label={t("nativeTrigger")}
        value={String(entry.trigger ?? "load")}
        disabled={disabled || action}
        description={hasParams ? t("nativeManualRequired") : undefined}
        data={[
          { value: "load", label: t("nativeTriggerLoad"), disabled: hasParams },
          { value: "manual", label: t("nativeTriggerManual") },
        ]}
        onChange={(trigger) => {
          if (trigger) patch({ trigger });
        }}
      />
      <Select
        label={t("nativePermission")}
        value={String(entry.permission ?? "view")}
        disabled={disabled}
        data={[
          { value: "view", label: t("nativePermissionView"), disabled: action },
          { value: "modify", label: t("nativePermissionModify") },
          { value: "full", label: t("nativePermissionFull") },
        ]}
        onChange={(permission) => {
          if (permission) patch({ permission });
        }}
      />
      {action && (
        <Fieldset legend={t("nativeConfirmation")} disabled={disabled}>
          <Stack gap="xs">
            <TextInput
              label={t("nativeConfirmationTitleLabel")}
              value={String(confirmation.title ?? "")}
              required
              maxLength={128}
              onChange={(event) => patch({ confirmation: { ...confirmation, title: event.currentTarget.value } })}
            />
            <Textarea
              label={t("nativeConfirmationMessageLabel")}
              value={String(confirmation.message ?? "")}
              required
              maxLength={512}
              onChange={(event) => patch({ confirmation: { ...confirmation, message: event.currentTarget.value } })}
            />
            <TextInput
              label={t("nativeConfirmationButton")}
              value={String(confirmation.confirmLabel ?? "")}
              maxLength={64}
              onChange={(event) =>
                patch({ confirmation: { ...confirmation, confirmLabel: event.currentTarget.value } })
              }
            />
            <Checkbox
              label={t("nativeConfirmationDestructive")}
              checked={confirmation.destructive === true}
              onChange={(event) =>
                patch({ confirmation: { ...confirmation, destructive: event.currentTarget.checked } })
              }
            />
          </Stack>
        </Fieldset>
      )}
      {!schema && <Alert color="yellow">{t("nativeSchemaUnavailable")}</Alert>}
      {fields.map((field) => (
        <NativeInputField
          key={field.name}
          {...field}
          value={input[field.name]}
          options={options}
          disabled={disabled}
          onChange={(value) => updateInput(field.name, value)}
        />
      ))}
      {(!schema || Object.keys(extras).length > 0) && (
        <NativeLiteralInput
          label={t("nativeAdvancedInputs")}
          schema={{ type: "object" }}
          value={schema ? extras : input}
          disabled={disabled}
          onChange={(value) => {
            if (!isRecord(value)) return;
            const declared = Object.fromEntries(
              Object.entries(input).filter(([name]) => fields.some((field) => field.name === name)),
            );
            const next = { ...declared, ...value };
            patch({ input: next, ...(nativeParameterFields(next, schema ?? {}).length ? { trigger: "manual" } : {}) });
          }}
        />
      )}
      <Text size="xs" c="dimmed">
        {t("nativeBindingHelp", { id })}
      </Text>
      <NativeRequestTest
        key={`${id}:${entry.capability}`}
        id={id}
        input={input}
        schema={schema ?? {}}
        action={action}
        {...preview}
      />
    </Stack>
  );
}
