"use client";

import { Accordion, Button, Fieldset, Group, PasswordInput, Select, Stack, Text, TextInput } from "@mantine/core";
import { IconKey, IconPlus, IconTrash } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { getCustomWidgetSourceUrlIssue } from "@homarr/custom-widgets/core";
import type { CustomWidgetSource, CustomWidgetSourceUrlIssue } from "@homarr/custom-widgets/core";
import { showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import { isRecord, parseJson, parseSources } from "./_custom-widget-form-utils";
import type { CustomWidgetWorkbenchForm } from "./_custom-widget-form-utils";
import { CustomWidgetIdentifierInput } from "./_custom-widget-identifier-input";

const secretFields: Record<string, Array<{ kind: "apiKey" | "username" | "password" }>> = {
  bearer: [{ kind: "apiKey" }],
  basic: [{ kind: "username" }, { kind: "password" }],
  apiKeyHeader: [{ kind: "apiKey" }],
  apiKeyQuery: [{ kind: "apiKey" }],
};

const sourceUrlErrorKeys: Record<CustomWidgetSourceUrlIssue, `baseUrlError.${CustomWidgetSourceUrlIssue}`> = {
  invalid: "baseUrlError.invalid",
  protocol: "baseUrlError.protocol",
  credentials: "baseUrlError.credentials",
  queryOrFragment: "baseUrlError.queryOrFragment",
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
  };
  const setSecret = (sourceId: string, kind: string, value: string) => {
    const current = form.values.secrets.filter((secret) => !(secret.sourceId === sourceId && secret.kind === kind));
    const existing = form.values.secrets.find((secret) => secret.sourceId === sourceId && secret.kind === kind);
    form.setFieldValue("secrets", [...current, { sourceId, kind, value, hasValue: existing?.hasValue }]);
  };
  const addSource = () => {
    const id = sources.length === 0 ? "default" : `source-${sources.length + 1}`;
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
  const removeSource = (index: number) => {
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
    form.setFieldValue(
      "requests",
      JSON.stringify(
        Object.fromEntries(
          Object.entries(
            isRecord(parseJson(form.values.requests))
              ? (parseJson(form.values.requests) as Record<string, unknown>)
              : {},
          ).filter(([, request]) => !isRecord(request) || request.source !== removedId),
        ),
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
      {sources.map((source, index) => {
        const baseUrlIssue = getCustomWidgetSourceUrlIssue(source.baseUrl);
        return (
          <Fieldset key={index} legend={index === 0 ? t("primary") : source.name}>
            <Stack gap="sm">
              <Group grow align="start">
                <CustomWidgetIdentifierInput
                  label={t("id")}
                  value={source.id}
                  disabled={source.id === "default" || Boolean(definitionId)}
                  error={form.errors.sources}
                  onCommit={(value) => update(index, { id: value })}
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
                error={baseUrlIssue ? t(sourceUrlErrorKeys[baseUrlIssue]) : undefined}
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
                  value={typeof source.auth === "string" ? source.auth : source.auth.type}
                  onChange={(value) => setAuth(index, value ?? "none")}
                  allowDeselect={false}
                />
              </Group>
              {typeof source.auth === "object" && source.auth.type === "apiKeyHeader" && (
                <TextInput
                  label={t("headerName")}
                  value={source.auth.name}
                  onChange={(event) =>
                    update(index, { auth: { type: "apiKeyHeader", name: event.currentTarget.value } })
                  }
                />
              )}
              {typeof source.auth === "object" && source.auth.type === "apiKeyQuery" && (
                <TextInput
                  label={t("queryParameter")}
                  value={source.auth.name}
                  onChange={(event) =>
                    update(index, { auth: { type: "apiKeyQuery", name: event.currentTarget.value } })
                  }
                />
              )}
              {(secretFields[typeof source.auth === "string" ? source.auth : source.auth.type] ?? []).map((field) => {
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
