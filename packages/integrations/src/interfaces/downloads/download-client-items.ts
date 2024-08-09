import type { SanitizedIntegration } from "../../base/integration";

/**
 * DownloadClientItem
 * Description:
 * Normalized interface for downloading clients for Usenet and
 * Torrents alike, using common properties and few extra optionals
 * from each.
 */
export interface DownloadClientItem {
  /** Unique Identifier provided by client */
  id: string;
  /** Position in queue */
  index: number;
  /** Filename */
  name: string;
  /** Torrent/Usenet identifier */
  type: "torrent" | "usenet";
  /** Item size in Bytes */
  size: number;
  /** Total uploaded in Bytes, only required for Torrent items */
  sent?: number;
  /** Download speed in Bytes/s, only required if not complete
   *  (Says 0 only if it should be downloading but isn't) */
  downSpeed?: number;
  /** Upload speed in Bytes/s, only required for Torrent items */
  upSpeed?: number;
  /** Positive = eta (until completion, 0 meaning infinite), Negative = time since completion, in milliseconds*/
  time: number;
  /** Unix timestamp in milliseconds when the item was added to the client */
  added?: number;
  /** Status message, mostly as information to display and not for logic */
  state: UsenetQueueState | UsenetHistoryState | TorrentState;
  /** Progress expressed between 0 and 1, can infer completion from progress === 1 */
  progress: number;
  /** Category given to the item */
  category?: string | string[];
}

export interface ExtendedDownloadClientItem extends DownloadClientItem {
  integration: SanitizedIntegration;
  received: number;
  ratio?: number;
  actions: {
    resume: () => void;
    pause: () => void;
    delete: ({ fromDisk }: { fromDisk: boolean }) => void;
  };
}

type UsenetQueueState = "downloading" | "queued" | "paused";
type UsenetHistoryState = "completed" | "failed" | "processing";
type TorrentState = "leeching" | "stalled" | "unknown" | "paused" | "seeding";
