import { needsCode } from "./control-center/capabilities";
import { getPrimaryAction, isUnavailable, requiresConfirmation } from "./semantics";
import { isSensorLike } from "./technical/meta";
import { haDomains } from "./types";
import type { HaAction, HaEntity, SmartHomeReadingOrder } from "./types";

export interface DevicePanelItem {
  kind: "device";
  id: string;
  name: string;
  primary: HaEntity;
  readings: HaEntity[];
  readingOrder: SmartHomeReadingOrder;
  showGraph: boolean;
  showKeyValue: boolean;
}

export type PanelItem = { kind: "entity"; id: string; entity: HaEntity } | DevicePanelItem;

// One-shot actions such as "Reset meter" or "Identify" belong in the readings, never on the main tile.
const launchDomains = new Set(["button", "scene", "script", "update"]);

const primaryTier = (entity: HaEntity) => {
  if (launchDomains.has(entity.domain)) return 2;
  if (entity.readOnly === true || isSensorLike(entity)) return 1;
  return 0;
};

const primaryRank = (entity: HaEntity) => {
  const tier = primaryTier(entity);
  return [
    tier,
    Number(entity.device?.entityName !== null),
    // A sensor-only device leads with its key measurement (temperature) rather than e.g. its battery.
    tier === 1 ? getReadingPriority(entity) : 0,
    haDomains.indexOf(entity.domain),
  ];
};

const comparePrimary = (left: HaEntity, right: HaEntity) => {
  const a = primaryRank(left);
  const b = primaryRank(right);
  for (let index = 0; index < a.length; index++) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
};

export type ReadingControl =
  | { kind: "toggle"; action: HaAction }
  | { kind: "trigger"; action: HaAction }
  | { kind: "select" }
  | { kind: "number" };

/** The one-tap control a reading offers inside a device card, if it is safe to run without a confirmation. */
export const getReadingControl = (entity: HaEntity): ReadingControl | null => {
  if (entity.domain === "input_select") return (entity.attributes.options?.length ?? 0) > 0 ? { kind: "select" } : null;
  if (entity.domain === "number") return entity.readOnly === true ? null : { kind: "number" };
  const action = getPrimaryAction(entity);
  if (!action || needsCode(entity, action) || requiresConfirmation(entity, action)) return null;
  if (action.type === "toggle") return { kind: "toggle", action };
  if (action.type === "trigger") return { kind: "trigger", action };
  return null;
};

// Values people glance at; everything else is still one tap away in the device details.
const keyMeasurements = new Set([
  "power",
  "temperature",
  "humidity",
  "illuminance",
  "carbon_dioxide",
  "carbon_monoxide",
  "pm25",
  "pm10",
  "moisture",
]);
const diagnosticClasses = new Set([
  "signal_strength",
  "power_factor",
  "voltage",
  "current",
  "frequency",
  "apparent_power",
  "reactive_power",
  "data_rate",
  "data_size",
  "duration",
]);
const diagnosticUnits = new Set(["rssi", "dbm", "db", "pf", "lqi", "v", "a", "ma", "hz", "va", "var"]);
const LOW_BATTERY = 20;

const isDiagnostic = (entity: HaEntity) =>
  diagnosticClasses.has(entity.deviceClass ?? "") || diagnosticUnits.has(entity.unit?.toLowerCase() ?? "");

const controlDomains = new Set([
  "light",
  "switch",
  "fan",
  "input_boolean",
  "humidifier",
  "automation",
  "valve",
  "scene",
  "script",
  "button",
  "input_select",
  "number",
]);

/**
 * Lower comes first: controls, things that are on, key measurements, totals, then diagnostics.
 * Without `live` the rank ignores the current state so a list keeps its order while values change;
 * with it, active inputs and low batteries move up and unknown values drop to the end.
 */
export const getReadingPriority = (entity: HaEntity, live = false): number => {
  if (live && isUnavailable(entity)) return 9;
  if (controlDomains.has(entity.domain) && entity.readOnly !== true) return 0;
  if (entity.domain === "binary_sensor") return live && entity.state === "on" ? 1 : 5;
  if (!isSensorLike(entity)) return 4;
  if (entity.deviceClass === "battery") return live && Number(entity.state) <= LOW_BATTERY ? 1 : 6;
  if (isDiagnostic(entity)) return 7;
  if (keyMeasurements.has(entity.deviceClass ?? "")) return 2;
  if (entity.deviceClass === "energy") return 3;
  return 4;
};

