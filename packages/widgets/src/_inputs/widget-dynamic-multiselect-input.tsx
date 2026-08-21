"use client";

import { Loader, MultiSelect } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export const WidgetDynamicMultiSelectInput = ({
  property,
  kind,
  options,
}: CommonWidgetInputProps<"dynamicMultiSelect">) => {
  const t = useI18n("widget.common.select");
  const tCommon = useI18n("common");
  const tInput = useWidgetInputTranslation(kind, property);
  const form = useFormContext();
  const inputProps = form.getInputProps(`options.${property}`);
  const selectedValues = (inputProps.value as string[] | undefined) ?? [];
  const { data: selectData, isPending, isError } = options.useOptions();
  const data = [
    ...selectData,
    ...selectedValues
      .filter((selectedValue) => !selectData.some((option) => option.value === selectedValue))
      .map((selectedValue) => ({ value: selectedValue, label: selectedValue })),
  ];

  return (
    <MultiSelect
      {...inputProps}
      label={tInput("label")}
      description={options.withDescription ? tInput("description") : undefined}
      placeholder={isPending ? t("loading") : tInput("placeholder")}
      leftSection={isPending ? <Loader size="xs" /> : undefined}
      searchable
      clearable
      maxValues={options.maxValues}
      nothingFoundMessage={tCommon("noResults")}
      data={data}
      disabled={isError}
      error={isError ? t("loadError") : inputProps.error}
    />
  );
};
