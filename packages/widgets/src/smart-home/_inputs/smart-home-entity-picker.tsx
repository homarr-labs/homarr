"use client";

import { useMemo } from "react";
import { Badge, Group, MultiSelect, Select, Stack, Text, ThemeIcon } from "@mantine/core";
import type {
  ComboboxData,
  ComboboxItem,
  ComboboxItemGroup,
  ComboboxLikeRenderOptionInput,
  ComboboxRenderPillInput,
} from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import type { SmartHomeCatalogDevice } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";

import { getCatalogEntityIcon } from "../controls/semantics";
import type { SmartHomeCatalogIndex } from "./catalog-index";
import { uniqueIds } from "./catalog-index";
import type { SmartHomePickerBaseProps } from "./picker-shared";
import {
  createSmartHomeOptionsFilter,
  SmartHomeKnownPill,
  SmartHomeMissingPill,
  useSmartHomePickerStatus,
} from "./picker-shared";

const DEFAULT_OPTION_LIMIT = 150;

const devicesByCatalog = new WeakMap<object, Map<string, SmartHomeCatalogDevice>>();
const getCatalogDevice = (index: SmartHomeCatalogIndex | null, id: string | null | undefined) => {
  if (!index || !id) return undefined;
  let devices = devicesByCatalog.get(index.catalog);
  if (!devices) {
    devices = new Map((index.catalog.devices ?? []).map((device) => [device.id, device]));
    devicesByCatalog.set(index.catalog, devices);
  }
  return devices.get(id);
};

export interface SmartHomeEntityScope {
  domains?: readonly string[];
  areaIds?: readonly string[];
  includeHidden?: boolean;
  limit?: number;
}

export interface SmartHomeEntityPickerProps extends SmartHomePickerBaseProps, SmartHomeEntityScope {
  value: readonly string[];
  onChange: (value: string[]) => void;
  maxValues?: number;
}

export interface SmartHomeEntitySelectProps extends SmartHomePickerBaseProps, SmartHomeEntityScope {
  value: string | null;
  onChange: (value: string | null) => void;
  clearable?: boolean;
  /** Entities to tag in the list, e.g. those already on the card. */
  marked?: { ids: ReadonlySet<string>; label: string };
  /** Focuses the field with its list open, for an element that was just added and needs its entity. */
  openOnMount?: boolean;
}

const buildEntityData = (
  index: SmartHomeCatalogIndex | null,
  selected: readonly string[],
  { domains, areaIds, includeHidden = false }: SmartHomeEntityScope,
) => {
  const missing = new Set<string>();
  const ungrouped: ComboboxItem[] = [];
  const domainSet = domains && domains.length > 0 ? new Set(domains) : null;
  const areaSet = areaIds && areaIds.length > 0 ? new Set(areaIds) : null;
  const selectedSet = new Set(selected);
  const groups = new Map<string, ComboboxItemGroup<ComboboxItem>>(
    (index?.areas ?? []).map((area) => [area.id, { group: area.name, items: [] }]),
  );

  for (const entity of index?.entities ?? []) {
    const inScope =
      (includeHidden || !entity.hidden) &&
      (!domainSet || domainSet.has(entity.domain)) &&
      (!areaSet || (entity.areaId !== null && areaSet.has(entity.areaId)));
    if (!inScope && !selectedSet.has(entity.id)) continue;
    const item = { value: entity.id, label: entity.name };
    const group = entity.areaId ? groups.get(entity.areaId) : undefined;
    if (group) group.items.push(item);
    else ungrouped.push(item);
  }

  for (const id of selected) {
    if (index?.entitiesById.has(id)) continue;
    if (index) missing.add(id);
    ungrouped.push({ value: id, label: id });
  }

  const data: ComboboxData = [...[...groups.values()].filter((group) => group.items.length > 0), ...ungrouped];
  return { data, missing };
};

const useEntityOptions = (
  index: SmartHomeCatalogIndex | null,
  selected: readonly string[],
  { domains, areaIds, includeHidden }: SmartHomeEntityScope,
) => {
  const { data, missing } = useMemo(
    () => buildEntityData(index, selected, { domains, areaIds, includeHidden }),
    [index, selected, domains, areaIds, includeHidden],
  );
  const filter = useMemo(() => createSmartHomeOptionsFilter(index?.searchTextById ?? new Map()), [index]);
  return { data, missing, filter };
};

/**
 * One entity in a picker: what kind of thing it is at a glance, its name, and where it belongs. The technical id
 * stays searchable and shows on hover.
 */
