import { createId } from "@homarr/common";
import type { SmartHomeCatalogEntity } from "@homarr/integrations/types";

import { toSmartHomeDomain } from "../types";
import { fitElementsIntoCard, getCardMinSize } from "./card-grid";
import { findFreeSlot } from "./responsive";
import { SMART_HOME_LAYOUT_MAX_TEXT } from "./schema";
import { fullTileDomains } from "./schema";
import type { SmartHomeElementView, SmartHomeLayoutCard, SmartHomeLayoutElement } from "./schema";

export const smartHomeLayoutPresets = ["plug", "fan", "climate", "printer", "overview"] as const;
export type SmartHomeLayoutPreset = (typeof smartHomeLayoutPresets)[number];

const readOnlyDomains = new Set(["sensor", "binary_sensor"]);

const isControllable = (entity: Pick<SmartHomeCatalogEntity, "domain">) => {
  const { domain, readOnly } = toSmartHomeDomain(entity.domain);
  return !readOnly && !readOnlyDomains.has(domain);
};

// Domains whose main value is a 0–100 slider (brightness, fan speed, position), like on device cards.
const sliderDomains = new Set(["light", "fan", "cover"]);
type ViewEntity = Pick<SmartHomeCatalogEntity, "domain" | "deviceClass"> & { unit?: string | null };

/**
 * The views that make sense for an entity, controls first. The labeled slider and the bare sliders only exist for
 * entities with a slider; for a switch the labeled slider would just be a row.
 */
export const getAllowedViews = (entity: ViewEntity) => {
  const views: SmartHomeElementView[] = entity.domain === "camera" ? ["camera", "tile"] : ["tile"];
  if (sliderDomains.has(entity.domain)) views.push("control", "slider", "pill");
  if (isControllable(entity)) views.push("button", "row");
  views.push("value", "group", "chip", "status");
  if (!isControllable(entity)) views.push("row");
  if (entity.domain === "sensor") views.push("graph");
  if (entity.deviceClass === "battery") views.push("battery");
  else if (entity.unit === "%" && (entity.domain === "sensor" || entity.domain === "number")) views.push("progress");
  return views;
};

/** The view a newly added entity gets: how a device card would show it. */
export const getDefaultView = (entity: ViewEntity): SmartHomeElementView => {
  if (entity.domain === "camera") return "camera";
  if (sliderDomains.has(entity.domain)) return "control";
  if (fullTileDomains.has(entity.domain)) return "tile";
  if (isControllable(entity)) return "row";
  return "value";
};

const element = (source: string, entity: SmartHomeCatalogEntity, view: SmartHomeElementView) => ({
  id: createId(),
  source,
  entityId: entity.id,
  view,
});

const byClass = (entities: readonly SmartHomeCatalogEntity[], deviceClass: string) =>
  entities.filter((entity) => entity.deviceClass === deviceClass);

const MAX_PRESET_ELEMENTS = 8;
// Half the widget: two readings side by side still have room for their labels.
const PRESET_COLUMNS = 6;

type PresetEntity = SmartHomeCatalogEntity | undefined;
type PresetItem = [PresetEntity, SmartHomeElementView, Partial<SmartHomeLayoutElement>?];

/**
 * Elements placed line by line on a card as wide as a new card: each line shares the columns among the entities
 * found for it, and lines without any are left out.
 */
const placeLines = (source: string, lines: { h: number; items: PresetItem[] }[]) => {
  const elements: SmartHomeLayoutElement[] = [];
  let y = 0;
  for (const line of lines) {
    const items = line.items.filter(
      (item): item is [SmartHomeCatalogEntity, SmartHomeElementView, Partial<SmartHomeLayoutElement>?] =>
        Boolean(item[0]),
    );
    if (items.length === 0) continue;
    const base = Math.floor(PRESET_COLUMNS / items.length);
    let x = 0;
    items.forEach(([entity, view, options], index) => {
      // The first element takes what does not divide evenly, e.g. 2 + 1 + 1 for three.
      const w = index === 0 ? PRESET_COLUMNS - base * (items.length - 1) : base;
      elements.push({ ...element(source, entity, view), ...options, x, y, w, h: line.h });
      x += w;
    });
    y += line.h;
  }
  return elements;
};

// A printer's buttons show only their icon, so three fit next to each other.
const iconButton = (icon: string) => ({ hideLabel: true, icon });

// Entity ids name what an entity is (Home Assistant's "print_progress", Homey's "bambu_progress_percentage"); the
// device name in front of it is left out so a printer called "Progress" does not match everything.
const idMatches = (entity: SmartHomeCatalogEntity, pattern: RegExp) => pattern.test(entity.id.split(".")[1] ?? "");

/**
 * A 3D printer (Bambu Lab through Home Assistant or Homey, OctoPrint, Moonraker, ...): camera, progress, status,
 * time left, temperatures, light and pause/resume. Stopping a print cannot be undone, so it is left to the details.
 */
