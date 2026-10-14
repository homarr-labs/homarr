import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { z } from "zod/v4";

import { ResponseError } from "@homarr/common/response-error";

import type { IntegrationInput, IntegrationTestingInput } from "../../base/integration";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import { apiKeyAuth } from "../../http-auth";
import type { DownloadClientJobsAndStatus } from "../../interfaces/downloads/download-client-data";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";
import type { IntegrationRuntimeResources } from "../../runtime/contracts";
import { NativeDownloadClient } from "./base";
import type { DownloadControl, DownloadPublicClient } from "./contracts";

dayjs.extend(duration);

const fileSchema = z.object({
  id: z.string(),
  filename: z.string(),
  size: z.number(),
  percentComplete: z.number(),
  averageSpeed: z.number(),
  remainingTime: z.string().optional(),
  state: z.string(),
  requestedAt: z.string(),
});
const downloadsSchema = z.array(z.object({ directories: z.array(z.object({ files: z.array(fileSchema) })) }));

export class NativeSlskdClient extends NativeDownloadClient implements DownloadPublicClient<"slskd"> {
  constructor(integration: IntegrationInput, resources: IntegrationRuntimeResources) {
    super(integration, resources, "slskd");
  }

  public override async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    return await this.operationAsync<IntegrationHttpAuthentication>("getHttpAuthenticationAsync", async () =>
      apiKeyAuth(this.integration),
    );
  }

  public async getClientJobsAndStatusAsync(input: { limit: number }): Promise<DownloadClientJobsAndStatus> {
    return await this.queryAsync<DownloadClientJobsAndStatus>("getClientJobsAndStatusAsync", async (transport) => {
      const response = await transport.fetchAsync(this.url("/api/v0/transfers/downloads"), {
        method: "GET",
        headers: { "X-API-Key": this.secret("apiKey") },
        signal: this.resources.context.signal,
        redirect: "error",
      });
      let body: unknown;
      try {
        if (!response.ok) throw new ResponseError({ status: response.status });
        body = response.headers.get("content-type")?.includes("application/json")
          ? await response.json()
          : await response.text();
      } finally {
        if (response.body && !response.bodyUsed) await response.body.cancel();
      }
      this.resources.context.signal.throwIfAborted();
      const downloads = downloadsSchema.parse(body);
      const files = downloads.flatMap((user) => user.directories).flatMap((directory) => directory.files);
      return {
        status: {
          paused: false,
          rates: { down: files.reduce((sum, file) => sum + file.averageSpeed, 0), up: 0 },
          types: ["miscellaneous"],
        },
        items: files.slice(0, input.limit).map((file, index): DownloadClientItem => {
          const remaining = file.remainingTime ? file.remainingTime.split(":") : null;
          return {
            id: file.id,
            name: file.filename.split("\\").at(-1) ?? file.filename,
            size: file.size,
            time: remaining
              ? dayjs
                  .duration({
                    hours: Number(remaining[0]),
                    minutes: Number(remaining[1]),
                    seconds: Number(remaining[2]),
                  })
                  .as("milliseconds")
              : 0,
            progress: file.percentComplete / 100,
            type: "miscellaneous",
            state: this.getDownloadState(file.state),
            added: dayjs(file.requestedAt).unix() * 1000,
            index,
          };
        }),
      };
    });
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/api/v0/server"), {
      headers: { "X-API-Key": this.secret("apiKey") },
      signal: this.resources.context.signal,
      redirect: "error",
    });
    try {
      if (!response.ok) return TestConnectionError.StatusResult({ status: response.status, url: response.url });
      await response.json();
      this.resources.context.signal.throwIfAborted();
      return { success: true };
    } finally {
      if (response.body && !response.bodyUsed) await response.body.cancel();
    }
  }

  protected async prepareControlAsync(_input: IntegrationTestingInput, _control: DownloadControl): Promise<void> {
    this.rejectControl();
  }

  private getDownloadState(csv: string): DownloadClientItem["state"] {
    try {
      const states = parseTransferStateArray(csv);
      if (states.includes(TransferState.InProgress)) return "downloading";
      if (
        states.includes(TransferState.Errored) ||
        states.includes(TransferState.Aborted) ||
        states.includes(TransferState.TimedOut) ||
        states.includes(TransferState.Rejected) ||
        states.includes(TransferState.Cancelled)
      )
        return "failed";
      if (states.includes(TransferState.Queued) || states.includes(TransferState.Initializing)) return "processing";
      if (states.includes(TransferState.Completed) || states.includes(TransferState.Succeeded)) return "completed";
      this.resources.log?.write("warn", "Unable to map SLSKD transfer state; using unknown", {
        integrationId: this.integration.id,
        stateCount: states.length,
      });
      return "unknown";
    } catch {
      this.resources.log?.write("error", "Unable to translate SLSKD transfer state; using unknown", {
        integrationId: this.integration.id,
      });
      return "unknown";
    }
  }
}

export enum TransferState {
  None,
  Requested,
  Queued,
  Initializing,
  InProgress,
  Completed,
  Succeeded,
  Cancelled,
  TimedOut,
  Errored,
  Rejected,
  Aborted,
}

const transferStates: Readonly<Record<string, TransferState | undefined>> = {
  None: TransferState.None,
  Requested: TransferState.Requested,
  Queued: TransferState.Queued,
  Initializing: TransferState.Initializing,
  InProgress: TransferState.InProgress,
  Completed: TransferState.Completed,
  Succeeded: TransferState.Succeeded,
  Cancelled: TransferState.Cancelled,
  TimedOut: TransferState.TimedOut,
  Errored: TransferState.Errored,
  Rejected: TransferState.Rejected,
  Aborted: TransferState.Aborted,
};

export function parseTransferStateArray(csv: string, separator = ","): (TransferState | undefined)[] {
  return csv
    .split(separator)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (Object.hasOwn(transferStates, part) ? transferStates[part] : undefined));
}
