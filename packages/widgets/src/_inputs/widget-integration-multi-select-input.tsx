"use client";

import { MultiSelect, Text } from "@mantine/core";

import { useScopedI18n } from "@homarr/translation/client";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

const useIntegrationSelectTranslation = () => useScopedI18n("widget.integrationSelect");

export const WidgetIntegrationMultiSelectInput = ({
  property,
  kind,
  options,
}: CommonWidgetInputProps<"integrationMultiSelect">) => {
  const t = useIntegrationSelectTranslation();
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
  const placeholder = isPending ? t("loading") : tInput("placeholder");
  const loadError = isError ? t("loadError") : undefined;

  return (
    <MultiSelect
      {...inputProps}
      label={tInput("label")}
      description={description}
      placeholder={placeholder}
      searchable
      clearable
      nothingFoundMessage={t("noResults")}
      data={data}
      disabled={isError}
      error={loadError ?? inputProps.error}
    />
  );
};
