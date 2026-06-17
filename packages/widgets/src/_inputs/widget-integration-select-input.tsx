"use client";

import { Select, Text } from "@mantine/core";

import { useScopedI18n } from "@homarr/translation/client";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

const useIntegrationSelectTranslation = () => useScopedI18n("widget.integrationSelect");

export const WidgetIntegrationSelectInput = ({
  property,
  kind,
  options,
}: CommonWidgetInputProps<"integrationSelect">) => {
  const t = useIntegrationSelectTranslation();
  const tInput = useWidgetInputTranslation(kind, property);
  const form = useFormContext();

  const integrationIds = form.values.integrationIds as string[];

  const { data: selectData = [], isPending, isError } = options.useOptions(integrationIds);
  const currentValue = form.getInputProps(`options.${property}`).value as string;
  const hasCurrentInData = !currentValue || selectData.some((opt) => opt.value === currentValue);
  const data = hasCurrentInData ? selectData : [...selectData, { value: currentValue, label: currentValue }];

  if (integrationIds.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {t("configureIntegrationFirst")}
      </Text>
    );
  }

  const description = options.withDescription ? tInput("description") : undefined;
  const placeholder = isPending ? t("loading") : t("placeholder");
  const error = isError ? t("loadError") : undefined;

  return (
    <Select
      label={tInput("label")}
      description={description}
      placeholder={placeholder}
      clearable={options.clearable}
      searchable={options.searchable}
      nothingFoundMessage={t("noResults")}
      data={data}
      disabled={isError}
      error={error}
      {...form.getInputProps(`options.${property}`)}
    />
  );
};
