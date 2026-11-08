"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import { ActionIcon, Badge, Button, Checkbox, Group, SegmentedControl, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconCube, IconHome, IconStack2, IconX } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import { useFormContext } from "../../_inputs/form";
import {
  createSmartHomeCatalogIndex,
  searchSmartHomeEntities,
  SmartHomeAreaPicker,
  SmartHomeEntitySelect,
  useSmartHomeCatalog,
} from "../_inputs";
import type { SmartHomeCatalogState } from "../_inputs";
import { prototypeAreas, prototypeEntities } from "./fixtures";
import { areaIcons } from "./semantics";
import { toPrototypeDomain } from "./types";
import type { PrototypeBlock, PrototypeConfiguration, PrototypeOptionsPatch } from "./types";

export interface PrototypeCatalog {
  source: "fixture" | "live";
  integrationId: string | null;
  state: SmartHomeCatalogState;
}

const toFloorId = (name: string) => name.toLowerCase().replaceAll(" ", "_");

const fixtureFloorNames = [...new Set(prototypeAreas.flatMap((area) => (area.floor ? [area.floor] : [])))];

const fixtureCatalog: PrototypeCatalog = {
  source: "fixture",
  integrationId: null,
  state: {
    status: "ready",
    isRefreshing: false,
    refresh: () => undefined,
    index: createSmartHomeCatalogIndex({
      floors: fixtureFloorNames.map((name, level) => ({ id: toFloorId(name), name, level, icon: null })),
      areas: prototypeAreas.map((area) => ({
        id: area.id,
        name: area.name,
        floorId: area.floor && toFloorId(area.floor),
        icon: null,
        temperatureEntityId: area.temperatureEntityId,
        humidityEntityId: area.humidityEntityId,
      })),
      entities: prototypeEntities.map((entity) => ({
        id: entity.id,
        domain: entity.domain,
        name: entity.name,
        areaId: entity.areaId,
        icon: entity.icon,
        deviceClass: entity.deviceClass,
        hidden: false,
      })),
    }),
  },
};

export const usePrototypeCatalog = (integrationId: string | null | undefined): PrototypeCatalog => {
  const live = useSmartHomeCatalog(integrationId);
  if (live.status === "idle" || !integrationId) return fixtureCatalog;
  return { source: "live", integrationId, state: live };
};

const useFormPrototypeCatalog = () => usePrototypeCatalog(useFormContext().values.integrationIds[0]);

const livePrefix = "live:";
const entityPrefix = "entity:";
const areasPrefix = "areas:";

const withSource = (body: string, source: string | null) => {
  if (source === null) return body;
  return `${livePrefix}${source}:${body}`;
};

export const createEntityBlockId = (entityId: string, source: string | null) =>
  withSource(`${entityPrefix}${entityId}`, source);

export const createAreasBlockId = (areaIds: readonly string[], source: string | null) =>
  withSource(`${areasPrefix}${areaIds.join(",")}`, source);

const splitSource = (id: string) => {
  if (!id.startsWith(livePrefix)) return { source: null, body: id };
  const rest = id.slice(livePrefix.length);
  const separator = rest.indexOf(":");
  if (separator <= 0) return null;
  return { source: rest.slice(0, separator), body: rest.slice(separator + 1) };
};

export const parseBlockId = (id: string): PrototypeBlock | null => {
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
  catalog: PrototypeCatalog,
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
    const areaIds = new Set(block.areaIds);
    const members = entities.filter(
      (entity) =>
        entity.areaId !== null &&
        areaIds.has(entity.areaId) &&
        (filter.roomDomains.length === 0 || filter.roomDomains.includes(toPrototypeDomain(entity.domain).domain)) &&
        !claimed.has(entity.id) &&
        !excluded.has(entity.id) &&
        !placed.has(entity.id),
    );
    members.forEach((entity) => placed.add(entity.id));
    counts.set(block.id, members.length);
  }
  return counts;
};

