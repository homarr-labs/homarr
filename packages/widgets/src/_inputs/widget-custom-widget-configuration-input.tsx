"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  Alert,
  ColorInput,
  MultiSelect,
  NumberInput,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { DateInput, TimeInput } from "@mantine/dates";
import { IconAlertTriangle } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useOptionalBoard } from "@homarr/boards/context";
import type { CustomWidgetOption } from "@homarr/custom-widgets/core";
import { validateCustomWidgetOptions } from "@homarr/custom-widgets/core";
import { CustomWidgetCodeEditor } from "@homarr/custom-widgets/workbench";
import type { CustomWidgetEditorMessages } from "@homarr/custom-widgets/workbench";
import { IconPicker } from "@homarr/forms-collection";
import { useScopedI18n } from "@homarr/translation/client";

import type { CommonWidgetInputProps } from "./common";
import { useFormContext } from "./form";

export const WidgetCustomWidgetConfigurationInput = ({
  property,
}: CommonWidgetInputProps<"customWidgetConfiguration">) => {
  const form = useFormContext();
  const labels = useScopedI18n("widget.customApi.configuration");
  const board = useOptionalBoard();
  const definitionId = typeof form.values.options.definitionId === "string" ? form.values.options.definitionId : "";
  const configurationValue = form.values.options[property];
  const configuration = useMemo(() => (isRecord(configurationValue) ? configurationValue : {}), [configurationValue]);
  const available = clientApi.customWidget.available.useQuery(
    { boardId: board?.id ?? "", currentId: definitionId || undefined },
    { enabled: board !== null && Boolean(definitionId) },
  );
  const definition = available.data?.find((candidate) => candidate.id === definitionId);
  const options = isRecord(definition?.options) ? (definition.options as Record<string, CustomWidgetOption>) : null;
  const issues = useMemo(
    () => (options ? validateCustomWidgetOptions(options, configuration) : []),
    [configuration, options],
  );

  useEffect(() => {
    const path = `options.${property}`;
    if (issues[0]) form.setFieldError(path, `${issues[0].path}: ${issues[0].message}`);
    else form.clearFieldError(path);
  }, [form, issues, property]);

  if (!definitionId || !options) return null;
  const entries = Object.entries(options);
  const regular = entries.filter(([, option]) => !option.advanced);
  const advanced = entries.filter(([, option]) => option.advanced);
  return (
    <Stack gap="md">
      {issues[0] && (
        <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={16} />}>
          <Text size="sm">{labels("needsAttention", { message: issues[0].message })}</Text>
        </Alert>
      )}
      {regular.map(([name, option]) => (
        <OptionField
          key={name}
          option={option}
          path={`options.${property}.${name}`}
          configuration={configuration}
          definitionId={definitionId}
        />
      ))}
      {advanced.length > 0 && (
        <Accordion variant="contained">
          <Accordion.Item value="advanced-options">
            <Accordion.Control>{labels("advancedOptions")}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                {advanced.map(([name, option]) => (
                  <OptionField
                    key={name}
                    option={option}
                    path={`options.${property}.${name}`}
                    configuration={configuration}
                    definitionId={definitionId}
                  />
                ))}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      )}
    </Stack>
  );
};

function OptionField({
  option,
  path,
  configuration,
  definitionId,
}: {
  option: CustomWidgetOption;
  path: string;
  configuration: Record<string, unknown>;
  definitionId: string;
}) {
  const form = useFormContext();
  const input = form.getInputProps(path, { type: option.control === "switch" ? "checkbox" : "input" });
  const common = { label: option.label, description: option.description };
  if (option.choicesFrom)
    return <DynamicOptionField option={option} path={path} configuration={configuration} definitionId={definitionId} />;
  if (option.control === "switch") return <Switch {...common} {...input} />;
  if (["number", "duration"].includes(option.control))
    return <NumberInput {...common} min={option.min} max={option.max} step={option.step} {...input} />;
  if (option.control === "slider")
    return (
      <Stack gap={4}>
        <Text size="sm" fw={500}>
          {option.label}
        </Text>
        {option.description && (
          <Text size="xs" c="dimmed">
            {option.description}
          </Text>
        )}
        <Slider min={option.min ?? 0} max={option.max ?? 100} step={option.step ?? 1} {...input} />
      </Stack>
    );
  const choices = option.choices?.map((choice) => ({ label: choice.label, value: String(choice.value) })) ?? [];
  if (option.control === "select")
    return (
      <Select
        {...common}
        data={choices}
        value={input.value == null ? null : String(input.value)}
        onChange={(value) => form.setFieldValue(path, coerceChoice(value, option))}
      />
    );
  if (option.control === "multiSelect")
    return (
      <MultiSelect
        {...common}
        data={choices}
        value={Array.isArray(input.value) ? input.value.map(String) : []}
        onChange={(value) =>
          form.setFieldValue(
            path,
            value.map((entry) => coerceChoice(entry, option)),
          )
        }
      />
    );
  if (option.control === "textarea") return <Textarea {...common} autosize minRows={3} {...input} />;
  if (option.control === "color") return <ColorInput {...common} {...input} />;
  if (option.control === "date") return <DateInput {...common} valueFormat="YYYY-MM-DD" {...input} />;
  if (option.control === "time") return <TimeInput {...common} {...input} />;
  if (option.control === "icon") return <IconPicker withAsterisk={false} {...input} />;
  if (option.control === "timeZone")
    return <Select {...common} searchable data={Intl.supportedValuesOf("timeZone")} {...input} />;
  if (option.control === "json")
    return (
      <JsonOption
        label={option.label}
        description={option.description}
        value={input.value}
        onChange={(value) => form.setFieldValue(path, value)}
      />
    );
  return <TextInput {...common} type={option.control === "url" ? "url" : "text"} {...input} />;
}

