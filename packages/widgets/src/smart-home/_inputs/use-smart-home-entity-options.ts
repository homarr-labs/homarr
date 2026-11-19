"use client";

import { useMemo } from "react";

import { clientApi } from "@homarr/api/client";

/** Creates `integrationSelect` options listing the visible entities of the widget's smart home integration. */
export const createSmartHomeEntityOptions =
  (domain?: string) =>
  (integrationIds: string[]): { data: { value: string; label: string }[]; isPending: boolean; isError: boolean } => {
    const integrationId = integrationIds[0] ?? "";
    const query = clientApi.widget.smartHome.catalog.useQuery(
      { integrationId },
      { enabled: integrationId.length > 0, staleTime: 15_000, refetchOnWindowFocus: false, retry: 1 },
    );
    const data = useMemo(() => {
      if (!query.data) return [];
      const areaNames = new Map(query.data.areas.map((area) => [area.id, area.name]));
      const options = query.data.entities
        .filter((entity) => !entity.hidden && (domain === undefined || entity.domain === domain))
        .map((entity) => {
          const area = entity.areaId ? areaNames.get(entity.areaId) : undefined;
          return { value: entity.id, label: area ? `${entity.name} (${area})` : entity.name };
        });
      const labelCounts = new Map<string, number>();
      for (const { label } of options) labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
      // Entities with the same name in the same area are told apart by their ID.
      return options
        .map((option) =>
          (labelCounts.get(option.label) ?? 0) > 1 ? { ...option, label: `${option.label} · ${option.value}` } : option,
        )
        .toSorted((left, right) => left.label.localeCompare(right.label));
    }, [query.data]);
    return { data, isPending: query.isPending, isError: query.isError };
  };
