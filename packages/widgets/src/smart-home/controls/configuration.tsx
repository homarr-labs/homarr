"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import { IconCube, IconDevices, IconHome, IconStack2, IconX } from "@tabler/icons-react";

import type { SmartHomeCatalogEntity } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import { useFormContext } from "../../_inputs/form";
import { searchSmartHomeEntities, SmartHomeAreaPicker, SmartHomeEntitySelect, useSmartHomeCatalog } from "../_inputs";
import type { SmartHomeCatalogState } from "../_inputs";
import { areaIcons } from "./semantics";
import { toSmartHomeDomain } from "./types";
import type { SmartHomeBlock } from "./types";

export interface BlockCatalog {
  integrationId: string | null;
  state: SmartHomeCatalogState;
}

export const useBlockCatalog = (integrationId: string | null | undefined): BlockCatalog => ({
  integrationId: integrationId ?? null,
  state: useSmartHomeCatalog(integrationId),
});

const useFormBlockCatalog = () => useBlockCatalog(useFormContext().values.integrationIds[0]);

const livePrefix = "live:";
const entityPrefix = "entity:";
const areasPrefix = "areas:";
const devicePrefix = "device:";

const withSource = (body: string, source: string | null) => {
  if (source === null) return body;
  return `${livePrefix}${source}:${body}`;
};

export const createEntityBlockId = (entityId: string, source: string | null) =>
  withSource(`${entityPrefix}${entityId}`, source);

export const createAreasBlockId = (areaIds: readonly string[], source: string | null) =>
  withSource(`${areasPrefix}${areaIds.join(",")}`, source);

const labelSeparator = "?label=";

/** A device block can carry its own name for the card, e.g. "Left blind" instead of the device's name. */
export const createDeviceBlockId = (deviceId: string, source: string | null, label?: string | null) => {
  const name = label?.trim();
  const suffix = name ? `${labelSeparator}${encodeURIComponent(name)}` : "";
  return withSource(`${devicePrefix}${deviceId}${suffix}`, source);
};

const decodeLabel = (value: string) => {
  try {
    return decodeURIComponent(value) || null;
  } catch {
    return null;
  }
};

const splitSource = (id: string) => {
  if (!id.startsWith(livePrefix)) return { source: null, body: id };
  const rest = id.slice(livePrefix.length);
  const separator = rest.indexOf(":");
  if (separator <= 0) return null;
  return { source: rest.slice(0, separator), body: rest.slice(separator + 1) };
};

export const parseBlockId = (id: string): SmartHomeBlock | null => {
  const parts = splitSource(id);
  if (!parts) return null;
  const { source, body } = parts;
  if (body.startsWith(entityPrefix)) {
    const entityId = body.slice(entityPrefix.length);
    if (!entityId) return null;
    return { kind: "entity", id, source, entityId };
  }
  if (body.startsWith(areasPrefix)) {
    const areaIds = [...new Set(body.slice(areasPrefix.length).split(",").filter(Boolean))];
    if (areaIds.length === 0) return null;
    return { kind: "areas", id, source, areaIds };
  }
  if (body.startsWith(devicePrefix)) {
    const rest = body.slice(devicePrefix.length);
    const separator = rest.indexOf(labelSeparator);
    const deviceId = separator === -1 ? rest : rest.slice(0, separator);
    if (!deviceId) return null;
    const label = separator === -1 ? null : decodeLabel(rest.slice(separator + labelSeparator.length));
    return { kind: "device", id, source, deviceId, label };
  }
  return null;
};

export const parseSourceBlocks = (blockIds: readonly string[], source: string | null) =>
  blockIds.flatMap((id) => parseBlockId(id) ?? []).filter((block) => block.source === source);

export interface BlockContentFilter {
  roomDomains: readonly string[];
  excludedEntityIds: readonly string[];
}

