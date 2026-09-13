"use client";

import { ActionIcon, Button, Group, NumberInput, Stack, Switch, Text, Textarea } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useI18n } from "@homarr/translation/client";

export function ExtensionDefaultEditor({
  type,
  value,
  onChange,
}: {
  type: string;
  value: unknown;
  onChange(value: unknown): void;
}) {
  const t = useI18n("customWidget.flow.extensionEditor");
  if (type === "boolean")
    return (
      <Switch
        label={t("defaultValue")}
        checked={value === true}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    );
  if (type === "number") return <NumberInput label={t("defaultValue")} value={inputValue(value)} onChange={onChange} />;
  if (type === "string")
    return (
      <Textarea
        label={t("defaultValue")}
        autosize
        minRows={2}
        maxRows={6}
        maxLength={8192}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    );
  if (type !== "string[]" && type !== "number[]") return null;
  const values = Array.isArray(value) ? value : [];
  const update = (index: number, next: unknown) =>
    onChange(values.map((entry, position) => (position === index ? next : entry)));
  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        {t("defaultValue")}
      </Text>
      <Stack gap="xs" mah={240} style={{ overflow: "auto" }}>
        {values.map((entry, index) => (
          <Group key={index} gap="xs" wrap="nowrap">
            {type === "number[]" ? (
              <NumberInput
                aria-label={t("listValue", { index: index + 1 })}
                value={inputValue(entry)}
                onChange={(next) => update(index, next)}
                style={{ flex: 1 }}
              />
            ) : (
              <Textarea
                aria-label={t("listValue", { index: index + 1 })}
                autosize
                minRows={1}
                maxRows={4}
                value={typeof entry === "string" ? entry : ""}
                maxLength={512}
                onChange={(event) => update(index, event.currentTarget.value)}
                style={{ flex: 1 }}
              />
            )}
            <ActionIcon
              variant="subtle"
              color="red"
              aria-label={t("removeValue", { index: index + 1 })}
              onClick={() => onChange(values.filter((_, position) => position !== index))}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}
      </Stack>
      <Button
        variant="light"
        size="compact-sm"
        disabled={values.length >= 256}
        onClick={() => onChange([...values, defaultForType(type.slice(0, -2))])}
      >
        {t("addValue")}
      </Button>
    </Stack>
  );
}

function inputValue(value: unknown) {
  if (typeof value === "number" || typeof value === "string") return value;
  return "";
}
export function defaultForType(type: string): string | number | boolean | unknown[] {
  if (type === "number") return 0;
  if (type === "boolean") return false;
  if (type.endsWith("[]")) return [];
  return "";
}
