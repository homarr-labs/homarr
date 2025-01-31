import { QBittorrent } from "@ctrl/qbittorrent";
import dayjs from "dayjs";

import { createCertificateAgentAsync } from "@homarr/certificates/server";

import type { DownloadClientJobsAndStatus } from "../../interfaces/downloads/download-client-data";
import { DownloadClientIntegration } from "../../interfaces/downloads/download-client-integration";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";
import type { DownloadClientStatus } from "../../interfaces/downloads/download-client-status";

export class QBitTorrentIntegration extends DownloadClientIntegration {
  public async testConnectionAsync(): Promise<void> {
    const client = await this.getClientAsync();
    await client.login();
  }

  public async getClientJobsAndStatusAsync(): Promise<DownloadClientJobsAndStatus> {
    const type = "torrent";
    const client = await this.getClientAsync();
    const torrents = await client.listTorrents();
    const rates = torrents.reduce(
      ({ down, up }, { dlspeed, upspeed }) => ({ down: down + dlspeed, up: up + upspeed }),
      { down: 0, up: 0 },
    );
    const paused =
      torrents.find(({ state }) => QBitTorrentIntegration.getTorrentState(state) !== "paused") === undefined;
    const status: DownloadClientStatus = { paused, rates, types: [type] };
    const items = torrents.map((torrent): DownloadClientItem => {
      const state = QBitTorrentIntegration.getTorrentState(torrent.state);
      return {
        type,
        id: torrent.hash,
        index: torrent.priority,
        name: torrent.name,
        size: torrent.size,
        sent: torrent.uploaded,
        downSpeed: torrent.progress !== 1 ? torrent.dlspeed : undefined,
        upSpeed: torrent.upspeed,
        time:
          torrent.progress === 1
            ? Math.min(torrent.completion_on * 1000 - dayjs().valueOf(), -1)
            : torrent.eta === 8640000
              ? 0
              : Math.max(torrent.eta * 1000, 0),
        added: torrent.added_on * 1000,
        state,
        progress: torrent.progress,
        category: torrent.category,
      };
    });
    return { status, items };
  }

  public async pauseQueueAsync() {
    const client = await this.getClientAsync();
    await client.pauseTorrent("all");
  }

  public async pauseItemAsync({ id }: DownloadClientItem): Promise<void> {
    const client = await this.getClientAsync();
    await client.pauseTorrent(id);
  }

  public async resumeQueueAsync() {
    const client = await this.getClientAsync();
    await client.resumeTorrent("all");
  }

  public async resumeItemAsync({ id }: DownloadClientItem): Promise<void> {
    const client = await this.getClientAsync();
    await client.resumeTorrent(id);
  }

  public async deleteItemAsync({ id }: DownloadClientItem, fromDisk: boolean): Promise<void> {
    const client = await this.getClientAsync();
    await client.removeTorrent(id, fromDisk);
  }

  private async getClientAsync() {
    return new QBittorrent({
      baseUrl: this.url("/").toString(),
      username: this.getSecretValue("username"),
      password: this.getSecretValue("password"),
      dispatcher: await createCertificateAgentAsync(),
    });
  }

  private static getTorrentState(state: string): DownloadClientItem["state"] {
    switch (state) {
      case "allocating":
      case "checkingDL":
      case "downloading":
      case "forcedDL":
      case "forcedMetaDL":
      case "metaDL":
      case "queuedDL":
      case "queuedForChecking":
        return "leeching";
      case "checkingUP":
      case "forcedUP":
      case "queuedUP":
      case "uploading":
      case "stalledUP":
        return "seeding";
      case "pausedDL":
      case "pausedUP":
        return "paused";
      case "stalledDL":
        return "stalled";
      case "error":
      case "checkingResumeData":
      case "missingFiles":
      case "moving":
      case "unknown":
      default:
        return "unknown";
    }
  }
}
