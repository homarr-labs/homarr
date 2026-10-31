"use client";

import { Accordion, Button, List, Stack, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { CustomWidgetSource, CustomWidgetHttpSource, CustomWidgetSecretKind } from "@homarr/custom-widgets/core";
import { editCustomWidgetSource } from "@homarr/custom-widgets/workbench";
import type { CustomWidgetSourceDraftEdit } from "@homarr/custom-widgets/workbench";
import { useConfirmModal } from "@homarr/modals";
import { showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import { isSimpleCustomWidgetQuerySetup, parseSources } from "./_custom-widget-form-utils";
import type { CustomWidgetWorkbenchForm } from "./_custom-widget-form-utils";
import { getDependentRequestIds } from "./_custom-widget-source-dependencies";
import { CustomWidgetSourceField } from "./_custom-widget-source-field";

export function CustomWidgetSourcesEditor({
  form,
  definitionId,
  compact = false,
}: {
  form: CustomWidgetWorkbenchForm;
  definitionId?: string;
  compact?: boolean;
}) {
  const t = useI18n("customWidget.workbench.sources");
  const w = useI18n("customWidget.workbench");
  const { openConfirmModal } = useConfirmModal();
  const utils = clientApi.useUtils();
  const clearSecretMutation = clientApi.customWidget.secretClear.useMutation();
  const sources = parseSources(form.values.sources);
  const compactSetup = compact && isSimpleCustomWidgetQuerySetup(form.values);
  const applySourceEdit = (edit: CustomWidgetSourceDraftEdit) => {
    const result = editCustomWidgetSource(form.getValues(), edit, Boolean(definitionId));
    if (!result.success) {
      form.setFieldError("sources", t(result.error));
      return;
    }
    if (edit.type === "update" && form.errors.sources === t("duplicateSourceId")) {
      form.clearFieldError("sources");
    }
    const { patch } = result;
    if (patch.sources !== undefined) form.setFieldValue("sources", patch.sources);
    if (patch.requests !== undefined) form.setFieldValue("requests", patch.requests);
    if (patch.secrets !== undefined) form.setFieldValue("secrets", patch.secrets);
  };
  const update = (index: number, changes: Partial<CustomWidgetSource> & { id?: string }) => {
    applySourceEdit({ type: "update", index, changes });
  };
  const setAuth = (index: number, type: string) => {
    let auth: CustomWidgetHttpSource["auth"];
    if (type === "apiKeyHeader") auth = { type, name: "X-API-Key" };
    else if (type === "apiKeyQuery") auth = { type, name: "api_key" };
    else if (type === "headers") auth = { type, headers: [{ name: "X-API-Key", slot: "key" }] };
    else auth = type as "none" | "basic" | "bearer";
    update(index, { auth });
  };
  const setSecret = (sourceId: string, kind: string, value: string) => {
    const current = form.values.secrets.filter((secret) => !(secret.sourceId === sourceId && secret.kind === kind));
    const existing = form.values.secrets.find((secret) => secret.sourceId === sourceId && secret.kind === kind);
    form.setFieldValue("secrets", [...current, { sourceId, kind, value, hasValue: existing?.hasValue }]);
  };
  const addSource = () => {
    let suffix = sources.length + 1;
    while (sources.some(({ id }) => id === `source-${suffix}`)) suffix += 1;
    const id = sources.length === 0 ? "default" : `source-${suffix}`;
    form.setFieldValue(
      "sources",
      JSON.stringify(
        Object.fromEntries([
          ...sources.map(({ id: sourceId, ...source }) => [sourceId, source] as const),
          [
            id,
            {
              name: t("newName", { count: sources.length + 1 }),
              baseUrl: "https://example.com",
              auth: "none",
            },
          ],
        ]),
        null,
        2,
      ),
    );
  };
  const removeSourceAndDependents = (index: number) => {
    applySourceEdit({ type: "remove", index });
  };
  const removeSource = (index: number) => {
    const values = form.getValues();
    const removedId = parseSources(values.sources)[index]?.id;
    if (!removedId) return;
    const dependentRequestIds = getDependentRequestIds(values.requests, removedId);
    if (dependentRequestIds.length === 0) {
      removeSourceAndDependents(index);
      return;
    }
    openConfirmModal({
      title: t("remove"),
      children: (
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            {w("requests.title")} ({dependentRequestIds.length})
          </Text>
          <List size="sm">
            {dependentRequestIds.map((requestId) => (
              <List.Item key={requestId}>{requestId}</List.Item>
            ))}
          </List>
        </Stack>
      ),
      confirmProps: { children: t("remove") },
      onConfirm: () => removeSourceAndDependents(index),
    });
  };
  const clearSecret = async (sourceId: string, kind: CustomWidgetSecretKind) => {
    if (!definitionId) return;
    await clearSecretMutation.mutateAsync({ definitionId, sourceId, kind });
    const current = form.values.secrets.filter((secret) => !(secret.sourceId === sourceId && secret.kind === kind));
    form.setFieldValue("secrets", [...current, { sourceId, kind, value: "", hasValue: false }]);
    await utils.customWidget.get.invalidate({ id: definitionId });
    showSuccessNotification({ title: t("credentialRemoved"), message: t("credentialRemovedDescription") });
  };

  return (
    <Stack gap="sm">
      {sources.map((source, index) => {
        return (
          <CustomWidgetSourceField
            key={source.id}
            compact={compactSetup}
            source={source}
            index={index}
            form={form}
            definitionId={definitionId}
            clearSecretPending={clearSecretMutation.isPending}
            onUpdate={update}
            onSetAuthentication={setAuth}
            onSetSecret={setSecret}
            onClearSecret={clearSecret}
            onRemove={removeSource}
          />
        );
      })}
      <Accordion variant="contained">
        <Accordion.Item value="advanced">
          <Accordion.Control>{t("advanced")}</Accordion.Control>
          <Accordion.Panel>
            <Button type="button" variant="light" leftSection={<IconPlus size={16} />} onClick={addSource}>
              {t("add")}
            </Button>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
      {form.errors.sources && (
        <Text c="red" size="xs">
          {form.errors.sources}
        </Text>
      )}
    </Stack>
  );
}
