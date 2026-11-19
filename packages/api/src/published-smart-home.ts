/** Saved control blocks define a publication boundary, independent of the browser UI. */
const entityPattern = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const knownDomains = new Set([
  "light",
  "switch",
  "fan",
  "climate",
  "humidifier",
  "cover",
  "valve",
  "lock",
  "alarm_control_panel",
  "media_player",
  "camera",
  "vacuum",
  "scene",
  "script",
  "automation",
  "button",
  "input_boolean",
  "input_select",
  "person",
  "binary_sensor",
  "sensor",
  "weather",
  "sun",
  "update",
]);
const aliases: Record<string, string> = { select: "input_select", input_button: "button" };
const record = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
};
const strings = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
};
const unique = (values: string[]) => [...new Set(values)].toSorted();

export function createPublishedSmartHomeRead(
  integrationId: string,
  options: Readonly<Record<string, unknown>>,
  catalogDomains: readonly string[] = [],
) {
  const entityIds: string[] = [];
  const areaIds: string[] = [];
  const prefix = `live:${integrationId}:`;
  for (const block of strings(options.blocks)) {
    if (!block.startsWith(prefix)) continue;
    const body = block.slice(prefix.length);
    if (body.startsWith("entity:")) {
      const id = body.slice("entity:".length);
      if (entityPattern.test(id)) entityIds.push(id);
    }
    if (body.startsWith("areas:")) areaIds.push(...body.slice("areas:".length).split(",").filter(Boolean));
  }
  const explicit = unique(entityIds);
  const areas = unique(areaIds);
  const exclusions = unique(strings(options.excludedEntityIds));
  const roomDomains = unique(strings(options.roomDomains));
  if (
    (explicit.length === 0 && areas.length === 0) ||
    explicit.length > 200 ||
    areas.length > 50 ||
    exclusions.length > 400 ||
    exclusions.some((id) => !entityPattern.test(id)) ||
    areas.some((id) => id.length > 255) ||
    roomDomains.some((domain) => domain.length > 64)
  )
    return null;
  const domains = new Set(roomDomains);
  if (domains.has("input_select")) domains.add("select");
  if (domains.has("button")) domains.add("input_button");
  if (domains.has("sensor")) {
    for (const domain of catalogDomains) {
      if (domain.length <= 64 && !knownDomains.has(domain) && !aliases[domain]) domains.add(domain);
    }
  }
  if (domains.size > 400) return null;
  const selection = {
    entityIds: explicit,
    areaIds: areas,
    domains: [...domains].toSorted(),
    excludedEntityIds: exclusions,
  };
  const matchesEntity = (value: unknown) => {
    const entity = record(value);
    if (typeof entity.id !== "string" || !entityPattern.test(entity.id)) return false;
    if (explicit.includes(entity.id)) return true;
    if (entity.hidden === true || typeof entity.areaId !== "string" || !areas.includes(entity.areaId)) return false;
    if (exclusions.includes(entity.id)) return false;
    const domain = String(entity.domain);
    let displayDomain = domain;
    if (aliases[domain]) displayDomain = aliases[domain];
    else if (!knownDomains.has(domain)) displayDomain = "sensor";
    return roomDomains.length === 0 || roomDomains.includes(displayDomain);
  };
  const projectAreas = (values: unknown, entities: readonly unknown[]): Record<string, unknown>[] => {
    const visibleIds = new Set(entities.map((entity) => record(entity).id));
    const visibleAreas = new Set([...areas, ...entities.map((entity) => record(entity).areaId)]);
    if (!Array.isArray(values)) return [];
    return values
      .filter((area) => visibleAreas.has(record(area).id))
      .map((area) => {
        const entry = record(area);
        let temperatureEntityId: unknown = null;
        let humidityEntityId: unknown = null;
        if (visibleIds.has(entry.temperatureEntityId)) temperatureEntityId = entry.temperatureEntityId;
        if (visibleIds.has(entry.humidityEntityId)) humidityEntityId = entry.humidityEntityId;
        return { ...entry, temperatureEntityId, humidityEntityId };
      });
  };
  const projectCatalog = (value: unknown) => {
    const catalog = record(value);
    const entities = (Array.isArray(catalog.entities) ? catalog.entities : []).filter(matchesEntity).slice(0, 400);
    const projectedAreas = projectAreas(catalog.areas, entities);
    const floorIds = new Set(projectedAreas.map((area) => area.floorId));
    const floors = (Array.isArray(catalog.floors) ? catalog.floors : []).filter((floor) =>
      floorIds.has(record(floor).id),
    );
    return { entities, areas: projectedAreas, floors };
  };
  return { selection, matchesEntity, projectAreas, projectCatalog };
}