function DynamicOptionField({
  option,
  path,
  configuration,
  definitionId,
}: {
  option: CustomWidgetOption;
  path: string;
  configuration: Record<string, unknown>;
  definitionId: string;
}) {
  const form = useFormContext();
  const board = useOptionalBoard();
  const source = option.choicesFrom;
  if (!source) return null;
  const query = clientApi.customWidget.optionRequest.useQuery(
    {
      boardId: board?.id ?? "",
      definitionId,
      requestId: source.request,
      params: primitiveConfiguration(configuration),
    },
    { enabled: Boolean(board?.id && definitionId && source.request) },
  );
  const collection = source.itemsPath ? getByPath(query.data?.data, source.itemsPath) : query.data?.data;
  const data = (Array.isArray(collection) ? collection : []).flatMap((row) => {
    const value = getByPath(row, source.valuePath);
    const label = getByPath(row, source.labelPath);
    return typeof value === "string" || typeof value === "number"
      ? [{ value: String(value), label: String(label ?? value) }]
      : [];
  });
  const input = form.getInputProps(path);
  const common = {
    label: option.label,
    description: option.description,
    data,
    searchable: true,
    disabled: query.isError,
    rightSection: query.isFetching ? "…" : undefined,
  };
  if (option.control === "multiSelect")
    return (
      <MultiSelect
        {...common}
        value={Array.isArray(input.value) ? input.value.map(String) : []}
        onChange={(value) =>
          form.setFieldValue(
            path,
            value.map((entry) => coerceChoice(entry, option)),
          )
        }
      />
    );
  return (
    <Select
      {...common}
      value={input.value == null ? null : String(input.value)}
      onChange={(value) => form.setFieldValue(path, coerceChoice(value, option))}
    />
  );
}

const editorMessages: CustomWidgetEditorMessages = {
  languageJsx: "JSX",
  languageJson: "JSON",
  undo: "Undo",
  redo: "Redo",
  components: "Components",
  componentSearch: "Search components",
  componentEmpty: "No components",
  componentCount: (count) => `${count} components`,
  insertStarter: "Insert starter",
  format: "Format",
  copy: "Copy",
  copied: "Copied",
  schema: "Schema",
  schemaTab: "JSON Schema",
  minimalTab: "Minimal",
  fullTab: "Full",
  errors: (count) => `${count} errors`,
  warnings: (count) => `${count} warnings`,
  ready: "Ready",
  position: ({ line, column }) => `Ln ${line}, Col ${column}`,
  characters: (count, limit) => (limit ? `${count} / ${limit}` : `${count} characters`),
  diagnosticsTitle: "Diagnostics",
  diagnostic: (diagnostic) => diagnostic.value ?? diagnostic.code,
};

function JsonOption({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: unknown;
  onChange(value: unknown): void;
}) {
  const [draft, setDraft] = useState(() => JSON.stringify(value ?? null, null, 2));
  const [error, setError] = useState<string>();
  return (
    <CustomWidgetCodeEditor
      id={`${label}-json-option`}
      label={label}
      description={description}
      language="json"
      value={draft}
      height="160px"
      error={error}
      onChange={(next) => {
        setDraft(next);
        try {
          onChange(JSON.parse(next) as unknown);
          setError(undefined);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Invalid JSON");
        }
      }}
      messages={editorMessages}
    />
  );
}

function coerceChoice(value: string | null, option: CustomWidgetOption) {
  if (value === null) return null;
  return typeof option.default === "number" ||
    option.choices?.some((choice) => typeof choice.value === "number" && String(choice.value) === value)
    ? Number(value)
    : value;
}

function primitiveConfiguration(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string | number | boolean] =>
      ["string", "number", "boolean"].includes(typeof entry[1]),
    ),
  );
}

function getByPath(value: unknown, path: string): unknown {
  return path
    .replace(/^\$\.?/u, "")
    .split(".")
    .filter(Boolean)
    .reduce<unknown>((current, segment) => (isRecord(current) ? current[segment] : undefined), value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
