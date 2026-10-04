import { z } from "zod/v4";
import { parseStringPromise } from "xml2js";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { IIndexerManagerIntegration } from "../interfaces/indexer-manager/indexer-manager-integration";
import type { Indexer } from "../interfaces/indexer-manager/indexer-manager-types";

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

export class JackettIntegration extends Integration implements IIndexerManagerIntegration {
  private torznabUrl(id: string, action: string) {
    return this.url(`/api/v2.0/indexers/${encodeURIComponent(id)}/results/torznab/api`, {
      apikey: this.getSecretValue("apiKey"),
      t: action,
    });
  }

  private async getConfiguredIndexersAsync() {
    const url = this.torznabUrl("all", "indexers");
    url.searchParams.set("configured", "true");
    const response = await fetchWithTrustedCertificatesAsync(url, {
      signal: AbortSignal.timeout(30_000),
      redirect: "error",
    });
    if (!response.ok) throw new Error(`Jackett indexers request failed (${response.status})`);
    const parsed = indexersSchema.parse(await parseStringPromise(await response.text(), { explicitArray: true }));
    if (parsed.indexers === "") return [];
    return (parsed.indexers.indexer ?? []).filter((indexer) => indexer.$.configured === "true");
  }

  public async getIndexersAsync(): Promise<Indexer[]> {
    const indexers = await this.getConfiguredIndexersAsync();
    return indexers.map((indexer) => ({
      id: indexer.$.id,
      name: indexer.title[0] ?? indexer.$.id,
      url: indexer.link?.[0] ?? "",
      enabled: true,
      // Jackett's Torznab catalog does not expose health or last-test results.
      status: null,
    }));
  }

  public async getStatsAsync() {
    return { configured: (await this.getConfiguredIndexersAsync()).length };
  }

  public async testAllAsync(): Promise<void> {
    const indexers = await this.getConfiguredIndexersAsync();
    // Torznab search exercises the upstream indexer; caps only returns metadata.
    // Limit concurrency so a large catalog does not flood every tracker at once.
    for (let offset = 0; offset < indexers.length; offset += 4) {
      await Promise.all(
        indexers.slice(offset, offset + 4).map(async (indexer) => {
          const response = await fetchWithTrustedCertificatesAsync(this.torznabUrl(indexer.$.id, "search"), {
            signal: AbortSignal.timeout(30_000),
            redirect: "error",
          });
          if (!response.ok) throw new Error(`Jackett indexer test failed (${response.status})`);
          // A Torznab <error> can use HTTP 200; only a valid RSS result is success.
          searchSchema.parse(await parseStringPromise(await response.text(), { explicitArray: true }));
        }),
      );
    }
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.torznabUrl("all", "caps"), { redirect: "error" });
    if (!response.ok) return TestConnectionError.StatusResult(response);
    capsSchema.parse(await parseStringPromise(await response.text(), { explicitArray: true }));
    return { success: true };
  }
}