export const countCatalogBlocks = (
  blockIds: readonly string[],
  catalog: BlockCatalog,
  filter: BlockContentFilter,
): ReadonlyMap<string, number> | null => {
  if (catalog.state.status !== "ready") return null;
  const { index } = catalog.state;
  const blocks = parseSourceBlocks(blockIds, catalog.integrationId);
  const claimed = new Set(blocks.flatMap((block) => (block.kind === "entity" ? [block.entityId] : [])));
  const excluded = new Set(filter.excludedEntityIds);
  const placed = new Set<string>();
  const counts = new Map<string, number>();
  const entities = [...index.entitiesById.values()].filter((entity) => !entity.hidden);

  for (const block of blocks) {
    if (block.kind === "entity") {
      const known = index.entitiesById.has(block.entityId) && !placed.has(block.entityId);
      placed.add(block.entityId);
      counts.set(block.id, Number(known));
      continue;
    }
    if (block.kind === "device") {
      const members = entities.filter(
        (entity) =>
          entity.deviceId === block.deviceId &&
          !claimed.has(entity.id) &&
          !excluded.has(entity.id) &&
          !placed.has(entity.id),
      );
      members.forEach((entity) => placed.add(entity.id));
      counts.set(block.id, members.length);
      continue;
    }
    const areaIds = new Set(block.areaIds);
    const members = entities.filter(
      (entity) =>
        entity.areaId !== null &&
        areaIds.has(entity.areaId) &&
        (filter.roomDomains.length === 0 || filter.roomDomains.includes(toSmartHomeDomain(entity.domain).domain)) &&
        !claimed.has(entity.id) &&
        !excluded.has(entity.id) &&
        !placed.has(entity.id),
    );
    members.forEach((entity) => placed.add(entity.id));
    counts.set(block.id, members.length);
  }
  return counts;
};

export interface SmartHomeBlockListItem {
  id: string;
}

export const useBlockListData = (ids: string[]) => {
  const data = useMemo(() => ids.map((id) => ({ id })), [ids]);
  return { data, isLoading: false, error: null };
};

export const useCatalogEntityOptions = () => {
  const { state } = useFormBlockCatalog();
  const index = state.status === "ready" ? state.index : null;
  const data = useMemo(() => {
    if (!index) return [];
    return searchSmartHomeEntities(index, {}).map((entity) => {
      const area = index.areasById.get(entity.areaId ?? "");
      return { value: entity.id, label: [entity.name, area?.name, entity.id].filter(Boolean).join(" · ") };
    });
  }, [index]);
  return { data, isPending: state.status === "loading", isError: state.status === "error" };
};

interface BlockRowProps {
  id: string;
  catalog: BlockCatalog;
  count: number | undefined;
  onRemove: () => void;
  removeLabel: string;
  rootAttributes?: DraggableAttributes;
  handle?: ReactNode;
}

type BlockIssue = "otherSource" | "missing" | "empty" | null;

export function BlockRow({ id, catalog, count, onRemove, removeLabel, rootAttributes, handle }: BlockRowProps) {
  const t = useI18n("widget.smartHome-controls.block");
  const index = catalog.state.status === "ready" ? catalog.state.index : null;
  const block = parseBlockId(id);

  let title = id;
  let detail = t("kind.unknown");
  let Icon: TablerIcon = IconCube;
  let issue: BlockIssue = block ? null : "missing";

  if (block?.kind === "entity") {
    const entity = index?.entitiesById.get(block.entityId);
    const area = index?.areasById.get(entity?.areaId ?? "");
    title = entity?.name ?? block.entityId;
    detail = [t("kind.entity"), area?.name ?? t("noArea"), block.entityId].join(" · ");
    if (index && !entity) issue = "missing";
  }

  if (block?.kind === "areas") {
    title = block.areaIds.map((areaId) => index?.areasById.get(areaId)?.name ?? areaId).join(" + ");
    const parts = [t("kind.room")];
    Icon = areaIcons[block.areaIds[0] ?? ""] ?? IconHome;
    if (block.areaIds.length > 1) {
      parts[0] = t("kind.mergedRooms");
      Icon = IconStack2;
    }
    if (count !== undefined) parts.push(t("entityCount", { count }));
    detail = parts.join(" · ");
    if (index && block.areaIds.some((areaId) => !index.areasById.has(areaId))) issue = "missing";
  }

  if (block?.kind === "device") {
    const device = index?.catalog.devices?.find((candidate) => candidate.id === block.deviceId);
    const area = index?.areasById.get(device?.areaId ?? "");
    title = block.label ?? device?.name ?? block.deviceId;
    Icon = IconDevices;
    const parts = [t("kind.device"), area?.name ?? t("noArea")];
    if (block.label && device) parts.splice(1, 0, device.name);
    if (count !== undefined) parts.push(t("entityCount", { count }));
    detail = parts.join(" · ");
    if (index && !device) issue = "missing";
  }

  if (block && block.source !== catalog.integrationId) issue = "otherSource";
  if (!issue && count === 0) issue = "empty";

  return (
    <Group {...rootAttributes} justify="space-between" wrap="nowrap">
      <Group wrap="nowrap" miw={0} gap="sm">
        {handle}
        <ThemeIcon variant="light" color={issue ? "orange" : "gray"} radius="xl" size="lg">
          <Icon size={18} stroke={1.7} />
        </ThemeIcon>
        <Stack gap={0} miw={0}>
          <Text fw={600} truncate>
            {title}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {detail}
          </Text>
        </Stack>
      </Group>
      <Group gap="xs" wrap="nowrap">
        {issue && (
          <Badge color="orange" variant="light">
            {t(`issue.${issue}`)}
          </Badge>
        )}
        <ActionIcon variant="subtle" color="red" onClick={onRemove} aria-label={removeLabel}>
          <IconX size="var(--mantine-font-size-xl)" />
        </ActionIcon>
      </Group>
    </Group>
  );
}

