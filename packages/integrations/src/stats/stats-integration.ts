import { Headers } from "undici";

import { ResponseError } from "@homarr/common/server";
import { getIntegrationHttpAuthDefinition } from "@homarr/definitions";
import {
  createAxiosCertificateInstanceAsync,
  fetchWithTrustedCertificatesAsync,
} from "@homarr/core/infrastructure/http";

import { Integration } from "../base/integration";
import type { IntegrationInput, IntegrationTestingInput } from "../base/integration";
import type { IntegrationHttpAuthentication } from "../http-auth";
import { resolveDeclaredHttpAuthentication } from "../http-auth";
import type { StatsProvider } from "./types";
import type { StatsFetchContext } from "./types";

export class StatsIntegration extends Integration {
  constructor(
    input: IntegrationInput,
    private readonly provider: StatsProvider,
  ) {
    super(input);
  }

  public override async getHttpAuthenticationAsync() {
    if (this.integration.kind && getIntegrationHttpAuthDefinition(this.integration.kind).type !== "adapter")
      return await super.getHttpAuthenticationAsync();
    if (this.provider.getHttpAuthenticationAsync) {
      const signal = AbortSignal.timeout(15_000);
      return await this.provider.getHttpAuthenticationAsync({
        signal,
        secret: (kind) => this.getSecretValue(kind),
        hasSecret: (kind) => this.hasSecretValue(kind),
        requestAsync: this.createRequestAsync(signal, undefined, undefined, true),
      });
    }
    if (!this.provider.getHttpAuthentication) return await super.getHttpAuthenticationAsync();
    return this.provider.getHttpAuthentication({
      secret: (kind) => this.getSecretValue(kind),
      hasSecret: (kind) => this.hasSecretValue(kind),
    });
  }

  async getStatsAsync(signal = AbortSignal.timeout(30_000), testing?: IntegrationTestingInput) {
    const definition = this.integration.kind ? getIntegrationHttpAuthDefinition(this.integration.kind) : undefined;
    let authentication: IntegrationHttpAuthentication | undefined;
    if (definition && definition.type !== "adapter") {
      authentication = resolveDeclaredHttpAuthentication(this.integration, definition);
    }
    return await this.provider.fetchAsync({
      signal,
      secret: (kind) => this.getSecretValue(kind),
      hasSecret: (kind) => this.hasSecretValue(kind),
      requestAsync: this.createRequestAsync(signal, testing, authentication),
    });
  }

  private createRequestAsync(
    signal: AbortSignal,
    testing?: IntegrationTestingInput,
    authentication?: IntegrationHttpAuthentication,
    sanitizeErrors = false,
  ): StatsFetchContext["requestAsync"] {
    const hasQueryAuthentication = Object.keys(authentication?.query ?? {}).length > 0;
    const requestFailure = new Error("Stats request failed");
    return async (path, init) => {
      // Paths belong to compiled providers, never to dashboard input.
      const url = this.url(path);
      for (const [name, value] of Object.entries(authentication?.query ?? {})) url.searchParams.set(name, value);
      const headers = new Headers(init?.headers);
      for (const [name, value] of Object.entries(authentication?.headers ?? {})) headers.set(name, value);
      try {
        if (this.provider.transport === "axios") {
          const client = testing?.axiosInstance ?? (await createAxiosCertificateInstanceAsync());
          const response = await client.request<unknown>({
            url: url.toString(),
            method: init?.method ?? "GET",
            headers: Object.fromEntries(headers),
            data: init?.body,
            signal,
            maxRedirects: 0,
          });
          return response.data;
        }
        const fetchAsync = testing?.fetchAsync ?? fetchWithTrustedCertificatesAsync;
        const response = await fetchAsync(url, { ...init, headers, signal, redirect: "error" });
        if (!response.ok) throw new ResponseError({ status: response.status });
        return await response.json();
      } catch (error) {
        if (!sanitizeErrors && !hasQueryAuthentication) throw error;
        if (error instanceof ResponseError) throw error;
        // A transport error may contain credentials in its URL, body, or cause.
        throw requestFailure;
      }
    };
  }

  protected async testingAsync(input: IntegrationTestingInput) {
    await this.getStatsAsync(AbortSignal.timeout(30_000), input);
    return { success: true as const };
  }
}
