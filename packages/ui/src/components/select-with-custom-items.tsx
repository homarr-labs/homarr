"use client";

import { useCallback, useMemo, useState } from "react";
import type { SelectProps } from "@mantine/core";
import { Combobox, ComboboxClearButton, Input, InputBase, ScrollArea, useCombobox } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";

interface BaseSelectItem {
  value: string;
  label: string;
}

export interface SelectWithCustomItemsProps<TSelectItem extends BaseSelectItem> extends Pick<
  SelectProps,
  "label" | "error" | "defaultValue" | "value" | "onChange" | "placeholder" | "clearable"
> {
  data: TSelectItem[];
  description?: string;
  withAsterisk?: boolean;
  onBlur?: (event: React.FocusEvent<HTMLButtonElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLButtonElement>) => void;
  w?: string;
  withinPortal?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  nothingFoundMessage?: string;
}

type Props<TSelectItem extends BaseSelectItem> = SelectWithCustomItemsProps<TSelectItem> & {
  SelectOption: React.ComponentType<TSelectItem & { checked?: boolean }>;
};

export const SelectWithCustomItems = <TSelectItem extends BaseSelectItem>({
  data,
  onChange,
  value,
  defaultValue,
  placeholder,
  SelectOption,
  w,
  clearable,
  withinPortal = false,
  searchable = false,
  searchPlaceholder,
  nothingFoundMessage,
  ...props
}: Props<TSelectItem>) => {
  const [search, setSearch] = useState("");
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch("");
    },
    onDropdownOpen: () => {
      if (searchable) combobox.focusSearchInput();
    },
  });

  const [selectedValue, setValue] = useUncontrolled({
    value,
    defaultValue,
    finalValue: null,
    onChange,
  });

  const selectedOption = useMemo(() => data.find((item) => item.value === selectedValue), [data, selectedValue]);

  const normalizedSearch = search.toLocaleLowerCase().trim();
  const filteredData = data.filter((item) => !searchable || item.label.toLocaleLowerCase().includes(normalizedSearch));
  const options = filteredData.map((item) => (
    <Combobox.Option value={item.value} key={item.value} active={item.value === selectedValue}>
      <SelectOption {...item} checked={item.value === selectedValue} />
    </Combobox.Option>
  ));

  const toggle = useCallback(() => combobox.toggleDropdown(), [combobox]);
  const onOptionSubmit = useCallback(
    (nextValue: string) => {
      setValue(
        nextValue,
        data.find((item) => item.value === nextValue),
      );
      combobox.closeDropdown();
      if (searchable) combobox.focusTarget();
    },
    [setValue, data, combobox, searchable],
  );

  const isClearable = clearable && Boolean(selectedValue);

  return (
    <Combobox store={combobox} withinPortal={withinPortal} onOptionSubmit={onOptionSubmit}>
      <Combobox.Target targetType="button">
        <InputBase
          {...props}
          component="button"
          type="button"
          pointer
          __clearSection={<ComboboxClearButton onClear={() => setValue(null, null)} />}
          __clearable={isClearable}
          __defaultRightSection={<Combobox.Chevron />}
          onClick={toggle}
          rightSectionPointerEvents={isClearable ? "all" : "none"}
          multiline
          w={w}
        >
          {selectedOption ? <SelectOption {...selectedOption} /> : <Input.Placeholder>{placeholder}</Input.Placeholder>}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        {searchable && (
          <>
            <Combobox.Search
              value={search}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              onChange={(event) => {
                setSearch(event.currentTarget.value);
                combobox.updateSelectedOptionIndex();
              }}
              onBlur={() => combobox.closeDropdown()}
              onKeyDown={(event) => {
                if (event.key === "Escape") combobox.focusTarget();
              }}
            />
            <Combobox.Options>
              <ScrollArea.Autosize mah="min(250px, 50dvh)" type="scroll">
                {options}
                {options.length === 0 && <Combobox.Empty>{nothingFoundMessage}</Combobox.Empty>}
              </ScrollArea.Autosize>
            </Combobox.Options>
          </>
        )}
        {!searchable && <Combobox.Options>{options}</Combobox.Options>}
      </Combobox.Dropdown>
    </Combobox>
  );
};