const toStrings = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
};

const useFormBlockCounts = (catalog: BlockCatalog) => {
  const { options } = useFormContext().values;
  const { blocks, roomDomains, excludedEntityIds } = options;
  return useMemo(
    () =>
      countCatalogBlocks(toStrings(blocks), catalog, {
        roomDomains: toStrings(roomDomains),
        excludedEntityIds: toStrings(excludedEntityIds),
      }),
    [blocks, roomDomains, excludedEntityIds, catalog],
  );
};

interface BlockListItemProps {
  item: SmartHomeBlockListItem;
  removeItem: () => void;
  removeLabel: string;
  rootAttributes: DraggableAttributes;
  handle: ReactNode;
}

export function BlockListItem({ item, removeItem, removeLabel, rootAttributes, handle }: BlockListItemProps) {
  const catalog = useFormBlockCatalog();
  const counts = useFormBlockCounts(catalog);
  return (
    <BlockRow
      id={item.id}
      catalog={catalog}
      count={counts?.get(item.id)}
      onRemove={removeItem}
      removeLabel={removeLabel}
      rootAttributes={rootAttributes}
      handle={handle}
    />
  );
}

interface BlockAddButtonProps {
  addItem: (item: SmartHomeBlockListItem) => void;
  values: string[];
}

export function BlockAddButton({ addItem, values }: BlockAddButtonProps) {
  const catalog = useFormBlockCatalog();
  const form = useFormContext();
  const onAdd = (ids: string[], visibility?: DeviceEntityVisibility) => {
    ids.forEach((id) => addItem({ id }));
    if (!visibility) return;
    const { options } = form.getValues();
    const excluded = toStrings(options.excludedEntityIds);
    form.setFieldValue("options", { ...options, excludedEntityIds: applyDeviceVisibility(excluded, visibility) });
  };
  return <BlockAdder catalog={catalog} values={values} onAdd={onAdd} />;
}

type AddMode = "rooms" | "device" | "entity";

interface BlockAdderProps {
  catalog: BlockCatalog;
  values: readonly string[];
  /** `visibility`: the entities the user ticked and unticked while adding a device. */
  onAdd: (ids: string[], visibility?: DeviceEntityVisibility) => void;
}

const toAreaSetKey = (areaIds: readonly string[]) => areaIds.toSorted().join(",");

/** Devices grouped by room, for the device picker. */
const DEVICE_HINT_ENTITIES = 3;

/** Removes the device name that entity names repeat: "Power · Living room" or "Living room Power". */
const withoutDeviceName = (name: string, deviceName: string) =>
  name.replace(` · ${deviceName}`, "").replace(`${deviceName} `, "").trim() || name;

// Controls first, so the hint reads like what the device is: "Cover, Power, Energy +6".
const hintRank = (entity: SmartHomeCatalogEntity) => {
  const { domain } = toSmartHomeDomain(entity.domain);
  return domain === "sensor" || domain === "binary_sensor" ? 1 : 0;
};

