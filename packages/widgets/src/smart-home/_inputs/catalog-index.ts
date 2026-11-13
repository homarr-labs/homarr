import type {
  SmartHomeArea,
  SmartHomeCatalog,
  SmartHomeCatalogEntity,
  SmartHomeFloor,
} from "@homarr/integrations/types";

export const SMART_HOME_MAX_RESOLVED_ENTITIES = 400;

export interface SmartHomeCatalogIndex {
  catalog: SmartHomeCatalog;
  entities: readonly SmartHomeCatalogEntity[];
  areas: readonly SmartHomeArea[];
  floors: readonly SmartHomeFloor[];
  domains: readonly string[];
  entitiesById: ReadonlyMap<string, SmartHomeCatalogEntity>;
  areasById: ReadonlyMap<string, SmartHomeArea>;
  floorsById: ReadonlyMap<string, SmartHomeFloor>;
  visibleEntityCountByArea: ReadonlyMap<string, number>;
  searchTextById: ReadonlyMap<string, string>;
}

export interface SmartHomeEntitySearch {
  query?: string;
  domains?: readonly string[];
  areaIds?: readonly string[];
  includeHidden?: boolean;
  limit?: number;
}

export interface SmartHomeSelection {
  areaIds: readonly string[];
  entityIds: readonly string[];
  excludedEntityIds?: readonly string[];
  domains?: readonly string[];
}

export type SmartHomeResolvedEntity =
  | { source: "entity"; entity: SmartHomeCatalogEntity }
  | { source: "area"; entity: SmartHomeCatalogEntity; areaId: string }
  | { source: "unassigned"; entity: SmartHomeCatalogEntity };

export interface SmartHomeResolvedSelection {
  entities: SmartHomeResolvedEntity[];
  excludedEntityIds: string[];
  missingEntityIds: string[];
  missingAreaIds: string[];
  truncated: boolean;
}

export const normalizeSmartHomeSearchText = (value: string) =>
  value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();

const normalizeText = normalizeSmartHomeSearchText;

