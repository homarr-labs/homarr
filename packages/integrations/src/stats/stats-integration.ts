import { Headers } from "undici";

import { AxiosHttpErrorHandler, FetchHttpErrorHandler, RequestError, ResponseError } from "@homarr/common/server";
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
import { FrigateAuthenticationError } from "./frigate-authentication-error";

const fetchErrorHandler = new FetchHttpErrorHandler();
const axiosErrorHandler = new AxiosHttpErrorHandler();

const sanitizeTransportError = (error: unknown, fallback: Error): Error => {
  if (error instanceof ResponseError) return error;
  const requestError = fetchErrorHandler.handleRequestError(error) ?? axiosErrorHandler.handleRequestError(error);
  if (!requestError) return fallback;
  return new RequestError(requestError, { cause: fallback });
};

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
        integration: this.publicIntegration,
        signal,
        url: new URL(this.integration.url),
        secret: (kind) => this.getSecretValue(kind),
        hasSecret: (kind) => this.hasSecretValue(kind),
        requestAsync: this.createRequestAsync(signal),
        requestResponseAsync: this.createResponseRequestAsync(signal),
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
      integration: this.publicIntegration,
      signal,
      url: new URL(this.integration.url),
      secret: (kind) => this.getSecretValue(kind),
      hasSecret: (kind) => this.hasSecretValue(kind),
      requestAsync: this.createRequestAsync(signal, testing, authentication),
      requestResponseAsync: this.createResponseRequestAsync(signal, testing),
    });
  }

  private createResponseRequestAsync(
    signal: AbortSignal,
    testing?: IntegrationTestingInput,
  ): StatsFetchContext["requestResponseAsync"] {
    return async (path, init) => {
      const url = this.url(path);
      const requestFailure = this.createRequestFailure(path);
      try {
        const fetchAsync = testing?.fetchAsync ?? fetchWithTrustedCertificatesAsync;
        const response = await fetchAsync(url, { ...init, signal, redirect: "manual" });
        // Login bodies can be empty or contain sensitive error details. Do not read them.
        await response.body?.cancel();
        if (response.status !== 200) {
          throw new ResponseError({ status: response.status, url: url.toString() }, { cause: requestFailure });
        }
        let headerBytes = 0;
        for (const [name, value] of response.headers) {
          headerBytes += Buffer.byteLength(name) + Buffer.byteLength(value);
          if (headerBytes > 16_384) throw requestFailure;
        }
        return { status: response.status, headers: response.headers };
      } catch (error) {
        // Fetch errors may retain the password body or session cookies in their cause.
        throw sanitizeTransportError(error, requestFailure);
      }
    };
  }

  private createRequestAsync(
    signal: AbortSignal,
    testing?: IntegrationTestingInput,
    authentication?: IntegrationHttpAuthentication,
  ): StatsFetchContext["requestAsync"] {
    const sanitizeErrors = Boolean(this.provider.getHttpAuthenticationAsync);
    const hasQueryAuthentication = Object.keys(authentication?.query ?? {}).length > 0;
    return async (path, init) => {
      const requestFailure = this.createRequestFailure(path);
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
        const redirect = sanitizeErrors ? "manual" : "error";
        const response = await fetchAsync(url, { ...init, headers, signal, redirect });
        if (!response.ok) {
          if (!sanitizeErrors && !hasQueryAuthentication) throw new ResponseError({ status: response.status });
          const responseUrl = new URL(url);
          responseUrl.search = "";
          responseUrl.hash = "";
          throw new ResponseError({ status: response.status, url: responseUrl.toString() }, { cause: requestFailure });
        }
        return await response.json();
      } catch (error) {
        if (!sanitizeErrors && !hasQueryAuthentication) throw error;
        // A transport error may contain credentials in its URL, body, or cause.
        throw sanitizeTransportError(error, requestFailure);
      }
    };
  }

  private createRequestFailure(path: string) {
    if (this.integration.kind === "frigate") {
      if (path === "/api/login") return new FrigateAuthenticationError(this.publicIntegration, "login");
      if (path === "/api/profile") return new FrigateAuthenticationError(this.publicIntegration, "profile");
      if (path === "/api/stats") return new FrigateAuthenticationError(this.publicIntegration, "stats");
    }
    return new Error("Stats request failed");
  }

  protected async testingAsync(input: IntegrationTestingInput) {
    await this.getStatsAsync(AbortSignal.timeout(30_000), input);
    return { success: true as const };
  }
}