/** Devices grouped by room for the device picker, each with a hint so same-named devices can be told apart. */
const useDeviceOptions = (catalog: BlockCatalog) => {
  const t = useI18n("widget.smartHome-controls.block");
  const index = catalog.state.status === "ready" ? catalog.state.index : null;
  return useMemo(() => {
    const hints = new Map<string, string>();
    if (!index) return { data: [], hints };
    const members = new Map<string, SmartHomeCatalogEntity[]>();
    for (const entity of index.entities) {
      if (!entity.deviceId || entity.hidden) continue;
      members.set(entity.deviceId, [...(members.get(entity.deviceId) ?? []), entity]);
    }
    const groups = new Map<string, { value: string; label: string }[]>();
    for (const device of index.catalog.devices ?? []) {
      const group = index.areasById.get(device.areaId ?? "")?.name ?? t("noArea");
      const items = groups.get(group) ?? [];
      items.push({ value: device.id, label: device.name });
      groups.set(group, items);
      // The main entity usually carries just the device's name, which tells nothing new here.
      const entities = (members.get(device.id) ?? [])
        .filter((entity) => entity.name !== device.name)
        .toSorted((left, right) => hintRank(left) - hintRank(right));
      const names = entities
        .slice(0, DEVICE_HINT_ENTITIES)
        .map((entity) => withoutDeviceName(entity.name, device.name));
      const more = entities.length - names.length;
      const contents = more > 0 ? `${names.join(", ")} +${more}` : names.join(", ");
      hints.set(device.id, [device.model, contents].filter(Boolean).join(" · "));
    }
    const data = [...groups.entries()]
      .toSorted(([left], [right]) => left.localeCompare(right))
      .map(([group, items]) => ({ group, items }));
    return { data, hints };
  }, [index, t]);
};

/** Which of a device's entities the user ticked (shown) and unticked (hidden) while adding it. */
export interface DeviceEntityVisibility {
  shown: string[];
  hidden: string[];
}

/** The hidden entities after adding a device: unticked ones join them, ticked ones leave them; others stay. */
export const applyDeviceVisibility = (excluded: readonly string[], { shown, hidden }: DeviceEntityVisibility) => [
  ...new Set([...excluded.filter((id) => !shown.includes(id)), ...hidden]),
];

interface DeviceBlockSetupProps {
  catalog: BlockCatalog;
  deviceId: string;
  onAdd: (label: string, visibility: DeviceEntityVisibility) => void;
}

/** After picking a device: an optional name for its card and which of its entities to show. */
function DeviceBlockSetup({ catalog, deviceId, onAdd }: DeviceBlockSetupProps) {
  const t = useI18n("widget.smartHome-controls.block");
  const index = catalog.state.status === "ready" ? catalog.state.index : null;
  const device = index?.catalog.devices?.find((candidate) => candidate.id === deviceId);
  const entities = useMemo(
    () => (index?.entities ?? []).filter((entity) => entity.deviceId === deviceId && !entity.hidden),
    [index, deviceId],
  );
  const [label, setLabel] = useState("");
  const [shown, setShown] = useState<string[]>(() => entities.map((entity) => entity.id));
  const shortName = (name: string) => (device ? withoutDeviceName(name, device.name) : name);

  return (
    <Stack gap="xs">
      <TextInput
        label={t("add.deviceName")}
        placeholder={device?.name}
        value={label}
        onChange={(event) => setLabel(event.currentTarget.value)}
      />
      <Checkbox.Group label={t("add.deviceEntities")} value={shown} onChange={setShown}>
        <Stack gap={6} mt={4}>
          {entities.map((entity) => (
            <Checkbox key={entity.id} value={entity.id} label={shortName(entity.name)} />
          ))}
        </Stack>
      </Checkbox.Group>
      <Group justify="flex-end">
        <Button
          size="xs"
          disabled={shown.length === 0}
          onClick={() =>
            onAdd(label, {
              shown,
              hidden: entities.filter((entity) => !shown.includes(entity.id)).map((entity) => entity.id),
            })
          }
        >
          {t("add.submit")}
        </Button>
      </Group>
    </Stack>
  );
}

export function BlockAdder(props: BlockAdderProps) {
  return <SourceBlockAdder key={props.catalog.integrationId} {...props} />;
}