const compareReadings = (left: HaEntity, right: HaEntity) => getReadingPriority(left) - getReadingPriority(right);

/**
 * The rank used when a card has to leave readings out. Automatic follows the live priority;
 * manual keeps the order in which the entities were added to the widget.
 */
export const getReadingRank = (device: DevicePanelItem, entity: HaEntity) =>
  device.readingOrder === "manual" ? device.readings.indexOf(entity) : getReadingPriority(entity, true);

const deviceEntities = (device: DevicePanelItem) => [device.primary, ...device.readings];

/** The battery level of a device, from its battery sensor or the level its main entity reports. */
export const getDeviceBattery = (device: DevicePanelItem): number | null => {
  const sensor = deviceEntities(device).find(
    (entity) => entity.domain === "sensor" && entity.deviceClass === "battery" && !isUnavailable(entity),
  );
  const level = sensor ? Number(sensor.state) : device.primary.attributes.batteryLevel;
  return level !== undefined && Number.isFinite(level) ? level : null;
};

export const isLowBattery = (level: number | null) => level !== null && level <= LOW_BATTERY;

/** A low battery reported as a level or as a battery warning sensor. */
export const hasLowBattery = (device: DevicePanelItem) =>
  isLowBattery(getDeviceBattery(device)) ||
  deviceEntities(device).some(
    (entity) => entity.domain === "binary_sensor" && entity.deviceClass === "battery" && entity.state === "on",
  );

/** The device dropped off the network; "unknown" alone only means the value has not been reported yet. */
export const isDeviceOffline = (device: DevicePanelItem) => device.primary.state === "unavailable";

/** The measurement worth repeating next to the state, e.g. the power of a plug or the temperature of a thermostat. */
export const getKeyReading = (device: DevicePanelItem) =>
  device.readings
    .filter(
      (entity) => entity.domain === "sensor" && keyMeasurements.has(entity.deviceClass ?? "") && !isUnavailable(entity),
    )
    .toSorted((left, right) => getReadingRank(device, left) - getReadingRank(device, right))
    .at(0) ?? null;

/** The label of an entity inside its device tile, e.g. "Power" instead of "Living room plug Power". */
export const getDeviceEntityLabel = (entity: HaEntity) => entity.device?.entityName ?? entity.name;

/**
 * Collapses entities of the same device into one item, placed where the device's first entity was.
 * The controllable main entity drives the tile; every other entity becomes a reading.
 */
export const toPanelItems = (
  entities: readonly HaEntity[],
  groupByDevice: boolean,
  readingOrder: SmartHomeReadingOrder = "automatic",
  showGraph = true,
  deviceLabels: ReadonlyMap<string, string> = new Map(),
  showKeyValue = false,
): PanelItem[] => {
  if (!groupByDevice) return entities.map((entity) => ({ kind: "entity", id: entity.id, entity }));

  const members = new Map<string, HaEntity[]>();
  for (const entity of entities) {
    if (!entity.device) continue;
    const group = members.get(entity.device.id);
    if (group) group.push(entity);
    else members.set(entity.device.id, [entity]);
  }

  const emitted = new Set<string>();
  return entities.flatMap((entity): PanelItem[] => {
    const group = entity.device ? members.get(entity.device.id) : undefined;
    // A lone entity stands on its own, unless the user added its device under a name of their own.
    if (!entity.device || !group || (group.length < 2 && !deviceLabels.has(entity.device.id)))
      return [{ kind: "entity", id: entity.id, entity }];
    if (emitted.has(entity.device.id)) return [];
    emitted.add(entity.device.id);
    const [primary = entity] = group.toSorted(comparePrimary);
    const readings = group.filter((member) => member !== primary);
    return [
      {
        kind: "device",
        id: `device:${entity.device.id}`,
        name: deviceLabels.get(entity.device.id) ?? primary.device?.name ?? primary.name,
        primary,
        readings: readingOrder === "manual" ? readings : readings.toSorted(compareReadings),
        readingOrder,
        showGraph,
        showKeyValue,
      },
    ];
  });
};