const compareFloors = (left: SmartHomeFloor | undefined, right: SmartHomeFloor | undefined) => {
  if (left === right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  const levelDifference = (left.level ?? Number.MAX_SAFE_INTEGER) - (right.level ?? Number.MAX_SAFE_INTEGER);
  if (levelDifference !== 0) return levelDifference;
  return left.name.localeCompare(right.name);
};

export const uniqueIds = (ids: readonly string[]): string[] => [...new Set(ids)];

export const tokenizeSmartHomeSearch = (query: string): string[] =>
  normalizeText(query)
    .split(/[\s,]+/)
    .filter((token) => token.length > 0);

export const matchesSmartHomeSearch = (searchText: string, tokens: readonly string[]) =>
  tokens.every((token) => searchText.includes(token));

export const createSmartHomeCatalogIndex = (catalog: SmartHomeCatalog): SmartHomeCatalogIndex => {
  const floorsById = new Map(catalog.floors.map((floor) => [floor.id, floor]));
  const areas = catalog.areas.toSorted((left, right) => {
    const floorOrder = compareFloors(
      left.floorId ? floorsById.get(left.floorId) : undefined,
      right.floorId ? floorsById.get(right.floorId) : undefined,
    );
    if (floorOrder !== 0) return floorOrder;
    return left.name.localeCompare(right.name);
  });
  const areasById = new Map(areas.map((area) => [area.id, area]));
  const entitiesById = new Map(catalog.entities.map((entity) => [entity.id, entity]));
  const visibleEntityCountByArea = new Map<string, number>();
  const searchTextById = new Map<string, string>();

  for (const entity of catalog.entities) {
    const area = entity.areaId ? areasById.get(entity.areaId) : undefined;
    const floor = area?.floorId ? floorsById.get(area.floorId) : undefined;
    if (area && !entity.hidden) {
      visibleEntityCountByArea.set(area.id, (visibleEntityCountByArea.get(area.id) ?? 0) + 1);
    }
    searchTextById.set(
      entity.id,
      normalizeText(
        [entity.name, entity.id, entity.domain, entity.deviceClass, area?.name, floor?.name]
          .filter((part): part is string => typeof part === "string" && part.length > 0)
          .join(" "),
      ),
    );
  }

  return {
    catalog,
    entities: catalog.entities,
    areas,
    floors: catalog.floors.toSorted(compareFloors),
    domains: uniqueIds(catalog.entities.map((entity) => entity.domain)).toSorted(),
    entitiesById,
    areasById,
    floorsById,
    visibleEntityCountByArea,
    searchTextById,
  };
};

export const getSmartHomeAreaSearchText = (index: SmartHomeCatalogIndex, area: SmartHomeArea) => {
  const floor = area.floorId ? index.floorsById.get(area.floorId) : undefined;
  return normalizeText([area.name, area.id, floor?.name].filter(Boolean).join(" "));
};

export const searchSmartHomeEntities = (
  index: SmartHomeCatalogIndex,
  { query = "", domains, areaIds, includeHidden = false, limit = Number.POSITIVE_INFINITY }: SmartHomeEntitySearch,
): SmartHomeCatalogEntity[] => {
  const tokens = tokenizeSmartHomeSearch(query);
  const domainSet = domains && domains.length > 0 ? new Set(domains) : null;
  const areaSet = areaIds && areaIds.length > 0 ? new Set(areaIds) : null;
  const result: SmartHomeCatalogEntity[] = [];

  for (const entity of index.entities) {
    if (result.length >= limit) break;
    if (entity.hidden && !includeHidden) continue;
    if (domainSet && !domainSet.has(entity.domain)) continue;
    if (areaSet && (entity.areaId === null || !areaSet.has(entity.areaId))) continue;
    if (!matchesSmartHomeSearch(index.searchTextById.get(entity.id) ?? "", tokens)) continue;
    result.push(entity);
  }

  return result;
};

export const partitionSmartHomeIds = <TValue>(ids: readonly string[], known: ReadonlyMap<string, TValue>) => {
  const unique = uniqueIds(ids);
  return {
    known: unique.filter((id) => known.has(id)),
    missing: unique.filter((id) => !known.has(id)),
  };
};

export const resolveSmartHomeSelection = (
  index: SmartHomeCatalogIndex,
  { areaIds, entityIds, excludedEntityIds = [], domains }: SmartHomeSelection,
): SmartHomeResolvedSelection => {
  const excluded = new Set(excludedEntityIds);
  const domainSet = domains && domains.length > 0 ? new Set(domains) : null;
  const entityPartition = partitionSmartHomeIds(entityIds, index.entitiesById);
  const areaPartition = partitionSmartHomeIds(areaIds, index.areasById);
  const includeAll = entityIds.length === 0 && areaIds.length === 0;
  const seen = new Set<string>();
  const resolved: SmartHomeResolvedEntity[] = [];

  const push = (item: SmartHomeResolvedEntity) => {
    if (seen.has(item.entity.id) || excluded.has(item.entity.id)) return;
    seen.add(item.entity.id);
    resolved.push(item);
  };

  for (const id of entityPartition.known) {
    const entity = index.entitiesById.get(id);
    if (entity) push({ source: "entity", entity });
  }

  const memberAreaIds = includeAll ? index.areas.map((area) => area.id) : areaPartition.known;
  const membersByArea = new Map<string, SmartHomeCatalogEntity[]>(memberAreaIds.map((areaId) => [areaId, []]));
  for (const entity of index.entities) {
    if (entity.hidden || entity.areaId === null) continue;
    if (domainSet && !domainSet.has(entity.domain)) continue;
    membersByArea.get(entity.areaId)?.push(entity);
  }
  for (const areaId of memberAreaIds) {
    for (const entity of membersByArea.get(areaId) ?? []) push({ source: "area", entity, areaId });
  }

  if (includeAll) {
    for (const entity of index.entities) {
      if (entity.hidden || entity.areaId !== null) continue;
      if (domainSet && !domainSet.has(entity.domain)) continue;
      push({ source: "unassigned", entity });
    }
  }

  return {
    entities: resolved.slice(0, SMART_HOME_MAX_RESOLVED_ENTITIES),
    excludedEntityIds: uniqueIds(excludedEntityIds),
    missingEntityIds: entityPartition.missing,
    missingAreaIds: areaPartition.missing,
    truncated: resolved.length > SMART_HOME_MAX_RESOLVED_ENTITIES,
  };
};
