"use client";

import { MultiSelect, Text } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export const WidgetIntegrationMultiSelectInput = ({
  property,
  kind,
  options,
}: CommonWidgetInputProps<"integrationMultiSelect">) => {
  const t = useI18n("widget.integrationSelect");
  const tSelect = useI18n("widget.common.select");
  const tCommon = useI18n("common");
  const tInput = useWidgetInputTranslation(kind, property);
  const form = useFormContext();

  const integrationIds = form.values.integrationIds as string[];
  const inputProps = form.getInputProps(`options.${property}`);
  const selectedValues = (inputProps.value as string[] | undefined) ?? [];

  const { data: selectData = [], isPending, isError } = options.useOptions(integrationIds);
  const data = [
    ...selectData,
    ...selectedValues
      .filter((selectedValue) => !selectData.some((option) => option.value === selectedValue))
      .map((selectedValue) => ({ value: selectedValue, label: selectedValue })),
  ];

  if (integrationIds.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {t("configureIntegrationFirst")}
      </Text>
    );
  }

  const description = options.withDescription ? tInput("description") : undefined;
  const placeholder = isPending ? tSelect("loading") : tInput("placeholder");
  const loadError = isError ? tSelect("loadError") : undefined;

  return (
    <MultiSelect
      {...inputProps}
      label={tInput("label")}
      description={description}
      placeholder={placeholder}
      searchable
      clearable
      nothingFoundMessage={tCommon("noResults")}
      data={data}
      disabled={isError}
      error={loadError ?? inputProps.error}
    />
  );
};
