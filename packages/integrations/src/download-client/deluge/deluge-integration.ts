import { Deluge } from "@ctrl/deluge";
import dayjs from "dayjs";

import type { DownloadClientJobsAndStatus } from "../../interfaces/downloads/download-client-data";
import { DownloadClientIntegration } from "../../interfaces/downloads/download-client-integration";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";
import type { DownloadClientStatus } from "../../interfaces/downloads/download-client-status";

export class DelugeIntegration extends DownloadClientIntegration {
  public async testConnectionAsync(): Promise<void> {
    const client = this.getClient();
    await client.login();
  }

  public async getClientJobsAndStatusAsync(): Promise<DownloadClientJobsAndStatus> {
    const type = "torrent";
    const client = this.getClient();
    const {
      stats: { download_rate, upload_rate },
      torrents: rawTorrents,
    } = (await client.listTorrents(["completed_time"])).result;
    const torrents = Object.entries(rawTorrents).map(([id, torrent]) => ({
      ...(torrent as { completed_time: number } & typeof torrent),
      id,
    }));
    const paused = torrents.find(({ state }) => DelugeIntegration.getTorrentState(state) !== "paused") === undefined;
    const status: DownloadClientStatus = {
      paused,
      rates: {
        down: Math.floor(download_rate),
        up: Math.floor(upload_rate),
      },
      type,
    };
    const items = torrents.map((torrent): DownloadClientItem => {
      const state = DelugeIntegration.getTorrentState(torrent.state);
      return {
        type,
        id: torrent.id,
        index: torrent.queue,
        name: torrent.name,
        size: torrent.total_wanted,
        sent: torrent.total_uploaded,
        downSpeed: torrent.progress !== 100 ? torrent.download_payload_rate : undefined,
        upSpeed: torrent.upload_payload_rate,
        time:
          torrent.progress === 100
            ? Math.min((torrent.completed_time - dayjs().unix()) * 1000, -1)
            : Math.max(torrent.eta * 1000, 0),
        added: torrent.time_added * 1000,
        state,
        progress: torrent.progress / 100,
        category: torrent.label,
      };
    });
    return { status, items };
  }

  public async pauseQueueAsync() {
    const client = this.getClient();
    const store = (await client.listTorrents()).result.torrents;
    await Promise.all(
      Object.entries(store).map(async ([id]) => {
        await client.pauseTorrent(id);
      }),
    );
  }

  public async pauseItemAsync({ id }: DownloadClientItem): Promise<void> {
    await this.getClient().pauseTorrent(id);
  }

  public async resumeQueueAsync() {
    const client = this.getClient();
    const store = (await client.listTorrents()).result.torrents;
    await Promise.all(
      Object.entries(store).map(async ([id]) => {
        await client.resumeTorrent(id);
      }),
    );
  }

  public async resumeItemAsync({ id }: DownloadClientItem): Promise<void> {
    await this.getClient().resumeTorrent(id);
  }

  public async deleteItemAsync({ id }: DownloadClientItem, fromDisk: boolean): Promise<void> {
    await this.getClient().removeTorrent(id, fromDisk);
  }

  private getClient() {
    const baseUrl = new URL(this.integration.url).href;
    return new Deluge({
      baseUrl,
      password: this.getSecretValue("password"),
    });
  }

  private static getTorrentState(state: string): DownloadClientItem["state"] {
    switch (state) {
      case "Queued":
      case "Checking":
      case "Allocating":
      case "Downloading":
        return "leeching";
      case "Seeding":
        return "seeding";
      case "Paused":
        return "paused";
      case "Error":
      case "Moving":
      default:
        return "unknown";
    }
  }
}
