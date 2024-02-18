"use client";

import { useMemo } from "react";
import type { SelectProps } from "@mantine/core";
import { Combobox, Input, InputBase, useCombobox } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";

interface BaseSelectItem {
  value: string;
  label: string;
}

export interface SelectWithCustomItemsProps<TSelectItem extends BaseSelectItem>
  extends Pick<
    SelectProps,
    "label" | "error" | "defaultValue" | "value" | "onChange" | "placeholder"
  > {
  data: TSelectItem[];
  onBlur?: (ev: React.FocusEvent<HTMLButtonElement>) => void;
  onFocus?: (ev: React.FocusEvent<HTMLButtonElement>) => void;
}

type Props<TSelectItem extends BaseSelectItem> =
  SelectWithCustomItemsProps<TSelectItem> & {
    SelectOption: React.ComponentType<TSelectItem>;
  };

export const SelectWithCustomItems = <TSelectItem extends BaseSelectItem>({
  data,
  onChange,
  value,
  defaultValue,
  placeholder,
  SelectOption,
  ...props
}: Props<TSelectItem>) => {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [_value, setValue] = useUncontrolled({
    value,
    defaultValue,
    finalValue: null,
    onChange,
  });

  const selectedOption = useMemo(
    () => data.find((item) => item.value === _value),
    [data, _value],
  );

  const options = data.map((item) => (
    <Combobox.Option value={item.value} key={item.value}>
      <SelectOption {...item} />
    </Combobox.Option>
  ));

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      onOptionSubmit={(val) => {
        setValue(
          val,
          data.find((item) => item.value === val),
        );
        console.log(val);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          {...props}
          component="button"
          type="button"
          pointer
          rightSection={<Combobox.Chevron />}
          onClick={() => combobox.toggleDropdown()}
          rightSectionPointerEvents="none"
          multiline
        >
          {selectedOption ? (
            <SelectOption {...selectedOption} />
          ) : (
            <Input.Placeholder>{placeholder}</Input.Placeholder>
          )}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>{options}</Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};
