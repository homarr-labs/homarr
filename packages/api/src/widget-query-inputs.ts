import type { InferRouterInputs } from "@orpc/server";

import type { downloadsRouter } from "./router/widgets/downloads";

type DownloadsQueryInput = InferRouterInputs<typeof downloadsRouter>["getJobsAndStatuses"];

export interface BeszelSystemChoice {
  value: string;
  label: string;
  integrationId: string;
  systemId: string;
}

interface BeszelSystemsResult {
  integrationId: string;
  integrationName: string;
  systems: { id: string; name: string }[];
}

export function createBeszelSystemChoices(results: BeszelSystemsResult[]): BeszelSystemChoice[] {
  const includeIntegrationName = results.length > 1;
  return results.flatMap((result) =>
    result.systems.map((system) => {
      let label = system.name;
      if (includeIntegrationName) label = `${result.integrationName} · ${system.name}`;
      return {
        value: `${result.integrationId}:${system.id}`,
        label,
        integrationId: result.integrationId,
        systemId: system.id,
      };
    }),
  );
}

export function resolveBeszelSystemChoice(choices: BeszelSystemChoice[], storedValue: string) {
  const exactMatch = choices.find((choice) => choice.value === storedValue);
  if (exactMatch) return exactMatch;
  if (storedValue === "") return choices[0];

  const legacyMatches = choices.filter((choice) => choice.systemId === storedValue);
  if (legacyMatches.length === 1) return legacyMatches[0];
  return undefined;
}

export function resolveStoredBeszelQuerySelection(storedValue: string, integrationIds: readonly string[]) {
  for (const integrationId of integrationIds) {
    const prefix = `${integrationId}:`;
    if (storedValue.startsWith(prefix)) {
      return { integrationIds: [integrationId], systemId: storedValue.slice(prefix.length) };
    }
  }

  if (storedValue !== "" && integrationIds.length === 1) {
    return { integrationIds: [integrationIds[0] as string], systemId: storedValue };
  }

  return null;
}

export const resolveDownloadsQueryInput = (integrationIds: readonly string[], options: Record<string, unknown>) =>
  ({
    integrationIds: [...integrationIds],
    limitPerIntegration: Number(options.limitPerIntegration ?? 50),
    selection: {
      sort: (options.defaultSort ?? "progress") as NonNullable<DownloadsQueryInput["selection"]>["sort"],
      descending: (options.descendingDefaultSort ?? false) === true,
      categoryFilter: (options.categoryFilter ?? []) as string[],
      filterIsWhitelist: (options.filterIsWhitelist ?? false) === true,
      showCompletedTorrent: options.showCompletedTorrent !== false,
      activeTorrentThreshold: Number(options.activeTorrentThreshold ?? 0),
    },
    includeArchivedHistory: (options.includeArchivedHistory ?? false) === true,
    historyWindowDays: Number(options.historyWindowDays ?? 7),
  }) satisfies DownloadsQueryInput;
