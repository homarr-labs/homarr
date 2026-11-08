"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button, Center, Combobox, Group, Loader, ScrollArea, useCombobox } from "@mantine/core";
import type { ButtonProps } from "@mantine/core";

export interface AccessPickerOption<T> {
  value: string;
  label: string;
  keywords?: readonly string[];
  item: T;
}

export type AccessPickerTriggerProps = Omit<ButtonProps, "children" | "loading" | "onClick" | "type">;

interface AccessPickerProps<T> {
  label: string;
  searchPlaceholder: string;
  emptyMessage: string;
  triggerLabel: string;
  options: AccessPickerOption<T>[];
  renderOption: (option: AccessPickerOption<T>) => ReactNode;
  isPending: boolean;
  onOpenedChange: (opened: boolean) => void;
  onSelect: (option: AccessPickerOption<T>) => void | Promise<void>;
  triggerProps?: AccessPickerTriggerProps;
}

export const AccessPicker = <T,>({
  label,
  searchPlaceholder,
  emptyMessage,
  triggerLabel,
  options,
  renderOption,
  isPending,
  onOpenedChange,
  onSelect,
  triggerProps,
}: AccessPickerProps<T>) => {
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const combobox = useCombobox({
    onDropdownClose: () => {
      onOpenedChange(false);
      combobox.resetSelectedOption();
      setSearch("");
      requestAnimationFrame(() => combobox.focusTarget());
    },
    onDropdownOpen: () => {
      onOpenedChange(true);
      combobox.selectFirstOption();
      requestAnimationFrame(() => combobox.focusSearchInput());
    },
  });

  const normalizedSearch = search.trim().toLowerCase();
  const visibleOptions: AccessPickerOption<T>[] = [];
  if (combobox.dropdownOpened) {
    for (const option of options) {
      if (normalizedSearch) {
        const searchableText = [option.label, ...(option.keywords ?? [])].join(" ").toLowerCase();
        if (!searchableText.includes(normalizedSearch)) continue;
      }

      visibleOptions.push(option);
      if (visibleOptions.length === 5) break;
    }
  }

  const handleSelect = (value: string) => {
    const option = options.find((item) => item.value === value);
    if (!option || isSubmitting) return;

    combobox.closeDropdown();
    setIsSubmitting(true);

    const submit = async () => {
      try {
        await onSelect(option);
      } finally {
        setIsSubmitting(false);
      }
    };

    void submit().catch(() => undefined);
  };

  return (
    <Combobox store={combobox} onOptionSubmit={handleSelect} width="target" withinPortal>
      <Combobox.Target targetType="button">
        <Button
          {...triggerProps}
          onClick={() => combobox.toggleDropdown()}
          rightSection={
            <Group gap={4} wrap="nowrap">
              {triggerProps?.rightSection}
              <Combobox.Chevron />
            </Group>
          }
          loading={isSubmitting}
          disabled={isSubmitting || triggerProps?.disabled}
        >
          {triggerLabel}
        </Button>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Search
          value={search}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            combobox.updateSelectedOptionIndex();
          }}
          placeholder={searchPlaceholder}
          aria-label={label}
        />
        <ScrollArea.Autosize mah={300} type="auto">
          <Combobox.Options>
            {isPending && (
              <Center p="md">
                <LoaderPlaceholder />
              </Center>
            )}
            {!isPending && visibleOptions.length === 0 && <Combobox.Empty>{emptyMessage}</Combobox.Empty>}
            {!isPending &&
              visibleOptions.map((option) => (
                <Combobox.Option value={option.value} key={option.value}>
                  {renderOption(option)}
                </Combobox.Option>
              ))}
          </Combobox.Options>
        </ScrollArea.Autosize>
      </Combobox.Dropdown>
    </Combobox>
  );
};

const LoaderPlaceholder = () => <Loader size="sm" />;
