import { Headers } from "undici";

import { ResponseError } from "@homarr/common/server";
import {
  createAxiosCertificateInstanceAsync,
  fetchWithTrustedCertificatesAsync,
} from "@homarr/core/infrastructure/http";

import { Integration } from "../base/integration";
import type { IntegrationInput, IntegrationTestingInput } from "../base/integration";
import { createStatsRequestSignal } from "./types";
import type { StatsProvider } from "./types";

export class StatsIntegration extends Integration {
  constructor(
    input: IntegrationInput,
    private readonly provider: StatsProvider,
  ) {
    super(input);
  }

  public override async getHttpAuthenticationAsync() {
    if (!this.provider.getHttpAuthentication) return await super.getHttpAuthenticationAsync();
    return this.provider.getHttpAuthentication({
      secret: (kind) => this.getSecretValue(kind),
      hasSecret: (kind) => this.hasSecretValue(kind),
    });
  }

  async getStatsAsync(signal = AbortSignal.timeout(30_000), testing?: IntegrationTestingInput) {
    const providerSignal = createStatsRequestSignal(signal);
    const result = await this.provider.fetchAsync({
      signal: providerSignal,
      secret: (kind) => this.getSecretValue(kind),
      hasSecret: (kind) => this.hasSecretValue(kind),
      requestAsync: async (path, init) => {
        const requestSignal = createStatsRequestSignal(providerSignal, init?.signal);
        // Paths belong to compiled providers, never to dashboard input.
        if (this.provider.transport === "axios") {
          const client = testing?.axiosInstance ?? (await createAxiosCertificateInstanceAsync());
          const response = await client.request<unknown>({
            url: this.url(path).toString(),
            method: init?.method ?? "GET",
            headers: Object.fromEntries(new Headers(init?.headers)),
            data: init?.body,
            signal: requestSignal,
            maxRedirects: 0,
          });
          return response.data;
        }
        const fetchAsync = testing?.fetchAsync ?? fetchWithTrustedCertificatesAsync;
        const response = await fetchAsync(this.url(path), { ...init, signal: requestSignal, redirect: "error" });
        if (!response.ok) throw new ResponseError(response);
        return await response.json();
      },
    });
    signal.throwIfAborted();
    return result;
  }

  protected async testingAsync(input: IntegrationTestingInput) {
    await this.getStatsAsync(AbortSignal.timeout(30_000), input);
    return { success: true as const };
  }
}
