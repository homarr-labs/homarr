"use client";

import { useMemo } from "react";
import { Alert, Stack } from "@mantine/core";

import { isRecord } from "@homarr/common";
import { customWidgetOptionsSchema } from "@homarr/custom-widgets/core";
import type { CustomWidgetOption } from "@homarr/custom-widgets/core";
import { useWidgetOptions, useWidgetQuery, useWidgetServices } from "@homarr/widget-sdk";

import { PackageOptionField } from "./package-option-fields";

export function LegacyConfiguration({
  schema,
  parameterNames = {},
}: {
  schema: unknown;
  parameterNames?: Record<string, string[]>;
}) {
  const options = useWidgetOptions();
  const services = useWidgetServices();
  const parsed = useMemo(() => customWidgetOptionsSchema.parse(schema), [schema]);
  return (
    <Stack gap="md">
      {Object.entries(parsed).map(([name, option]) => (
        <LegacyOption
          key={name}
          name={name}
          option={option}
          parameterNames={parameterNames[option.choicesFrom?.request ?? ""] ?? []}
          value={options[name] ?? option.default}
          onChange={(value) => {
            void services
              .updateOptions({ ...options, [name]: value })
              .catch((error: unknown) =>
                services.notify({ title: option.label, message: String(error), color: "red" }),
              );
          }}
        />
      ))}
    </Stack>
  );
}

function LegacyOption({
  name,
  option,
  value,
  onChange,
  parameterNames,
}: {
  name: string;
  option: CustomWidgetOption;
  value: unknown;
  onChange(value: unknown): void;
  parameterNames: string[];
}) {
  const options = useWidgetOptions();
  const source = option.choicesFrom;
  const query = useWidgetQuery<{ data: unknown }>(
    source?.request ?? "",
    {
      params: Object.fromEntries(parameterNames.map((key) => [key, options[key]])),
      optionValues: options,
    },
    { enabled: Boolean(source), staleTime: 30_000 },
  );
  let renderedOption = option;
  if (source) {
    const rows = source.itemsPath ? getByPath(query.data?.data, source.itemsPath) : query.data?.data;
    const choices = (Array.isArray(rows) ? rows : []).flatMap((row) => {
      const entry = getByPath(row, source.valuePath);
      if (typeof entry !== "string" && typeof entry !== "number") return [];
      return [{ value: entry, label: String(getByPath(row, source.labelPath) ?? entry) }];
    });
    // Preserve the selected value while fetching or when the upstream omits a formerly valid option.
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (
        (typeof entry === "string" || typeof entry === "number") &&
        !choices.some((choice) => String(choice.value) === String(entry))
      )
        choices.push({ value: entry, label: String(entry) });
    }
    renderedOption = { ...option, choices, choicesFrom: undefined };
  }
  return (
    <Stack gap={4}>
      {query.error && <Alert color="red">{query.error.message}</Alert>}
      <PackageOptionField identity={name} option={renderedOption} value={value} onChange={onChange} />
    </Stack>
  );
}

function getByPath(value: unknown, path: string): unknown {
  return path
    .replace(/^\$\.?/u, "")
    .split(".")
    .filter(Boolean)
    .reduce<unknown>((current, segment) => (isRecord(current) ? current[segment] : undefined), value);
}
