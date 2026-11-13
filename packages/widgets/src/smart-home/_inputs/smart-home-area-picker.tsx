"use client";

import { useMemo } from "react";
import { Badge, Group, MultiSelect, Text } from "@mantine/core";
import type { ComboboxData, ComboboxItem, ComboboxItemGroup, ComboboxRenderPillInput } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

import type { SmartHomeCatalogIndex } from "./catalog-index";
import { getSmartHomeAreaSearchText, uniqueIds } from "./catalog-index";
import type { SmartHomePickerBaseProps } from "./picker-shared";
import {
  createSmartHomeOptionsFilter,
  SmartHomeKnownPill,
  SmartHomeMissingPill,
  useSmartHomePickerStatus,
} from "./picker-shared";

export interface SmartHomeAreaPickerProps extends SmartHomePickerBaseProps {
  value: readonly string[];
  onChange: (value: string[]) => void;
  maxValues?: number;
}

const buildAreaData = (index: SmartHomeCatalogIndex | null, selected: readonly string[]) => {
  const searchTextByValue = new Map<string, string>();
  const missing = new Set<string>();
  const ungrouped: ComboboxItem[] = [];
  const groups = new Map<string, ComboboxItemGroup<ComboboxItem>>();

  if (index) {
    for (const area of index.areas) {
      searchTextByValue.set(area.id, getSmartHomeAreaSearchText(index, area));
      const item = { value: area.id, label: area.name };
      const floor = area.floorId ? index.floorsById.get(area.floorId) : undefined;
      if (!floor) {
        ungrouped.push(item);
        continue;
      }
      const group = groups.get(floor.id) ?? { group: floor.name, items: [] };
      group.items.push(item);
      groups.set(floor.id, group);
    }
  }

  for (const id of selected) {
    if (index?.areasById.has(id)) continue;
    if (index) missing.add(id);
    ungrouped.push({ value: id, label: id });
  }

  const data: ComboboxData = [...groups.values(), ...ungrouped];
  return { data, searchTextByValue, missing };
};

export const SmartHomeAreaPicker = ({
  catalog,
  value,
  onChange,
  label,
  description,
  placeholder,
  error,
  disabled,
  maxValues,
}: SmartHomeAreaPickerProps) => {
  const t = useI18n();
  const status = useSmartHomePickerStatus(catalog, placeholder);
  const index = catalog.status === "ready" ? catalog.index : null;
  const selected = useMemo(() => uniqueIds(value), [value]);
  const { data, searchTextByValue, missing } = useMemo(() => buildAreaData(index, selected), [index, selected]);
  const filter = useMemo(() => createSmartHomeOptionsFilter(searchTextByValue), [searchTextByValue]);

  const renderPill = (input: ComboboxRenderPillInput) => {
    if (missing.has(String(input.option.value))) return <SmartHomeMissingPill {...input} />;
    return <SmartHomeKnownPill {...input} />;
  };

  return (
    <MultiSelect
      label={label}
      description={description}
      placeholder={status.placeholder}
      error={status.statusError ?? error}
      data={data}
      value={selected}
      onChange={(next) => onChange(uniqueIds(next))}
      filter={filter}
      maxValues={maxValues}
      disabled={disabled}
      readOnly={status.unavailable}
      loading={status.loading}
      searchable
      clearable={!status.unavailable}
      hidePickedOptions
      nothingFoundMessage={t("common.noResults")}
      renderPill={renderPill}
      renderOption={({ option }) => (
        <Group justify="space-between" wrap="nowrap" w="100%" gap="xs">
          <Text size="sm" truncate>
            {option.label}
          </Text>
          {index && (
            <Badge size="xs" variant="light" color="gray">
              {index.visibleEntityCountByArea.get(option.value) ?? 0}
            </Badge>
          )}
        </Group>
      )}
    />
  );
};
