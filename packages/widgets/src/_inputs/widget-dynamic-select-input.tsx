"use client";

import { useState } from "react";
import { Group, Loader, Select } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconCheck } from "@tabler/icons-react";

import { translateIfNecessary } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";
import { getSelectIconFor } from "./widget-select-input";

export const WidgetDynamicSelectInput = ({
  property,
  kind,
  options,
  integrationIds,
}: CommonWidgetInputProps<"dynamicSelect">) => {
  const t = useI18n();
  const tWidget = useWidgetInputTranslation(kind, property);
  const form = useFormContext();
  const inputProps = form.getInputProps(`options.${property}`);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const { data: selectOptions, isLoading, error } = options.useOptions(debouncedSearch, integrationIds);
  const CurrentIcon = getSelectIconFor(selectOptions ?? [], inputProps.value as string);

  return (
    <Select
      label={tWidget("label")}
      data={selectOptions?.map((option) =>
        typeof option === "string"
          ? option
          : {
              value: option.value,
              label: translateIfNecessary(t, option.label) ?? option.value,
            },
      )}
      searchValue={search}
      onSearchChange={setSearch}
      leftSection={CurrentIcon && <CurrentIcon size={16} stroke={1.5} />}
      rightSection={isLoading ? <Loader size="sm" /> : null}
      nothingFoundMessage={error ? t("common.unableToLoad") : t("common.noResults")}
      renderOption={({ option, checked }) => {
        const Icon = getSelectIconFor(selectOptions ?? [], option.value);

        return (
          <Group flex="1" gap="xs">
            {Icon && <Icon color="currentColor" opacity={0.6} size={18} stroke={1.5} />}
            {option.label}
            {checked && (
              <IconCheck
                style={{ marginInlineStart: "auto" }}
                color="currentColor"
                opacity={0.6}
                size={18}
                stroke={1.5}
              />
            )}
          </Group>
        );
      }}
      description={options.withDescription ? tWidget("description") : undefined}
      searchable={true}
      {...inputProps}
    />
  );
};
