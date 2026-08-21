"use client";

import { Accordion, ActionIcon, Button, Fieldset, Group, Select, Stack, Switch, Text, TextInput } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import { isRecord, parseJson } from "./_custom-widget-form-utils";
import type { CustomWidgetWorkbenchForm } from "./_custom-widget-form-utils";
import { QueryValuesEditor, RequestBodyEditor } from "./_custom-widget-request-value-editors";
import { CustomWidgetIdentifierInput } from "./_custom-widget-identifier-input";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export function CustomWidgetRequestsEditor({
  form,
  onRename,
}: {
  form: CustomWidgetWorkbenchForm;
  onRename(currentId: string, nextId: string): void;
}) {
  const t = useI18n("customWidget.workbench.builder");
  const parsed = parseJson(form.values.requests);
  const entries = isRecord(parsed) ? Object.entries(parsed) : [];
  const sources = parseJson(form.values.sources);
  const sourceIds = isRecord(sources) ? Object.keys(sources) : ["default"];

  const commit = (next: Array<[string, unknown]>) =>
    form.setFieldValue("requests", JSON.stringify(Object.fromEntries(next), null, 2));
  const update = (index: number, id: string, request: Record<string, unknown>) =>
    commit(entries.map((entry, i) => (i === index ? [id, request] : entry)));
  const remove = (index: number) => commit(entries.filter((_, i) => i !== index));
  const move = (index: number, direction: -1 | 1) => {
    const next = [...entries];
    const target = index + direction;
    if (!next[index] || !next[target]) return;
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };
  const add = () => {
    let suffix = entries.length + 1;
    while (entries.some(([id]) => id === `request-${suffix}`)) suffix += 1;
    commit([...entries, [`request-${suffix}`, { path: "/api/data" }]]);
  };

  return (
    <Stack gap="sm">
      {entries.map(([id, rawRequest], index) => {
        const request = isRecord(rawRequest) ? rawRequest : {};
        const kind = request.kind === "action" ? "action" : "query";
        const trigger = request.trigger === "manual" ? "manual" : "load";
        return (
          <Fieldset key={index} legend={id || t("request", { count: index + 1 })}>
            <Stack gap="sm">
              <Group grow align="start">
                <CustomWidgetIdentifierInput
                  label={t("requestId")}
                  value={id}
                  error={form.errors.requests}
                  onCommit={(value) => onRename(id, value)}
                />
                <Select
                  label={t("type")}
                  data={["query", "action"]}
                  value={kind}
                  allowDeselect={false}
                  onChange={(value) =>
                    update(index, id, {
                      ...request,
                      kind: value,
                      ...(value === "action" ? { trigger: "manual" } : {}),
                    })
                  }
                />
                <Select
                  label={t("method")}
                  data={methods}
                  value={typeof request.method === "string" ? request.method : "GET"}
                  allowDeselect={false}
                  onChange={(value) =>
                    update(index, id, {
                      ...request,
                      method: value,
                      ...(value === "DELETE" ? { permission: "full" } : {}),
                    })
                  }
                />
              </Group>
              <Group grow align="start">
                <Select
                  label={t("source")}
                  data={sourceIds}
                  value={typeof request.source === "string" ? request.source : "default"}
                  allowDeselect={false}
                  onChange={(value) => update(index, id, { ...request, source: value })}
                />
                {kind === "query" && (
                  <Select
                    label={t("run")}
                    data={[
                      { value: "load", label: t("runLoad") },
                      { value: "manual", label: t("runManual") },
                    ]}
                    value={trigger}
                    allowDeselect={false}
                    onChange={(value) => update(index, id, { ...request, trigger: value })}
                  />
                )}
                <Select
                  label={t("permission")}
                  data={["view", "modify", "full"]}
                  value={
                    typeof request.permission === "string" ? request.permission : kind === "action" ? "modify" : "view"
                  }
                  allowDeselect={false}
                  onChange={(value) => update(index, id, { ...request, permission: value })}
                />
              </Group>
              <TextInput
                label={t("path")}
                description={t("pathDescription")}
                value={typeof request.path === "string" ? request.path : ""}
                onChange={(event) => update(index, id, { ...request, path: event.currentTarget.value })}
              />
              <Accordion variant="contained">
                <Accordion.Item value="values">
                  <Accordion.Control>{t("requestDetails")}</Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="sm">
                      <QueryValuesEditor
                        value={isRecord(request.query) ? request.query : {}}
                        optionNames={Object.keys(
                          isRecord(parseJson(form.values.options))
                            ? (parseJson(form.values.options) as Record<string, unknown>)
                            : {},
                        )}
                        allowParams={trigger === "manual" || kind === "action"}
                        onChange={(query) => update(index, id, { ...request, query })}
                      />
                      <RequestBodyEditor
                        id={id}
                        value={request.body}
                        optionNames={Object.keys(
                          isRecord(parseJson(form.values.options))
                            ? (parseJson(form.values.options) as Record<string, unknown>)
                            : {},
                        )}
                        allowParams={trigger === "manual" || kind === "action"}
                        onChange={(body) => update(index, id, { ...request, body })}
                      />
                      {kind === "action" && (
                        <TextInput
                          label={t("confirmation")}
                          value={typeof request.confirmation === "string" ? request.confirmation : ""}
                          onChange={(event) =>
                            update(index, id, { ...request, confirmation: event.currentTarget.value || undefined })
                          }
                        />
                      )}
                      {kind === "action" && (
                        <TextInput
                          label={t("invalidation")}
                          description={t("invalidationDescription")}
                          value={Array.isArray(request.invalidates) ? request.invalidates.join(", ") : ""}
                          onChange={(event) =>
                            update(index, id, {
                              ...request,
                              invalidates: event.currentTarget.value
                                .split(",")
                                .map((value) => value.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      )}
                      <Switch
                        label={t("noAuth")}
                        checked={request.auth === "none"}
                        onChange={(event) =>
                          update(index, id, { ...request, auth: event.currentTarget.checked ? "none" : "inherit" })
                        }
                      />
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
              <Group justify="space-between">
                <Group gap="xs">
                  <ActionIcon
                    type="button"
                    variant="subtle"
                    aria-label={t("moveRequestUp")}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <IconArrowUp size={16} />
                  </ActionIcon>
                  <ActionIcon
                    type="button"
                    variant="subtle"
                    aria-label={t("moveRequestDown")}
                    disabled={index === entries.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <IconArrowDown size={16} />
                  </ActionIcon>
                </Group>
                <Button
                  type="button"
                  color="red"
                  variant="subtle"
                  leftSection={<IconTrash size={16} />}
                  onClick={() => remove(index)}
                >
                  {t("removeRequest")}
                </Button>
              </Group>
            </Stack>
          </Fieldset>
        );
      })}
      <Button type="button" variant="light" leftSection={<IconPlus size={16} />} onClick={add}>
        {t("addRequest")}
      </Button>
      {form.errors.requests && (
        <Text c="red" size="xs">
          {form.errors.requests}
        </Text>
      )}
    </Stack>
  );
}
