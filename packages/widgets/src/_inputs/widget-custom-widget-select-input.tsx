"use client";

import { useMemo, useState } from "react";
import { Combobox, InputBase, Loader, useCombobox } from "@mantine/core";

import { clientApi } from "@homarr/api/client";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export const WidgetCustomWidgetSelectInput = ({
  property,
  kind,
  options,
}: CommonWidgetInputProps<"customWidgetSelect">) => {
  const t = useWidgetInputTranslation(kind, property);
  const form = useFormContext();
  const { data, isLoading } = clientApi.customWidget.all.useQuery();
  const [search, setSearch] = useState("");

  const currentValue = form.values.options[property] as string;

  const definitions = useMemo(
    () =>
      (data ?? [])
        .filter((def) => def.enabled || def.id === currentValue)
        .map((def) => ({ value: def.id, label: def.name })),
    [data, currentValue],
  );

  const filteredOptions = useMemo(
    () =>
      definitions.filter(
        (def) =>
          def.label.toLowerCase().includes(search.toLowerCase()) ||
          def.value.toLowerCase().includes(search.toLowerCase()),
      ),
    [definitions, search],
  );

  const selectedLabel = definitions.find((d) => d.value === currentValue)?.label;

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch("");
    },
  });

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        form.setFieldValue(`options.${property}`, val);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          label={t("label")}
          description={options.withDescription ? t("description") : undefined}
          rightSection={isLoading ? <Loader size="xs" /> : <Combobox.Chevron />}
          rightSectionPointerEvents="none"
          value={combobox.dropdownOpened ? search : (selectedLabel ?? currentValue)}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            form.setFieldValue(`options.${property}`, event.currentTarget.value);
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => combobox.closeDropdown()}
          placeholder={t("label")}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {filteredOptions.map((def) => (
            <Combobox.Option key={def.value} value={def.value} active={def.value === currentValue}>
              {def.label}
            </Combobox.Option>
          ))}
          {filteredOptions.length === 0 && !isLoading && <Combobox.Empty>No definitions found</Combobox.Empty>}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};
