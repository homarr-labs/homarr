import type { DownloadClientItem } from "./download-client-items";
import type { DownloadClientStatus } from "./download-client-status";

export interface DownloadClientData {
  status: DownloadClientStatus;
  items: DownloadClientItem[];
}
