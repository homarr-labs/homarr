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
          const name = area ? `${entity.name} (${area})` : entity.name;
          return { value: entity.id, label: `${name} · ${entity.id}` };
        });
      return options.toSorted((left, right) => left.label.localeCompare(right.label));
    }, [query.data]);
    return { data, isPending: query.isPending, isError: query.isError };
  };
