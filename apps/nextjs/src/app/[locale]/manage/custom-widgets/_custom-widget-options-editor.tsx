"use client";

import {
  Accordion,
  ActionIcon,
  Button,
  Fieldset,
  Group,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from "@tabler/icons-react";

import { customWidgetOptionControls } from "@homarr/custom-widgets/core";
import { useI18n } from "@homarr/translation/client";

import { isRecord, parseJson } from "./_custom-widget-form-utils";
import type { CustomWidgetWorkbenchForm } from "./_custom-widget-form-utils";
import { DefaultValueEditor, OptionChoicesEditor, optionForControl } from "./_custom-widget-option-fields";
import { CustomWidgetIdentifierInput } from "./_custom-widget-identifier-input";

export function CustomWidgetOptionsEditor({
  form,
  onRename,
}: {
  form: CustomWidgetWorkbenchForm;
  onRename(currentName: string, nextName: string): void;
}) {
  const t = useI18n("customWidget.workbench.builder");
  const parsed = parseJson(form.values.options);
  const entries = isRecord(parsed) ? Object.entries(parsed) : [];
  const requests = parseJson(form.values.requests);
  const requestIds = isRecord(requests) ? Object.keys(requests) : [];
  const commit = (next: Array<[string, unknown]>) =>
    form.setFieldValue("options", JSON.stringify(Object.fromEntries(next), null, 2));
  const update = (index: number, id: string, option: Record<string, unknown>) =>
    commit(entries.map((entry, i) => (i === index ? [id, option] : entry)));
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
    while (entries.some(([id]) => id === `option-${suffix}`)) suffix += 1;
    commit([...entries, [`option-${suffix}`, { label: `Option ${suffix}`, control: "text", default: "" }]]);
  };

  return (
    <Stack gap="sm">
      {entries.map(([id, rawOption], index) => {
        const option = isRecord(rawOption) ? rawOption : {};
        const control = typeof option.control === "string" ? option.control : "text";
        const choicesFrom = isRecord(option.choicesFrom) ? option.choicesFrom : null;
        const choices = Array.isArray(option.choices)
          ? option.choices.flatMap((choice) =>
              isRecord(choice) &&
              typeof choice.label === "string" &&
              (typeof choice.value === "string" || typeof choice.value === "number")
                ? [{ label: choice.label, value: choice.value }]
                : [],
            )
          : [];
        return (
          <Fieldset key={index} legend={typeof option.label === "string" ? option.label : id}>
            <Stack gap="sm">
              <Group grow align="start">
                <CustomWidgetIdentifierInput
                  label={t("optionName")}
                  value={id}
                  error={form.errors.options}
                  onCommit={(value) => onRename(id, value)}
                />
                <TextInput
                  label={t("label")}
                  value={typeof option.label === "string" ? option.label : ""}
                  onChange={(event) => update(index, id, { ...option, label: event.currentTarget.value })}
                />
                <Select
                  label={t("control")}
                  data={[...customWidgetOptionControls]}
                  value={control}
                  allowDeselect={false}
                  onChange={(value) => update(index, id, optionForControl(option, value))}
                />
              </Group>
              <TextInput
                label={t("description")}
                value={typeof option.description === "string" ? option.description : ""}
                onChange={(event) =>
                  update(index, id, { ...option, description: event.currentTarget.value || undefined })
                }
              />
              <DefaultValueEditor
                id={`${index}-default`}
                control={control}
                value={option.default}
                choices={choices}
                onChange={(value) => update(index, id, { ...option, default: value })}
              />
              <Accordion variant="contained">
                <Accordion.Item value="advanced">
                  <Accordion.Control>{t("optionDetails")}</Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="sm">
                      {["number", "slider", "duration"].includes(control) && (
                        <Group grow>
                          <NumberInput
                            label={t("minimum")}
                            value={typeof option.min === "number" ? option.min : ""}
                            onChange={(value) =>
                              update(index, id, { ...option, min: typeof value === "number" ? value : undefined })
                            }
                          />
                          <NumberInput
                            label={t("maximum")}
                            value={typeof option.max === "number" ? option.max : ""}
                            onChange={(value) =>
                              update(index, id, { ...option, max: typeof value === "number" ? value : undefined })
                            }
                          />
                          <NumberInput
                            label={t("step")}
                            value={typeof option.step === "number" ? option.step : ""}
                            onChange={(value) =>
                              update(index, id, { ...option, step: typeof value === "number" ? value : undefined })
                            }
                          />
                        </Group>
                      )}
                      {["select", "multiSelect"].includes(control) && (
                        <OptionChoicesEditor
                          value={choices}
                          onChange={(nextChoices) =>
                            update(index, id, {
                              ...option,
                              choices: nextChoices.length > 0 ? nextChoices : undefined,
                              choicesFrom: undefined,
                              default:
                                control === "select" &&
                                !nextChoices.some((choice) => Object.is(choice.value, option.default))
                                  ? (nextChoices[0]?.value ?? "")
                                  : option.default,
                            })
                          }
                        />
                      )}
                      {["select", "multiSelect"].includes(control) && (
                        <Group grow align="start">
                          <Select
                            label={t("choicesRequest")}
                            data={requestIds}
                            value={typeof choicesFrom?.request === "string" ? choicesFrom.request : null}
                            clearable
                            onChange={(value) =>
                              update(index, id, {
                                ...option,
                                choices: value ? undefined : option.choices,
                                choicesFrom: value ? { request: value, valuePath: "id", labelPath: "name" } : undefined,
                              })
                            }
                          />
                          {choicesFrom && (
                            <>
                              <TextInput
                                label={t("itemsPath")}
                                placeholder={t("itemsPathPlaceholder")}
                                value={String(choicesFrom.itemsPath ?? "")}
                                onChange={(event) =>
                                  update(index, id, {
                                    ...option,
                                    choicesFrom: { ...choicesFrom, itemsPath: event.currentTarget.value || undefined },
                                  })
                                }
                              />
                              <TextInput
                                label={t("valuePath")}
                                value={String(choicesFrom.valuePath ?? "")}
                                onChange={(event) =>
                                  update(index, id, {
                                    ...option,
                                    choicesFrom: { ...choicesFrom, valuePath: event.currentTarget.value },
                                  })
                                }
                              />
                              <TextInput
                                label={t("labelPath")}
                                value={String(choicesFrom.labelPath ?? "")}
                                onChange={(event) =>
                                  update(index, id, {
                                    ...option,
                                    choicesFrom: { ...choicesFrom, labelPath: event.currentTarget.value },
                                  })
                                }
                              />
                            </>
                          )}
                        </Group>
                      )}
                      <Group grow>
                        <TextInput
                          label={t("group")}
                          value={typeof option.group === "string" ? option.group : ""}
                          onChange={(event) =>
                            update(index, id, { ...option, group: event.currentTarget.value || undefined })
                          }
                        />
                        <Switch
                          mt="xl"
                          label={t("advancedOption")}
                          checked={option.advanced === true}
                          onChange={(event) => update(index, id, { ...option, advanced: event.currentTarget.checked })}
                        />
                      </Group>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
              <Group justify="space-between">
                <Group gap="xs">
                  <ActionIcon
                    type="button"
                    variant="subtle"
                    aria-label={t("moveOptionUp")}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <IconArrowUp size={16} />
                  </ActionIcon>
                  <ActionIcon
                    type="button"
                    variant="subtle"
                    aria-label={t("moveOptionDown")}
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
                  {t("removeOption")}
                </Button>
              </Group>
            </Stack>
          </Fieldset>
        );
      })}
      <Button type="button" variant="light" leftSection={<IconPlus size={16} />} onClick={add}>
        {t("addOption")}
      </Button>
      {form.errors.options && (
        <Text c="red" size="xs">
          {form.errors.options}
        </Text>
      )}
    </Stack>
  );
}
