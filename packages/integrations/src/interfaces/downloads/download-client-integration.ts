import { Integration } from "../../base/integration";
import type { DownloadClientJobsAndStatus } from "./download-client-data";
import type { DownloadClientItem } from "./download-client-items";

export abstract class DownloadClientIntegration extends Integration {
  /** Get download client's status and list of all of it's items */
  public abstract getClientJobsAndStatusAsync(input: { limit: number }): Promise<DownloadClientJobsAndStatus>;
  /** Pauses the client or all of it's items */
  public abstract pauseQueueAsync(): Promise<void>;
  /** Pause a single item using it's ID */
  public abstract pauseItemAsync(item: DownloadClientItem): Promise<void>;
  /** Resumes the client or all of it's items */
  public abstract resumeQueueAsync(): Promise<void>;
  /** Resume a single item using it's ID */
  public abstract resumeItemAsync(item: DownloadClientItem): Promise<void>;
  /** Delete an entry on the client or a file from disk */
  public abstract deleteItemAsync(item: DownloadClientItem, fromDisk: boolean): Promise<void>;
}
