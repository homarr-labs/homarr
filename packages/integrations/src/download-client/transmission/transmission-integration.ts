import { Transmission } from "@ctrl/transmission";
import dayjs from "dayjs";

import type { DownloadClientJobsAndStatus } from "../../interfaces/downloads/download-client-data";
import { DownloadClientIntegration } from "../../interfaces/downloads/download-client-integration";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";
import type { DownloadClientStatus } from "../../interfaces/downloads/download-client-status";

export class TransmissionIntegration extends DownloadClientIntegration {
  public async testConnectionAsync(): Promise<void> {
    await this.getClient().getSession();
  }

  public async getClientJobsAndStatusAsync(): Promise<DownloadClientJobsAndStatus> {
    const type = "torrent";
    const client = this.getClient();
    const { torrents } = (await client.listTorrents()).arguments;
    const rates = torrents.reduce(
      ({ down, up }, { rateDownload, rateUpload }) => ({ down: down + rateDownload, up: up + rateUpload }),
      { down: 0, up: 0 },
    );
    const paused =
      torrents.find(({ status }) => TransmissionIntegration.getTorrentState(status) !== "paused") === undefined;
    const status: DownloadClientStatus = { paused, rates, type };
    const items = torrents.map((torrent): DownloadClientItem => {
      const state = TransmissionIntegration.getTorrentState(torrent.status);
      return {
        type,
        id: torrent.hashString,
        index: torrent.queuePosition,
        name: torrent.name,
        size: torrent.totalSize,
        sent: torrent.uploadedEver,
        downSpeed: torrent.percentDone !== 1 ? torrent.rateDownload : undefined,
        upSpeed: torrent.rateUpload,
        time:
          torrent.percentDone === 1
            ? Math.min(torrent.doneDate * 1000 - dayjs().valueOf(), -1)
            : Math.max(torrent.eta * 1000, 0),
        added: torrent.addedDate * 1000,
        state,
        progress: torrent.percentDone,
        category: torrent.labels,
      };
    });
    return { status, items };
  }

  public async pauseQueueAsync() {
    const client = this.getClient();
    const ids = (await client.listTorrents()).arguments.torrents.map(({ hashString }) => hashString);
    await this.getClient().pauseTorrent(ids);
  }

  public async pauseItemAsync({ id }: DownloadClientItem): Promise<void> {
    await this.getClient().pauseTorrent(id);
  }

  public async resumeQueueAsync() {
    const client = this.getClient();
    const ids = (await client.listTorrents()).arguments.torrents.map(({ hashString }) => hashString);
    await this.getClient().resumeTorrent(ids);
  }

  public async resumeItemAsync({ id }: DownloadClientItem): Promise<void> {
    await this.getClient().resumeTorrent(id);
  }

  public async deleteItemAsync({ id }: DownloadClientItem, fromDisk: boolean): Promise<void> {
    await this.getClient().removeTorrent(id, fromDisk);
  }

  private getClient() {
    return new Transmission({
      baseUrl: this.url("/").toString(),
      username: this.getSecretValue("username"),
      password: this.getSecretValue("password"),
    });
  }

  private static getTorrentState(status: number): DownloadClientItem["state"] {
    switch (status) {
      case 0:
        return "paused";
      case 1:
      case 3:
        return "stalled";
      case 2:
      case 4:
        return "leeching";
      case 5:
      case 6:
        return "seeding";
      default:
        return "unknown";
    }
  }
}
