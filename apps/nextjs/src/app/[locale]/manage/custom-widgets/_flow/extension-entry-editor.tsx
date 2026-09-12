"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Alert, Button, Code, CopyButton, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { customWidgetContentSchema, customWidgetPreferenceSchema } from "@homarr/custom-widgets/core";
import { useI18n } from "@homarr/translation/client";
import { CodeEditor } from "../_code-editor";
import { useCustomWidgetFormDocumentField, useCustomWidgetFormDocumentStore } from "../_custom-widget-form-state";
import type { CustomWidgetWorkbenchForm } from "../_custom-widget-form-utils";
import { isRecord } from "../_custom-widget-form-utils";
import { defaultForType, ExtensionDefaultEditor } from "./extension-default-editor";
import {
  extensionCollection,
  extensionEntryDependants,
  readExtensionCollection,
  validExtensionEntryName,
} from "./extension-entry-policy";
import type { ExtensionEntryKind } from "./extension-entry-policy";

const valueTypes = ["string", "number", "boolean", "string[]", "number[]"] as const;
const typeLabels = {
  string: "text",
  number: "number",
  boolean: "toggle",
  "string[]": "textList",
  "number[]": "numberList",
} as const;
type EntryValues = Record<string, unknown>;

export function ExtensionEntryEditor({
  form,
  kind,
  selected,
  onSelect,
}: {
  form: CustomWidgetWorkbenchForm;
  kind: ExtensionEntryKind;
  selected?: string;
  onSelect?(id: string): void;
}) {
  const t = useI18n("customWidget.flow.extensionEditor");
  const actions = useI18n("common.action");
  const flow = useI18n("customWidget.flow");
  const store = useCustomWidgetFormDocumentStore();
  const raw = useCustomWidgetFormDocumentField("extensions");
  const template = useCustomWidgetFormDocumentField("template");
  const [active, setActive] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const collection = readExtensionCollection(raw, kind);
  const entries = collection?.entries ?? {};
  const ids = Object.keys(entries);
  const id = ids.includes(active) ? active : (ids[0] ?? "");
  const entry = entries[id];
  const deferredTemplate = useDeferredValue(template);
  const fragments = useDeferredValue(JSON.stringify(collection?.extensions.fragments));
  const dependants = useMemo(() => {
    if (!id) return { invalid: false, nodes: [] as string[] };
    return extensionEntryDependants(deferredTemplate, fragments ? JSON.parse(fragments) : undefined, kind, id);
  }, [deferredTemplate, fragments, kind, id]);
  useEffect(() => {
    if (selected?.startsWith(`${kind}:`)) setActive(selected.slice(kind.length + 1));
    setError("");
  }, [selected, kind]);
  const select = (next: string) => {
    setActive(next);
    onSelect?.(`${kind}:${next}`);
  };
  const write = (change: (current: EntryValues) => EntryValues) => {
    const current = readExtensionCollection(store.getValues().extensions, kind);
    if (!current) return;
    form.setFieldValue(
      "extensions",
      JSON.stringify(
        {
          ...current.extensions,
          [extensionCollection[kind]]: change(current.entries),
        },
        null,
        2,
      ),
    );
  };
  const update = (value: unknown) => write((current) => ({ ...current, [id]: value }));
  const create = () => {
    const current = readExtensionCollection(store.getValues().extensions, kind);
    if (!current || !validExtensionEntryName(name, current.entries)) return;
    const maximum = kind === "preference" ? 64 : 32;
    if (Object.keys(current.entries).length >= maximum) return;
    let value: unknown = { type: "string", defaultValue: "" };
    if (kind === "fragment") value = `<Text>{props.label ?? ${JSON.stringify(t("newViewText"))}}</Text>`;
    if (kind === "content") value = { type: "string", defaultValue: "", permission: "modify" };
    store.transaction(() => write((values) => ({ ...values, [name]: value })));
    select(name);
    setName("");
  };
  const remove = () => {
    const current = readExtensionCollection(store.getValues().extensions, kind);
    if (!current) return;
    const dependencies = extensionEntryDependants(store.getValues().template, current.extensions.fragments, kind, id);
    if (dependencies.invalid || dependencies.nodes.length) {
      setError(t("deleteBlocked"));
      return;
    }
    store.transaction(() => {
      write((values) => Object.fromEntries(Object.entries(values).filter(([key]) => key !== id)));
      const layout = store.getLayout();
      const nodes = Object.fromEntries(Object.entries(layout.nodes).filter(([key]) => key !== `${kind}:${id}`));
      store.setLayout({ ...layout, nodes });
    });
    setActive("");
    onSelect?.("widget");
  };
  const maximum = kind === "preference" ? 64 : 32;
  const createDisabled = !collection || ids.length >= maximum || !validExtensionEntryName(name, entries);
  let snippet = `{${kind === "preference" ? "preferences" : "content"}[${JSON.stringify(id)}]}`;
  if (kind === "fragment") snippet = `<View name=${JSON.stringify(id)} />`;
  return (
    <Stack gap="md">
      <Text size="xs" c="dimmed">
        {t(`${kind}Help`)}
      </Text>
      {!collection && <Alert color="red">{t("invalidCollection")}</Alert>}
      {ids.length > 0 && (
        <Select
          label={t(`select${kind}`)}
          searchable
          value={id}
          data={ids}
          onChange={(next) => {
            if (next) select(next);
          }}
        />
      )}
      {id && collection && (
        <Stack gap="sm">
          {kind === "fragment" && typeof entry === "string" && (
            <CodeEditor id={`fragment-${id}`} language="jsx" label={t("viewCode")} value={entry} onChange={update} />
          )}
          {kind !== "fragment" && isRecord(entry) && <ValueDeclaration kind={kind} entry={entry} onChange={update} />}
          {((kind === "fragment" && typeof entry !== "string") || (kind !== "fragment" && !isRecord(entry))) && (
            <Alert color="red">{t("invalidEntry")}</Alert>
          )}
          <Group justify="space-between">
            <Text size="xs" fw={600}>
              {t("useInJsx")}
            </Text>
            <CopyButton value={snippet}>
              {({ copied, copy }) => (
                <Button size="compact-xs" variant="subtle" onClick={copy}>
                  {copied ? t("copied") : actions("copy")}
                </Button>
              )}
            </CopyButton>
          </Group>
          <Code block style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {snippet}
          </Code>
          {(dependants.invalid || dependants.nodes.length > 0) && (
            <Alert color="yellow" title={t("deleteBlocked")}>
              <Text size="xs">{dependants.invalid ? t("resolveJsxFirst") : t("referencedBy")}</Text>
              {dependants.nodes.map((node) => (
                <Button key={node} variant="subtle" size="compact-xs" onClick={() => onSelect?.(node)}>
                  {node === "widget" ? t("widgetJsx") : node.slice(9)}
                </Button>
              ))}
            </Alert>
          )}
          <Button
            color="red"
            variant="subtle"
            disabled={dependants.invalid || dependants.nodes.length > 0}
            onClick={remove}
          >
            {t(`delete${kind}`)}
          </Button>
        </Stack>
      )}
      {error && <Alert color="red">{error}</Alert>}
      <Stack gap="xs">
        <TextInput
          label={t(`new${kind}`)}
          data-workbench-local-input
          value={name}
          maxLength={64}
          disabled={!collection || ids.length >= maximum}
          placeholder={kind}
          onChange={(event) => setName(event.currentTarget.value)}
          error={name && !validExtensionEntryName(name, entries) ? t("invalidName") : undefined}
        />
        <Button onClick={create} disabled={createDisabled}>
          {t(`create${kind}`)}
        </Button>
        {ids.length >= maximum && (
          <Text size="xs" c="dimmed">
            {t("entryLimit", { maximum })}
          </Text>
        )}
        {!collection && (
          <Text size="xs" c="dimmed">
            {flow("extensionsJson")}
          </Text>
        )}
      </Stack>
    </Stack>
  );
}

