"use client";

import { useEffect, useState } from "react";
import { ActionIcon, Button, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import { CodeEditor } from "./_code-editor";
import { isRecord } from "./_custom-widget-form-utils";
import { CustomWidgetIdentifierInput } from "./_custom-widget-identifier-input";

export function QueryValuesEditor({
  value,
  optionNames,
  allowParams,
  onChange,
}: {
  value: Record<string, unknown>;
  optionNames: string[];
  allowParams: boolean;
  onChange(value: Record<string, unknown>): void;
}) {
  const t = useI18n("customWidget.workbench.builder");
  const entries = Object.entries(value);
  const [nameErrors, setNameErrors] = useState<Record<number, string>>({});
  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        {t("queryValues")}
      </Text>
      {entries.map(([name, bound], index) => {
        const kind =
          isRecord(bound) && typeof bound.$option === "string"
            ? "option"
            : isRecord(bound) && typeof bound.$param === "string"
              ? "param"
              : "literal";
        const current =
          kind === "option"
            ? String((bound as Record<string, unknown>).$option)
            : kind === "param"
              ? String((bound as Record<string, unknown>).$param)
              : String(bound ?? "");
        const commit = (nextName: string, nextKind: string, nextValue: string) =>
          onChange(
            Object.fromEntries(
              entries.map(([key, child], i) =>
                i === index
                  ? [
                      nextName,
                      nextKind === "option"
                        ? { $option: nextValue }
                        : nextKind === "param"
                          ? { $param: nextValue }
                          : parseLiteral(nextValue),
                    ]
                  : [key, child],
              ),
            ),
          );
        const sourceChoices = [
          { value: "literal", label: t("literal") },
          { value: "option", label: t("widgetOption") },
          ...(allowParams ? [{ value: "param", label: t("invocationParameter") }] : []),
        ];
        return (
          <Group key={index} align="end" wrap="wrap">
            <CustomWidgetIdentifierInput
              style={{ flex: "1 1 10rem" }}
              label={t("queryKey")}
              value={name}
              error={nameErrors[index]}
              onCommit={(nextName) => {
                if (
                  !/^[A-Za-z][A-Za-z0-9_-]*$/u.test(nextName) ||
                  entries.some(([entryName], entryIndex) => entryIndex !== index && entryName === nextName)
                ) {
                  setNameErrors((currentErrors) => ({ ...currentErrors, [index]: t("queryKeyInvalid") }));
                  return;
                }
                setNameErrors((currentErrors) => {
                  const nextErrors = { ...currentErrors };
                  delete nextErrors[index];
                  return nextErrors;
                });
                commit(nextName, kind, current);
              }}
            />
            <Select
              style={{ flex: "1 1 10rem" }}
              label={t("valueSource")}
              data={sourceChoices}
              value={kind}
              allowDeselect={false}
              onChange={(nextKind) => commit(name, nextKind ?? "literal", current)}
            />
            {kind === "option" ? (
              <Select
                style={{ flex: "1 1 10rem" }}
                label={t("option")}
                data={optionNames}
                value={current}
                searchable
                onChange={(next) => commit(name, kind, next ?? "")}
              />
            ) : (
              <TextInput
                style={{ flex: "1 1 10rem" }}
                label={kind === "param" ? t("parameterName") : t("value")}
                value={current}
                onChange={(event) => commit(name, kind, event.currentTarget.value)}
              />
            )}
            <ActionIcon
              type="button"
              color="red"
              variant="subtle"
              aria-label={t("removeQueryValue")}
              onClick={() => onChange(Object.fromEntries(entries.filter((_, i) => i !== index)))}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        );
      })}
      <Button
        type="button"
        size="compact-sm"
        variant="subtle"
        leftSection={<IconPlus size={14} />}
        onClick={() => onChange({ ...value, [`value${entries.length + 1}`]: "" })}
      >
        {t("addQueryValue")}
      </Button>
    </Stack>
  );
}

export function RequestBodyEditor({
  id,
  value,
  optionNames,
  allowParams,
  onChange,
}: {
  id: string;
  value: unknown;
  optionNames: string[];
  allowParams: boolean;
  onChange(value: unknown): void;
}) {
  const t = useI18n("customWidget.workbench.builder");
  const serialized = value === undefined ? "" : JSON.stringify(value, null, 2);
  const [draft, setDraft] = useState(serialized);
  const [error, setError] = useState<string>();
  const [optionName, setOptionName] = useState<string | null>(optionNames[0] ?? null);
  const [parameterName, setParameterName] = useState("");
  const [insertion, setInsertion] = useState({ text: "", key: 0 });
  useEffect(() => setDraft(serialized), [serialized]);
  return (
    <Stack gap="xs">
      <CodeEditor
        id={`${id}-request-body-editor`}
        label={t("jsonBody")}
        description={t("jsonBodyDescription")}
        language="json"
        value={draft}
        height="160px"
        error={error}
        insertText={insertion.text}
        insertKey={insertion.key}
        onChange={(next) => {
          setDraft(next);
          try {
            onChange(next.trim() ? (JSON.parse(next) as unknown) : undefined);
            setError(undefined);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : t("invalidJson"));
          }
        }}
      />
      <Group align="end" wrap="wrap">
        <Select label={t("option")} data={optionNames} value={optionName} searchable onChange={setOptionName} />
        <Button
          type="button"
          variant="light"
          disabled={!optionName}
          onClick={() =>
            optionName &&
            setInsertion((current) => ({ text: JSON.stringify({ $option: optionName }), key: current.key + 1 }))
          }
        >
          {t("insertOptionReference")}
        </Button>
        {allowParams && (
          <>
            <TextInput
              label={t("parameterName")}
              value={parameterName}
              onChange={(event) => setParameterName(event.currentTarget.value)}
            />
            <Button
              type="button"
              variant="light"
              disabled={!parameterName.trim()}
              onClick={() =>
                setInsertion((current) => ({
                  text: JSON.stringify({ $param: parameterName.trim() }),
                  key: current.key + 1,
                }))
              }
            >
              {t("insertParameterReference")}
            </Button>
          </>
        )}
      </Group>
    </Stack>
  );
}

function parseLiteral(value: string): string | number | boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/u.test(value.trim())) return Number(value);
  return value;
}
