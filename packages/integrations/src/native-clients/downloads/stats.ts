import type { DownloadClientJobsAndStatus } from "../../interfaces/downloads/download-client-data";

export const pickDownloadClientStats = ({ status }: DownloadClientJobsAndStatus) => ({
  download: status.rates.down,
  upload: status.rates.up ?? null,
  paused: status.paused,
});
