import { readBoundedJsonResponseAsync } from "@homarr/common/bounded-response";
import { z } from "zod";

import type { IntegrationTestingInput } from "../../base/integration";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import { traefikResourcesSchema, traefikVersionSchema } from "../../traefik/traefik-types";
import type {
  TraefikDashboardData,
  TraefikResource,
  TraefikResourceDetail,
  TraefikResourceStatus,
  TraefikResourceSummary,
} from "../../traefik/traefik-types";
import { IntegrationTransportParseError, IntegrationTransportStatusError } from "../../runtime/transport-errors";
import {
  SpecialistFetchAcquisitionError,
  SpecialistNonDegradableError,
  SpecialistProtocol,
  throwSpecialistCriticalFailures,
} from "./protocol";
import type { SpecialistHttp } from "./protocol";

const MAX_RESOURCE_DETAILS = 200;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

const normalizeStatus = (status?: string): TraefikResourceStatus => {
  const value = status?.toLowerCase();
  return value === "enabled" || value === "disabled" || value === "warning" || value === "error" ? value : "unknown";
};

const summarize = (resources: TraefikResource[]): TraefikResourceSummary =>
  resources.reduce<TraefikResourceSummary>(
    (summary, resource) => {
      const status = normalizeStatus(resource.status);
      summary.total++;
      if (status === "enabled") summary.enabled++;
      if (status === "warning") summary.warnings++;
      if (status === "error") summary.errors++;
      return summary;
    },
    { total: 0, enabled: 0, warnings: 0, errors: 0 },
  );

export class TraefikProtocol extends SpecialistProtocol {
  private headers(): Record<string, string> {
    if (this.hasSecret("username") && this.hasSecret("password")) return this.basicHeaders();
    if (this.hasSecret("apiKey")) return { Authorization: `Bearer ${this.secret("apiKey")}` };
    return {};
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    return this.testingHttp(input).responseAsync(
      this.url("/api/version"),
      { headers: this.headers() },
      async (response) => {
        if (!response.ok) throw new IntegrationTransportStatusError(response.status);
        traefikVersionSchema.parse(
          await readBoundedJsonResponseAsync(response, MAX_RESPONSE_BYTES, "Traefik response"),
        );
        return { success: true };
      },
    );
  }

  private getAsync(http: SpecialistHttp, path: `/${string}`) {
    return http.responseAsync(
      this.url(path),
      { headers: this.headers() },
      async (response) => {
        if (!response.ok) throw new IntegrationTransportStatusError(response.status);
        return await readBoundedJsonResponseAsync(response, MAX_RESPONSE_BYTES, "Traefik response");
      },
      10_000,
    );
  }

  async getDashboardDataAsync(): Promise<TraefikDashboardData> {
    return this.runAsync(async (http) => {
      const versionPromise = this.getAsync(http, "/api/version").then(
        (value) => traefikVersionSchema.parse(value).Version ?? null,
      );
      const endpoints = [
        "entrypoints",
        "http/routers",
        "http/services",
        "http/middlewares",
        "tcp/routers",
        "tcp/services",
        "tcp/middlewares",
        "udp/routers",
        "udp/services",
      ] as const;
      const [versionResult, ...resourceResults] = await Promise.allSettled([
        versionPromise,
        ...endpoints.map(async (endpoint) =>
          traefikResourcesSchema.parse(await this.getAsync(http, `/api/${endpoint}`)),
        ),
      ]);
      const failures: unknown[] = [versionResult, ...resourceResults].flatMap((result) =>
        result?.status === "rejected" ? [result.reason] : [],
      );
      throwSpecialistCriticalFailures(failures);
      if (this.resources.context.signal.aborted)
        throw new SpecialistNonDegradableError("cancellation", [...failures, this.resources.context.signal.reason]);
      for (const error of failures) {
        if (
          !(error instanceof IntegrationTransportStatusError) &&
          !(error instanceof IntegrationTransportParseError) &&
          !(error instanceof SpecialistFetchAcquisitionError) &&
          !(error instanceof z.ZodError)
        )
          throw new SpecialistNonDegradableError("optional-provider", [error]);
      }
      if ([versionResult, ...resourceResults].every((result) => result?.status === "rejected")) {
        if (versionResult?.status === "rejected") throw versionResult.reason;
        throw new Error("Every Traefik endpoint failed");
      }
      const resourcesByEndpoint = new Map<string, TraefikResource[]>();
      const failedEndpoints: string[] = versionResult?.status === "rejected" ? ["version"] : [];
      for (const [index, endpoint] of endpoints.entries()) {
        const result = resourceResults[index];
        if (result?.status === "rejected") failedEndpoints.push(endpoint);
        if (result?.status === "fulfilled" && Array.isArray(result.value))
          resourcesByEndpoint.set(endpoint, result.value);
      }
      const entries = (endpoint: string) => resourcesByEndpoint.get(endpoint) ?? [];
      const resources: TraefikResourceDetail[] = [];
      const groups = [
        ["http", "router", "http/routers"],
        ["http", "service", "http/services"],
        ["http", "middleware", "http/middlewares"],
        ["tcp", "router", "tcp/routers"],
        ["tcp", "service", "tcp/services"],
        ["tcp", "middleware", "tcp/middlewares"],
        ["udp", "router", "udp/routers"],
        ["udp", "service", "udp/services"],
      ] as const;
      for (const [protocol, type, endpoint] of groups) {
        const remaining = MAX_RESOURCE_DETAILS - resources.length;
        if (remaining === 0) break;
        resources.push(
          ...entries(endpoint)
            .slice(0, remaining)
            .map((resource, index) => ({
              protocol,
              type,
              name: resource.name ?? `${type}-${index + 1}`,
              provider: resource.provider ?? null,
              status: normalizeStatus(resource.status),
            })),
        );
      }
      const summary = (protocol: "http" | "tcp") => ({
        routers: summarize(entries(`${protocol}/routers`)),
        services: summarize(entries(`${protocol}/services`)),
        middlewares: summarize(entries(`${protocol}/middlewares`)),
      });
      return {
        version:
          versionResult?.status === "fulfilled" && typeof versionResult.value === "string" ? versionResult.value : null,
        entryPoints: entries("entrypoints")
          .slice(0, MAX_RESOURCE_DETAILS)
          .map((entry, index) => entry.name ?? `entrypoint-${index + 1}`),
        resources,
        failedEndpoints,
        http: summary("http"),
        tcp: summary("tcp"),
        udp: { routers: summarize(entries("udp/routers")), services: summarize(entries("udp/services")) },
      };
    });
  }
}
