"use client";

import { useEffect, useId, useMemo, useState } from "react";
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
import { resolveCustomWidgetOptionsBinding, validateCustomWidgetOptions } from "@homarr/custom-widgets/core";
import { CustomWidgetCodeEditor } from "@homarr/custom-widgets/workbench";
import { IconPicker } from "@homarr/forms-collection";
import { useScopedI18n } from "@homarr/translation/client";

import type { CommonWidgetInputProps } from "./common";
import { useFormContext } from "./form";

type Schema = Record<string, unknown>;

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
  const schema = isRecord(definition?.optionsSchema) ? definition.optionsSchema : null;
  const issues = useMemo(
    () => (schema ? validateCustomWidgetOptions(schema, configuration) : []),
    [configuration, schema],
  );

  useEffect(() => {
    const path = `options.${property}`;
    if (issues[0]) form.setFieldError(path, `${issues[0].path}: ${issues[0].message}`);
    else form.clearFieldError(path);
  }, [form, issues, property]);

  if (!definitionId || !schema) return null;
  const properties = getEffectiveProperties(schema, configuration);
  const required = getEffectiveRequired(schema, configuration);
  const entries = sortOptionEntries(properties);
  const regular = entries.filter(([, child]) => !isAdvancedOption(child));
  const advanced = entries.filter(([, child]) => isAdvancedOption(child));

  return (
    <Stack gap="md">
      {issues.length > 0 && (
        <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={16} />}>
          <Text size="sm">{labels("needsAttention", { message: issues[0]?.message ?? "" })}</Text>
        </Alert>
      )}
      {regular.map(([name, candidate]) =>
        isRecord(candidate) ? (
          <OptionField
            key={name}
            name={name}
            schema={candidate}
            path={`options.${property}.${name}`}
            configuration={configuration}
            required={required.has(name)}
          />
        ) : null,
      )}
      {advanced.length > 0 && (
        <Accordion variant="contained">
          <Accordion.Item value="advanced-options">
            <Accordion.Control>{labels("advancedOptions")}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                {advanced.map(([name, candidate]) =>
                  isRecord(candidate) ? (
                    <OptionField
                      key={name}
                      name={name}
                      schema={candidate}
                      path={`options.${property}.${name}`}
                      configuration={configuration}
                      required={required.has(name)}
                    />
                  ) : null,
                )}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      )}
    </Stack>
  );
};

function OptionField({
  name,
  schema,
  path,
  configuration,
  required = false,
}: {
  name: string;
  schema: Schema;
  path: string;
  configuration: Record<string, unknown>;
  required?: boolean;
}) {
  const form = useFormContext();
  const presentation = isRecord(schema["x-homarr"]) ? schema["x-homarr"] : {};
  const label = typeof schema.title === "string" ? schema.title : humanize(name);
  const description = typeof schema.description === "string" ? schema.description : undefined;
  const placeholder = typeof presentation.placeholder === "string" ? presentation.placeholder : undefined;
  const control = typeof presentation.control === "string" ? presentation.control : inferControl(schema);
  const input = form.getInputProps(path, { type: control === "switch" ? "checkbox" : "input" });

  if (control === "json") {
    return (
      <JsonValueInput
        label={label}
        description={description}
        required={required}
        value={input.value}
        onChange={(value) => form.setFieldValue(path, value)}
      />
    );
  }

  if (schema.type === "object" && isRecord(schema.properties)) {
    const value = isRecord(input.value) ? input.value : {};
    const properties = getEffectiveProperties(schema, value);
    const nestedRequired = getEffectiveRequired(schema, value);
    return (
      <Fieldset legend={`${label}${required ? " *" : ""}`}>
        <Stack gap="sm">
          {sortOptionEntries(properties).map(([childName, child]) =>
            isRecord(child) ? (
              <OptionField
                key={childName}
                name={childName}
                schema={child}
                path={`${path}.${childName}`}
                configuration={configuration}
                required={nestedRequired.has(childName)}
              />
            ) : null,
          )}
        </Stack>
      </Fieldset>
    );
  }

  const choices = getChoices(control === "multi-select" && isRecord(schema.items) ? schema.items : schema);
  if (isRecord(presentation.optionsSource)) {
    return (
      <DynamicOptionsSelect
        label={label}
        description={description}
        source={presentation.optionsSource}
        configuration={configuration}
        path={path}
        numeric={
          control === "multi-select" && isRecord(schema.items)
            ? schema.items.type === "number" || schema.items.type === "integer"
            : schema.type === "number" || schema.type === "integer"
        }
        multiple={control === "multi-select"}
        placeholder={placeholder}
        required={required}
      />
    );
  }

  return (
    <StaticOptionControl
      control={control}
      schema={schema}
      path={path}
      label={label}
      description={description}
      placeholder={placeholder}
      required={required}
      choices={choices}
    />
  );
}

