import { z } from "zod/v4";

import type { IntegrationTestingInput } from "../../base/integration";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { PatchMonStats } from "../../patchmon/patchmon-types";
import type { WudStats } from "../../wud/wud-types";
import { IntegrationTransportParseError } from "../../runtime/transport-errors";
import { SpecialistProtocol, specialistParseResult } from "./protocol";

const patchmonWireSchema = z.object({
  total_hosts: z.number(),
  hosts_needing_updates: z.number(),
  security_updates: z.number(),
  up_to_date_hosts: z.number(),
  hosts_with_security_updates: z.number(),
  recent_updates_24h: z.number(),
  total_outdated_packages: z.number(),
  total_repos: z.number(),
  last_updated: z.string(),
  os_distribution: z
    .array(
      z.object({
        name: z.string(),
        count: z.number(),
        os_type: z.string().optional(),
        os_version: z.string().optional(),
      }),
    )
    .default([]),
});

const wudWireSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    displayName: z.string().nullable().optional(),
    updateAvailable: z.boolean(),
    link: z.string().nullable().optional(),
    image: z.object({ tag: z.object({ value: z.string().nullable().optional() }).optional() }).optional(),
    updateKind: z.object({ remoteValue: z.string().nullable().optional() }).optional(),
    result: z.object({ tag: z.string().nullable().optional() }).optional(),
  }),
);

export class PatchmonProtocol extends SpecialistProtocol {
  private headers() {
    return this.basicHeaders("patchmonApiKey", "patchmonApiSecret");
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    return this.testingHttp(input).responseAsync(
      this.url("/api/v1/gethomepage/stats"),
      { headers: this.headers() },
      async (response) => {
        if (!response.ok) return this.statusResult(response);
        try {
          patchmonWireSchema.parse(await response.json());
        } catch {
          this.resources.context.signal.throwIfAborted();
          return specialistParseResult("Invalid PatchMon stats response");
        }
        return { success: true };
      },
    );
  }

  async getStatsAsync(): Promise<PatchMonStats> {
    return this.runAsync(async (http) => {
      const data = patchmonWireSchema.parse(
        await http.jsonAsync(this.url("/api/v1/gethomepage/stats"), { headers: this.headers() }, 10_000),
      );
      return {
        totalHosts: data.total_hosts,
        hostsNeedingUpdates: data.hosts_needing_updates,
        securityUpdates: data.security_updates,
        upToDateHosts: data.up_to_date_hosts,
        hostsWithSecurityUpdates: data.hosts_with_security_updates,
        recentUpdates24h: data.recent_updates_24h,
        totalOutdatedPackages: data.total_outdated_packages,
        totalRepos: data.total_repos,
        lastUpdated: data.last_updated,
        osDistribution: data.os_distribution
          .map((entry) => ({
            name: entry.name,
            count: entry.count,
            osType: entry.os_type,
            osVersion: entry.os_version,
          }))
          .toSorted((a, b) => b.count - a.count),
      };
    });
  }
}

export class WudProtocol extends SpecialistProtocol {
  private headers() {
    return this.hasSecret("username") && this.hasSecret("password") ? this.basicHeaders() : undefined;
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    return this.testingHttp(input).responseAsync(
      this.url("/api/containers"),
      { headers: this.headers() },
      async (response) => {
        if (!response.ok) return this.statusResult(response);
        try {
          wudWireSchema.parse(await response.json());
        } catch {
          this.resources.context.signal.throwIfAborted();
          return specialistParseResult("Invalid WUD containers response");
        }
        return { success: true };
      },
    );
  }

  async getStatsAsync(): Promise<WudStats> {
    return this.runAsync(async (http) => {
      let containers: z.infer<typeof wudWireSchema>;
      try {
        containers = wudWireSchema.parse(
          await http.jsonAsync(this.url("/api/containers"), { headers: this.headers() }, 10_000),
        );
      } catch (error) {
        if (error instanceof z.ZodError) throw new IntegrationTransportParseError();
        throw error;
      }
      return {
        totalContainers: containers.length,
        updatesAvailable: containers.filter((container) => container.updateAvailable).length,
        updates: containers
          .filter((container) => container.updateAvailable)
          .map((container) => ({
            id: container.id,
            name: container.displayName ?? container.name,
            currentVersion: container.image?.tag?.value ?? null,
            newVersion: container.updateKind?.remoteValue ?? container.result?.tag ?? null,
            link: container.link ?? null,
          })),
      };
    });
  }
}
