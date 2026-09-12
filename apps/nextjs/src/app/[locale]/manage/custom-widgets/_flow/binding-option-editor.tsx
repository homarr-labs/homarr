"use client";
import { Select, Stack, TextInput } from "@mantine/core";
import { useI18n } from "@homarr/translation/client";
import type { FlowBindingIntent } from "./connection-planner";
import { bindingDescriptor } from "./binding-code";
import type { BindingChoices } from "./binding-code";
import { readObject } from "./graph";
import { isCompatibleNativeOption, nativeInputFields } from "./native-editor-model";
import type { NativeInputSchema } from "./native-editor-model";

export function BindingOptionEditor({
  intent,
  choices,
  schema,
  onChange,
}: {
  intent: FlowBindingIntent;
  choices: BindingChoices;
  schema: NativeInputSchema;
  onChange(value: Partial<BindingChoices>): void;
}) {
  const t = useI18n("customWidget.flow");
  const fields = nativeInputFields(schema);
  const fieldSchema = fields.find((field) => field.name === choices.field)?.schema ?? {};
  let options = Object.entries(readObject(intent.snapshot.options));
  if (intent.native) options = options.filter(([, option]) => isCompatibleNativeOption(option, fieldSchema));
  const descriptor = bindingDescriptor(intent);
  const pathFields = [...String(descriptor.path ?? "").matchAll(/\{param:([A-Za-z][A-Za-z0-9_-]*)\}/gu)].map(
    (match) => match[1] ?? "",
  );
  return (
    <Stack gap="sm">
      <Select
        label={t("bindingOption")}
        searchable
        value={choices.option}
        data={options.map(([name]) => name)}
        onChange={(value) => value && onChange({ option: value })}
      />
      {intent.kind === "requestOption" && (
        <>
          {!intent.native && (
            <Select
              label={t("bindingRequestLocation")}
              value={choices.location}
              data={[
                { value: "query", label: t("bindingQueryParameter") },
                { value: "body", label: t("bindingBodyField") },
                { value: "path", label: t("bindingPathParameter"), disabled: pathFields.length === 0 },
              ]}
              onChange={(value) => {
                if (!value) return;
                let field = choices.field;
                if (value === "path") field = pathFields[0] ?? "";
                onChange({ location: value as BindingChoices["location"], field });
              }}
            />
          )}
          {intent.native && (
            <Select
              label={t("bindingRequestField")}
              searchable
              value={choices.field}
              data={fields.map(({ name }) => name)}
              onChange={(value) => value && onChange({ field: value })}
            />
          )}
          {!intent.native && choices.location === "path" && (
            <Select
              label={t("bindingRequestField")}
              value={choices.field}
              data={[...new Set(pathFields)]}
              onChange={(value) => value && onChange({ field: value })}
            />
          )}
          {!intent.native && choices.location !== "path" && (
            <TextInput
              label={t("bindingRequestField")}
              value={choices.field}
              onChange={(event) => onChange({ field: event.currentTarget.value })}
            />
          )}
        </>
      )}
    </Stack>
  );
}
