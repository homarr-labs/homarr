import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";

import type { DownloadClientJobsAndStatus } from "../../interfaces/downloads/download-client-data";
import { DownloadClientIntegration } from "../../interfaces/downloads/download-client-integration";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";
import { CreateAria2, Aria2DownloadState } from './aria2-client';
import path from "path"


export class Aria2Integration extends DownloadClientIntegration {
  public async getClientJobsAndStatusAsync(): Promise<DownloadClientJobsAndStatus> {
    const client = await this.getClientAsync();
    // ?: Should recursive retrive all items or just few first item?
    const [actives, waitings, stoppeds, globalstats] = await Promise.all([client.tellActive(), client.tellWaiting(0, 1000), client.tellStopped(0, 1000), client.getGlobalStat()]);

    const downloadings = [...actives, ...waitings, ...stoppeds];

    return {
      status: {
        types: ["torrent", "http(s)"],
        paused: false,
        rates: {
          up: Number(globalstats.uploadSpeed),
          down: Number(globalstats.downloadSpeed),
        }
      },
      items: downloadings.map((item, idx) => {
        const totalSize = Number(item.totalLength);
        const completedSize = Number(item.completedLength);
        const progress = totalSize > 0 ? completedSize / totalSize : 0;
        const itemName = item?.bittorrent?.info?.name || path.basename(item.files[0]?.path || "Unknown");

        return {
          id: item.gid,
          index: idx,
          name: itemName,
          type: !!item.bittorrent ? "torrent" : "http(s)",
          size: totalSize,
          sent: Number(item.uploadLength),
          downSpeed: Number(item.downloadSpeed),
          upSpeed: Number(item.uploadSpeed),
          time: this.calculateEta(completedSize, totalSize, Number(item.downloadSpeed)),
          state: this.getState(item.status, !!item.bittorrent),
          progress: progress,
          category: [],
        }
      }),
    } as DownloadClientJobsAndStatus
  }
  public async pauseQueueAsync(): Promise<void> {

    const client = await this.getClientAsync();
    await client.pauseAll();
  }
  public async pauseItemAsync(item: DownloadClientItem): Promise<void> {
    const client = await this.getClientAsync();
    switch (item.state) {
      case "downloading":
      case "leeching":
        await client.pause(item.id);
        return;
      default:
        return;
    }
  }
  public async resumeQueueAsync(): Promise<void> {
    const client = await this.getClientAsync();
    await client.unpauseAll();
  }
  public async resumeItemAsync(item: DownloadClientItem): Promise<void> {
    const client = await this.getClientAsync();
    switch (item.state) {
      case "paused":
        await client.unpause(item.id);
        return;
      default:
        return;
    }
  }
  public async deleteItemAsync(item: DownloadClientItem, fromDisk: boolean): Promise<void> {
    const client = await this.getClientAsync();
    // Note: Remove download file is not support by aria2, replace with forceremove 
    switch (item.state) {
      case "downloading":
      case "leeching":
      case "paused":
        await (fromDisk ? client.remove(item.id) : client.forceRemove(item.id));
        return
      default:
        await client.removeDownloadResult(item.id)
        return;
    }
  }

  public async testConnectionAsync(): Promise<void> {
    const client = await this.getClientAsync();
    await client.getVersion()
  }

  private async getClientAsync() {
    const dispatcher = fetchWithTrustedCertificatesAsync
    const aria2Client = await CreateAria2({
      baseUrl: this.url("/jsonrpc").toString(),
      secretKey: this.getSecretValue("apiKey"),
      dispatcher: dispatcher,
    });
    return aria2Client
  }

  private getState(aria2Status: Aria2DownloadState, isTorrent: boolean): DownloadClientItem["state"] {
    return isTorrent ? this.getTorrentState(aria2Status) : this.getNonTorrentState(aria2Status)
  }
  private getNonTorrentState(aria2Status: Aria2DownloadState): DownloadClientItem["state"] {
    switch (aria2Status) {
      case 'active':
        return 'downloading';
      case 'waiting':
        return 'queued';
      case 'paused':
        return 'paused';
      case 'complete':
        return 'completed';
      case 'error':
        return 'failed'
      case 'removed':
      default:
        return 'unknown';
    }
  }
  private getTorrentState(aria2Status: Aria2DownloadState): DownloadClientItem["state"] {
    switch (aria2Status) {
      case 'active':
        return 'leeching'
      case 'waiting':
        return 'queued';
      case 'paused':
        return 'paused';
      case 'complete':
        return 'completed';
      case 'error':
        return 'failed'
      case 'removed':
      default:
        return 'unknown';
    }
  }
  private calculateEta(completed: number, total: number, speed: number): number {
    if (speed === 0 || completed >= total) return 0;
    return Math.floor((total - completed) / speed) * 1000; // Convert to milliseconds
  }
}
