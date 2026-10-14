import type { Deluge } from "@ctrl/deluge";
import dayjs from "dayjs";
import { z } from "zod/v4";

import { isRecord } from "@homarr/common/object";

import type { IntegrationInput, IntegrationTestingInput } from "../../base/integration";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import type { DownloadClientJobsAndStatus } from "../../interfaces/downloads/download-client-data";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";
import type { IntegrationRuntimeResources } from "../../runtime/contracts";
import { NativeDownloadClient } from "./base";
import { DownloadClientHoldError } from "./contracts";
import type { DownloadControl, DownloadPublicClient } from "./contracts";

const torrentSchema = z.object({
  state: z.string(),
  queue: z.number(),
  name: z.string(),
  total_wanted: z.number(),
  total_uploaded: z.number(),
  progress: z.number(),
  download_payload_rate: z.number(),
  upload_payload_rate: z.number(),
  completed_time: z.number(),
  eta: z.number(),
  time_added: z.number(),
  label: z.string().optional(),
});

export class NativeDelugeClient extends NativeDownloadClient implements DownloadPublicClient<"deluge"> {
  constructor(integration: IntegrationInput, resources: IntegrationRuntimeResources) {
    super(integration, resources, "deluge");
  }

  public override async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    return await this.queryAsync<IntegrationHttpAuthentication>("getHttpAuthenticationAsync", async (transport) => {
      const password = this.secret("password");
      const response = await transport
        .fetchAsync(this.url("/json"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: "auth.login", params: [password], id: 1 }),
          signal: this.resources.context.signal,
          redirect: "error",
        })
        .catch((error: unknown) => {
          this.resources.context.signal.throwIfAborted();
          throw new Error("Deluge authentication failed", { cause: error });
        });
      try {
        if (!response.ok) throw new Error("Deluge authentication failed");
        const result: unknown = await response.json().catch(() => null);
        this.resources.context.signal.throwIfAborted();
        if (!isRecord(result) || result.result !== true || result.error)
          throw new Error("Deluge authentication failed");
        const cookies = response.headers
          .getSetCookie()
          .map((cookie) => cookie.split(";", 1)[0])
          .filter((cookie): cookie is string => Boolean(cookie));
        if (cookies.length === 0) throw new Error("Deluge authentication failed");
        return { headers: { Cookie: cookies.join("; ") }, redactValues: [password, ...cookies] };
      } finally {
        if (response.body && !response.bodyUsed) await response.body.cancel();
      }
    });
  }

  public async getClientJobsAndStatusAsync(input: { limit: number }): Promise<DownloadClientJobsAndStatus> {
    return await this.operationAsync<DownloadClientJobsAndStatus>("getClientJobsAndStatusAsync", async () => {
      const client = await this.getClientAsync();
      const {
        stats: { download_rate, upload_rate },
        torrents: rawTorrents,
      } = (await client.listTorrents(["completed_time"])).result;
      const torrents = Object.entries(rawTorrents).map(([id, torrent]) => ({ ...torrentSchema.parse(torrent), id }));
      const paused = torrents.find(({ state }) => this.getTorrentState(state) !== "paused") === undefined;
      return {
        status: { paused, rates: { down: Math.floor(download_rate), up: Math.floor(upload_rate) }, types: ["torrent"] },
        items: torrents.slice(0, input.limit).map((torrent): DownloadClientItem => ({
          type: "torrent",
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
          state: this.getTorrentState(torrent.state),
          progress: torrent.progress / 100,
          category: torrent.label,
        })),
      };
    });
  }

  protected async testingAsync(_input: IntegrationTestingInput): Promise<TestingResult> {
    const client = await this.getClientAsync();
    if (!(await client.login())) return TestConnectionError.UnauthorizedResult(401);
    return { success: true };
  }

  protected async prepareControlAsync(_input: IntegrationTestingInput, control: DownloadControl): Promise<void> {
    const client = await this.getClientAsync();
    switch (control.type) {
      case "pauseQueue": {
        const store = (await client.listTorrents()).result.torrents;
        const outcomes = await Promise.allSettled(Object.keys(store).map((id) => client.pauseTorrent(id)));
        for (const outcome of outcomes) if (outcome.status === "rejected") throw outcome.reason;
        return;
      }
      case "resumeQueue": {
        const store = (await client.listTorrents()).result.torrents;
        const outcomes = await Promise.allSettled(Object.keys(store).map((id) => client.resumeTorrent(id)));
        for (const outcome of outcomes) if (outcome.status === "rejected") throw outcome.reason;
        return;
      }
      case "pauseItem":
        await client.pauseTorrent(control.item.id);
        return;
      case "resumeItem":
        await client.resumeTorrent(control.item.id);
        return;
      case "deleteItem":
        await client.removeTorrent(control.item.id, control.fromDisk);
    }
  }

  private async getClientAsync(): Promise<Deluge> {
    throw new DownloadClientHoldError(this.kind, "sdk-request-ownership");
  }

  private getTorrentState(state: string): DownloadClientItem["state"] {
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
      default:
        return "unknown";
    }
  }
}
