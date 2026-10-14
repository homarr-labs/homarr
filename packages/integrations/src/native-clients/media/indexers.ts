import { parseStringPromise } from "xml2js";
import { z } from "zod/v4";

import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import { apiKeyAuth } from "../../http-auth";
import type { Indexer } from "../../interfaces/indexer-manager/indexer-manager-types";
import { indexerResponseSchema, statusResponseSchema } from "../../prowlarr/prowlarr-types";
import { MediaClientHoldError, MediaHttpClient, settleMediaAsync } from "./http";
import type { MediaHttpOperation, MediaPublic } from "./http";

const indexerSchema = z.object({
  $: z.object({ id: z.string().min(1), configured: z.enum(["true", "false"]) }),
  title: z.array(z.string()).min(1),
  link: z.array(z.string()).optional(),
});
const indexersSchema = z.object({
  indexers: z.union([z.literal(""), z.object({ indexer: z.array(indexerSchema).optional() })]),
});
const capsSchema = z.object({ caps: z.object({}).passthrough() });
const searchSchema = z.object({ rss: z.object({ channel: z.array(z.object({}).passthrough()).min(1) }) });

export class JackettMediaClient extends MediaHttpClient implements MediaPublic<"jackett"> {
  private torznabUrl(id: string, action: string) {
    return this.url(`/api/v2.0/indexers/${encodeURIComponent(id)}/results/torznab/api`, {
      apikey: this.secret("apiKey"),
      t: action,
    });
  }

  private getConfiguredIndexersAsync(http: MediaHttpOperation) {
    const url = this.torznabUrl("all", "indexers");
    url.searchParams.set("configured", "true");
    return http.responseAsync(url, { signal: AbortSignal.timeout(30_000), redirect: "error" }, async (response) => {
      if (!response.ok) throw new Error(`Jackett indexers request failed (${response.status})`);
      const wire: unknown = await parseStringPromise(await response.text(), { explicitArray: true });
      const data = indexersSchema.parse(wire);
      return data.indexers === ""
        ? []
        : (data.indexers.indexer ?? []).filter((indexer) => indexer.$.configured === "true");
    });
  }

  async getIndexersAsync(): Promise<Indexer[]> {
    return this.runAsync(async (http) =>
      (await this.getConfiguredIndexersAsync(http)).map((indexer) => ({
        id: indexer.$.id,
        name: indexer.title[0] ?? indexer.$.id,
        url: indexer.link?.[0] ?? "",
        enabled: true,
        status: null,
      })),
    );
  }

  async getStatsAsync() {
    return this.runAsync(async (http) => ({ configured: (await this.getConfiguredIndexersAsync(http)).length }));
  }

  async testAllAsync(): Promise<void> {
    return this.testAllOperationAsync();
  }

  private async testAllOperationAsync(): Promise<void> {
    this.requireInteraction();
    await this.runAsync(async (http) => {
      const indexers = await this.getConfiguredIndexersAsync(http);
      for (let offset = 0; offset < indexers.length; offset += 4) {
        await settleMediaAsync(
          indexers.slice(offset, offset + 4).map((indexer) =>
            http.responseAsync(
              this.torznabUrl(indexer.$.id, "search"),
              { signal: AbortSignal.timeout(30_000), redirect: "error" },
              async (response) => {
                if (!response.ok) throw new Error(`Jackett indexer test failed (${response.status})`);
                const wire: unknown = await parseStringPromise(await response.text(), { explicitArray: true });
                searchSchema.parse(wire);
              },
            ),
          ),
        );
      }
    });
  }

  private requireInteraction(): void {
    throw new MediaClientHoldError("interact-authority");
  }

  protected testingAsync(http: MediaHttpOperation) {
    return http.responseAsync(this.torznabUrl("all", "caps"), { redirect: "error" }, async (response) => {
      if (!response.ok) return TestConnectionError.StatusResult(response);
      const wire: unknown = await parseStringPromise(await response.text(), { explicitArray: true });
      capsSchema.parse(wire);
      return { success: true } as const;
    });
  }
}

export class ProwlarrMediaClient extends MediaHttpClient implements MediaPublic<"prowlarr"> {
  override async getHttpAuthenticationAsync() {
    this.resources.context.signal.throwIfAborted();
    return apiKeyAuth(this.integration);
  }

  async getIndexersAsync(): Promise<Indexer[]> {
    return this.runAsync(async (http) => {
      const headers = { "X-Api-Key": this.secret("apiKey") };
      const indexerData = await http.responseAsync(this.url("/api/v1/indexer"), { headers }, async (response) => {
        if (!response.ok)
          throw new Error(
            `Failed to fetch indexers for ${this.integration.name} (${this.integration.id}): ${response.statusText}`,
          );
        return await response.json();
      });
      const statusData = await http.responseAsync(this.url("/api/v1/indexerstatus"), { headers }, async (response) => {
        if (!response.ok)
          throw new Error(
            `Failed to fetch status for ${this.integration.name} (${this.integration.id}): ${response.statusText}`,
          );
        return await response.json();
      });
      const indexers = indexerResponseSchema.array().safeParse(indexerData);
      const statuses = statusResponseSchema.safeParse(statusData);
      const errors: string[] = [];
      if (!indexers.success) errors.push(`Indexers parsing error: ${indexers.error.message}`);
      if (!statuses.success) errors.push(`Status parsing error: ${statuses.error.message}`);
      if (!indexers.success || !statuses.success)
        throw new Error(
          `Failed to parse indexers for ${this.integration.name} (${this.integration.id}), most likely your api key is wrong:\n${errors.join("\n")}`,
        );
      const inactive = new Set(statuses.data.map((status) => status.indexerId));
      return indexers.data.map((indexer) => ({
        id: indexer.id,
        name: indexer.name,
        url: indexer.indexerUrls[0] ?? "",
        enabled: indexer.enable,
        status: !inactive.has(indexer.id),
      }));
    });
  }

  async testAllAsync(): Promise<void> {
    return this.testAllOperationAsync();
  }

  private async testAllOperationAsync(): Promise<void> {
    this.requireInteraction();
    await this.runAsync((http) =>
      http.responseAsync(
        this.url("/api/v1/indexer/testall"),
        { headers: { "X-Api-Key": this.secret("apiKey") } },
        async (response) => {
          if (!response.ok)
            throw new Error(
              `Failed to test all indexers for ${this.integration.name} (${this.integration.id}): ${response.statusText}`,
            );
        },
      ),
    );
  }

  private requireInteraction(): void {
    throw new MediaClientHoldError("interact-authority");
  }

  protected testingAsync(http: MediaHttpOperation) {
    return http.responseAsync(
      this.url("/api"),
      { headers: { "X-Api-Key": this.secret("apiKey") } },
      async (response) => {
        if (!response.ok) return TestConnectionError.StatusResult(response);
        await z.object({}).parseAsync(await response.json());
        return { success: true } as const;
      },
    );
  }
}
