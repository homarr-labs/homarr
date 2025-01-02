import { Integration } from "../base/integration";
import { IntegrationTestConnectionError } from "../base/test-connection-error";
import type { Indexer } from "../interfaces/indexer-manager/indexer";
import { indexerResponseSchema, statusResponseSchema } from "./prowlarr-types";

export class ProwlarrIntegration extends Integration {
  public async getIndexersAsync(): Promise<Indexer[]> {
    const apiKey = super.getSecretValue("apiKey");

    const indexerResponse = await fetch(this.url("/api/v1/indexer"), {
      headers: {
        "X-Api-Key": apiKey,
      },
    });
    if (!indexerResponse.ok) {
      throw new Error(
        `Failed to fetch indexers for ${this.integration.name} (${this.integration.id}): ${indexerResponse.statusText}`,
      );
    }

    const statusResponse = await fetch(this.url("/api/v1/indexerstatus"), {
      headers: {
        "X-Api-Key": apiKey,
      },
    });
    if (!statusResponse.ok) {
      throw new Error(
        `Failed to fetch status for ${this.integration.name} (${this.integration.id}): ${statusResponse.statusText}`,
      );
    }

    const indexersResult = indexerResponseSchema.array().safeParse(await indexerResponse.json());
    const statusResult = statusResponseSchema.safeParse(await statusResponse.json());

    const errorMessages: string[] = [];
    if (!indexersResult.success) {
      errorMessages.push(`Indexers parsing error: ${indexersResult.error.message}`);
    }
    if (!statusResult.success) {
      errorMessages.push(`Status parsing error: ${statusResult.error.message}`);
    }
    if (!indexersResult.success || !statusResult.success) {
      throw new Error(
        `Failed to parse indexers for ${this.integration.name} (${this.integration.id}), most likely your api key is wrong:\n${errorMessages.join("\n")}`,
      );
    }

    const inactiveIndexerIds = new Set(statusResult.data.map((status: { indexerId: number }) => status.indexerId));

    const indexers: Indexer[] = indexersResult.data.map((indexer) => ({
      id: indexer.id,
      name: indexer.name,
      url: indexer.indexerUrls[0] ?? "",
      enabled: indexer.enable,
      status: !inactiveIndexerIds.has(indexer.id),
    }));

    return indexers;
  }

  public async testAllAsync(): Promise<void> {
    const apiKey = super.getSecretValue("apiKey");
    const response = await fetch(this.url("/api/v1/indexer/testall"), {
      headers: {
        "X-Api-Key": apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to test all indexers for ${this.integration.name} (${this.integration.id}): ${response.statusText}`,
      );
    }
  }

  public async testConnectionAsync(): Promise<void> {
    const apiKey = super.getSecretValue("apiKey");

    await super.handleTestConnectionResponseAsync({
      queryFunctionAsync: async () => {
        return await fetch(this.url("/api"), {
          headers: {
            "X-Api-Key": apiKey,
          },
        });
      },
      handleResponseAsync: async (response) => {
        try {
          const result = (await response.json()) as unknown;
          if (typeof result === "object" && result !== null) return;
        } catch {
          throw new IntegrationTestConnectionError("invalidJson");
        }

        throw new IntegrationTestConnectionError("invalidCredentials");
      },
    });
  }
}