function StaticOptionControl({
  control,
  schema,
  path,
  label,
  description,
  placeholder,
  required,
  choices,
}: {
  control: string;
  schema: Schema;
  path: string;
  label: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  choices: Array<{ value: string; label: string }>;
}) {
  const form = useFormContext();
  const input = form.getInputProps(path, { type: control === "switch" ? "checkbox" : "input" });
  switch (control) {
    case "switch":
      return <Switch label={label} description={description} required={required} {...input} />;
    case "number":
      return <NumberInput label={label} description={description} required={required} {...input} />;
    case "duration":
      return <NumberInput label={label} description={description} required={required} suffix=" s" min={0} {...input} />;
    case "slider":
      return (
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            {label}
            {required ? " *" : ""}
          </Text>
          {description && (
            <Text size="xs" c="dimmed">
              {description}
            </Text>
          )}
          <Slider
            min={typeof schema.minimum === "number" ? schema.minimum : 0}
            max={typeof schema.maximum === "number" ? schema.maximum : 100}
            step={typeof schema.multipleOf === "number" ? schema.multipleOf : 1}
            {...input}
          />
        </Stack>
      );
    case "select": {
      const numeric = schema.type === "number" || schema.type === "integer";
      return (
        <Select
          label={label}
          description={description}
          placeholder={placeholder}
          data={choices}
          searchable
          required={required}
          value={input.value === undefined || input.value === null ? null : String(input.value)}
          onBlur={input.onBlur}
          onChange={(value) => form.setFieldValue(path, numeric && value !== null ? Number(value) : value)}
        />
      );
    }
    case "multi-select": {
      const itemSchema = isRecord(schema.items) ? schema.items : {};
      const numeric = itemSchema.type === "number" || itemSchema.type === "integer";
      return (
        <MultiSelect
          label={label}
          description={description}
          placeholder={placeholder}
          data={choices}
          searchable
          required={required}
          value={Array.isArray(input.value) ? input.value.map(String) : []}
          onBlur={input.onBlur}
          onChange={(value) => form.setFieldValue(path, numeric ? value.map(Number) : value)}
        />
      );
    }
    case "date":
      return (
        <DateInput label={label} description={description} required={required} valueFormat="YYYY-MM-DD" {...input} />
      );
    case "time":
      return <TimeInput label={label} description={description} required={required} {...input} />;
    case "color":
      return <ColorInput label={label} description={description} required={required} {...input} />;
    case "icon":
      return (
        <Stack gap={4}>
          <IconPicker label={label} withAsterisk={required} {...input} />
          {description && (
            <Text size="xs" c="dimmed">
              {description}
            </Text>
          )}
        </Stack>
      );
    case "timeZone":
      return (
        <Select
          label={label}
          description={description}
          data={Intl.supportedValuesOf("timeZone")}
          searchable
          required={required}
          {...input}
        />
      );
    case "textarea":
      return (
        <Textarea
          label={label}
          description={description}
          placeholder={placeholder}
          required={required}
          autosize
          minRows={3}
          {...input}
        />
      );
    default:
      return (
        <TextInput
          label={label}
          description={description}
          placeholder={placeholder}
          required={required}
          type={control === "url" ? "url" : "text"}
          {...input}
        />
      );
  }
}

