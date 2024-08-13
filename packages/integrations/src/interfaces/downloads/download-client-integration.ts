import type { IntegrationKind } from "@homarr/definitions";

import { Integration } from "../../base/integration";
import type { DownloadClientJobsAndStatus } from "./download-client-data";
import type { DownloadClientItem } from "./download-client-items";

export abstract class DownloadClientIntegration extends Integration {
  /** Get download client's status and list of all of it's items */
  public abstract getClientJobsAndStatusAsync(): Promise<DownloadClientJobsAndStatus>;
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

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace DownloadClientIntegration {
  export const TorrentClientKinds: Extract<IntegrationKind, "deluge" | "qBittorrent" | "transmission">[] = [
    "deluge",
    "qBittorrent",
    "transmission",
  ] as const;
  export const UsenetClientKinds: Extract<IntegrationKind, "sabNzbd" | "nzbGet">[] = ["sabNzbd", "nzbGet"] as const;
  export const DownloadClientKinds = [...TorrentClientKinds, ...UsenetClientKinds] as const;
}
