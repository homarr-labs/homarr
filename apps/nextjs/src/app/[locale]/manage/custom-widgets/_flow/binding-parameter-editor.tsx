"use client";
import { Group, Select, Stack, Text } from "@mantine/core";
import { useI18n } from "@homarr/translation/client";
import type { BindingParameter } from "./binding-code";
import type { NativeInputSchema } from "./native-editor-model";
import { isCompatibleNativeOption } from "./native-editor-model";
import { NativeLiteralInput } from "./native-literal-input";

export function BindingParameterEditor({
  name,
  parameter,
  schema,
  options,
  inputs,
  onChange,
}: {
  name: string;
  parameter: BindingParameter;
  schema: NativeInputSchema;
  options: Record<string, unknown>;
  inputs: string[];
  onChange(value: BindingParameter): void;
}) {
  const t = useI18n("customWidget.flow");
  const optionNames = Object.keys(options).filter((key) => isCompatibleNativeOption(options[key], schema));
  let fieldSchema = schema;
  if (!schema.type) fieldSchema = { ...schema, type: typeof parameter.value };
  return (
    <Stack gap={6}>
      <Text size="sm" fw={500}>
        {name}
      </Text>
      <Group grow align="start">
        <Select
          label={t("bindingParameterSource")}
          value={parameter.mode}
          data={[
            { value: "control", label: t("bindingNewControl") },
            { value: "literal", label: t("nativeLiteral") },
            { value: "option", label: t("nativeOptionBinding"), disabled: optionNames.length === 0 },
            { value: "input", label: t("bindingExistingInput"), disabled: inputs.length === 0 },
          ]}
          onChange={(mode) => {
            if (!mode) return;
            let selected = parameter.name;
            if (mode === "option") selected = optionNames[0] ?? "";
            if (mode === "input") selected = inputs[0] ?? "";
            if (mode === "control") selected = parameter.controlName;
            onChange({ ...parameter, mode: mode as BindingParameter["mode"], name: selected });
          }}
        />
        {(parameter.mode === "option" || parameter.mode === "input") && (
          <Select
            label={t("bindingValue")}
            value={parameter.name}
            searchable
            data={parameter.mode === "option" ? optionNames : inputs}
            onChange={(value) => value && onChange({ ...parameter, name: value })}
          />
        )}
        {(parameter.mode === "literal" || parameter.mode === "control") && (
          <NativeLiteralInput
            label={t("bindingValue")}
            value={parameter.value}
            schema={fieldSchema}
            required
            disabled={false}
            onChange={(value) => onChange({ ...parameter, value })}
          />
        )}
      </Group>
      {!schema.type && (parameter.mode === "literal" || parameter.mode === "control") && (
        <Select
          label={t("bindingParameterType")}
          value={typeof parameter.value}
          data={[
            { value: "string", label: t("bindingText") },
            { value: "number", label: t("bindingNumber") },
            { value: "boolean", label: t("bindingBoolean") },
          ]}
          onChange={(type) => {
            let value: unknown = "";
            if (type === "number") value = 0;
            if (type === "boolean") value = false;
            onChange({ ...parameter, value });
          }}
        />
      )}
    </Stack>
  );
}