const buildPrinterElements = (source: string, visible: SmartHomeCatalogEntity[]) => {
  const sensors = visible.filter((entity) => entity.domain === "sensor");
  const find = (candidates: SmartHomeCatalogEntity[], ...patterns: RegExp[]) =>
    patterns.map((pattern) => candidates.find((entity) => idMatches(entity, pattern))).find(Boolean);
  const percentages = sensors.filter((entity) => entity.unit === "%" && !idMatches(entity, /fan|humid|signal/));
  // A percentage first: Homey's "bambu_progress_time_remaining" is a progress too, but not the one in percent.
  const progress = find(percentages, /progress|fortschritt/) ?? percentages[0];
  const enums = sensors.filter((entity) => entity.deviceClass === "enum");
  const status = find(enums, /print_status|druckstatus/);
  const stage = find(enums, /stage|stufe|phase/) ?? (status ? undefined : enums[0]);
  const remaining =
    find(sensors, /remaining|verbleib|time_left/) ?? sensors.find((entity) => entity.deviceClass === "duration");
  const layer = find(sensors, /current_layer|print_layers|aktuelle_schicht|layer/);
  const temperatures = sensors.filter(
    (entity) => entity.deviceClass === "temperature" && !idMatches(entity, /target|ziel/),
  );
  const nozzle = find(temperatures, /nozzle|hotend|d[uü]se|tool/) ?? temperatures[0];
  const bed = find(temperatures, /bed|bett/) ?? temperatures.find((entity) => entity !== nozzle);
  const camera = visible.find((entity) => entity.domain === "camera");
  const light =
    visible.find((entity) => entity.domain === "light") ??
    find(
      visible.filter((entity) => entity.domain === "switch"),
      /light|licht/,
    );
  const buttons = visible.filter((entity) => entity.domain === "button");
  const pause = find(buttons, /pause|pausieren/);
  const resume = find(buttons, /resume|fortsetzen/);

  return placeLines(source, [
    { h: 3, items: [[camera, "camera"]] },
    { h: 1, items: [[progress, "progress"]] },
    {
      h: 1,
      // Their values ("Running", "Auto bed leveling") speak for themselves.
      items: [
        [status, "status", { hideLabel: true }],
        [stage, "status", { hideLabel: true }],
      ],
    },
    {
      h: 1,
      items: [
        [remaining, "status"],
        [layer, "status"],
      ],
    },
    {
      h: 1,
      items: [
        [nozzle, "status"],
        [bed, "status"],
      ],
    },
    {
      h: 1,
      items: [
        [light, "button", iconButton("bulb")],
        [pause, "button", iconButton("player-pause")],
        [resume, "button", iconButton("player-play")],
      ],
    },
  ]);
};

/** Builds the elements of a template card from one device's entities. */
export const buildPresetElements = (
  preset: SmartHomeLayoutPreset,
  source: string,
  entities: readonly SmartHomeCatalogEntity[],
): SmartHomeLayoutElement[] => {
  const visible = entities.filter((entity) => !entity.hidden);
  const controls = visible.filter(isControllable);
  const [power] = byClass(visible, "power");
  const [energy] = byClass(visible, "energy");
  const [temperature] = byClass(visible, "temperature");
  const [humidity] = byClass(visible, "humidity");
  const [battery] = byClass(visible, "battery");
  const elements: SmartHomeLayoutElement[] = [];
  const add = (entity: SmartHomeCatalogEntity | undefined, view: SmartHomeElementView | undefined) => {
    if (entity && view) elements.push(element(source, entity, view));
  };

  switch (preset) {
    case "plug":
      add(controls[0], controls[0] && getDefaultView(controls[0]));
      add(power, "value");
      add(energy, "value");
      add(power, "graph");
      break;
    case "fan":
      controls.slice(0, 4).forEach((entity) => add(entity, getDefaultView(entity)));
      add(temperature, "value");
      break;
    case "climate":
      add(temperature, "value");
      add(humidity, "value");
      add(temperature, "graph");
      add(
        controls.find((entity) => entity.domain === "climate"),
        "tile",
      );
      add(battery, "battery");
      break;
    case "printer": {
      // Placed line by line to fit one card, so it is not cut to the usual number of elements.
      const printer = buildPrinterElements(source, visible);
      if (printer.length > 0) return printer;
      break;
    }
    case "overview":
      add(controls[0], controls[0] && getDefaultView(controls[0]));
      visible.filter((entity) => entity !== controls[0]).forEach((entity) => add(entity, "status"));
      break;
  }
  // A device without the classes a template looks for still gets a useful card.
  if (elements.length === 0) visible.slice(0, 4).forEach((entity) => add(entity, getDefaultView(entity)));
  return elements.slice(0, MAX_PRESET_ELEMENTS);
};

const NEW_CARD_WIDTH = 4;

/** A new card sized for its elements, in the first free spot of the widget; null when the widget is full. */
export const createCard = (
  existing: readonly SmartHomeLayoutCard[],
  elements: SmartHomeLayoutElement[],
  title?: string,
): SmartHomeLayoutCard | null => {
  // As wide as elements placed by a template ask for, at least the usual width.
  const width = Math.max(NEW_CARD_WIDTH, ...elements.map((placed) => (placed.x ?? 0) + (placed.w ?? 0)));
  const draft = {
    id: createId(),
    x: 0,
    y: 0,
    w: width,
    h: 1,
    title: title?.slice(0, SMART_HOME_LAYOUT_MAX_TEXT),
    elements,
  };
  const slot = findFreeSlot(existing, width, getCardMinSize(draft).h);
  // A smaller slot than the contents need only works if the elements can share it.
  return slot ? fitElementsIntoCard({ ...draft, x: slot.x, y: slot.y, w: slot.w, h: slot.h }) : null;
};
