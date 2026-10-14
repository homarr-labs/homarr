import type { IntegrationInstanceOfKind } from "../../base/creator";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";

export type DownloadIntegrationKind =
  | "sabNzbd"
  | "nzbGet"
  | "qBittorrent"
  | "deluge"
  | "transmission"
  | "slskd"
  | "aria2";

export type DownloadPublicClient<TKind extends DownloadIntegrationKind> = Pick<
  IntegrationInstanceOfKind<TKind>,
  keyof IntegrationInstanceOfKind<TKind>
>;

export type DownloadControl =
  | { type: "pauseQueue" }
  | { type: "resumeQueue" }
  | { type: "pauseItem"; item: DownloadClientItem }
  | { type: "resumeItem"; item: DownloadClientItem }
  | { type: "deleteItem"; item: DownloadClientItem; fromDisk: boolean };

export class DownloadClientHoldError extends Error {
  constructor(
    public readonly kind: DownloadIntegrationKind,
    public readonly resource:
      | "interact-authority"
      | "sdk-request-ownership"
      | "unsupported-control"
      | "aria2-object-name",
  ) {
    super(`Download client operation is held: ${resource}`);
    this.name = "DownloadClientHoldError";
  }
}

export class DownloadProtocolError extends Error {
  constructor(
    public readonly kind: DownloadIntegrationKind,
    public readonly method: string,
    public readonly code?: number,
  ) {
    super("Download client returned a protocol error");
    this.name = "DownloadProtocolError";
  }
}
