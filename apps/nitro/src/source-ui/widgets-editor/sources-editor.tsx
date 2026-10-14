import { useState } from "react";
import { Accordion, Alert, Button, Group, List, Modal, Stack, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import type { CustomWidgetSource } from "@homarr/custom-widgets/core";
import { useI18n, useWorkbenchBindings } from "./workbench-context";
import { filterSecretsForSourceAuthentication, isRecord, parseJson, parseSources } from "./form-utils";
import type { CustomWidgetWorkbenchForm } from "./form-utils";
import { getDependentRequestIds, removeDependentRequests } from "./source-dependencies";
import { CustomWidgetSourceField } from "./source-field";

export function CustomWidgetSourcesEditor({
  form,
  definitionId,
}: {
  form: CustomWidgetWorkbenchForm;
  definitionId?: string;
}) {
  const t = useI18n("customWidget.workbench.sources");
  const w = useI18n("customWidget.workbench");
  const bindings = useWorkbenchBindings();
  const [removing, setRemoving] = useState<string | null>(null);
  const [clearError, setClearError] = useState<string | null>(null);
  const sources = parseSources(form.values.sources);
  const getSourceEntries = () => {
    const parsed = parseJson(form.getValues().sources);
    return Object.entries(isRecord(parsed) ? parsed : {});
  };
  const update = (index: number, changes: Partial<CustomWidgetSource> & { id?: string }) => {
    if (changes.type)
      form.setFieldValue(
        "secrets",
        form.values.secrets.filter((secret) => secret.sourceId !== sources[index]?.id),
      );
    const previousId = sources[index]?.id;
    const nextId = changes.id ?? previousId;
    if (nextId && nextId !== previousId && getSourceEntries().some(([id]) => id === nextId)) {
      form.setFieldError("sources", t("duplicateSourceId"));
      return;
    }
    if (form.errors.sources === t("duplicateSourceId")) form.clearFieldError("sources");
    const sourceEntries = getSourceEntries();
    form.setFieldValue(
      "sources",
      JSON.stringify(
        Object.fromEntries(
          sourceEntries.map(([id, source]) => {
            if (id !== previousId || !isRecord(source)) return [id, source];
            if (changes.type) return [nextId, { name: source.name, ...changes, id: undefined }];
            return [nextId, { ...source, ...changes, id: undefined }];
          }),
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
    if (type !== "none" && type !== "bearer" && type !== "basic" && type !== "apiKeyHeader" && type !== "apiKeyQuery")
      return;
    if (type === "apiKeyHeader") update(index, { auth: { type, name: "X-API-Key" } });
    else if (type === "apiKeyQuery") update(index, { auth: { type, name: "api_key" } });
    else update(index, { auth: type });
    form.setFieldValue(
      "secrets",
      filterSecretsForSourceAuthentication(form.values.secrets, sources[index]?.id ?? "", type),
    );
  };
  const setSecret = (sourceId: string, kind: string, value: string) => {
    const current = form.values.secrets.filter((secret) => !(secret.sourceId === sourceId && secret.kind === kind));
    const existing = form.values.secrets.find((secret) => secret.sourceId === sourceId && secret.kind === kind);
    form.setFieldValue("secrets", [...current, { sourceId, kind, value, hasValue: existing?.hasValue }]);
  };
  const addSource = () => {
    const sourceEntries = getSourceEntries();
    let suffix = sourceEntries.length + 1;
    while (sourceEntries.some(([id]) => id === `source-${suffix}`)) suffix += 1;
    const id = sourceEntries.length === 0 ? "default" : `source-${suffix}`;
    form.setFieldValue(
      "sources",
      JSON.stringify(
        Object.fromEntries([
          ...sourceEntries,
          [
            id,
            {
              name: t("newName", { count: sourceEntries.length + 1 }),
              baseUrl: "https://example.com",
              networkScope: sourceEntries.length === 0 ? "public" : "private",
              auth: "none",
            },
          ],
        ]),
        null,
        2,
      ),
    );
  };
  const removeSourceAndDependents = (removedId: string) => {
    form.setFieldValue(
      "sources",
      JSON.stringify(Object.fromEntries(getSourceEntries().filter(([id]) => id !== removedId)), null, 2),
    );
    form.setFieldValue("requests", JSON.stringify(removeDependentRequests(form.values.requests, removedId), null, 2));
    form.setFieldValue(
      "secrets",
      form.values.secrets.filter((secret) => secret.sourceId !== removedId),
    );
  };
  const removeSource = (index: number) => {
    const removedId = sources[index]?.id;
    if (!removedId) return;
    if (getDependentRequestIds(form.values.requests, removedId).length === 0) removeSourceAndDependents(removedId);
    else setRemoving(removedId);
  };
  const clearSecret = bindings.clearSecret;
  return (
    <Stack gap="sm">
      {clearError && <Alert color="red">{clearError}</Alert>}
      {sources.map((source, index) => (
        <CustomWidgetSourceField
          key={source.id}
          source={source}
          index={index}
          form={form}
          definitionId={definitionId}
          clearSecretPending={bindings.clearSecretPending ?? false}
          onUpdate={update}
          onSetAuthentication={setAuth}
          onSetSecret={setSecret}
          onClearSecret={
            clearSecret
              ? async (sourceId, kind) => {
                  setClearError(null);
                  try {
                    await clearSecret(sourceId, kind);
                    const current = form
                      .getValues()
                      .secrets.filter((secret) => !(secret.sourceId === sourceId && secret.kind === kind));
                    form.setFieldValue("secrets", [...current, { sourceId, kind, value: "", hasValue: false }]);
                  } catch (cause) {
                    setClearError(cause instanceof Error ? cause.message : t("credentialRemovedDescription"));
                  }
                }
              : undefined
          }
          onRemove={removeSource}
        />
      ))}
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
      <Modal opened={removing !== null} onClose={() => setRemoving(null)} title={t("remove")}>
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            {w("requests.title")} ({removing ? getDependentRequestIds(form.values.requests, removing).length : 0})
          </Text>
          <List size="sm">
            {removing &&
              getDependentRequestIds(form.values.requests, removing).map((requestId) => (
                <List.Item key={requestId}>{requestId}</List.Item>
              ))}
          </List>
          <Group justify="flex-end">
            <Button type="button" variant="default" onClick={() => setRemoving(null)}>
              {bindings.t("common.action.cancel")}
            </Button>
            <Button
              type="button"
              color="red"
              onClick={() => {
                if (removing) removeSourceAndDependents(removing);
                setRemoving(null);
              }}
            >
              {t("remove")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
