import { Headers } from "undici";

import { ResponseError } from "@homarr/common/server";
import {
  createAxiosCertificateInstanceAsync,
  fetchWithTrustedCertificatesAsync,
} from "@homarr/core/infrastructure/http";

import { Integration } from "../base/integration";
import type { IntegrationInput, IntegrationTestingInput } from "../base/integration";
import type { StatsProvider } from "./types";

export class StatsIntegration extends Integration {
  constructor(
    input: IntegrationInput,
    private readonly provider: StatsProvider,
  ) {
    super(input);
  }

  async getStatsAsync(signal = AbortSignal.timeout(30_000), testing?: IntegrationTestingInput) {
    return await this.provider.fetchAsync({
      signal,
      secret: (kind) => this.getSecretValue(kind),
      hasSecret: (kind) => this.hasSecretValue(kind),
      requestAsync: async (path, init) => {
        // Paths belong to compiled providers, never to dashboard input.
        if (this.provider.transport === "axios") {
          const client = testing?.axiosInstance ?? (await createAxiosCertificateInstanceAsync());
          const response = await client.request<unknown>({
            url: this.url(path).toString(),
            method: init?.method ?? "GET",
            headers: Object.fromEntries(new Headers(init?.headers)),
            data: init?.body,
            signal,
            maxRedirects: 0,
          });
          return response.data;
        }
        const fetchAsync = testing?.fetchAsync ?? fetchWithTrustedCertificatesAsync;
        const response = await fetchAsync(this.url(path), { ...init, signal, redirect: "error" });
        if (!response.ok) throw new ResponseError(response);
        return await response.json();
      },
    });
  }

  protected async testingAsync(input: IntegrationTestingInput) {
    await this.getStatsAsync(AbortSignal.timeout(30_000), input);
    return { success: true as const };
  }
}