const EntityOption = ({
  index,
  option,
  marked,
}: {
  index: SmartHomeCatalogIndex | null;
  marked?: SmartHomeEntitySelectProps["marked"];
} & ComboboxLikeRenderOptionInput<ComboboxItem>) => {
  const t = useI18n();
  const entity = index?.entitiesById.get(option.value);
  if (!entity) {
    return (
      <Text size="sm" c="dimmed" ff="monospace" truncate>
        {option.label}
      </Text>
    );
  }
  const area = entity.areaId ? index?.areasById.get(entity.areaId) : undefined;
  const device = getCatalogDevice(index, entity.deviceId);
  const Icon = getCatalogEntityIcon(entity);
  // The device is only worth repeating when the entity's own name does not already say it.
  const place = [device && !entity.name.startsWith(device.name) ? device.name : null, area?.name].filter(Boolean);
  return (
    <Group justify="space-between" wrap="nowrap" w="100%" gap="sm" title={entity.id}>
      <Group gap="sm" wrap="nowrap" miw={0}>
        <ThemeIcon size="md" radius="md" variant="light" color="gray">
          <Icon size={16} stroke={1.7} />
        </ThemeIcon>
        <Stack gap={0} miw={0}>
          <Text size="sm" truncate>
            {entity.name}
          </Text>
          {place.length > 0 && (
            <Text size="xs" c="dimmed" truncate>
              {place.join(" · ")}
            </Text>
          )}
        </Stack>
      </Group>
      {marked?.ids.has(entity.id) ? (
        <Badge size="xs" variant="light" style={{ flex: "none" }}>
          {marked.label}
        </Badge>
      ) : entity.hidden ? (
        <Badge size="xs" variant="light" color="gray" style={{ flex: "none" }}>
          {t("common.hidden")}
        </Badge>
      ) : null}
    </Group>
  );
};

export const SmartHomeEntityPicker = ({
  catalog,
  value,
  onChange,
  label,
  description,
  placeholder,
  error,
  disabled,
  maxValues,
  domains,
  areaIds,
  includeHidden,
  limit = DEFAULT_OPTION_LIMIT,
}: SmartHomeEntityPickerProps) => {
  const t = useI18n();
  const status = useSmartHomePickerStatus(catalog, placeholder);
  const index = catalog.status === "ready" ? catalog.index : null;
  const selected = useMemo(() => uniqueIds(value), [value]);
  const { data, missing, filter } = useEntityOptions(index, selected, { domains, areaIds, includeHidden });

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
      limit={limit}
      maxValues={maxValues}
      disabled={disabled}
      readOnly={status.unavailable}
      loading={status.loading}
      searchable
      clearable={!status.unavailable}
      hidePickedOptions
      maxDropdownHeight={320}
      nothingFoundMessage={t("common.noResults")}
      renderPill={renderPill}
      renderOption={(input) => <EntityOption index={index} {...input} />}
    />
  );
};

export const SmartHomeEntitySelect = ({
  catalog,
  value,
  onChange,
  label,
  description,
  placeholder,
  error,
  disabled,
  clearable = true,
  domains,
  areaIds,
  includeHidden,
  limit = DEFAULT_OPTION_LIMIT,
  marked,
  openOnMount,
}: SmartHomeEntitySelectProps) => {
  const t = useI18n();
  const status = useSmartHomePickerStatus(catalog, placeholder);
  const index = catalog.status === "ready" ? catalog.index : null;
  const selected = useMemo(() => (value ? [value] : []), [value]);
  const { data, missing, filter } = useEntityOptions(index, selected, { domains, areaIds, includeHidden });
  const isMissing = value !== null && missing.has(value);
  const resolveError = () => {
    if (status.statusError) return status.statusError;
    if (isMissing) return t("widget.smartHome-entityState.state.unavailable");
    return error;
  };

  return (
    <Select
      label={label}
      description={description}
      placeholder={status.placeholder}
      error={resolveError()}
      data={data}
      value={value}
      onChange={(next) => onChange(next)}
      filter={filter}
      limit={limit}
      disabled={disabled}
      readOnly={status.unavailable}
      loading={status.loading}
      leftSection={isMissing && <IconAlertTriangle size={14} color="var(--mantine-color-orange-6)" aria-hidden />}
      searchable
      clearable={clearable && !status.unavailable}
      // The user just added an element and picks its entity next; nothing else competes for focus then.
      // oxlint-disable-next-line jsx-a11y/no-autofocus
      autoFocus={openOnMount}
      defaultDropdownOpened={openOnMount}
      maxDropdownHeight={360}
      nothingFoundMessage={t("common.noResults")}
      renderOption={(input) => <EntityOption index={index} marked={marked} {...input} />}
    />
  );
};
