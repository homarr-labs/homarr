"use client";

import {
  Accordion,
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

import type { CustomWidgetOption, CustomWidgetOptions } from "@homarr/custom-widgets/core";
import { IconPicker } from "@homarr/forms-collection";
import { useI18n } from "@homarr/translation/client";

import { JsonOption } from "./package-json-option";

export function PackageOptionFields({
  schema,
  value,
  onChange,
}: {
  schema: CustomWidgetOptions;
  value: Record<string, unknown>;
  onChange(value: Record<string, unknown>): void;
}) {
  const t = useI18n("widget.customApi.configuration");
  const render = ([name, option]: [string, CustomWidgetOption]) => (
    <PackageOptionField
      key={name}
      identity={name}
      option={option}
      value={Object.hasOwn(value, name) ? value[name] : option.default}
      onChange={(next) => onChange({ ...value, [name]: next })}
    />
  );
  const entries = Object.entries(schema);
  const advanced = entries.filter(([, option]) => option.advanced);
  return (
    <Stack gap="md">
      {entries.filter(([, option]) => !option.advanced).map(render)}
      {advanced.length > 0 && (
        <Accordion variant="contained">
          <Accordion.Item value="advanced">
            <Accordion.Control>{t("advancedOptions")}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">{advanced.map(render)}</Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      )}
    </Stack>
  );
}

export function PackageOptionField({
  identity,
  option,
  value,
  onChange,
}: {
  identity: string;
  option: CustomWidgetOption;
  value: unknown;
  onChange(value: unknown): void;
}) {
  const common = { label: option.label, description: option.description };
  const textValue = typeof value === "string" ? value : "";
  const numberValue = typeof value === "number" ? value : 0;
  if (option.control === "switch")
    return <Switch {...common} checked={value === true} onChange={(event) => onChange(event.currentTarget.checked)} />;
  if (option.control === "number" || option.control === "duration")
    return (
      <NumberInput
        {...common}
        min={option.min}
        max={option.max}
        step={option.step}
        value={numberValue}
        onChange={onChange}
      />
    );
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
        <Slider
          aria-label={option.label}
          min={option.min ?? 0}
          max={option.max ?? 100}
          step={option.step ?? 1}
          value={numberValue}
          onChange={onChange}
        />
      </Stack>
    );
  const choices = option.choices?.map((choice) => ({ label: choice.label, value: String(choice.value) })) ?? [];
  // V3 dynamic configuration lives in its configuration entrypoint, never in the legacy request executor.
  if (option.control === "select")
    return (
      <Select
        {...common}
        data={choices}
        value={value == null ? null : String(value)}
        onChange={(next) => onChange(coerceChoice(next, option))}
      />
    );
  if (option.control === "multiSelect")
    return (
      <MultiSelect
        {...common}
        data={choices}
        value={Array.isArray(value) ? value.map(String) : []}
        onChange={(next) => onChange(next.map((entry) => coerceChoice(entry, option)))}
      />
    );
  if (option.control === "textarea")
    return (
      <Textarea
        {...common}
        autosize
        minRows={3}
        value={textValue}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    );
  if (option.control === "color") return <ColorInput {...common} value={textValue} onChange={onChange} />;
  if (option.control === "date")
    return (
      <DateInput
        {...common}
        valueFormat="YYYY-MM-DD"
        value={textValue || null}
        onChange={(next) => onChange(next ?? "")}
      />
    );
  if (option.control === "time")
    return <TimeInput {...common} value={textValue} onChange={(event) => onChange(event.currentTarget.value)} />;
  if (option.control === "icon") return <IconPicker withAsterisk={false} value={textValue} onChange={onChange} />;
  if (option.control === "timeZone")
    return (
      <Select
        {...common}
        searchable
        data={Intl.supportedValuesOf("timeZone")}
        value={textValue}
        onChange={(next) => onChange(next ?? "")}
      />
    );
  if (option.control === "json")
    return (
      <JsonOption
        identity={identity}
        editorId={`${identity}-json-option`}
        {...common}
        value={value}
        onChange={onChange}
      />
    );
  return (
    <TextInput
      {...common}
      type={option.control === "url" ? "url" : "text"}
      value={textValue}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
}

function coerceChoice(value: string | null, option: CustomWidgetOption) {
  if (value === null) return null;
  if (
    typeof option.default === "number" ||
    option.choices?.some((choice) => typeof choice.value === "number" && String(choice.value) === value)
  )
    return Number(value);
  return value;
}
