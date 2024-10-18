import { Integration } from "../base/integration";
import { IntegrationTestConnectionError } from "../base/test-connection-error";
import type { Indexer } from "../types";
import { indexerResponseSchema } from "./jackett-types";

export class JackettIntegration extends Integration {
  public async getIndexersAsync(): Promise<Indexer[]> {
    const apiKey = super.getSecretValue("apiKey");

    const indexerResponse = await fetch(`${this.integration.url}/api/v2.0/indexers/all/Results?apikey=${apiKey}`, {
      method: "GET",
      redirect: "follow",
    });

    if (!indexerResponse.ok) {
      throw new Error(
        `Failed to fetch indexers for ${this.integration.name} (${this.integration.id}): ${indexerResponse.statusText}`,
      );
    }

    const indexersResult = indexerResponseSchema.safeParse(await indexerResponse.json());

    if (!indexersResult.success) {
      throw new Error(
        `Failed to parse indexers for ${this.integration.name} (${this.integration.id}), ${indexersResult.error.message}`,
      );
    }

    const indexers: Indexer[] = indexersResult.data.Indexers.map((indexer) => {
      const matchedResponse = indexersResult.data.Results.find((response) => response.TrackerId === indexer.ID);
      return {
        id: indexer.ID,
        name: indexer.Name,
        url: matchedResponse?.Guid ?? "",
        status: indexer.Results !== 0,
      };
    });

    return indexers;
  }

  public async testConnectionAsync(): Promise<void> {
    const apiKey = super.getSecretValue("apiKey");

    await super.handleTestConnectionResponseAsync({
      queryFunctionAsync: async () => {
        return await fetch(`${this.integration.url}/api/v2.0/indexers/all/Results?apikey=${apiKey}`, {
          method: "GET",
          redirect: "follow",
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
