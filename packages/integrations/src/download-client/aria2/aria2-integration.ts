import path from "path";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";

import type { DownloadClientJobsAndStatus } from "../../interfaces/downloads/download-client-data";
import { DownloadClientIntegration } from "../../interfaces/downloads/download-client-integration";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";
import type { Aria2Download, Aria2GetClient } from "./aria2-types";

export class Aria2Integration extends DownloadClientIntegration {
  public async getClientJobsAndStatusAsync(): Promise<DownloadClientJobsAndStatus> {
    const client = this.getClient();
    const keys: (keyof Aria2Download)[] = [
      "bittorrent",
      "uploadLength",
      "uploadSpeed",
      "downloadSpeed",
      "totalLength",
      "completedLength",
      "files",
      "status",
      "gid",
    ];
    const [actives, waitings, stoppeds, globalstats] = await Promise.all([
      client.tellActive(),
      client.tellWaiting(0, 1000, keys),
      client.tellStopped(0, 1000, keys),
      client.getGlobalStat(),
    ]);

    const downloadings = [...actives, ...waitings, ...stoppeds];

    return {
      status: {
        types: ["torrent", "miscellaneous"],
        paused: false,
        rates: {
          up: Number(globalstats.uploadSpeed),
          down: Number(globalstats.downloadSpeed),
        },
      },
      items: downloadings.map((download, index) => {
        const totalSize = Number(download.totalLength);
        const completedSize = Number(download.completedLength);
        const progress = totalSize > 0 ? completedSize / totalSize : 0;

        const itemName = download.bittorrent?.info?.name ?? path.basename(download.files[0]?.path ?? "Unknown");

        return {
          index,
          id: download.gid,
          name: itemName,
          type: download.bittorrent ? "torrent" : "miscellaneous",
          size: totalSize,
          sent: Number(download.uploadLength),
          downSpeed: Number(download.downloadSpeed),
          upSpeed: Number(download.uploadSpeed),
          time: Aria2Integration.calculateEta(completedSize, totalSize, Number(download.downloadSpeed)),
          state: Aria2Integration.getState(download.status, Boolean(download.bittorrent)),
          category: [],
          progress,
        };
      }),
    } as DownloadClientJobsAndStatus;
  }
  public async pauseQueueAsync(): Promise<void> {
    const client = this.getClient();
    await client.pauseAll();
  }
  public async pauseItemAsync(item: DownloadClientItem): Promise<void> {
    const client = this.getClient();
    if (item.state in ["downloading", "leeching"]) {
      await client.pause(item.id);
    }
  }
  public async resumeQueueAsync(): Promise<void> {
    const client = this.getClient();
    await client.unpauseAll();
  }
  public async resumeItemAsync(item: DownloadClientItem): Promise<void> {
    const client = this.getClient();
    if (item.state === "paused") {
      await client.unpause(item.id);
    }
  }
  public async deleteItemAsync(item: DownloadClientItem, fromDisk: boolean): Promise<void> {
    const client = this.getClient();
    // Note: Remove download file is not support by aria2, replace with forceremove

    if (item.state in ["downloading", "leeching", "paused"]) {
      await (fromDisk ? client.remove(item.id) : client.forceRemove(item.id));
    } else {
      await client.removeDownloadResult(item.id);
    }
  }

  public async testConnectionAsync(): Promise<void> {
    const client = this.getClient();
    await client.getVersion();
  }

  private getClient() {
    const apiKey = this.getSecretValue("apiKey");
    const url = this.url("/jsonrpc");

    return new Proxy(
      {},
      {
        get: (target, method: keyof Aria2GetClient) => {
          return async (...args: Parameters<Aria2GetClient[typeof method]>) => {
            const body = JSON.stringify({
              jsonrpc: "2.0",
              id: btoa(["Homarr", Date.now().toString(), Math.random()].join(".")), // unique id per request
              method: `aria2.${method}`,
              params: [`token:${apiKey}`, ...args],
            });

            return await fetchWithTrustedCertificatesAsync(url, { method: "POST", body })
              .then(async (response) => {
                if (!response.ok) {
                  throw new Error(response.statusText);
                }
                const responseBody = (await response.json()) as { result: ReturnType<Aria2GetClient[typeof method]> };
                return responseBody.result;
              })
              .catch((error) => {
                if (error instanceof Error) {
                  throw new Error(error.message);
                } else {
                  throw new Error("Error communicating with NzbGet");
                }
              });
          };
        },
      },
    ) as Aria2GetClient;
  }

  static getState(aria2Status: Aria2Download["status"], isTorrent: boolean): DownloadClientItem["state"] {
    return isTorrent
      ? Aria2Integration.getNonTorrentState(aria2Status)
      : Aria2Integration.getNonTorrentState(aria2Status);
  }
  static getNonTorrentState(aria2Status: Aria2Download["status"]): DownloadClientItem["state"] {
    switch (aria2Status) {
      case "active":
        return "downloading";
      case "waiting":
        return "queued";
      case "paused":
        return "paused";
      case "complete":
        return "completed";
      case "error":
        return "failed";
      case "removed":
      default:
        return "unknown";
    }
  }
  static getTorrentState(aria2Status: Aria2Download["status"]): DownloadClientItem["state"] {
    switch (aria2Status) {
      case "active":
        return "leeching";
      case "waiting":
        return "queued";
      case "paused":
        return "paused";
      case "complete":
        return "completed";
      case "error":
        return "failed";
      case "removed":
      default:
        return "unknown";
    }
  }
  static calculateEta(completed: number, total: number, speed: number): number {
    if (speed === 0 || completed >= total) return 0;
    return Math.floor((total - completed) / speed) * 1000; // Convert to milliseconds
  }
}
