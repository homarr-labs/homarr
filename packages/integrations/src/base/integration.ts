import type tls from "node:tls";
import type { AxiosInstance } from "axios";
import type { Dispatcher } from "undici";
import { fetch as undiciFetch } from "undici";

import { removeTrailingSlash } from "@homarr/common";
import { createAxiosCertificateInstanceAsync, createCertificateAgentAsync } from "@homarr/core/infrastructure/http";
import type { IntegrationSecretKind } from "@homarr/definitions";

import { HandleIntegrationErrors } from "./errors/decorator";
import { TestConnectionError } from "./test-connection/test-connection-error";
import type { TestingResult } from "./test-connection/test-connection-service";
import { TestConnectionService } from "./test-connection/test-connection-service";
import type { IntegrationSecret } from "./types";

export interface IntegrationInput {
  id: string;
  name: string;
  url: string;
  externalUrl: string | null;
  decryptedSecrets: IntegrationSecret[];
}

export interface IntegrationTestingInput {
  fetchAsync: typeof undiciFetch;
  dispatcher: Dispatcher;
  axiosInstance: AxiosInstance;
  options: {
    ca: string[] | string;
    checkServerIdentity: typeof tls.checkServerIdentity;
  };
}

@HandleIntegrationErrors([])
export abstract class Integration {
  constructor(protected integration: IntegrationInput) {}

  public get publicIntegration() {
    return {
      id: this.integration.id,
      name: this.integration.name,
      url: this.integration.url,
    };
  }

  protected getSecretValue(kind: IntegrationSecretKind) {
    const secret = this.integration.decryptedSecrets.find((secret) => secret.kind === kind);
    if (!secret) {
      throw new Error(`No secret of kind ${kind} was found`);
    }
    return secret.value;
  }

  protected hasSecretValue(kind: IntegrationSecretKind) {
    return this.integration.decryptedSecrets.some((secret) => secret.kind === kind);
  }

  private createUrl(
    inputUrl: string,
    path: `/${string}`,
    queryParams?: Record<string, string | Date | number | boolean | null | undefined>,
  ) {
    const baseUrl = removeTrailingSlash(inputUrl);
    const url = new URL(`${baseUrl}${path}`);

    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (value === null || value === undefined) {
          continue;
        }
        url.searchParams.set(key, value instanceof Date ? value.toISOString() : value.toString());
      }
    }

    return url;
  }
  protected url(path: `/${string}`, queryParams?: Record<string, string | Date | number | boolean | null | undefined>) {
    return this.createUrl(this.integration.url, path, queryParams);
  }

  protected externalUrl(
    path: `/${string}`,
    queryParams?: Record<string, string | Date | number | boolean | null | undefined>,
  ): URL | RenderablePath {
    const base = this.integration.externalUrl ?? this.integration.url;
    // Path-only externalUrl (e.g. "/cockpit/") cannot be parsed by `new URL`,
    // but the rendered href ends up on the client where the browser resolves
    // it against the current origin. Build a hostless RenderablePath instead.
    // Scheme-relative bases ("//host/...") are rejected at the schema layer
    // (packages/validation/src/app.ts) but explicitly excluded here too so
    // that a malformed value can't cross-origin-escape through this branch.
    if (base.startsWith("/") && !base.startsWith("//")) {
      return new RenderablePath(base, path, queryParams);
    }
    return this.createUrl(base, path, queryParams);
  }

  protected webSocketUrl(
    path: `/${string}`,
    queryParams?: Record<string, string | Date | number | boolean | null | undefined>,
  ) {
    const url = this.url(path, queryParams);
    // http -> ws, https -> wss
    url.protocol = url.protocol.replace("http", "ws");
    return url;
  }

  public async testConnectionAsync(): Promise<TestingResult> {
    try {
      const url = new URL(this.integration.url);
      return await new TestConnectionService(url).handleAsync(async ({ ca, checkServerIdentity }) => {
        const fetchDispatcher = await createCertificateAgentAsync({
          ca,
          checkServerIdentity,
        });

        const axiosInstance = await createAxiosCertificateInstanceAsync({
          ca,
          checkServerIdentity,
        });

        const testingAsync: typeof this.testingAsync = this.testingAsync.bind(this);
        return await testingAsync({
          dispatcher: fetchDispatcher,
          fetchAsync: async (url, options) => await undiciFetch(url, { ...options, dispatcher: fetchDispatcher }),
          axiosInstance,
          options: {
            ca,
            checkServerIdentity,
          },
        });
      });
    } catch (error) {
      if (!(error instanceof TestConnectionError)) {
        return TestConnectionError.UnknownResult(error);
      }

      return error.toResult();
    }
  }

  /**
   * Test the connection to the integration
   * @returns {Promise<TestingResult>}
   */
  protected abstract testingAsync(input: IntegrationTestingInput): Promise<TestingResult>;
}

/**
 * URL-shaped wrapper for path-only externalUrl bases (e.g. "/cockpit/").
 *
 * Path-only externalUrl is meaningful only on the client, where the browser
 * resolves it against the current origin. The integration helpers can't use
 * `new URL` server-side because there's no host to parse. RenderablePath
 * mirrors just enough of the `URL` surface — `toString()`, `pathname`,
 * `hostname`, `searchParams` — to keep the 19 caller sites of
 * `super.externalUrl(...)` working unchanged. `hostname` is always the empty
 * string for a path-only base; `pathname` is the joined base + path.
 *
 * Fragment handling note: the constructor splits on the first `?` only, not
 * `#`. Path arguments that contain a fragment (e.g. Jellyfin / Emby hash-bang
 * routes like `/web/index.html#!/details?id=abc`) keep the fragment as part
 * of `pathname`, and any `?` inside the hash-bang is treated as the query
 * separator. This matches what Jellyfin / Emby SPA routers expect: the
 * post-`?` params must stay inside the hash, not be hoisted before it. Don't
 * combine fragment-containing paths with extra `queryParams` here — the
 * merged params would land inside the hash too. WHATWG URL behaves
 * differently (it places `.hash` after `.search`), but mirroring that would
 * break the SPA-routing callers this method exists to serve.
 */
export class RenderablePath {
  public readonly searchParams: URLSearchParams;
  private readonly pathOnly: string;

  constructor(
    base: string,
    path: `/${string}`,
    queryParams?: Record<string, string | Date | number | boolean | null | undefined>,
  ) {
    const trimmedBase = removeTrailingSlash(base);
    const combined = `${trimmedBase}${path}`;
    const queryIndex = combined.indexOf("?");
    if (queryIndex === -1) {
      this.pathOnly = combined;
      this.searchParams = new URLSearchParams();
    } else {
      this.pathOnly = combined.substring(0, queryIndex);
      this.searchParams = new URLSearchParams(combined.substring(queryIndex + 1));
    }

    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (value === null || value === undefined) {
          continue;
        }
        this.searchParams.set(key, value instanceof Date ? value.toISOString() : value.toString());
      }
    }
  }

  public get hostname(): string {
    return "";
  }

  public get pathname(): string {
    return this.pathOnly;
  }

  public toString(): string {
    const query = this.searchParams.toString();
    return query ? `${this.pathOnly}?${query}` : this.pathOnly;
  }
}
