import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type {
  TraefikDashboardData,
  TraefikProtocolSummary,
  TraefikResource,
  TraefikResourceStatus,
  TraefikResourceSummary,
} from "./traefik-types";
import { traefikResourcesSchema, traefikVersionSchema } from "./traefik-types";

type ResourcePath =
  | "/api/http/routers"
  | "/api/http/services"
  | "/api/http/middlewares"
  | "/api/tcp/routers"
  | "/api/tcp/services"
  | "/api/tcp/middlewares"
  | "/api/udp/routers"
  | "/api/udp/services"
  | "/api/entrypoints";

export class TraefikIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/api/version"), { headers: this.getAuthHeaders() });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    traefikVersionSchema.parse(await response.json());
    return { success: true };
  }

  public async getDashboardDataAsync(): Promise<TraefikDashboardData> {
    const [
      versionResult,
      entryPointsResult,
      httpRoutersResult,
      httpServicesResult,
      httpMiddlewaresResult,
      tcpRoutersResult,
      tcpServicesResult,
      tcpMiddlewaresResult,
      udpRoutersResult,
      udpServicesResult,
    ] = await Promise.allSettled([
      this.getVersionAsync(),
      this.getResourcesAsync("/api/entrypoints"),
      this.getResourcesAsync("/api/http/routers"),
      this.getResourcesAsync("/api/http/services"),
      this.getResourcesAsync("/api/http/middlewares"),
      this.getResourcesAsync("/api/tcp/routers"),
      this.getResourcesAsync("/api/tcp/services"),
      this.getResourcesAsync("/api/tcp/middlewares"),
      this.getResourcesAsync("/api/udp/routers"),
      this.getResourcesAsync("/api/udp/services"),
    ]);
    const version = versionResult.status === "fulfilled" ? versionResult.value : null;
    const entryPoints = entryPointsResult.status === "fulfilled" ? entryPointsResult.value : [];
    const httpRouters = httpRoutersResult.status === "fulfilled" ? httpRoutersResult.value : [];
    const httpServices = httpServicesResult.status === "fulfilled" ? httpServicesResult.value : [];
    const httpMiddlewares = httpMiddlewaresResult.status === "fulfilled" ? httpMiddlewaresResult.value : [];
    const tcpRouters = tcpRoutersResult.status === "fulfilled" ? tcpRoutersResult.value : [];
    const tcpServices = tcpServicesResult.status === "fulfilled" ? tcpServicesResult.value : [];
    const tcpMiddlewares = tcpMiddlewaresResult.status === "fulfilled" ? tcpMiddlewaresResult.value : [];
    const udpRouters = udpRoutersResult.status === "fulfilled" ? udpRoutersResult.value : [];
    const udpServices = udpServicesResult.status === "fulfilled" ? udpServicesResult.value : [];

    return {
      version,
      entryPoints: entryPoints.map((entryPoint, index) => entryPoint.name ?? `entrypoint-${index + 1}`),
      http: this.createProtocolSummary(httpRouters, httpServices, httpMiddlewares),
      tcp: this.createProtocolSummary(tcpRouters, tcpServices, tcpMiddlewares),
      udp: {
        routers: this.summarizeResources(udpRouters),
        services: this.summarizeResources(udpServices),
      },
    };
  }

  private async getVersionAsync() {
    const response = await this.fetchOkAsync("/api/version");
    const version = traefikVersionSchema.parse(await response.json());
    return version.Version ?? null;
  }

  private async getResourcesAsync(path: ResourcePath) {
    const response = await this.fetchOkAsync(path);
    return traefikResourcesSchema.parse(await response.json());
  }

  private createProtocolSummary(
    routers: TraefikResource[],
    services: TraefikResource[],
    middlewares: TraefikResource[],
  ): TraefikProtocolSummary {
    return {
      routers: this.summarizeResources(routers),
      services: this.summarizeResources(services),
      middlewares: this.summarizeResources(middlewares),
    };
  }

  private summarizeResources(resources: TraefikResource[]): TraefikResourceSummary {
    return resources.reduce<TraefikResourceSummary>(
      (summary, resource) => {
        const status = this.normalizeStatus(resource.status);
        summary.total += 1;

        if (status === "enabled") summary.enabled += 1;
        if (status === "warning") summary.warnings += 1;
        if (status === "error") summary.errors += 1;

        return summary;
      },
      { total: 0, enabled: 0, warnings: 0, errors: 0 },
    );
  }

  private normalizeStatus(status: string | undefined): TraefikResourceStatus {
    if (!status) return "unknown";
    const normalized = status.toLowerCase();

    if (normalized === "enabled" || normalized === "disabled" || normalized === "warning" || normalized === "error") {
      return normalized;
    }

    return "unknown";
  }

  private async fetchOkAsync(path: ResourcePath | "/api/version") {
    const response = await fetchWithTrustedCertificatesAsync(this.url(path), {
      headers: this.getAuthHeaders(),
      timeout: 10_000,
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return response;
  }

  private getAuthHeaders(): Record<string, string> {
    if (this.hasSecretValue("username") && this.hasSecretValue("password")) {
      const credentials = Buffer.from(`${this.getSecretValue("username")}:${this.getSecretValue("password")}`).toString(
        "base64",
      );
      return { Authorization: `Basic ${credentials}` };
    }

    if (this.hasSecretValue("apiKey")) {
      return { Authorization: `Bearer ${this.getSecretValue("apiKey")}` };
    }

    return {};
  }
}
