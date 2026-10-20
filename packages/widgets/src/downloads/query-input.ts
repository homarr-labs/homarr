import type { RouterInputs } from "@homarr/api";

export const resolveDownloadsQueryInput = (integrationIds: readonly string[], options: Record<string, unknown>) =>
  ({
    integrationIds: [...integrationIds],
    limitPerIntegration: Number(options.limitPerIntegration ?? 50),
    selection: {
      sort: (options.defaultSort ?? "progress") as NonNullable<
        RouterInputs["widget"]["downloads"]["getJobsAndStatuses"]["selection"]
      >["sort"],
      descending: (options.descendingDefaultSort ?? false) === true,
      categoryFilter: (options.categoryFilter ?? []) as string[],
      filterIsWhitelist: (options.filterIsWhitelist ?? false) === true,
      showCompletedTorrent: options.showCompletedTorrent !== false,
      activeTorrentThreshold: Number(options.activeTorrentThreshold ?? 0),
    },
    includeArchivedHistory: (options.includeArchivedHistory ?? false) === true,
    historyWindowDays: Number(options.historyWindowDays ?? 7),
  }) satisfies RouterInputs["widget"]["downloads"]["getJobsAndStatuses"];
