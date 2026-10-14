import path from "node:path";
import { z } from "zod/v4";

import { isRecord } from "@homarr/common/object";

import type { IntegrationInput, IntegrationTestingInput } from "../../base/integration";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type {
  Aria2Download,
  Aria2GetClient,
  Aria2GetGlobalStat,
  Aria2GetVersion,
} from "../../download-client/aria2/aria2-types";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import type { DownloadClientJobsAndStatus } from "../../interfaces/downloads/download-client-data";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";
import type { IntegrationRuntimeResources } from "../../runtime/contracts";
import { NativeDownloadClient } from "./base";
import { DownloadClientHoldError, DownloadProtocolError } from "./contracts";
import type { DownloadControl, DownloadPublicClient } from "./contracts";

const downloadSchema = z.object({
  gid: z.string(),
  status: z.string(),
  totalLength: z.string(),
  completedLength: z.string(),
  uploadLength: z.string(),
  downloadSpeed: z.string(),
  uploadSpeed: z.string(),
  files: z.array(z.object({ path: z.string() })),
  bittorrent: z
    .object({ info: z.object({ name: z.union([z.string(), z.object({ "utf-8": z.string() })]) }).optional() })
    .optional(),
});
const globalStatSchema = z.object({
  downloadSpeed: z.string(),
  uploadSpeed: z.string(),
  numActive: z.string(),
  numWaiting: z.string(),
  numStopped: z.string(),
  numStoppedTotal: z.string(),
}) satisfies z.ZodType<Aria2GetGlobalStat>;
const versionSchema = z.object({
  enabledFeatures: z.array(z.string()),
  version: z.string(),
}) satisfies z.ZodType<Aria2GetVersion>;

export class NativeAria2Client extends NativeDownloadClient implements DownloadPublicClient<"aria2"> {
  constructor(integration: IntegrationInput, resources: IntegrationRuntimeResources) {
    super(integration, resources, "aria2");
  }

  public override async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    return await this.operationAsync<IntegrationHttpAuthentication>("getHttpAuthenticationAsync", async () => {
      if (!this.hasSecret("apiKey")) return { headers: {} };
      const token = this.secret("apiKey");
      return {
        headers: {},
        body: { type: "jsonArrayPrefix", name: "params", value: `token:${token}` },
        redactValues: [token, `token:${token}`],
      };
    });
  }

  public async getClientJobsAndStatusAsync(input: { limit: number }): Promise<DownloadClientJobsAndStatus> {
    return await this.queryAsync<DownloadClientJobsAndStatus>("getClientJobsAndStatusAsync", async (transport) => {
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
      const [active, waiting, stopped, global] = await Promise.allSettled([
        this.rpcAsync(transport, "tellActive").then((result) => z.array(downloadSchema).parse(result)),
        this.rpcAsync(transport, "tellWaiting", 0, input.limit, keys).then((result) =>
          z.array(downloadSchema).parse(result),
        ),
        this.rpcAsync(transport, "tellStopped", 0, input.limit, keys).then((result) =>
          z.array(downloadSchema).parse(result),
        ),
        this.rpcAsync(transport, "getGlobalStat").then((result) => globalStatSchema.parse(result)),
      ]);
      if (active.status === "rejected") throw active.reason;
      if (waiting.status === "rejected") throw waiting.reason;
      if (stopped.status === "rejected") throw stopped.reason;
      if (global.status === "rejected") throw global.reason;
      const downloads = [...active.value, ...waiting.value, ...stopped.value].slice(0, input.limit);
      return {
        status: {
          types: ["torrent", "miscellaneous"],
          paused: downloads.every((download) => download.status === "paused"),
          rates: { up: Number(global.value.uploadSpeed), down: Number(global.value.downloadSpeed) },
        },
        items: downloads.map((download, index): DownloadClientItem => {
          const total = Number(download.totalLength);
          const completed = Number(download.completedLength);
          const speed = Number(download.downloadSpeed);
          const progress = total > 0 ? completed / total : 0;
          const name = download.bittorrent?.info?.name;
          if (name !== undefined && typeof name !== "string")
            throw new DownloadClientHoldError(this.kind, "aria2-object-name");
          return {
            index,
            id: download.gid,
            name: name ?? path.basename(download.files[0]?.path ?? "Unknown"),
            type: download.bittorrent ? "torrent" : "miscellaneous",
            size: total,
            sent: Number(download.uploadLength),
            downSpeed: speed,
            upSpeed: Number(download.uploadSpeed),
            time: speed === 0 || completed >= total ? 0 : Math.floor((total - completed) / speed) * 1000,
            state: this.getState(download.status, Boolean(download.bittorrent), progress),
            category: [],
            progress,
          };
        }),
      };
    });
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    versionSchema.parse(await this.rpcAsync(input, "getVersion"));
    return { success: true };
  }

  protected async prepareControlAsync(input: IntegrationTestingInput, control: DownloadControl): Promise<void> {
    switch (control.type) {
      case "pauseQueue":
        await this.rpcAsync(input, "pauseAll");
        return;
      case "resumeQueue":
        await this.rpcAsync(input, "unpauseAll");
        return;
      case "pauseItem":
        await this.rpcAsync(input, "pause", control.item.id);
        return;
      case "resumeItem":
        await this.rpcAsync(input, "unpause", control.item.id);
        return;
      case "deleteItem":
        if (["downloading", "leeching", "seeding", "queued", "paused"].includes(control.item.state)) {
          await this.rpcAsync(input, control.fromDisk ? "remove" : "forceRemove", control.item.id);
        } else {
          await this.rpcAsync(input, "removeDownloadResult", control.item.id);
        }
    }
  }

  private async rpcAsync<TMethod extends keyof Aria2GetClient>(
    input: IntegrationTestingInput,
    method: TMethod,
    ...args: Parameters<Aria2GetClient[TMethod]>
  ): Promise<unknown> {
    const params: unknown[] = this.hasSecret("apiKey") ? [`token:${this.secret("apiKey")}`, ...args] : [...args];
    const body = await this.requestJsonAsync(input, this.url("/jsonrpc"), {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: btoa(["Homarr", Date.now().toString(), Math.random()].join(".")),
        method: `aria2.${method}`,
        params,
      }),
    });
    if (!isRecord(body)) throw new DownloadProtocolError(this.kind, method);
    if (body.error) {
      const code = isRecord(body.error) && typeof body.error.code === "number" ? body.error.code : undefined;
      throw new DownloadProtocolError(this.kind, method, code);
    }
    if (!("result" in body)) throw new DownloadProtocolError(this.kind, method);
    return body.result;
  }

  private getState(status: string, isTorrent: boolean, progress: number): DownloadClientItem["state"] {
    switch (status) {
      case "active":
        return isTorrent ? (progress >= 1 ? "seeding" : "leeching") : "downloading";
      case "waiting":
        return "queued";
      case "paused":
        return "paused";
      case "complete":
        return "completed";
      case "error":
        return "failed";
      default:
        return "unknown";
    }
  }
}
