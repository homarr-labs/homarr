import type { RequestInit, Response } from "undici";

import { ParseError, ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { KomodoOverview, KomodoResource, KomodoResourceKind, KomodoServerOverviewItem } from "./komodo-types";
import {
  createKomodoOverview,
  parseKomodoResourceListResponseAsync,
  parseKomodoServerOverviewResponseAsync,
  parseKomodoVersionResponseAsync,
} from "./komodo-types";

const REQUEST_TIMEOUT_MS = 10_000;
const LIST_REQUEST_BODY = { limit: 0 };

type KomodoFetchAsync = (url: URL, options?: RequestInit) => Promise<Response>;
type KomodoReadPath = "/read/GetVersion" | "/read/ListServers" | "/read/ListStacks" | "/read/ListDeployments";

export class KomodoIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await this.sendRequestAsync(input.fetchAsync, "/read/GetVersion", {});

    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    try {
      await parseKomodoVersionResponseAsync(response);
    } catch (error) {
      if (error instanceof ParseError) {
        return TestConnectionError.ParseResult(error);
      }
      throw error;
    }

    return { success: true };
  }

  public async listServersAsync(): Promise<KomodoResource[]> {
    return await this.listResourcesAsync("server", "/read/ListServers");
  }

  public async listStacksAsync(): Promise<KomodoResource[]> {
    return await this.listResourcesAsync("stack", "/read/ListStacks");
  }

  public async listDeploymentsAsync(): Promise<KomodoResource[]> {
    return await this.listResourcesAsync("deployment", "/read/ListDeployments");
  }

  public async getServerOverviewAsync(): Promise<KomodoServerOverviewItem[]> {
    const fetchAsync: KomodoFetchAsync = async (url, options) =>
      await fetchWithTrustedCertificatesAsync(url, { ...options, timeout: REQUEST_TIMEOUT_MS });
    const response = await this.sendRequestAsync(fetchAsync, "/read/ListServers", LIST_REQUEST_BODY);

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return await parseKomodoServerOverviewResponseAsync(response);
  }

  public async getOverviewAsync(): Promise<KomodoOverview> {
    const [servers, stacks, deployments] = await Promise.all([
      this.listServersAsync(),
      this.listStacksAsync(),
      this.listDeploymentsAsync(),
    ]);

    return createKomodoOverview(servers, stacks, deployments);
  }

  private async listResourcesAsync(kind: KomodoResourceKind, path: KomodoReadPath): Promise<KomodoResource[]> {
    const fetchAsync: KomodoFetchAsync = async (url, options) =>
      await fetchWithTrustedCertificatesAsync(url, { ...options, timeout: REQUEST_TIMEOUT_MS });
    const response = await this.sendRequestAsync(fetchAsync, path, LIST_REQUEST_BODY);

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return await parseKomodoResourceListResponseAsync(response, kind);
  }

  private async sendRequestAsync(
    fetchAsync: KomodoFetchAsync,
    path: KomodoReadPath,
    body: Record<string, unknown>,
  ): Promise<Response> {
    return await fetchAsync(this.url(path), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.getSecretValue("komodoApiKey"),
        "x-api-secret": this.getSecretValue("komodoApiSecret"),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }
}