function ValueDeclaration({
  kind,
  entry,
  onChange,
}: {
  kind: "preference" | "content";
  entry: Record<string, unknown>;
  onChange(entry: Record<string, unknown>): void;
}) {
  const t = useI18n("customWidget.flow.extensionEditor");
  const parsed = (kind === "content" ? customWidgetContentSchema : customWidgetPreferenceSchema).safeParse(entry);
  const type = String(entry.type ?? "");
  return (
    <Stack gap="sm">
      <Select
        label={t("valueType")}
        description={t("typeChangeHelp")}
        value={type}
        data={valueTypes.map((value) => ({ value, label: t(typeLabels[value]) }))}
        onChange={(next) => {
          if (next) onChange({ ...entry, type: next, defaultValue: defaultForType(next) });
        }}
      />
      <ExtensionDefaultEditor
        type={type}
        value={entry.defaultValue}
        onChange={(defaultValue) => onChange({ ...entry, defaultValue })}
      />
      {kind === "content" && (
        <Select
          label={t("writePermission")}
          value={String(entry.permission ?? "")}
          data={[
            { value: "modify", label: t("permissionModify") },
            { value: "full", label: t("permissionFull") },
          ]}
          onChange={(permission) => {
            if (permission) onChange({ ...entry, permission });
          }}
        />
      )}
      {!parsed.success && (
        <Alert color="yellow">
          <Text size="xs">{parsed.error.issues.map((issue) => issue.message).join(" · ")}</Text>
        </Alert>
      )}
    </Stack>
  );
}
