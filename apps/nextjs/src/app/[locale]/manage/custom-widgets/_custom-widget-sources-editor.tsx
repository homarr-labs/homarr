"use client";

import { Accordion, Button, Fieldset, Group, PasswordInput, Select, Stack, Text, TextInput } from "@mantine/core";
import { IconKey, IconPlus, IconTrash } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { CustomWidgetSource } from "@homarr/custom-widgets/core";
import { showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import { isRecord, parseJsonArray, parseSources } from "./_custom-widget-form-utils";
import type { CustomWidgetWorkbenchForm } from "./_custom-widget-form-utils";

const secretFields: Record<string, Array<{ kind: "apiKey" | "username" | "password" }>> = {
  bearer: [{ kind: "apiKey" }],
  basic: [{ kind: "username" }, { kind: "password" }],
  apiKeyHeader: [{ kind: "apiKey" }],
  apiKeyQuery: [{ kind: "apiKey" }],
};

export function CustomWidgetSourcesEditor({
  form,
  definitionId,
}: {
  form: CustomWidgetWorkbenchForm;
  definitionId?: string;
}) {
  const t = useScopedI18n("customWidget.workbench.sources");
  const utils = clientApi.useUtils();
  const clearSecretMutation = clientApi.customWidget.secretClear.useMutation();
  const sources = parseSources(form.values.sources);
  const update = (index: number, changes: Partial<CustomWidgetSource>) => {
    const previousId = sources[index]?.id;
    const nextId = changes.id;
    form.setFieldValue(
      "sources",
      JSON.stringify(
        sources.map((source, i) => (i === index ? { ...source, ...changes } : source)),
        null,
        2,
      ),
    );
    if (previousId && nextId && previousId !== nextId) {
      const requests = parseJsonArray(form.values.requests).map((request) =>
        isRecord(request) && request.sourceId === previousId ? { ...request, sourceId: nextId } : request,
      );
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
      type === "apiKeyHeader"
        ? { type, headerName: "X-API-Key" }
        : type === "apiKeyQuery"
          ? { type, parameterName: "api_key" }
          : { type };
    update(index, { auth: auth as CustomWidgetSource["auth"] });
  };
  const setSecret = (sourceId: string, kind: string, value: string) => {
    const current = form.values.secrets.filter((secret) => !(secret.sourceId === sourceId && secret.kind === kind));
    const existing = form.values.secrets.find((secret) => secret.sourceId === sourceId && secret.kind === kind);
    form.setFieldValue("secrets", [...current, { sourceId, kind, value, hasValue: existing?.hasValue }]);
  };
  const addSource = () => {
    const id = `source-${sources.length + 1}`;
    form.setFieldValue(
      "sources",
      JSON.stringify(
        [
          ...sources,
          {
            id,
            name: t("newName", { count: sources.length + 1 }),
            baseUrl: "https://example.com",
            networkScope: "private",
            auth: { type: "none" },
          },
        ],
        null,
        2,
      ),
    );
  };
  const removeSource = (index: number) => {
    const removedId = sources[index]?.id;
    form.setFieldValue(
      "sources",
      JSON.stringify(
        sources.filter((_, i) => i !== index),
        null,
        2,
      ),
    );
    if (!removedId) return;
    form.setFieldValue(
      "requests",
      JSON.stringify(
        parseJsonArray(form.values.requests).filter((request) => !isRecord(request) || request.sourceId !== removedId),
        null,
        2,
      ),
    );
    form.setFieldValue(
      "secrets",
      form.values.secrets.filter((secret) => secret.sourceId !== removedId),
    );
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
      {sources.map((source, index) => (
        <Fieldset key={source.id} legend={index === 0 ? t("primary") : source.name}>
          <Stack gap="sm">
            <Group grow align="start">
              <TextInput
                label={t("id")}
                value={source.id}
                disabled={Boolean(definitionId)}
                onChange={(event) => update(index, { id: event.currentTarget.value })}
              />
              <TextInput
                label={t("name")}
                value={source.name}
                onChange={(event) => update(index, { name: event.currentTarget.value })}
              />
            </Group>
            <TextInput
              label={t("baseUrl")}
              type="url"
              value={source.baseUrl}
              onChange={(event) => update(index, { baseUrl: event.currentTarget.value })}
            />
            <Group grow align="start">
              <Select
                label={t("networkScope")}
                data={["public", "private", "loopback"]}
                value={source.networkScope}
                onChange={(value) =>
                  value && update(index, { networkScope: value as CustomWidgetSource["networkScope"] })
                }
                allowDeselect={false}
              />
              <Select
                label={t("authentication")}
                data={["none", "bearer", "basic", "apiKeyHeader", "apiKeyQuery"]}
                value={source.auth.type}
                onChange={(value) => setAuth(index, value ?? "none")}
                allowDeselect={false}
              />
            </Group>
            {source.auth.type === "apiKeyHeader" && (
              <TextInput
                label={t("headerName")}
                value={source.auth.headerName}
                onChange={(event) =>
                  update(index, { auth: { type: "apiKeyHeader", headerName: event.currentTarget.value } })
                }
              />
            )}
            {source.auth.type === "apiKeyQuery" && (
              <TextInput
                label={t("queryParameter")}
                value={source.auth.parameterName}
                onChange={(event) =>
                  update(index, { auth: { type: "apiKeyQuery", parameterName: event.currentTarget.value } })
                }
              />
            )}
            {(secretFields[source.auth.type] ?? []).map((field) => {
              const secret = form.values.secrets.find(
                (entry) => entry.sourceId === source.id && entry.kind === field.kind,
              );
              const Input = field.kind === "username" ? TextInput : PasswordInput;
              return (
                <Group key={field.kind} align="end" wrap="nowrap">
                  <Input
                    style={{ flex: 1 }}
                    label={t(`secret.${field.kind}`)}
                    value={secret?.value ?? ""}
                    placeholder={secret?.hasValue ? t("configured") : undefined}
                    leftSection={<IconKey size={15} />}
                    onChange={(event) => setSecret(source.id, field.kind, event.currentTarget.value)}
                  />
                  {definitionId && secret?.hasValue && (
                    <Button
                      type="button"
                      color="red"
                      variant="subtle"
                      loading={clearSecretMutation.isPending}
                      onClick={() => void clearSecret(source.id, field.kind)}
                    >
                      {t("clear")}
                    </Button>
                  )}
                </Group>
              );
            })}
            {index > 0 && (
              <Button
                type="button"
                color="red"
                variant="subtle"
                leftSection={<IconTrash size={16} />}
                onClick={() => removeSource(index)}
              >
                {t("remove")}
              </Button>
            )}
          </Stack>
        </Fieldset>
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
    </Stack>
  );
}
