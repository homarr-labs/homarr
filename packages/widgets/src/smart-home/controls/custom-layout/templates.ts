import { createId } from "@homarr/common";
import type { SmartHomeCatalogEntity } from "@homarr/integrations/types";

import { fitElementsIntoCard, resizeCardWithElements, scaleElementPlacements } from "./card-grid";
import { getShortName } from "./names";
import { findFreeSlot } from "./responsive";
import { SMART_HOME_LAYOUT_MAX_TEXT, staticElementViews } from "./schema";
import type {
  SmartHomeLayoutCard,
  SmartHomeLayoutElement,
  SmartHomeLayoutTemplate,
  SmartHomeLayoutTemplateElement,
} from "./schema";

// Names are kept as long as the template schema allows; saving and matching use the same cut.
const MAX_MATCH_NAME = 120;
const matchName = (entity: SmartHomeCatalogEntity) => getShortName(entity).slice(0, MAX_MATCH_NAME);

/**
 * Saves a card for reuse. Each element keeps its options and remembers what kind of entity it showed (domain,
 * device class, short name) instead of the entity. Links to other entities (extra lines, combined values, a
 * condition on another entity) belong to this device and are not kept.
 */
export const cardToTemplate = (
  card: SmartHomeLayoutCard,
  name: string,
  entitiesById: ReadonlyMap<string, SmartHomeCatalogEntity>,
): SmartHomeLayoutTemplate => {
  // Views of the same entity (a value and a graph of one sensor) share a key, so they stay together.
  const bindings = new Map<string, string>();
  const bindingOf = (entityId: string) => {
    const binding = bindings.get(entityId) ?? `e${bindings.size}`;
    bindings.set(entityId, binding);
    return binding;
  };
  return {
    id: createId(),
    name,
    w: card.w,
    h: card.h,
    colors: card.colors,
    accent: card.accent,
    tint: card.tint,
    readOnly: card.readOnly,
    elements: card.elements.flatMap((element): SmartHomeLayoutTemplateElement[] => {
      const { id: _id, source: _source, entityId, entityIds: _entityIds, condition, ...options } = element;
      // A condition on another entity of this device cannot be carried over; one on the element's own entity can.
      const ownCondition = condition && (!condition.entityId || condition.entityId === entityId);
      const kept = { ...options, condition: ownCondition ? { ...condition, entityId: undefined } : undefined };
      if (staticElementViews.has(element.view)) return [{ ...kept, match: { domain: "" } }];
      const entity = entitiesById.get(entityId);
      if (!entity) return [];
      return [
        {
          ...kept,
          binding: bindingOf(entity.id),
          match: { domain: entity.domain, deviceClass: entity.deviceClass ?? undefined, name: matchName(entity) },
        },
      ];
    }),
  };
};

/**
 * Finds the device's entity for a template element: the same name first, then the same device class, and for
 * controls (not sensors, whose readings differ too much) any entity of the domain. Each entity is used once.
 */
const findMatch = (
  match: SmartHomeLayoutTemplateElement["match"],
  entities: readonly SmartHomeCatalogEntity[],
  used: ReadonlySet<string>,
) => {
  const candidates = entities.filter((entity) => entity.domain === match.domain && !used.has(entity.id));
  const sameClass = (entity: SmartHomeCatalogEntity) => (entity.deviceClass ?? undefined) === match.deviceClass;
  return (
    candidates.find((entity) => matchName(entity) === match.name && sameClass(entity)) ??
    candidates.find((entity) => matchName(entity) === match.name) ??
    (match.deviceClass ? candidates.find(sameClass) : undefined) ??
    (match.domain === "sensor" || match.domain === "binary_sensor" ? undefined : candidates[0])
  );
};

/**
 * A new card from a template for the given device, in the first free spot. Null when the widget is full, or when
 * the only free spot is too small for the template's elements.
 */
export const cardFromTemplate = (
  template: SmartHomeLayoutTemplate,
  deviceEntities: readonly SmartHomeCatalogEntity[],
  source: string,
  existing: readonly SmartHomeLayoutCard[],
  title: string | undefined,
): SmartHomeLayoutCard | null => {
  const slot = findFreeSlot(existing, template.w, template.h);
  if (!slot) return null;
  const used = new Set<string>();
  // Each binding (one original entity) is matched once; its other views show the same entity.
  const bound = new Map<string, SmartHomeCatalogEntity | null>();
  const elements = template.elements.flatMap(({ match, binding, ...options }): SmartHomeLayoutElement[] => {
    if (staticElementViews.has(options.view)) return [{ ...options, id: createId(), source, entityId: "" }];
    let entity = binding !== undefined && bound.has(binding) ? (bound.get(binding) ?? undefined) : undefined;
    if (binding === undefined || !bound.has(binding)) {
      entity = findMatch(match, deviceEntities, used);
      if (binding !== undefined) bound.set(binding, entity ?? null);
      if (entity) used.add(entity.id);
    }
    if (!entity) return [];
    return [{ ...options, id: createId(), source, entityId: entity.id }];
  });
  return intoSlot(slot, {
    x: slot.x,
    y: slot.y,
    w: template.w,
    h: template.h,
    id: createId(),
    title: title?.slice(0, SMART_HOME_LAYOUT_MAX_TEXT),
    colors: template.colors,
    accent: template.accent,
    tint: template.tint,
    readOnly: template.readOnly,
    elements,
  });
};

/** A copy of a card with new ids, in the first free spot; null when the widget is full or the spot too small. */
export const duplicateCard = (card: SmartHomeLayoutCard, existing: readonly SmartHomeLayoutCard[]) => {
  const slot = findFreeSlot(existing, card.w, card.h);
  if (!slot) return null;
  return intoSlot(slot, {
    ...card,
    id: createId(),
    elements: card.elements.map((element) => ({ ...element, id: createId() })),
  });
};

/**
 * The card in its slot. A smaller slot (the widget has less room left) scales the elements with the card, as a resize
 * would, instead of clamping them onto each other; when they cannot shrink that far, they move into free space.
 */
const intoSlot = (slot: { x: number; y: number; w: number; h: number }, card: SmartHomeLayoutCard) => {
  const placed = { ...card, x: slot.x, y: slot.y };
  if (slot.w === card.w && slot.h === card.h) return fitElementsIntoCard(placed);
  if (scaleElementPlacements(placed, slot.w, slot.h)) return resizeCardWithElements(placed, slot.w, slot.h);
  return fitElementsIntoCard({ ...placed, w: slot.w, h: slot.h });
};