function SourceBlockAdder({ catalog, values, onAdd }: BlockAdderProps) {
  const t = useI18n("widget.smartHome-controls.block");
  const [mode, setMode] = useState<AddMode>("rooms");
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [merge, setMerge] = useState(true);
  const [entityPickerKey, setEntityPickerKey] = useState(0);
  const [notice, setNotice] = useState<"duplicate" | "duplicateDevice" | "covered" | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const source = catalog.integrationId;
  const ready = catalog.state.status === "ready";
  const existing = parseSourceBlocks(values, source);
  const explicitEntityIds = new Set(existing.flatMap((block) => (block.kind === "entity" ? [block.entityId] : [])));
  const existingAreaSets = new Set(
    existing.flatMap((block) => (block.kind === "areas" ? [toAreaSetKey(block.areaIds)] : [])),
  );
  const coveredAreaIds = new Set(existing.flatMap((block) => (block.kind === "areas" ? block.areaIds : [])));
  const existingDeviceIds = new Set(existing.flatMap((block) => (block.kind === "device" ? [block.deviceId] : [])));
  const deviceOptions = useDeviceOptions(catalog);

  const chooseDevice = (id: string | null) => {
    setDeviceId(id);
    setNotice(id && existingDeviceIds.has(id) ? "duplicateDevice" : null);
  };

  const addDevice = (label: string, visibility: DeviceEntityVisibility) => {
    if (!ready || !deviceId || existingDeviceIds.has(deviceId)) return;
    setNotice(null);
    onAdd([createDeviceBlockId(deviceId, source, label)], visibility);
    setDeviceId(null);
  };

  const addEntity = (entityId: string | null) => {
    if (!ready) return;
    setEntityPickerKey((key) => key + 1);
    if (!entityId) return;
    if (explicitEntityIds.has(entityId)) {
      setNotice("duplicate");
      return;
    }
    setNotice(null);
    onAdd([createEntityBlockId(entityId, source)]);
  };

  const addRooms = () => {
    if (!ready) return;
    const groups = merge ? [areaIds] : areaIds.map((areaId) => [areaId]);
    const fresh = groups.filter(
      (group) => !existingAreaSets.has(toAreaSetKey(group)) && group.some((areaId) => !coveredAreaIds.has(areaId)),
    );
    setNotice(fresh.length < groups.length ? "covered" : null);
    if (fresh.length > 0) onAdd(fresh.map((group) => createAreasBlockId(group, source)));
    setAreaIds([]);
  };

  return (
    <Stack gap="xs">
      <SegmentedControl<AddMode>
        size="xs"
        value={mode}
        onChange={setMode}
        data={[
          { value: "rooms", label: t("add.rooms") },
          { value: "device", label: t("add.device") },
          { value: "entity", label: t("add.entity") },
        ]}
      />
      {mode === "device" && (
        <>
          <Select
            label={t("add.deviceLabel")}
            placeholder={t("add.devicePlaceholder")}
            data={deviceOptions.data}
            renderOption={({ option }) => (
              <Stack gap={0} miw={0}>
                <Text size="sm" truncate>
                  {option.label}
                </Text>
                <Text size="xs" c="dimmed" truncate>
                  {deviceOptions.hints.get(option.value)}
                </Text>
              </Stack>
            )}
            value={deviceId}
            onChange={chooseDevice}
            searchable
            clearable
            disabled={!ready}
            nothingFoundMessage={t("add.noDevices")}
            comboboxProps={{ withinPortal: true }}
          />
          {deviceId && !existingDeviceIds.has(deviceId) && (
            <DeviceBlockSetup key={deviceId} catalog={catalog} deviceId={deviceId} onAdd={addDevice} />
          )}
        </>
      )}
      {mode === "entity" && (
        <SmartHomeEntitySelect
          key={entityPickerKey}
          catalog={catalog.state}
          label={t("add.entityLabel")}
          placeholder={t("add.entityPlaceholder")}
          value={null}
          onChange={addEntity}
          clearable={false}
        />
      )}
      {mode === "rooms" && (
        <>
          <SmartHomeAreaPicker
            catalog={catalog.state}
            label={t("add.roomsLabel")}
            placeholder={t("add.roomsPlaceholder")}
            value={areaIds}
            onChange={setAreaIds}
          />
          <Group justify="space-between" wrap="nowrap">
            <Checkbox
              label={t("add.merge")}
              checked={merge}
              onChange={(event) => setMerge(event.currentTarget.checked)}
              disabled={areaIds.length < 2}
            />
            <Button size="xs" onClick={addRooms} disabled={!ready || areaIds.length === 0}>
              {t("add.submit")}
            </Button>
          </Group>
        </>
      )}
      {notice && (
        <Text size="xs" c="orange">
          {t(`add.${notice}`)}
        </Text>
      )}
    </Stack>
  );
}
