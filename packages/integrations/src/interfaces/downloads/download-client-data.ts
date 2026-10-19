import type { DownloadClientItem } from "./download-client-items";
import type { DownloadClientStatus } from "./download-client-status";

export interface DownloadClientJobsAndStatus {
  status: DownloadClientStatus;
  items: DownloadClientItem[];
  /** Original limited accounting population, independent of display selection. */
  ratioItems?: Pick<DownloadClientItem, "sent" | "size" | "progress" | "category">[];
}
