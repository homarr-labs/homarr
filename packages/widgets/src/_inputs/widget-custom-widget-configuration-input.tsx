"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  Alert,
  ColorInput,
  Fieldset,
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
import { isRecord } from "@homarr/common";
import type { CustomWidgetOption } from "@homarr/custom-widgets/core";
import {
  isCustomWidgetChoiceValue,
  normalizeCustomWidgetOptions,
  validateCustomWidgetOptions,
} from "@homarr/custom-widgets/core";
import { CustomWidgetCodeEditor } from "@homarr/custom-widgets/workbench";
import type { CustomWidgetEditorMessages } from "@homarr/custom-widgets/workbench";
import { IconPicker } from "@homarr/forms-collection";
import { useI18n } from "@homarr/translation/client";

import type { CommonWidgetInputProps } from "./common";
import { useFormContext } from "./form";

type OptionRequest = { id: string; configurationKeys?: string[] };

export const WidgetCustomWidgetConfigurationInput = ({
  property,
}: CommonWidgetInputProps<"customWidgetConfiguration">) => {
  const form = useFormContext();
  const labels = useI18n("widget.customApi.configuration");
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
  const definitionVersion = definition?.updatedAt instanceof Date ? definition.updatedAt.getTime() : undefined;
  const configurationVersion = form.values.options.configurationVersion;
  const needsDefinitionRepair = definitionVersion !== undefined && configurationVersion !== definitionVersion;
  const effectiveConfiguration = useMemo(
    () => (options && needsDefinitionRepair ? normalizeCustomWidgetOptions(options, configuration) : configuration),
    [configuration, needsDefinitionRepair, options],
  );
  const issues = useMemo(
    () => (options ? validateCustomWidgetOptions(options, effectiveConfiguration) : []),
    [effectiveConfiguration, options],
  );

  useEffect(() => {
    if (!needsDefinitionRepair || definitionVersion === undefined) return;
    form.setFieldValue(`options.${property}`, effectiveConfiguration);
    form.setFieldValue("options.configurationVersion", definitionVersion);
  }, [definitionVersion, effectiveConfiguration, form, needsDefinitionRepair, property]);

  useEffect(() => {
    const path = `options.${property}`;
    if (issues[0]) form.setFieldError(path, `${issues[0].path}: ${issues[0].message}`);
    else form.clearFieldError(path);
  }, [form, issues, property]);

  if (!definitionId || !options || needsDefinitionRepair) return null;
  const entries = Object.entries(options);
  const regular = entries.filter(([, option]) => !option.advanced);
  const advanced = entries.filter(([, option]) => option.advanced);
  return (
    <Stack gap="md">
      {issues[0] && (
        <Alert color="yellow" variant="light" icon={<IconAlertTriangle size="var(--mantine-font-size-md)" />}>
          <Text size="sm">{labels("needsAttention", { message: issues[0].message })}</Text>
        </Alert>
      )}
      <OptionSections
        entries={regular}
        path={`options.${property}`}
        configuration={effectiveConfiguration}
        definitionId={definitionId}
        optionRequests={definition?.optionRequests}
      />
      {advanced.length > 0 && (
        <Accordion variant="contained">
          <Accordion.Item value="advanced-options">
            <Accordion.Control>{labels("advancedOptions")}</Accordion.Control>
            <Accordion.Panel>
              <OptionSections
                entries={advanced}
                path={`options.${property}`}
                configuration={effectiveConfiguration}
                definitionId={definitionId}
                optionRequests={definition?.optionRequests}
              />
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      )}
    </Stack>
  );
};

