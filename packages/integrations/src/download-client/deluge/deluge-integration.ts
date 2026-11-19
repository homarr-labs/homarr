import { Deluge } from "@ctrl/deluge";
import dayjs from "dayjs";
import type { Dispatcher } from "undici";

import { createCertificateAgentAsync, fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { HandleIntegrationErrors } from "../../base/errors/decorator";
import { integrationOFetchHttpErrorHandler } from "../../base/errors/http";
import { Integration } from "../../base/integration";
import type { IntegrationTestingInput } from "../../base/integration";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { DownloadClientJobsAndStatus } from "../../interfaces/downloads/download-client-data";
import type {
  DownloadClientSelection,
  IDownloadClientIntegration,
} from "../../interfaces/downloads/download-client-integration";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";
import type { DownloadClientStatus } from "../../interfaces/downloads/download-client-status";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import { selectDownloadTorrents } from "../select-torrents";

@HandleIntegrationErrors([integrationOFetchHttpErrorHandler])
export class DelugeIntegration extends Integration implements IDownloadClientIntegration {
  public override async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    const password = this.getSecretValue("password");
    const response = await fetchWithTrustedCertificatesAsync(this.url("/json"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "auth.login", params: [password], id: 1 }),
      redirect: "error",
    }).catch(() => {
      throw new Error("Deluge authentication failed");
    });

    if (!response.ok) throw new Error("Deluge authentication failed");
    const result = (await response.json().catch(() => null)) as { result?: unknown; error?: unknown } | null;
    if (result?.result !== true || result.error) throw new Error("Deluge authentication failed");

    const cookies = response.headers
      .getSetCookie()
      .map((cookie) => cookie.split(";", 1)[0])
      .filter((cookie): cookie is string => Boolean(cookie));
    if (cookies.length === 0) throw new Error("Deluge authentication failed");
    const cookieHeader = cookies.join("; ");
    return { headers: { Cookie: cookieHeader }, redactValues: [password, ...cookies] };
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const client = await this.getClientAsync(input.dispatcher);
    const isSuccess = await client.login();

    if (!isSuccess) {
      return TestConnectionError.UnauthorizedResult(401);
    }

    return {
      success: true,
    };
  }

  public async getClientJobsAndStatusAsync(input: {
    limit: number;
    selection?: DownloadClientSelection;
  }): Promise<DownloadClientJobsAndStatus> {
    const type = "torrent";
    const client = await this.getClientAsync();
    // Currently there is no way to limit the number of returned torrents
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
      types: [type],
    };
    const currentTime = dayjs().unix();
    const selectedTorrents = selectDownloadTorrents(torrents, input, {
      category: (torrent) => torrent.label,
      progress: (torrent) => torrent.progress / 100,
      upSpeed: (torrent) => torrent.upload_payload_rate,
      downSpeed: (torrent) => {
        if (torrent.progress === 100) return undefined;
        return torrent.download_payload_rate;
      },
      name: (torrent) => torrent.name,
      size: (torrent) => torrent.total_wanted,
      added: (torrent) => torrent.time_added * 1000,
      index: (torrent) => torrent.queue,
      sent: (torrent) => torrent.total_uploaded,
      received: (torrent) => Math.floor(torrent.total_wanted * (torrent.progress / 100)),
      ratio: (torrent) => {
        if (torrent.total_wanted <= 0) return undefined;
        return torrent.total_uploaded / torrent.total_wanted;
      },
      state: (torrent) => DelugeIntegration.getTorrentState(torrent.state),
      time: (torrent) => {
        if (torrent.progress === 100) return Math.min((torrent.completed_time - currentTime) * 1000, -1);
        return Math.max(torrent.eta * 1000, 0);
      },
    });
    const items = selectedTorrents.map((torrent): DownloadClientItem => {
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
            ? Math.min((torrent.completed_time - currentTime) * 1000, -1)
            : Math.max(torrent.eta * 1000, 0),
        added: torrent.time_added * 1000,
        state,
        progress: torrent.progress / 100,
        category: torrent.label,
      };
    });
    if (!input.selection) return { status, items };

    const ratioItems = torrents.slice(0, input.limit).map((torrent) => ({
      sent: torrent.total_uploaded,
      size: torrent.total_wanted,
      progress: torrent.progress / 100,
      category: torrent.label,
    }));
    return { status, items, ratioItems };
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

  public async getCategoriesAsync(): Promise<string[] | null> {
    const client = await this.getClientAsync();
    if (!(await this.isLabelPluginEnabledAsync(client))) return null;

    const response = await client.getLabels();
    if (response.error) throw new Error("Unable to load Deluge labels", { cause: response.error });
    return response.result;
  }

  public async setItemCategoryAsync(id: string, category: string): Promise<void> {
    const client = await this.getClientAsync();
    if (!(await this.isLabelPluginEnabledAsync(client))) {
      throw new Error("The Deluge Label plugin must be enabled to change categories");
    }

    const response = await client.setTorrentLabel(id, category);
    if (response.error) throw new Error("Unable to change the Deluge label", { cause: response.error });
  }

  private async isLabelPluginEnabledAsync(client: Deluge): Promise<boolean> {
    const response = await client.getPlugins();
    if (response.error) throw new Error("Unable to load Deluge plugins", { cause: response.error });
    return response.result.enabled_plugins.includes("Label");
  }

  private async getClientAsync(dispatcher?: Dispatcher) {
    return new Deluge({
      baseUrl: this.url("/").toString(),
      password: this.getSecretValue("password"),
      dispatcher: dispatcher ?? (await createCertificateAgentAsync()),
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
