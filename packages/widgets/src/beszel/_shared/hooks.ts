"use client";

import { useMemo } from "react";

import type { BeszelSystemRow } from "./types";

type SystemRowWithKey = BeszelSystemRow & { rowKey: string };

export const useBeszelFilteredSystems = (
  results: { integrationId: string; systems: BeszelSystemRow[] }[],
  statusFilter: string,
): SystemRowWithKey[] => {
  const allSystems = useMemo(
    () =>
      results
        .flatMap((r) => r.systems.map((s) => ({ ...s, rowKey: `${r.integrationId}:${s.id}` })))
        .toSorted((a, b) => a.name.localeCompare(b.name)),
    [results],
  );

  return useMemo(() => {
    if (statusFilter === "all") return allSystems;
    return allSystems.filter((s) => s.status === statusFilter);
  }, [allSystems, statusFilter]);
};
