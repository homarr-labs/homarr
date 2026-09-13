"use client";

import { Select, Stack, TextInput } from "@mantine/core";
import { useI18n } from "@homarr/translation/client";
import { customWidgetIdentifierSchema } from "@homarr/custom-widgets/core";
import { isRecord } from "../_custom-widget-form-utils";
import { isCompatibleNativeOption, nativeLiteralDefault } from "./native-editor-model";
import type { NativeInputSchema } from "./native-editor-model";
import { NativeLiteralInput } from "./native-literal-input";

export function NativeInputField({
  name,
  schema,
  required,
  value,
  options,
  disabled,
  onChange,
}: {
  name: string;
  schema: NativeInputSchema;
  required: boolean;
  value: unknown;
  options: Record<string, unknown>;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  const t = useI18n("customWidget.flow");
  let mode = "literal";
  if (value === undefined && !required) mode = "default";
  if (isRecord(value) && typeof value.$option === "string") mode = "option";
  if (isRecord(value) && typeof value.$param === "string") mode = "param";
  const choices = [
    { value: "literal", label: t("nativeLiteral") },
    { value: "option", label: t("nativeOptionBinding") },
  ];
  if (schema.type !== "array" && schema.type !== "object")
    choices.push({ value: "param", label: t("nativeParamBinding") });
  if (!required) choices.unshift({ value: "default", label: t("nativeUseDefault") });
  const optionChoices = Object.entries(options)
    .filter(([, option]) => isCompatibleNativeOption(option, schema))
    .map(([id, option]) => ({
      value: id,
      label: isRecord(option) && typeof option.label === "string" ? `${option.label} (${id})` : id,
    }));
  const reference = isRecord(value) ? value : {};
  return (
    <Stack gap="xs">
      <Select
        label={name}
        required={required}
        value={mode}
        data={choices}
        disabled={disabled}
        onChange={(next) => {
          if (next === "default") onChange(undefined);
          if (next === "literal") onChange(nativeLiteralDefault(schema));
          if (next === "option") onChange({ $option: optionChoices[0]?.value ?? "" });
          if (next === "param") onChange({ $param: name });
        }}
      />
      {mode === "literal" && (
        <NativeLiteralInput
          label={t("nativeInputValue", { name })}
          schema={schema}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
        />
      )}
      {mode === "option" && (
        <Select
          label={t("nativeOptionBinding")}
          searchable
          data={optionChoices}
          disabled={disabled}
          value={typeof reference.$option === "string" ? reference.$option : null}
          error={!optionChoices.some((option) => option.value === reference.$option) && t("nativeMissingOption")}
          onChange={(id) => {
            if (id) onChange({ $option: id });
          }}
        />
      )}
      {mode === "param" && (
        <TextInput
          label={t("nativeParameterName")}
          disabled={disabled}
          value={String(reference.$param ?? "")}
          description={t("nativeParameterHelp")}
          error={!customWidgetIdentifierSchema.safeParse(reference.$param).success && t("nativeInvalidId")}
          onChange={(event) => onChange({ $param: event.currentTarget.value })}
        />
      )}
    </Stack>
  );
}
