import dayjs from "dayjs";
import { z } from "zod/v4";

import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationInput, IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { SessionStore } from "../base/session-store";
import { createSessionStore } from "../base/session-store";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ISystemHealthMonitoringIntegration } from "../interfaces/health-monitoring/health-monitoring-integration";
import type { SystemHealthMonitoring } from "../types";

export class GlancesIntegration extends Integration implements ISystemHealthMonitoringIntegration {
  private readonly sessionStore: SessionStore<{ version: string }>;

  constructor(integration: IntegrationInput) {
    super(integration);
    this.sessionStore = createSessionStore(integration);
  }

  public async getSystemInfoAsync(): Promise<SystemHealthMonitoring> {
    let session = await this.sessionStore.getAsync();

    if (session == null) {
      await this.sessionStore.setAsync({
        version: await this.getGlancesVersionAsync(),
      });

      // update the store to re-use the values below.
      session = await this.sessionStore.getAsync();
    }

    if (session == null) throw new Error("Session was unexpectitly null");

    const stats = await this.getAllStatsAsync();

    return {
      cpuUtilization: stats.cpu.total,
      memUsedInBytes: stats.mem.used,
      memAvailableInBytes: stats.mem.total - stats.mem.used,
      network: {
        down: stats.network.reduce((acc, net) => net.bytes_recv_rate_per_sec + acc, 0),
        up: stats.network.reduce((acc, net) => net.bytes_sent_rate_per_sec + acc, 0),
      },
      availablePkgUpdates: 0,
      version: session.version,
      fileSystem: stats.fs.map((fileSystem) => ({
        deviceName: fileSystem.device_name,
        used: `${fileSystem.used}`,
        available: `${fileSystem.free}`,
        percentage: fileSystem.percent,
      })),
      uptime: stats.uptime.as("seconds"),
      rebootRequired: false,
      cpuModelName: stats.quicklook.cpu_name,
      loadAverage: null,
      smart: [],
      cpuTemp: undefined,
      gpu: stats.gpu.map((gpu) => ({
        gpuId: gpu.gpu_id,
        name: gpu.name,
        memoryUtilization: gpu.mem ?? 0,
        processorUtilization: gpu.proc ?? 0,
        temperature: gpu.temperature ?? null,
        fanSpeed: gpu.fan_speed ?? null,
      })),
    };
  }

  private async getGlancesVersionAsync() {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/4/version"));

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return await response.text();
  }

  private async getAllStatsAsync() {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/4/all"));

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return allSchema.parseAsync(await response.json());
  }

  protected async testingAsync(_: IntegrationTestingInput): Promise<TestingResult> {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/4/status"), {
      headers: { "User-Agent": "Homarr" },
    });

    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    return { success: true };
  }
}

// Glances is written in python and uses the following code to format uptime:
// from datetime import datetime
// uptime = datetime.now() - datetime.fromtimestamp(1773395580)
// str(uptime).split(".")[0]
// This results in one of the following formats:
// - 71 days, 9:51:35
// - 1 day, 9:50:23
// - 9:51:24
// - 0:22:02
// - 0:00:17
// See https://github.com/nicolargo/glances/blob/4139b10c5c3a98afc67a19ae67d66d2d94d7db6a/glances/plugins/uptime/__init__.py#L58
const regex = /^(?:(?<days>\d+) days?, )?(?<hours>\d+):(?<minutes>\d+):(?<seconds>\d+)$/m;

const allSchema = z.object({
  cpu: z.object({
    total: z.number().min(0).max(100),
  }),
  mem: z.object({
    total: z.number().min(0),
    used: z.number().min(0),
    free: z.number().min(0),
  }),
  network: z.array(
    z.object({
      bytes_sent_rate_per_sec: z.number().min(0),
      bytes_recv_rate_per_sec: z.number().min(0),
    }),
  ),
  fs: z.array(
    z.object({
      device_name: z.string(),
      used: z.number().min(0),
      free: z.number().min(0),
      percent: z.number().min(0).max(100),
    }),
  ),
  uptime: z
    .string()
    .regex(new RegExp(regex))
    .transform((uptime) => {
      const match = regex.exec(uptime);
      if (!match?.groups) {
        throw new Error(`Unable to parse uptime value '${uptime}' with regex.`);
      }

      const days = "days" in match.groups ? Number(match.groups.days) : undefined;
      const hours = "hours" in match.groups ? Number(match.groups.hours) : undefined;
      const minutes = "minutes" in match.groups ? Number(match.groups.minutes) : undefined;
      const seconds = "seconds" in match.groups ? Number(match.groups.seconds) : undefined;

      return dayjs.duration({ days, hours, minutes, seconds });
    }),
  quicklook: z.object({
    cpu_name: z.string(),
  }),
  gpu: z
    .array(
      z.object({
        gpu_id: z.string(),
        name: z.string(),
        mem: z.number().nullable().optional(),
        proc: z.number().nullable().optional(),
        temperature: z.number().nullable().optional(),
        fan_speed: z.number().nullable().optional(),
      }),
    )
    .default([]),
});
