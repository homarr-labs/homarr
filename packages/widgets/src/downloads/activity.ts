import type { DownloadClientJobsAndStatus } from "@homarr/integrations";

import type { WidgetActivityFacts } from "../activity";

type DownloadClientItem = DownloadClientJobsAndStatus["items"][number];

export const getDownloadsActivityFacts = (
  clients: readonly DownloadClientJobsAndStatus[],
  includes: (item: DownloadClientItem) => boolean,
): WidgetActivityFacts => {
  let ongoing = 0;
  let background = 0;
  for (const client of clients) {
    for (const item of client.items) {
      if (!includes(item)) continue;
      if (item.state === "seeding") background++;
      if (item.state === "processing") ongoing++;
      if (
        !client.status.paused &&
        (item.state === "downloading" || item.state === "leeching") &&
        (item.downSpeed ?? 0) > 0
      )
        ongoing++;
    }
  }
  if (ongoing > 0) return { relevance: "ongoing", count: ongoing };
  if (background > 0) return { relevance: "background", count: 1 };
  return { relevance: "quiet", count: 0 };
};
