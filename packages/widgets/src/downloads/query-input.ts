import type { RouterInputs } from "@homarr/api";

export const resolveDownloadsQueryInput = (integrationIds: readonly string[], options: Record<string, unknown>) =>
  ({
    integrationIds: [...integrationIds],
    limitPerIntegration: Number(options.limitPerIntegration ?? 50),
    includeArchivedHistory: (options.includeArchivedHistory ?? false) === true,
    historyWindowDays: Number(options.historyWindowDays ?? 7),
  }) satisfies RouterInputs["widget"]["downloads"]["getJobsAndStatuses"];
