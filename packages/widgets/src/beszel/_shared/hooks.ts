"use client";

import { useMemo } from "react";

import { clientApi } from "@homarr/api/client";

import type { BeszelSystemRow } from "./types";

type SystemRowWithKey = BeszelSystemRow & { _key: string };

export const useBeszelSystemsSubscription = (integrationIds: string[], enabled = true) => {
  const utils = clientApi.useUtils();
  clientApi.widget.beszel.subscribeSystems.useSubscription(
    { integrationIds },
    {
      enabled,
      onData(data) {
        utils.widget.beszel.getSystems.setData({ integrationIds }, (prev) => {
          if (!prev) return prev;
          return prev.map((r) =>
            r.integrationId === data.integrationId ? { ...r, systems: data.systems, updatedAt: data.timestamp } : r,
          );
        });
      },
    },
  );
};

export const useBeszelFilteredSystems = (
  results: { integrationId: string; systems: BeszelSystemRow[] }[],
  statusFilter: string,
): SystemRowWithKey[] => {
  const allSystems = useMemo(
    () =>
      results
        .flatMap((r) => r.systems.map((s) => ({ ...s, _key: `${r.integrationId}:${s.id}` })))
        .toSorted((a, b) => a.name.localeCompare(b.name)),
    [results],
  );

  return useMemo(() => {
    if (statusFilter === "all") return allSystems;
    return allSystems.filter((s) => s.status === statusFilter);
  }, [allSystems, statusFilter]);
};