function DynamicOptionsSelect({
  label,
  description,
  source,
  configuration,
  path,
  numeric,
  multiple,
  placeholder,
  required,
}: {
  label: string;
  description?: string;
  source: Schema;
  configuration: Record<string, unknown>;
  path: string;
  numeric: boolean;
  multiple: boolean;
  placeholder?: string;
  required: boolean;
}) {
  const form = useFormContext();
  const board = useOptionalBoard();
  const definitionId = typeof form.values.options.definitionId === "string" ? form.values.options.definitionId : "";
  const input = form.getInputProps(path);
  const available = clientApi.customWidget.available.useQuery(
    { boardId: board?.id ?? "", currentId: definitionId || undefined },
    { enabled: board !== null && Boolean(definitionId) },
  );
  const definition = available.data?.find((candidate) => candidate.id === definitionId);
  const requestId = typeof source.requestId === "string" ? source.requestId : "";
  const request = definition?.optionRequests.find((candidate) => candidate.id === requestId);
  const params = (() => {
    if (!request) return null;
    try {
      return resolveCustomWidgetOptionsBinding(request, configuration);
    } catch {
      return null;
    }
  })();
  const query = clientApi.customWidget.optionRequest.useQuery(
    { boardId: board?.id ?? "", definitionId, requestId, params: params ?? {} },
    { enabled: Boolean(board?.id && definitionId && requestId && request && params) },
  );
  const valuePath = typeof source.valuePath === "string" ? source.valuePath : "$.value";
  const labelPath = typeof source.labelPath === "string" ? source.labelPath : "$.label";
  const itemsPath = typeof source.itemsPath === "string" ? source.itemsPath : undefined;
  const collection = itemsPath ? getByPath(query.data?.data, itemsPath) : query.data?.data;
  const rows = Array.isArray(collection) ? collection : [];
  const data = rows.flatMap((row) => {
    const value = getByPath(row, valuePath);
    const optionLabel = getByPath(row, labelPath);
    return typeof value === "string" || typeof value === "number"
      ? [{ value: String(value), label: String(optionLabel ?? value) }]
      : [];
  });
  const commonProps = {
    label,
    description,
    placeholder,
    data,
    searchable: true,
    required,
    disabled: !request || query.isError,
    rightSection: query.isFetching ? "…" : undefined,
    onBlur: input.onBlur,
  };
  if (multiple) {
    return (
      <MultiSelect
        {...commonProps}
        value={Array.isArray(input.value) ? input.value.map(String) : []}
        onChange={(value) => form.setFieldValue(path, numeric ? value.map(Number) : value)}
      />
    );
  }
  return (
    <Select
      {...commonProps}
      value={input.value === undefined || input.value === null ? null : String(input.value)}
      onChange={(value) => form.setFieldValue(path, numeric && value !== null ? Number(value) : value)}
    />
  );
}

function JsonValueInput({
  label,
  description,
  required,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  required: boolean;
  value: unknown;
  onChange(value: unknown): void;
}) {
  const labels = useScopedI18n("widget.customApi.configuration");
  const [draft, setDraft] = useState(() => JSON.stringify(value ?? null, null, 2));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setDraft(JSON.stringify(value ?? null, null, 2)), [value]);
  return (
    <ConfigurationJsonEditor
      label={label}
      description={description}
      required={required}
      error={error}
      value={draft}
      height="160px"
      onChange={(next) => {
        setDraft(next);
        try {
          const parsed = JSON.parse(next) as unknown;
          setError(null);
          onChange(parsed);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : labels("invalidJson"));
        }
      }}
    />
  );
}

function ConfigurationJsonEditor({
  label,
  description,
  required,
  error,
  value,
  height,
  onChange,
}: {
  label: string;
  description?: string;
  required?: boolean;
  error?: string | null;
  value: string;
  height: string;
  onChange(value: string): void;
}) {
  const t = useScopedI18n("customWidget.editor");
  const id = useId();
  return (
    <CustomWidgetCodeEditor
      id={id}
      label={label}
      description={description}
      required={required}
      error={error}
      value={value}
      language="json"
      height={height}
      onChange={onChange}
      messages={{
        languageJsx: t("language.jsx"),
        languageJson: t("language.json"),
        undo: t("action.undo"),
        redo: t("action.redo"),
        components: t("action.components"),
        componentSearch: t("componentReference.search"),
        componentEmpty: t("componentReference.empty"),
        componentCount: (count) => t("componentReference.count", { count }),
        insertStarter: t("action.insertStarter"),
        format: t("action.format"),
        copy: t("action.copy"),
        copied: t("action.copied"),
        schema: t("action.schema"),
        schemaTab: t("reference.schema"),
        minimalTab: t("reference.minimal"),
        fullTab: t("reference.full"),
        errors: (count) => t("status.errors", { count }),
        warnings: (count) => t("status.warnings", { count }),
        ready: t("status.ready"),
        position: (cursor) => t("status.position", cursor),
        characters: (count, limit) =>
          limit ? t("status.charactersWithLimit", { count, limit }) : t("status.characters", { count }),
        diagnosticsTitle: t("diagnostics.title"),
        diagnostic: (diagnostic) => diagnostic.value ?? diagnostic.code,
      }}
    />
  );
}

