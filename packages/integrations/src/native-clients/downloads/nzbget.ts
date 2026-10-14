import dayjs from "dayjs";
import { z } from "zod/v4";

import { isRecord } from "@homarr/common/object";

import type { IntegrationInput, IntegrationTestingInput } from "../../base/integration";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { NzbGetClient } from "../../download-client/nzbget/nzbget-types";
import type { DownloadClientJobsAndStatus } from "../../interfaces/downloads/download-client-data";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";
import type { IntegrationRuntimeResources } from "../../runtime/contracts";
import { NativeDownloadClient } from "./base";
import { DownloadProtocolError } from "./contracts";
import type { DownloadControl, DownloadPublicClient } from "./contracts";

const statusSchema = z.object({ DownloadPaused: z.boolean(), DownloadRate: z.number() }) satisfies z.ZodType<
  ReturnType<NzbGetClient["status"]>
>;
const groupSchema = z.object({
  Status: z.string(),
  NZBID: z.number(),
  MaxPriority: z.number(),
  NZBName: z.string(),
  FileSizeLo: z.number(),
  FileSizeHi: z.number(),
  ActiveDownloads: z.number(),
  RemainingSizeLo: z.number(),
  RemainingSizeHi: z.number(),
  DownloadTimeSec: z.number(),
  Category: z.string(),
  DownloadedSizeMB: z.number(),
  FileSizeMB: z.number(),
}) satisfies z.ZodType<ReturnType<NzbGetClient["listgroups"]>[number]>;
const historySchema = z.object({
  ScriptStatus: z.string(),
  NZBID: z.number(),
  Name: z.string(),
  FileSizeLo: z.number(),
  FileSizeHi: z.number(),
  HistoryTime: z.number(),
  DownloadTimeSec: z.number(),
  Category: z.string(),
}) satisfies z.ZodType<ReturnType<NzbGetClient["history"]>[number]>;
const fileSchema = z.array(z.object({ ID: z.number() })) satisfies z.ZodType<ReturnType<NzbGetClient["listfiles"]>>;

export class NativeNzbGetClient extends NativeDownloadClient implements DownloadPublicClient<"nzbGet"> {
  constructor(integration: IntegrationInput, resources: IntegrationRuntimeResources) {
    super(integration, resources, "nzbGet");
  }

  public async getClientJobsAndStatusAsync(input: { limit: number }): Promise<DownloadClientJobsAndStatus> {
    return await this.queryAsync<DownloadClientJobsAndStatus>("getClientJobsAndStatusAsync", async (transport) => {
      const [queueResult, historyResult, statusResult] = await Promise.allSettled([
        this.rpcAsync(transport, "listgroups").then((result) => z.array(groupSchema).parse(result)),
        this.rpcAsync(transport, "history").then((result) => z.array(historySchema).parse(result)),
        this.rpcAsync(transport, "status").then((result) => statusSchema.parse(result)),
      ]);
      if (queueResult.status === "rejected") throw queueResult.reason;
      if (historyResult.status === "rejected") throw historyResult.reason;
      if (statusResult.status === "rejected") throw statusResult.reason;
      const status = statusResult.value;
      const items = queueResult.value
        .map((file): DownloadClientItem => {
          const time = (file.RemainingSizeLo + file.RemainingSizeHi * Math.pow(2, 32)) / (status.DownloadRate / 1000);
          return {
            type: "usenet",
            id: file.NZBID.toString(),
            index: file.MaxPriority,
            name: file.NZBName,
            size: file.FileSizeLo + file.FileSizeHi * Math.pow(2, 32),
            downSpeed: file.ActiveDownloads > 0 ? status.DownloadRate : 0,
            time: Number.isFinite(time) ? time : 0,
            added: (dayjs().unix() - file.DownloadTimeSec) * 1000,
            state: file.Status === "QUEUED" ? "queued" : file.Status === "PAUSED" ? "paused" : "downloading",
            progress: file.DownloadedSizeMB / file.FileSizeMB,
            category: file.Category,
          };
        })
        .concat(
          historyResult.value.map((file, index): DownloadClientItem => ({
            type: "usenet",
            id: file.NZBID.toString(),
            index,
            name: file.Name,
            size: file.FileSizeLo + file.FileSizeHi * Math.pow(2, 32),
            time: (dayjs().unix() - file.HistoryTime) * 1000,
            added: (file.HistoryTime - file.DownloadTimeSec) * 1000,
            state:
              file.ScriptStatus === "FAILURE" ? "failed" : file.ScriptStatus === "SUCCESS" ? "completed" : "processing",
            progress: 1,
            category: file.Category,
          })),
        )
        .slice(0, input.limit);
      return {
        status: { paused: status.DownloadPaused, rates: { down: status.DownloadRate }, types: ["usenet"] },
        items,
      };
    });
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    z.string().parse(await this.rpcAsync(input, "version"));
    return { success: true };
  }

  protected async prepareControlAsync(input: IntegrationTestingInput, control: DownloadControl): Promise<void> {
    switch (control.type) {
      case "pauseQueue":
        await this.rpcAsync(input, "pausedownload");
        return;
      case "resumeQueue":
        await this.rpcAsync(input, "resumedownload");
        return;
      case "pauseItem":
        await this.rpcAsync(input, "editqueue", "GroupPause", "", [Number(control.item.id)]);
        return;
      case "resumeItem":
        await this.rpcAsync(input, "editqueue", "GroupResume", "", [Number(control.item.id)]);
        return;
      case "deleteItem": {
        const id = Number(control.item.id);
        if (control.fromDisk) {
          const files = fileSchema.parse(await this.rpcAsync(input, "listfiles", 0, 0, id));
          await this.rpcAsync(
            input,
            "editqueue",
            "FileDelete",
            "",
            files.map((file) => file.ID),
          );
        }
        await this.rpcAsync(
          input,
          "editqueue",
          control.item.progress === 1 ? "GroupFinalDelete" : "HistoryFinalDelete",
          "",
          [id],
        );
      }
    }
  }

  private async rpcAsync<TMethod extends keyof NzbGetClient>(
    input: IntegrationTestingInput,
    method: TMethod,
    ...params: Parameters<NzbGetClient[TMethod]>
  ): Promise<unknown> {
    const username = this.secret("username");
    const password = this.secret("password");
    const body = await this.requestJsonAsync(
      input,
      this.url(`/${encodeURIComponent(username)}:${encodeURIComponent(password)}/jsonrpc`),
      {
        method: "POST",
        body: JSON.stringify({ method, params }),
      },
    );
    if (!isRecord(body)) throw new DownloadProtocolError(this.kind, method);
    if (body.error) {
      const code = isRecord(body.error) && typeof body.error.code === "number" ? body.error.code : undefined;
      throw new DownloadProtocolError(this.kind, method, code);
    }
    if (!("result" in body)) throw new DownloadProtocolError(this.kind, method);
    return body.result;
  }
}
