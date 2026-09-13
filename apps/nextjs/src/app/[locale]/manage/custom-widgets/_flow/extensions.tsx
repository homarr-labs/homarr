"use client";

import { useState, useEffect } from "react";
import { Alert, Stack, Tabs, Text } from "@mantine/core";
import { useI18n } from "@homarr/translation/client";
import { NativeCapabilityPicker } from "./native-editor";
import { ExtensionEntryEditor } from "./extension-entry-editor";
import { CodeEditor } from "../_code-editor";
import { isRecord, parseJson } from "../_custom-widget-form-utils";
import type { CustomWidgetWorkbenchForm } from "../_custom-widget-form-utils";
import type { PreviewState } from "../_custom-widget-preview-panel";
import { useCustomWidgetFormDocumentField, useCustomWidgetFormDocumentStore } from "../_custom-widget-form-state";

/** Extension editing writes the same draft as code and Assistant transactions. */
export function WorkbenchExtensions({
  form,
  selected,
  preview,
  onSelect,
}: {
  form: CustomWidgetWorkbenchForm;
  selected?: string;
  preview?: PreviewState;
  onSelect?(id: string): void;
}) {
  const t = useI18n("customWidget.flow");
  const store = useCustomWidgetFormDocumentStore();
  const [tab, setTab] = useState<string | null>("native");
  useEffect(() => {
    const kind = selected?.split(":")[0];
    if (kind && ["fragment", "preference", "content", "native"].includes(kind)) setTab(kind);
  }, [selected]);
  const raw = useCustomWidgetFormDocumentField("extensions");
  const parsed = parseJson(raw || "{}");
  const valid = isRecord(parsed);
  const extensions = valid ? parsed : {};
  const writeStylesheet = (stylesheet: string) => {
    const current = parseJson(store.getValues().extensions || "{}");
    if (isRecord(current)) form.setFieldValue("extensions", JSON.stringify({ ...current, stylesheet }, null, 2));
  };
  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        {t("extensionDescription")}
      </Text>
      {!valid && <Alert color="red">{t("invalidExtensions")}</Alert>}
      <Tabs value={tab} onChange={setTab} keepMounted keepMountedMode="display-none">
        <Tabs.List>
          <Tabs.Tab value="native">{t("native")}</Tabs.Tab>
          <Tabs.Tab value="styles">{t("stylesheet")}</Tabs.Tab>
          <Tabs.Tab value="fragment">{t("extensionEditor.views")}</Tabs.Tab>
          <Tabs.Tab value="preference">{t("extensionEditor.preferences")}</Tabs.Tab>
          <Tabs.Tab value="content">{t("extensionEditor.sharedContent")}</Tabs.Tab>
          <Tabs.Tab value="advanced">{t("extensionsJson")}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="native" pt="sm">
          <NativeCapabilityPicker
            form={form}
            selected={selected}
            disabled={!valid}
            previewSessionId={preview?.session?.id}
            previewStale={preview?.stale}
            previewLiveActions={preview?.session?.liveActions}
            onSelect={onSelect}
          />
        </Tabs.Panel>
        <Tabs.Panel value="styles" pt="sm">
          <CodeEditor
            id="scoped-stylesheet"
            language="css"
            label={t("stylesheet")}
            value={typeof extensions.stylesheet === "string" ? extensions.stylesheet : ""}
            readOnly={!valid}
            onChange={writeStylesheet}
          />
        </Tabs.Panel>
        {(["fragment", "preference", "content"] as const).map((kind) => (
          <Tabs.Panel key={kind} value={kind} pt="sm">
            <ExtensionEntryEditor form={form} kind={kind} selected={selected} onSelect={onSelect} />
          </Tabs.Panel>
        ))}
        <Tabs.Panel value="advanced" pt="sm">
          <Text size="xs" c="dimmed" mb="xs">
            {t("extensionsJsonDescription")}
          </Text>
          <CodeEditor
            id="extensions-editor"
            language="json"
            label={t("extensionsJson")}
            value={raw}
            onChange={(value) => form.setFieldValue("extensions", value)}
          />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
