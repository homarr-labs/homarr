"use client";

import { Accordion, Button, List, Stack, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { CustomWidgetSource } from "@homarr/custom-widgets/core";
import { useConfirmModal } from "@homarr/modals";
import { showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import { filterSecretsForSourceAuthentication, isRecord, parseJson, parseSources } from "./_custom-widget-form-utils";
import type { CustomWidgetWorkbenchForm } from "./_custom-widget-form-utils";
import { getDependentRequestIds, removeDependentRequests } from "./_custom-widget-source-dependencies";
import { CustomWidgetSourceField } from "./_custom-widget-source-field";

export function CustomWidgetSourcesEditor({
  form,
  definitionId,
}: {
  form: CustomWidgetWorkbenchForm;
  definitionId?: string;
}) {
  const t = useI18n("customWidget.workbench.sources");
  const w = useI18n("customWidget.workbench");
  const { openConfirmModal } = useConfirmModal();
  const utils = clientApi.useUtils();
  const clearSecretMutation = clientApi.customWidget.secretClear.useMutation();
  const sources = parseSources(form.values.sources);
  const update = (index: number, changes: Partial<CustomWidgetSource> & { id?: string }) => {
    const previousId = sources[index]?.id;
    const nextId = changes.id ?? previousId;
    if (nextId && sources.some((source, sourceIndex) => sourceIndex !== index && source.id === nextId)) {
      form.setFieldError("sources", t("duplicateSourceId"));
      return;
    }
    if (form.errors.sources === t("duplicateSourceId")) form.clearFieldError("sources");
    const sourceEntries = sources.map(({ id, ...source }) => [id, source] as const);
    form.setFieldValue(
      "sources",
      JSON.stringify(
        Object.fromEntries(
          sourceEntries.map(([id, source], i) => [
            i === index ? nextId : id,
            i === index ? { ...source, ...changes, id: undefined } : source,
          ]),
        ),
        null,
        2,
      ),
    );
    if (previousId && nextId && previousId !== nextId) {
      const parsedRequests = parseJson(form.values.requests);
      const requests = isRecord(parsedRequests)
        ? Object.fromEntries(
            Object.entries(parsedRequests).map(([id, request]) => [
              id,
              isRecord(request) && request.source === previousId ? { ...request, source: nextId } : request,
            ]),
          )
        : {};
      form.setFieldValue("requests", JSON.stringify(requests, null, 2));
      form.setFieldValue(
        "secrets",
        form.values.secrets.map((secret) =>
          secret.sourceId === previousId ? { ...secret, sourceId: nextId } : secret,
        ),
      );
    }
  };
  const setAuth = (index: number, type: string) => {
    const auth =
      type === "apiKeyHeader" ? { type, name: "X-API-Key" } : type === "apiKeyQuery" ? { type, name: "api_key" } : type;
    update(index, { auth: auth as CustomWidgetSource["auth"] });
    form.setFieldValue(
      "secrets",
      filterSecretsForSourceAuthentication(
        form.values.secrets,
        sources[index]?.id ?? "",
        type as Parameters<typeof filterSecretsForSourceAuthentication>[2],
      ),
    );
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
              networkScope: sources.length === 0 ? "public" : "private",
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
    const removedId = sources[index]?.id;
    form.setFieldValue(
      "sources",
      JSON.stringify(
        Object.fromEntries(sources.filter((_, i) => i !== index).map(({ id, ...source }) => [id, source])),
        null,
        2,
      ),
    );
    if (!removedId) return;
    form.setFieldValue("requests", JSON.stringify(removeDependentRequests(form.values.requests, removedId), null, 2));
    form.setFieldValue(
      "secrets",
      form.values.secrets.filter((secret) => secret.sourceId !== removedId),
    );
  };
  const removeSource = (index: number) => {
    const removedId = sources[index]?.id;
    if (!removedId) return;
    const dependentRequestIds = getDependentRequestIds(form.values.requests, removedId);
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
  const clearSecret = async (sourceId: string, kind: "apiKey" | "username" | "password") => {
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
