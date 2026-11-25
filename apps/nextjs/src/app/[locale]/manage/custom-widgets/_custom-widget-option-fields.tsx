"use client";

import { useEffect, useState } from "react";
import { ActionIcon, Button, Group, MultiSelect, NumberInput, Select, Stack, Switch, TextInput } from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";

import {
  customWidgetOptionControls,
  customWidgetOptionSchema,
  getCustomWidgetOptionValueIssue,
  isCustomWidgetChoiceValue,
} from "@homarr/custom-widgets/core";
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
  const choiceData = [...new Map(choices.map((choice) => [String(choice.value), choice])).values()];
  const choiceError = choices.length !== choiceData.length ? "Choice values must be unique" : undefined;
  if (control === "select" && choices.length > 0)
    return (
      <Select<string | number>
        label={t("default")}
        data={choiceData}
        error={choiceError}
        disabled={Boolean(choiceError)}
        allowDeselect={false}
        value={isCustomWidgetChoiceValue(value) ? value : null}
        onChange={(next) => {
          if (next !== null) onChange(next);
        }}
      />
    );
  if (control === "multiSelect" && choices.length > 0)
    return (
      <MultiSelect<string | number>
        label={t("default")}
        data={choiceData}
        error={choiceError}
        disabled={Boolean(choiceError)}
        value={Array.isArray(value) ? value.filter(isCustomWidgetChoiceValue) : []}
        onChange={onChange}
      />
    );
  if (control === "json" || control === "multiSelect" || control === "select")
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
  const nextControl = customWidgetOptionControls.find((candidate) => candidate === control) ?? "text";
  const next: Record<string, unknown> = { ...option, control: nextControl };
  if (!["select", "multiSelect"].includes(nextControl)) {
    next.choices = undefined;
    next.choicesFrom = undefined;
  }
  if (!["number", "slider", "duration"].includes(nextControl)) {
    next.min = undefined;
    next.max = undefined;
    next.step = undefined;
  }
  const choices = customWidgetOptionSchema.shape.choices.safeParse(next.choices).data;
  const constraints = {
    control: nextControl,
    min: typeof next.min === "number" ? next.min : undefined,
    max: typeof next.max === "number" ? next.max : undefined,
    choices,
  };
  if (getCustomWidgetOptionValueIssue(constraints, option.default)) {
    next.default = defaultForControl(nextControl);
    if (nextControl === "select" && choices?.[0]) next.default = choices[0].value;
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
          <Select
            style={{ flex: "0 1 7rem" }}
            label={t("control")}
            data={["text", "number"]}
            value={typeof choice.value === "number" ? "number" : "text"}
            allowDeselect={false}
            onChange={(control) => {
              let next: string | number = String(choice.value);
              if (control === "number") {
                const numeric = Number(choice.value);
                next = Number.isFinite(numeric) ? numeric : 0;
              }
              onChange(value.map((entry, entryIndex) => (entryIndex === index ? { ...entry, value: next } : entry)));
            }}
          />
          {typeof choice.value === "number" ? (
            <NumericChoiceValueEditor
              label={t("choiceValue")}
              value={choice.value}
              onChange={(next) => {
                onChange(value.map((entry, entryIndex) => (entryIndex === index ? { ...entry, value: next } : entry)));
              }}
            />
          ) : (
            <TextInput
              style={{ flex: "1 1 10rem" }}
              label={t("choiceValue")}
              value={choice.value}
              onChange={(event) =>
                onChange(
                  value.map((entry, entryIndex) =>
                    entryIndex === index ? { ...entry, value: event.currentTarget.value } : entry,
                  ),
                )
              }
            />
          )}
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

function NumericChoiceValueEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange(value: number): void;
}) {
  const [draft, setDraft] = useState<string | number>(value);
  useEffect(() => {
    setDraft((current) => {
      if (current !== "" && Number(current) === value) return current;
      return value;
    });
  }, [value]);
  return (
    <NumberInput
      style={{ flex: "1 1 10rem" }}
      label={label}
      value={draft}
      onChange={(next) => {
        setDraft(next);
        if (next === "" || (typeof next === "string" && next.endsWith("."))) return;
        const numeric = Number(next);
        if (Number.isFinite(numeric)) onChange(numeric);
      }}
    />
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