interface PrototypeConfigurationContextValue {
  configuration: PrototypeConfiguration;
  onChange: (patch: PrototypeOptionsPatch) => void;
}

const PrototypeConfigurationContext = createContext<PrototypeConfigurationContextValue | null>(null);

export const PrototypeConfigurationProvider = ({
  value,
  onChange,
  children,
}: {
  value: PrototypeConfiguration;
  onChange: PrototypeConfigurationContextValue["onChange"];
  children: ReactNode;
}) => {
  const context = useMemo(() => ({ configuration: value, onChange }), [value, onChange]);
  return <PrototypeConfigurationContext.Provider value={context}>{children}</PrototypeConfigurationContext.Provider>;
};

export const usePrototypeConfiguration = () => useContext(PrototypeConfigurationContext);

export interface PrototypeBlockListItem {
  id: string;
}

export const useBlockListData = (ids: string[]) => {
  const data = useMemo(() => ids.map((id) => ({ id })), [ids]);
  return { data, isLoading: false, error: null };
};

export const useCatalogEntityOptions = () => {
  const { state } = useFormPrototypeCatalog();
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
  catalog: PrototypeCatalog;
  count: number | undefined;
  onRemove: () => void;
  removeLabel: string;
  rootAttributes?: DraggableAttributes;
  handle?: ReactNode;
}

type BlockIssue = "otherSource" | "missing" | "empty" | null;

export function BlockRow({ id, catalog, count, onRemove, removeLabel, rootAttributes, handle }: BlockRowProps) {
  const t = useI18n("widget.smartHome-prototype.block");
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

const useFormBlockCounts = (catalog: PrototypeCatalog) => {
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
  item: PrototypeBlockListItem;
  removeItem: () => void;
  removeLabel: string;
  rootAttributes: DraggableAttributes;
  handle: ReactNode;
}

export function BlockListItem({ item, removeItem, removeLabel, rootAttributes, handle }: BlockListItemProps) {
  const catalog = useFormPrototypeCatalog();
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
  addItem: (item: PrototypeBlockListItem) => void;
  values: string[];
}

export function BlockAddButton({ addItem, values }: BlockAddButtonProps) {
  const catalog = useFormPrototypeCatalog();
  return <BlockAdder catalog={catalog} values={values} onAdd={(ids) => ids.forEach((id) => addItem({ id }))} />;
}

type AddMode = "rooms" | "entity";

interface BlockAdderProps {
  catalog: PrototypeCatalog;
  values: readonly string[];
  onAdd: (ids: string[]) => void;
}

const toAreaSetKey = (areaIds: readonly string[]) => areaIds.toSorted().join(",");

export function BlockAdder({ catalog, values, onAdd }: BlockAdderProps) {
  const t = useI18n("widget.smartHome-prototype.block");
  const [mode, setMode] = useState<AddMode>("rooms");
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [merge, setMerge] = useState(true);
  const [entityPickerKey, setEntityPickerKey] = useState(0);
  const [notice, setNotice] = useState<"duplicate" | "covered" | null>(null);
  const source = catalog.integrationId;
  const existing = parseSourceBlocks(values, source);
  const explicitEntityIds = new Set(existing.flatMap((block) => (block.kind === "entity" ? [block.entityId] : [])));
  const existingAreaSets = new Set(
    existing.flatMap((block) => (block.kind === "areas" ? [toAreaSetKey(block.areaIds)] : [])),
  );
  const coveredAreaIds = new Set(existing.flatMap((block) => (block.kind === "areas" ? block.areaIds : [])));

  const addEntity = (entityId: string | null) => {
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
      <Text size="xs" c={catalog.source === "fixture" ? "orange" : "dimmed"}>
        {t(`source.${catalog.source}`)}
      </Text>
      <SegmentedControl<AddMode>
        size="xs"
        value={mode}
        onChange={setMode}
        data={[
          { value: "rooms", label: t("add.rooms") },
          { value: "entity", label: t("add.entity") },
        ]}
      />
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
            <Button size="xs" onClick={addRooms} disabled={areaIds.length === 0}>
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
