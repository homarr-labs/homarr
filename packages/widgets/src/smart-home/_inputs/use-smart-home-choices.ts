"use client";

import { useMemo } from "react";

import type { SmartHomeEntityScope } from "./smart-home-entity-picker";
import { searchSmartHomeEntities } from "./catalog-index";
import { useSmartHomeCatalog } from "./use-smart-home-catalog";

interface SmartHomeChoices {
  data: { value: string; label: string }[];
  isPending: boolean;
  isError: boolean;
}

export const useSmartHomeAreaChoices = (integrationIds: string[]): SmartHomeChoices => {
  const catalog = useSmartHomeCatalog(integrationIds[0]);
  const index = catalog.status === "ready" ? catalog.index : null;
  const data = useMemo(() => (index?.areas ?? []).map((area) => ({ value: area.id, label: area.name })), [index]);
  return { data, isPending: catalog.status === "loading", isError: catalog.status === "error" };
};

export const useSmartHomeEntityChoices = (
  integrationIds: string[],
  { domains, areaIds, includeHidden }: Omit<SmartHomeEntityScope, "limit"> = {},
): SmartHomeChoices => {
  const catalog = useSmartHomeCatalog(integrationIds[0]);
  const index = catalog.status === "ready" ? catalog.index : null;
  const data = useMemo(() => {
    if (!index) return [];
    return searchSmartHomeEntities(index, { domains, areaIds, includeHidden }).map((entity) => {
      const area = entity.areaId ? index.areasById.get(entity.areaId) : undefined;
      return { value: entity.id, label: [entity.name, area?.name, entity.id].filter(Boolean).join(" · ") };
    });
  }, [index, domains, areaIds, includeHidden]);
  return { data, isPending: catalog.status === "loading", isError: catalog.status === "error" };
};
