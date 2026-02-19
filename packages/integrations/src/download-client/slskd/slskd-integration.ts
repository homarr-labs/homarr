import dayjs from "dayjs";
import type { RequestInit } from "undici";

import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

import { HandleIntegrationErrors } from "../../base/errors/decorator";
import { integrationOFetchHttpErrorHandler } from "../../base/errors/http";
import { Integration } from "../../base/integration";
import type { IntegrationTestingInput } from "../../base/integration";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { DownloadClientJobsAndStatus } from "../../interfaces/downloads/download-client-data";
import type { IDownloadClientIntegration } from "../../interfaces/downloads/download-client-integration";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";

interface SlskdUserAndDownloads {
  directories: {
    files: {
      id: string;
      filename: string;
      size: number;
      percentComplete: number;
      averageSpeed: number;
      /**
       * Time in hh:mm:ss format.
       * Optional, undefined when aborted or errored.
       */
      remainingTime?: string;

      /**
       * A bit-wise combination of the state enums.
       */
      state: string;

      /**
       * ISO date when the file was requested at.
       * "enqueued" and "started" are different things.
       */
      requestedAt: string;
    }[];
  }[];
}

const logger = createLogger({ module: "slskd-integration" });

/**
 * Implementation of the Slskd application for Soulseek https://github.com/slskd/slskd
 * Slskd integration cannot pause or stop downloads, it can only list downloads.
 */
@HandleIntegrationErrors([integrationOFetchHttpErrorHandler])
export class SlskdIntegration extends Integration implements IDownloadClientIntegration {
  // eslint-disable-next-line no-restricted-syntax
  public pauseQueueAsync(): Promise<void> {
    return Promise.resolve();
  }

  // eslint-disable-next-line no-restricted-syntax
  public pauseItemAsync(_: DownloadClientItem): Promise<void> {
    return Promise.resolve();
  }

  // eslint-disable-next-line no-restricted-syntax
  public resumeQueueAsync(): Promise<void> {
    return Promise.resolve();
  }

  // eslint-disable-next-line no-restricted-syntax
  public resumeItemAsync(_: DownloadClientItem): Promise<void> {
    return Promise.resolve();
  }

  // eslint-disable-next-line no-restricted-syntax,id-length
  public deleteItemAsync(_: DownloadClientItem, _2: boolean): Promise<void> {
    return Promise.resolve();
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/api/v0/server"), {
      headers: {
        "X-API-Key": this.getSecretValue("apiKey"),
      },
    });

    if (!response.ok) {
      return TestConnectionError.StatusResult({
        status: response.status,
        url: response.url,
      });
    }

    await response.json();

    return {
      success: true,
    };
  }

  public async getClientJobsAndStatusAsync(input: { limit: number }): Promise<DownloadClientJobsAndStatus> {
    const downloads = await this.getDownloadsAsync();
    const flatFiles = downloads.flatMap((user) => user.directories).flatMap((directory) => directory.files);

    return {
      status: {
        paused: false, // slskd cannot be paused
        rates: {
          down: flatFiles.reduce((acc, file) => acc + file.averageSpeed, 0),
          up: 0, // slskd does not upload except sharing which isn't what we want to show in downloads
        },
        types: ["miscellaneous"],
      },
      items: flatFiles.slice(0, input.limit).map((file, index) => {
        const remainingTimeParts = file.remainingTime ? file.remainingTime.split(":") : null;
        // The file name returned from API includes the full remote path, which is not relevant for Homarr.
        // We remove everything before the last slash to beautify the file name.
        const actualFileName = file.filename.split("\\").at(-1);

        return {
          id: file.id,
          name: actualFileName ?? file.filename,
          size: file.size,
          time: remainingTimeParts
            ? dayjs
                .duration({
                  hours: Number(remainingTimeParts[0]),
                  minutes: Number(remainingTimeParts[1]),
                  seconds: Number(remainingTimeParts[2]),
                })
                .as("milliseconds")
            : 0,
          progress: file.percentComplete / 100,
          type: "miscellaneous",
          state: this.getDownloadState(file),
          added: dayjs(file.requestedAt).unix() * 1000,
          index,
        };
      }),
    };
  }

  private async getDownloadsAsync(): Promise<SlskdUserAndDownloads[]> {
    const response = await this.makeRequestAsync("/api/v0/transfers/downloads", { method: "GET" });
    return response as SlskdUserAndDownloads[];
  }

  private async makeRequestAsync(
    path: `/${string}`,
    options: RequestInit & { timeout?: number } = {},
  ): Promise<unknown> {
    const response = await fetchWithTrustedCertificatesAsync(this.url(path), {
      ...options,
      headers: {
        "X-API-Key": this.getSecretValue("apiKey"),
      },
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return response.json();
    }

    return response.text();
  }

  private getDownloadState(
    item: SlskdUserAndDownloads["directories"][number]["files"][number],
  ): DownloadClientItem["state"] {
    try {
      const mappedStates = parseTransferStateArray(item.state);

      if (mappedStates.includes(TransferState.InProgress)) {
        return "downloading";
      }

      if (
        mappedStates.includes(TransferState.Errored) ||
        mappedStates.includes(TransferState.Aborted) ||
        mappedStates.includes(TransferState.TimedOut) ||
        mappedStates.includes(TransferState.Rejected) ||
        mappedStates.includes(TransferState.Cancelled)
      ) {
        return "failed";
      }

      if (mappedStates.includes(TransferState.Queued) || mappedStates.includes(TransferState.Initializing)) {
        return "processing";
      }

      // "completed" must come last, since above enums are bit-wise combined even if they failed
      if (mappedStates.includes(TransferState.Completed) || mappedStates.includes(TransferState.Succeeded)) {
        return "completed";
      }

      logger.warn(
        `Unable to map the SLSKD transfer state enum '${mappedStates.join(",")}'. Will fall back to 'unknown'`,
      );

      return "unknown";
    } catch (error) {
      logger.error(
        new ErrorWithMetadata(
          `Unable to map the SLSKD transfer states '${item.state}' due to an exception in the translation. Will fall back to 'unknown'. This is likely a bug.`,
          undefined,
          {
            cause: error,
          },
        ),
      );
      return "unknown";
    }
  }
}

/**
 * Copy of the transfer states of SLSKD, copied from the following file:
 * https://github.com/slskd/slskd/blob/86dc6072a28876abfdeb1f5dbb7dfc99ea8e1805/src/slskd/Core/Data/Migrations/Z04012025_TransferStateMigration.cs#L217-L234
 */
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

export function parseTransferStateArray(csv: string, separator = ","): TransferState[] {
  const parts = csv
    .split(separator)
    .map((part) => part.trim())
    .filter(Boolean);

  // @ts-expect-error use string to index
  return parts.map((part) => TransferState[part] as TransferState);
}
