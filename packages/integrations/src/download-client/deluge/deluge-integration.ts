import { Deluge } from "@ctrl/deluge";
import dayjs from "dayjs";

import { createCertificateAgentAsync } from "@homarr/certificates/server";

import type { DownloadClientJobsAndStatus } from "../../interfaces/downloads/download-client-data";
import { DownloadClientIntegration } from "../../interfaces/downloads/download-client-integration";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";
import type { DownloadClientStatus } from "../../interfaces/downloads/download-client-status";

export class DelugeIntegration extends DownloadClientIntegration {
  public async testConnectionAsync(): Promise<void> {
    const client = await this.getClientAsync();
    await client.login();
  }

  public async getClientJobsAndStatusAsync(): Promise<DownloadClientJobsAndStatus> {
    const type = "torrent";
    const client = await this.getClientAsync();
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
    const client = await this.getClientAsync();
    const store = (await client.listTorrents()).result.torrents;
    await Promise.all(
      Object.entries(store).map(async ([id]) => {
        await client.pauseTorrent(id);
      }),
    );
  }

  public async pauseItemAsync({ id }: DownloadClientItem): Promise<void> {
    const client = await this.getClientAsync();
    await client.pauseTorrent(id);
  }

  public async resumeQueueAsync() {
    const client = await this.getClientAsync();
    const store = (await client.listTorrents()).result.torrents;
    await Promise.all(
      Object.entries(store).map(async ([id]) => {
        await client.resumeTorrent(id);
      }),
    );
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
    return new Deluge({
      baseUrl: this.url("/").toString(),
      password: this.getSecretValue("password"),
      dispatcher: await createCertificateAgentAsync(),
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