function inferControl(schema: Schema) {
  if (Array.isArray(schema.enum)) return "select";
  if (schema.type === "boolean") return "switch";
  if (schema.type === "number" || schema.type === "integer") return "number";
  if (schema.format === "date") return "date";
  if (schema.format === "time") return "time";
  if (schema.format === "color") return "color";
  if (schema.format === "uri") return "url";
  return "text";
}

function getChoices(schema: Schema) {
  return Array.isArray(schema.enum)
    ? schema.enum.flatMap((value) =>
        typeof value === "string" || typeof value === "number" ? [{ value: String(value), label: String(value) }] : [],
      )
    : [];
}

function getEffectiveProperties(schema: Schema, configuration: Record<string, unknown>): Record<string, unknown> {
  const properties = isRecord(schema.properties) ? schema.properties : {};
  if (!isRecord(schema.if)) return properties;
  const branch = matchesCondition(schema.if, configuration) ? schema.then : schema.else;
  return isRecord(branch) && isRecord(branch.properties) ? { ...properties, ...branch.properties } : properties;
}

function getEffectiveRequired(schema: Schema, configuration: Record<string, unknown>) {
  const required = new Set(
    Array.isArray(schema.required) ? schema.required.filter((value): value is string => typeof value === "string") : [],
  );
  if (!isRecord(schema.if)) return required;
  const branch = matchesCondition(schema.if, configuration) ? schema.then : schema.else;
  if (isRecord(branch) && Array.isArray(branch.required)) {
    branch.required
      .filter((value): value is string => typeof value === "string")
      .forEach((value) => required.add(value));
  }
  return required;
}

function sortOptionEntries(properties: Record<string, unknown>) {
  return Object.entries(properties).toSorted((left, right) => optionOrder(left[1]) - optionOrder(right[1]));
}

function optionOrder(value: unknown) {
  if (!isRecord(value) || !isRecord(value["x-homarr"])) return 0;
  const order = value["x-homarr"].order;
  return typeof order === "number" ? order : 0;
}

function isAdvancedOption(value: unknown) {
  return isRecord(value) && isRecord(value["x-homarr"]) && value["x-homarr"].advanced === true;
}

function matchesCondition(schema: Schema, configuration: Record<string, unknown>): boolean {
  const required = Array.isArray(schema.required)
    ? schema.required.filter((value): value is string => typeof value === "string")
    : [];
  if (required.some((key) => configuration[key] === undefined)) return false;
  if (!isRecord(schema.properties)) return true;
  return Object.entries(schema.properties).every(([key, candidate]) => {
    if (!isRecord(candidate)) return true;
    const value = configuration[key];
    if (candidate.const !== undefined) return Object.is(value, candidate.const);
    return !Array.isArray(candidate.enum) || candidate.enum.some((entry) => Object.is(entry, value));
  });
}

function humanize(value: string) {
  return value
    .replaceAll(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function getByPath(value: unknown, path: string): unknown {
  const normalized = path
    .replace(/^\$\.?/u, "")
    .replaceAll(/\[(\d+)\]/gu, ".$1")
    .replaceAll(/\[['"]([^'"]+)['"]\]/gu, ".$1");
  return normalized
    .split(".")
    .filter(Boolean)
    .reduce<unknown>((current, segment) => {
      if (["__proto__", "prototype", "constructor"].includes(segment.toLowerCase())) return undefined;
      if (Array.isArray(current) && /^\d+$/u.test(segment)) return current[Number(segment)];
      return isRecord(current) ? current[segment] : undefined;
    }, value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
