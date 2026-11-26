import { createId } from "@homarr/common";
import type { SmartHomeCatalogEntity } from "@homarr/integrations/types";

import { toSmartHomeDomain } from "../types";
import { fitElementsIntoCard, getCardMinSize } from "./card-grid";
import { findFreeSlot } from "./responsive";
import { SMART_HOME_LAYOUT_MAX_TEXT } from "./schema";
import { fullTileDomains } from "./schema";
import type { SmartHomeElementView, SmartHomeLayoutCard, SmartHomeLayoutElement } from "./schema";

export const smartHomeLayoutPresets = ["plug", "fan", "climate", "overview"] as const;
export type SmartHomeLayoutPreset = (typeof smartHomeLayoutPresets)[number];

const readOnlyDomains = new Set(["sensor", "binary_sensor"]);

const isControllable = (entity: Pick<SmartHomeCatalogEntity, "domain">) => {
  const { domain, readOnly } = toSmartHomeDomain(entity.domain);
  return !readOnly && !readOnlyDomains.has(domain);
};

// Domains whose main value is a 0–100 slider (brightness, fan speed, position), like on device cards.
const sliderDomains = new Set(["light", "fan", "cover"]);
type ViewEntity = Pick<SmartHomeCatalogEntity, "domain" | "deviceClass">;

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
  const draft = {
    id: createId(),
    x: 0,
    y: 0,
    w: NEW_CARD_WIDTH,
    h: 1,
    title: title?.slice(0, SMART_HOME_LAYOUT_MAX_TEXT),
    elements,
  };
  const slot = findFreeSlot(existing, NEW_CARD_WIDTH, getCardMinSize(draft).h);
  // A smaller slot than the contents need only works if the elements can share it.
  return slot ? fitElementsIntoCard({ ...draft, x: slot.x, y: slot.y, w: slot.w, h: slot.h }) : null;
};