function OptionSections({
  entries,
  path,
  configuration,
  definitionId,
  optionRequests,
}: {
  entries: Array<[string, CustomWidgetOption]>;
  path: string;
  configuration: Record<string, unknown>;
  definitionId: string;
  optionRequests?: OptionRequest[];
}) {
  const groups = new Map<string, Array<[string, CustomWidgetOption]>>();
  for (const entry of entries) {
    const group = entry[1].group ?? "";
    const fields = groups.get(group) ?? [];
    fields.push(entry);
    groups.set(group, fields);
  }
  return (
    <Stack gap="sm">
      {[...groups].map(([group, fields]) => {
        const inputs = (
          <Stack gap="sm">
            {fields.map(([name, option]) => (
              <OptionField
                key={`${definitionId}:${name}`}
                option={option}
                path={`${path}.${name}`}
                configuration={configuration}
                definitionId={definitionId}
                optionRequests={optionRequests}
              />
            ))}
          </Stack>
        );
        if (!group) return <Stack key={group}>{inputs}</Stack>;
        return (
          <Fieldset key={group} legend={group}>
            {inputs}
          </Fieldset>
        );
      })}
    </Stack>
  );
}

function OptionField({
  option,
  path,
  configuration,
  definitionId,
  optionRequests,
}: {
  option: CustomWidgetOption;
  path: string;
  configuration: Record<string, unknown>;
  definitionId: string;
  optionRequests?: OptionRequest[];
}) {
  const form = useFormContext();
  const input = form.getInputProps(path, { type: option.control === "switch" ? "checkbox" : "input" });
  const common = { label: option.label, description: option.description };
  if (option.choicesFrom)
    return (
      <DynamicOptionField
        option={option}
        path={path}
        configuration={configuration}
        definitionId={definitionId}
        optionRequests={optionRequests}
      />
    );
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
  const choices = option.choices ?? [];
  if (option.control === "select")
    return (
      <Select<string | number>
        {...common}
        {...input}
        data={choices}
        allowDeselect={false}
        value={isCustomWidgetChoiceValue(input.value) ? input.value : null}
        onChange={(value) => {
          if (value !== null) form.setFieldValue(path, value);
        }}
      />
    );
  if (option.control === "multiSelect")
    return (
      <MultiSelect<string | number>
        {...common}
        {...input}
        data={choices}
        value={Array.isArray(input.value) ? input.value.filter(isCustomWidgetChoiceValue) : []}
        onChange={(value) => form.setFieldValue(path, value)}
      />
    );
  if (option.control === "textarea") return <Textarea {...common} autosize minRows={3} {...input} />;
  if (option.control === "color") return <ColorInput {...common} {...input} />;
  if (option.control === "date") return <DateInput {...common} valueFormat="YYYY-MM-DD" {...input} />;
  if (option.control === "time") return <TimeInput {...common} {...input} />;
  if (option.control === "icon") return <IconPicker withAsterisk={false} {...input} />;
  if (option.control === "timeZone")
    return <Select {...common} searchable data={getTimeZoneChoices(input.value)} {...input} allowDeselect={false} />;
  if (option.control === "json")
    return (
      <JsonOption
        identity={`${definitionId}:${path}`}
        editorId={`${definitionId}-${path}-json-option`}
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
  optionRequests,
}: {
  option: CustomWidgetOption;
  path: string;
  configuration: Record<string, unknown>;
  definitionId: string;
  optionRequests?: OptionRequest[];
}) {
  const form = useFormContext();
  const board = useOptionalBoard();
  const formRef = useRef(form);
  const messages = useI18n("widget.customApi.customJsx");
  const search = useI18n("search");
  const source = option.choicesFrom;
  const boardId = board?.id ?? "";
  const requestId = source?.request ?? "";
  const configurationKeys = optionRequests?.find((request) => request.id === requestId)?.configurationKeys;
  let requestConfiguration = configuration;
  if (configurationKeys) {
    requestConfiguration = Object.fromEntries(
      configurationKeys.filter((key) => configuration[key] !== undefined).map((key) => [key, configuration[key]]),
    );
  }
  useEffect(() => {
    formRef.current = form;
  }, [form]);
  const query = clientApi.customWidget.optionRequest.useQuery(
    {
      boardId,
      definitionId,
      requestId,
      configuration: requestConfiguration,
    },
    {
      enabled: Boolean(board?.id && definitionId && source?.request),
      placeholderData: (previousData, previousQuery) => {
        const previousKey = previousQuery?.queryKey[1];
        const previousInput = isRecord(previousKey) ? previousKey.input : undefined;
        if (
          !previousData?.ok ||
          !isRecord(previousInput) ||
          previousInput.boardId !== boardId ||
          previousInput.definitionId !== definitionId ||
          previousInput.requestId !== requestId
        )
          return undefined;
        return previousData;
      },
    },
  );
  const response = query.data?.ok ? query.data.data : undefined;
  const collection = source?.itemsPath ? getByPath(response, source.itemsPath) : response;
  const choices = (source && Array.isArray(collection) ? collection : []).flatMap((row) => {
    const value = getByPath(row, source?.valuePath ?? "");
    const label = getByPath(row, source?.labelPath ?? "");
    return isCustomWidgetChoiceValue(value) ? [{ value, label: String(label ?? value) }] : [];
  });
  const uniqueChoices = new Map(choices.map((choice) => [String(choice.value), choice]));
  const data = [...uniqueChoices.values()];
  const error =
    query.error?.message ??
    (query.data && !query.data.ok ? (query.data.error ?? messages("requestFailed")) : undefined) ??
    (choices.length !== data.length ? "Choice values must be unique" : undefined);
  useEffect(() => {
    if (error) form.setFieldError(path, error);
    else form.clearFieldError(path);
  }, [error, form, path]);
  useEffect(() => () => formRef.current.clearFieldError(path), [path]);
  if (!source) return null;
  const input = form.getInputProps(path);
  const empty = query.isSuccess && !query.isFetching && !error && data.length === 0;
  let description = option.description;
  if (empty) description = [description, search("nothingFound")].filter(Boolean).join(" · ");
  const common = {
    label: option.label,
    description,
    data,
    searchable: true,
    disabled: Boolean(error) || query.isPending || query.isPlaceholderData,
    loading: query.isFetching,
    error: error ?? input.error,
    nothingFoundMessage: search("nothingFound"),
  };
  if (option.control === "multiSelect")
    return (
      <MultiSelect<string | number>
        {...input}
        {...common}
        value={Array.isArray(input.value) ? input.value.filter(isCustomWidgetChoiceValue) : []}
        onChange={(value) => form.setFieldValue(path, value)}
      />
    );
  return (
    <Select<string | number>
      {...input}
      {...common}
      allowDeselect={false}
      value={isCustomWidgetChoiceValue(input.value) ? input.value : null}
      onChange={(value) => {
        if (value !== null) form.setFieldValue(path, value);
      }}
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

export function JsonOption({
  identity,
  editorId,
  label,
  description,
  value,
  onChange,
}: {
  identity: string;
  editorId: string;
  label: string;
  description?: string;
  value: unknown;
  onChange(value: unknown): void;
}) {
  const serializedValue = JSON.stringify(value ?? null, null, 2);
  const [draft, setDraft] = useState(serializedValue);
  const [error, setError] = useState<string>();
  const synchronizedValueRef = useRef(serializedValue);
  const identityRef = useRef(identity);
  useEffect(() => {
    if (identityRef.current === identity && synchronizedValueRef.current === serializedValue) return;
    identityRef.current = identity;
    synchronizedValueRef.current = serializedValue;
    setDraft(serializedValue);
    setError(undefined);
  }, [identity, serializedValue]);
  return (
    <CustomWidgetCodeEditor
      id={editorId}
      label={label}
      description={description}
      language="json"
      value={draft}
      height="160px"
      error={error}
      onChange={(next) => {
        setDraft(next);
        try {
          const parsed = JSON.parse(next) as unknown;
          synchronizedValueRef.current = JSON.stringify(parsed ?? null, null, 2);
          onChange(parsed);
          setError(undefined);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Invalid JSON");
        }
      }}
      messages={editorMessages}
    />
  );
}

function getTimeZoneChoices(value: unknown) {
  const choices = [...new Set(["UTC", ...Intl.supportedValuesOf("timeZone")])];
  if (typeof value !== "string" || choices.includes(value)) return choices;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value }).resolvedOptions();
    return [value, ...choices];
  } catch {
    return choices;
  }
}

function getByPath(value: unknown, path: string): unknown {
  return path
    .replace(/^\$\.?/u, "")
    .split(".")
    .filter(Boolean)
    .reduce<unknown>((current, segment) => (isRecord(current) ? current[segment] : undefined), value);
}
