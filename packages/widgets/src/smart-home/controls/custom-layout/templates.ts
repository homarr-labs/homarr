import { createId } from "@homarr/common";
import type { SmartHomeCatalogEntity } from "@homarr/integrations/types";

import { getShortName } from "./names";
import { findFreeSlot } from "./responsive";
import { staticElementViews } from "./schema";
import type {
  SmartHomeLayoutCard,
  SmartHomeLayoutElement,
  SmartHomeLayoutTemplate,
  SmartHomeLayoutTemplateElement,
} from "./schema";

/**
 * Saves a card for reuse. Each element keeps its options and remembers what kind of entity it showed (domain,
 * device class, short name) instead of the entity. Links to other entities (extra lines, combined values, a
 * condition on another entity) belong to this device and are not kept.
 */
export const cardToTemplate = (
  card: SmartHomeLayoutCard,
  name: string,
  entitiesById: ReadonlyMap<string, SmartHomeCatalogEntity>,
): SmartHomeLayoutTemplate => ({
  id: createId(),
  name,
  w: card.w,
  h: card.h,
  accent: card.accent,
  tint: card.tint,
  elements: card.elements.flatMap((element): SmartHomeLayoutTemplateElement[] => {
    const { id: _id, source: _source, entityId, entityIds: _entityIds, condition, ...options } = element;
    const kept = { ...options, condition: condition ? { op: condition.op, value: condition.value } : undefined };
    if (staticElementViews.has(element.view)) return [{ ...kept, match: { domain: "" } }];
    const entity = entitiesById.get(entityId);
    if (!entity) return [];
    return [
      {
        ...kept,
        match: { domain: entity.domain, deviceClass: entity.deviceClass ?? undefined, name: getShortName(entity) },
      },
    ];
  }),
});

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
    candidates.find((entity) => getShortName(entity) === match.name && sameClass(entity)) ??
    candidates.find((entity) => getShortName(entity) === match.name) ??
    (match.deviceClass ? candidates.find(sameClass) : undefined) ??
    (match.domain === "sensor" || match.domain === "binary_sensor" ? undefined : candidates[0])
  );
};

/** A new card from a template for the given device, in the first free spot; null when the widget is full. */
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
  const elements = template.elements.flatMap(({ match, ...options }): SmartHomeLayoutElement[] => {
    if (staticElementViews.has(options.view)) return [{ ...options, id: createId(), source, entityId: "" }];
    const entity = findMatch(match, deviceEntities, used);
    if (!entity) return [];
    used.add(entity.id);
    return [{ ...options, id: createId(), source, entityId: entity.id }];
  });
  return {
    ...slot,
    id: createId(),
    title,
    accent: template.accent,
    tint: template.tint,
    elements,
  };
};

/** A copy of a card with new ids, in the first free spot; null when the widget is full. */
export const duplicateCard = (card: SmartHomeLayoutCard, existing: readonly SmartHomeLayoutCard[]) => {
  const slot = findFreeSlot(existing, card.w, card.h);
  if (!slot) return null;
  return {
    ...card,
    ...slot,
    id: createId(),
    elements: card.elements.map((element) => ({ ...element, id: createId() })),
  } satisfies SmartHomeLayoutCard;
};
