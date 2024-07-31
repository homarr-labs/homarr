import type { SanitizedIntegration } from "../../base/integration";

export interface DownloadClientStatus {
  /** If client is considered paused */
  paused: boolean;
  /** Download/Upload speeds for the client */
  rates: {
    down: number;
    up?: number;
  };
  type: "usenet"|"torrent";
}

export interface ExtendedClientStatus extends DownloadClientStatus {
  integration: SanitizedIntegration;
  /** To derive from current items */
  totalDown?: number;
  /** To derive from current items */
  totalUp?: number;
  ratio?: number;
}
