"use client";

import { useEffect, useMemo } from "react";
import { Accordion, Alert, MultiSelect, Select, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { z } from "zod/v4";

import { clientApi } from "@homarr/api/client";
import { useOptionalBoard } from "@homarr/boards/context";
import { isRecord } from "@homarr/common";
import type { CustomWidgetOption } from "@homarr/custom-widgets/core";
import { normalizeCustomWidgetOptions, validateCustomWidgetOptions } from "@homarr/custom-widgets/core";
import { customWidgetPackageSchema } from "@homarr/custom-widgets/package";
import { useI18n } from "@homarr/translation/client";

import { PackageOptionField, PackageOptionFields } from "../custom-api/package-option-fields";
import { PackageConnectionBindings } from "../custom-api/package-connection-bindings";
export { JsonOption } from "../custom-api/package-json-option";

import type { CommonWidgetInputProps } from "./common";
import { useFormContext } from "./form";

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
  const packageDefinition = useMemo(() => {
    const entry: unknown = definition;
    if (!isRecord(entry) || entry.packageVersion !== 3) return;
    const connections = customWidgetPackageSchema.shape.connections.safeParse(entry.connections);
    const bindings = z.record(z.string(), z.string()).safeParse(entry.installationBindings);
    if (!connections.success || !bindings.success) return;
    return { connections: connections.data, installationBindings: bindings.data };
  }, [definition]);
  const isPackage = Boolean(packageDefinition);
  const definitionVersion = definition?.updatedAt instanceof Date ? definition.updatedAt.getTime() : undefined;
  const configurationVersion = form.values.options.configurationVersion;
  const needsDefinitionRepair =
    !isPackage && definitionVersion !== undefined && configurationVersion !== definitionVersion;
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

  if (!definitionId || !options) return null;
  if (packageDefinition)
    return (
      <Stack gap="md">
        <PackageConnectionBindings
          connections={packageDefinition.connections}
          installationBindings={packageDefinition.installationBindings}
          value={
            isRecord(form.values.options.connectionBindings)
              ? (form.values.options.connectionBindings as Record<string, string>)
              : {}
          }
          onChange={(value) => form.setFieldValue("options.connectionBindings", value)}
        />
        <PackageOptionFields
          schema={options}
          value={effectiveConfiguration}
          onChange={(value) => form.setFieldValue(`options.${property}`, value)}
        />
      </Stack>
    );
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
      {regular.map(([name, option]) => (
        <OptionField
          key={`${definitionId}:${name}`}
          option={option}
          path={`options.${property}.${name}`}
          configuration={effectiveConfiguration}
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
                    key={`${definitionId}:${name}`}
                    option={option}
                    path={`options.${property}.${name}`}
                    configuration={effectiveConfiguration}
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
  if (option.choicesFrom)
    return <DynamicOptionField option={option} path={path} configuration={configuration} definitionId={definitionId} />;
  return (
    <PackageOptionField
      identity={`${definitionId}:${path}`}
      option={option}
      value={form.getInputProps(path).value}
      onChange={(value) => form.setFieldValue(path, value)}
    />
  );
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
