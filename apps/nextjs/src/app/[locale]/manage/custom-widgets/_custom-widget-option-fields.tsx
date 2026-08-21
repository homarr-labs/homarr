"use client";

import { useEffect, useState } from "react";
import { ActionIcon, Button, Group, MultiSelect, NumberInput, Select, Stack, Switch, TextInput } from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import { CodeEditor } from "./_code-editor";

export function DefaultValueEditor({
  id,
  control,
  value,
  choices = [],
  onChange,
}: {
  id: string;
  control: string;
  value: unknown;
  choices?: Array<{ label: string; value: string | number }>;
  onChange: (value: unknown) => void;
}) {
  const t = useI18n("customWidget.workbench.builder");
  if (control === "switch")
    return (
      <Switch
        label={t("default")}
        checked={value === true}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    );
  if (["number", "slider", "duration"].includes(control))
    return <NumberInput label={t("default")} value={typeof value === "number" ? value : 0} onChange={onChange} />;
  const choiceData = choices.map((choice) => ({ label: choice.label, value: String(choice.value) }));
  if (control === "select" && choices.length > 0)
    return (
      <Select
        label={t("default")}
        data={choiceData}
        value={value === undefined ? null : String(value)}
        onChange={(next) => onChange(coerceChoice(next, choices))}
      />
    );
  if (control === "multiSelect" && choices.length > 0)
    return (
      <MultiSelect
        label={t("default")}
        data={choiceData}
        value={Array.isArray(value) ? value.map(String) : []}
        onChange={(next) => onChange(next.map((entry) => coerceChoice(entry, choices)))}
      />
    );
  if (control === "json" || control === "multiSelect")
    return <JsonValueEditor id={id} label={t("default")} value={value} onChange={onChange} />;
  return (
    <TextInput
      label={t("default")}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
}

export function optionForControl(option: Record<string, unknown>, control: string | null): Record<string, unknown> {
  const nextControl = control ?? "text";
  const next: Record<string, unknown> = { ...option, control: nextControl, default: defaultForControl(nextControl) };
  if (!["select", "multiSelect"].includes(nextControl)) {
    next.choices = undefined;
    next.choicesFrom = undefined;
  }
  if (!["number", "slider", "duration"].includes(nextControl)) {
    next.min = undefined;
    next.max = undefined;
    next.step = undefined;
  }
  return next;
}

export function OptionChoicesEditor({
  value,
  onChange,
}: {
  value: Array<{ label: string; value: string | number }>;
  onChange(value: Array<{ label: string; value: string | number }>): void;
}) {
  const t = useI18n("customWidget.workbench.builder");
  return (
    <Stack gap="xs">
      {value.map((choice, index) => (
        <Group key={index} align="end" wrap="wrap">
          <TextInput
            style={{ flex: "1 1 10rem" }}
            label={t("choiceLabel")}
            value={choice.label}
            onChange={(event) =>
              onChange(
                value.map((entry, entryIndex) =>
                  entryIndex === index ? { ...entry, label: event.currentTarget.value } : entry,
                ),
              )
            }
          />
          <TextInput
            style={{ flex: "1 1 10rem" }}
            label={t("choiceValue")}
            value={String(choice.value)}
            onChange={(event) =>
              onChange(
                value.map((entry, entryIndex) =>
                  entryIndex === index ? { ...entry, value: parseChoiceValue(event.currentTarget.value) } : entry,
                ),
              )
            }
          />
          <ActionIcon
            type="button"
            color="red"
            variant="subtle"
            aria-label={t("removeChoice")}
            onClick={() => onChange(value.filter((_, entryIndex) => entryIndex !== index))}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ))}
      <Button
        type="button"
        size="compact-sm"
        variant="subtle"
        leftSection={<IconPlus size={14} />}
        onClick={() => onChange([...value, { label: t("newChoice"), value: `choice-${value.length + 1}` }])}
      >
        {t("addChoice")}
      </Button>
    </Stack>
  );
}

export function JsonValueEditor({
  id,
  label,
  description,
  value,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  value: unknown;
  onChange(value: unknown): void;
}) {
  const t = useI18n("customWidget.workbench.builder");
  const serialized = JSON.stringify(value, null, 2);
  const [draft, setDraft] = useState(serialized);
  const [error, setError] = useState<string>();
  useEffect(() => setDraft(serialized), [serialized]);
  return (
    <CodeEditor
      id={`option-${id}`}
      label={label}
      description={description}
      language="json"
      value={draft}
      height="140px"
      error={error}
      onChange={(next) => {
        setDraft(next);
        try {
          onChange(JSON.parse(next) as unknown);
          setError(undefined);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : t("invalidJson"));
        }
      }}
    />
  );
}

function defaultForControl(control: string | null) {
  if (control === "switch") return false;
  if (["number", "slider", "duration"].includes(control ?? "")) return 0;
  if (control === "multiSelect") return [];
  if (control === "json") return {};
  return "";
}

function parseChoiceValue(value: string): string | number {
  return /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/u.test(value.trim()) ? Number(value) : value;
}

function coerceChoice(value: string | null, choices: Array<{ value: string | number }>) {
  if (value === null) return "";
  const numeric = choices.find((choice) => typeof choice.value === "number" && String(choice.value) === value);
  return numeric?.value ?? value;
}
