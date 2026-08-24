"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button, Center, Combobox, Group, Loader, ScrollArea, useCombobox } from "@mantine/core";
import type { ButtonProps } from "@mantine/core";

export interface AccessPickerOption<T> {
  value: string;
  label: string;
  keywords?: readonly string[];
  content: ReactNode;
  item: T;
}

export type AccessPickerTriggerProps = Omit<ButtonProps, "children" | "loading" | "onClick" | "type">;

interface AccessPickerProps<T> {
  label: string;
  searchPlaceholder: string;
  emptyMessage: string;
  triggerLabel: string;
  options: AccessPickerOption<T>[];
  isPending: boolean;
  onSelect: (option: AccessPickerOption<T>) => void | Promise<void>;
  triggerProps?: AccessPickerTriggerProps;
}

export const AccessPicker = <T,>({
  label,
  searchPlaceholder,
  emptyMessage,
  triggerLabel,
  options,
  isPending,
  onSelect,
  triggerProps,
}: AccessPickerProps<T>) => {
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch("");
      requestAnimationFrame(() => combobox.focusTarget());
    },
    onDropdownOpen: () => {
      combobox.selectFirstOption();
      requestAnimationFrame(() => combobox.focusSearchInput());
    },
  });

  const normalizedSearch = search.trim().toLowerCase();
  const filteredOptions = options.filter((option) => {
    if (!normalizedSearch) return true;

    const searchableText = [option.label, ...(option.keywords ?? [])].join(" ").toLowerCase();
    return searchableText.includes(normalizedSearch);
  });
  const visibleOptions = filteredOptions.slice(0, 5);

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
            {!isPending && filteredOptions.length === 0 && <Combobox.Empty>{emptyMessage}</Combobox.Empty>}
            {!isPending &&
              visibleOptions.map((option) => (
                <Combobox.Option value={option.value} key={option.value}>
                  {option.content}
                </Combobox.Option>
              ))}
          </Combobox.Options>
        </ScrollArea.Autosize>
      </Combobox.Dropdown>
    </Combobox>
  );
};

const LoaderPlaceholder = () => <Loader size="sm" />;
