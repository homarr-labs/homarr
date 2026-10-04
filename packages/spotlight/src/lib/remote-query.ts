"use client";

import { useDebouncedValue } from "@mantine/hooks";

import type { RemoteSearchSource } from "./group";

const remoteSearchPolicy: Record<RemoteSearchSource, { delay: number; minimumLength: number }> = {
  apps: { delay: 140, minimumLength: 1 },
  boards: { delay: 140, minimumLength: 1 },
  integrations: { delay: 160, minimumLength: 1 },
  users: { delay: 180, minimumLength: 1 },
  groups: { delay: 180, minimumLength: 1 },
  "search-engines": { delay: 160, minimumLength: 1 },
  "integration-search": { delay: 220, minimumLength: 1 },
  media: { delay: 220, minimumLength: 1 },
};

interface RemoteQueryOptions {
  minimumLength?: number;
  trim?: boolean;
}

export interface RemoteQuery {
  enabled: boolean;
  query: string;
}

/**
 * Keeps every network-backed spotlight provider on the same query cadence. Local providers still
 * receive the immediate query and therefore render before remote results can replace the selection.
 */
export const useRemoteQuery = (
  query: string,
  source: RemoteSearchSource,
  options: RemoteQueryOptions = {},
): RemoteQuery => {
  const policy = remoteSearchPolicy[source];
  const minimumLength = options.minimumLength ?? policy.minimumLength;
  const normalizedQuery = options.trim === false ? query : query.trim();
  const [debouncedQuery] = useDebouncedValue(normalizedQuery, policy.delay);

  return {
    enabled: debouncedQuery.length >= minimumLength,
    query: debouncedQuery,
  };
};
