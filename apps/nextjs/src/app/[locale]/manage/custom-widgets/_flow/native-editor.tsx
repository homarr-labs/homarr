"use client";
import { useState } from "react";
import { Button, Select, Stack } from "@mantine/core";
import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { isRecord, parseJson } from "../_custom-widget-form-utils";
import type { CustomWidgetWorkbenchForm } from "../_custom-widget-form-utils";
import { useCustomWidgetFormDocumentField, useCustomWidgetFormDocumentStore } from "../_custom-widget-form-state";
import { NativeDescriptorEditor } from "./native-descriptor-editor";
import type { NativePreviewProps } from "./native-request-test";

export function NativeCapabilityPicker({
  form,
  selected,
  disabled,
  onSelect,
  ...preview
}: NativePreviewProps & {
  form: CustomWidgetWorkbenchForm;
  selected?: string;
  disabled: boolean;
  onSelect?: (id: string) => void;
}) {
  const t = useI18n("customWidget.flow");
  const store = useCustomWidgetFormDocumentStore();
  const raw = useCustomWidgetFormDocumentField("extensions");
  const rawOptions = useCustomWidgetFormDocumentField("options");
  const [capability, setCapability] = useState<string | null>("beszel.systems");
  const [editingId, setEditingId] = useState<string>();
  const catalog = clientApi.customWidget.nativeCapabilities.useQuery();
  const parsed = parseJson(raw || "{}");
  const parsedOptions = parseJson(rawOptions);
  const extensions = isRecord(parsed) ? parsed : {};
  const native = isRecord(extensions.native) ? extensions.native : {};
  const options = isRecord(parsedOptions) ? parsedOptions : {};
  const add = () => {
    const contract = catalog.data?.find((entry) => entry.id === capability);
    if (!contract || !isRecord(parsedOptions)) return;
    const base = contract.id.replaceAll(".", "-");
    let id = base;
    let counter = 2;
    const requests = parseJson(form.values.requests);
    if (!isRecord(requests)) return;
    while (Object.hasOwn(native, id) || Object.hasOwn(requests, id) || Object.hasOwn(options, `${id}Integration`))
      id = `${base}-${counter++}`;
    const integrationOption = `${id}Integration`;
    const values: Record<string, unknown> = {};
    const inputSchema = contract.inputSchema;
    for (const key of inputSchema.required ?? []) values[key] = { $param: key };
    let trigger = "load";
    if (contract.kind === "action" || Object.keys(values).length) trigger = "manual";
    const descriptor = {
      capability: contract.id,
      kind: contract.kind,
      trigger,
      input: values,
      permission: contract.kind === "action" ? "modify" : "view",
      ...(contract.integration ? { integrationOption } : {}),
      ...(contract.kind === "action"
        ? {
            confirmation: {
              title: t("nativeConfirmationTitle"),
              message: t("nativeConfirmationMessage", { capability: contract.id }),
            },
          }
        : {}),
    };
    store.transaction(() => {
      form.setFieldValue(
        "extensions",
        JSON.stringify({ ...extensions, native: { ...native, [id]: descriptor } }, null, 2),
      );
      if (contract.integration)
        form.setFieldValue(
          "options",
          JSON.stringify(
            {
              ...options,
              [integrationOption]: {
                label: t("nativeIntegrationLabel", { capability: contract.id }),
                control: "integration",
                default: "",
                integrationKinds: contract.integrationKinds,
              },
            },
            null,
            2,
          ),
        );
    });
    setEditingId(id);
    onSelect?.(`native:${id}`);
  };
  let selectedId = editingId;
  if (selected?.startsWith("native:")) selectedId = selected.slice(7);
  if (!selectedId || !Object.hasOwn(native, selectedId)) selectedId = Object.keys(native)[0];
  const entries = Object.entries(native).filter(([id]) => id === selectedId);
  return (
    <Stack gap="sm">
      <Select
        searchable
        label={t("chooseCapability")}
        value={capability}
        onChange={setCapability}
        data={(catalog.data ?? []).map((entry) => ({ value: entry.id, label: entry.id }))}
        error={catalog.error?.message}
      />
      <Button onClick={add} disabled={disabled || !capability || !isRecord(parsedOptions)}>
        {t("addCapability")}
      </Button>
      {!selected?.startsWith("native:") && Object.keys(native).length > 0 && (
        <Select
          label={t("nativeId")}
          searchable
          data={Object.keys(native)}
          value={selectedId ?? null}
          disabled={disabled}
          onChange={(id) => {
            if (id) {
              setEditingId(id);
              onSelect?.(`native:${id}`);
            }
          }}
        />
      )}
      {entries.map(([id, entry]) => {
        if (!isRecord(entry)) return null;
        const contract = catalog.data?.find((candidate) => candidate.id === entry.capability);
        return (
          <NativeDescriptorEditor
            key={id}
            form={form}
            id={id}
            entry={entry}
            options={options}
            schema={contract?.inputSchema}
            disabled={disabled}
            onSelect={(nextId) => {
              setEditingId(nextId.slice(7));
              onSelect?.(nextId);
            }}
            {...preview}
          />
        );
      })}
    </Stack>
  );
}
