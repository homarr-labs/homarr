import { z } from "zod/v4";

import { createSessionStore } from "../../base/session-store";
import type { IntegrationInput } from "../../base/integration";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { SystemHealthMonitoring } from "../../interfaces/health-monitoring/health-monitoring-types";
import type { IntegrationRuntimeResources } from "../../runtime/contracts";
import { settleAllAsync, SystemsHttpClient } from "./http";
import type { SystemsHttpOperation } from "./http";
import { pickSystemHealthStats } from "./stats";

const uptimePattern = /^(?:(?<days>\d+) days?, )?(?<hours>\d+):(?<minutes>\d+):(?<seconds>\d+)$/m;
const allSchema = z.object({
  cpu: z.object({ total: z.number().min(0).max(100) }),
  mem: z.object({ total: z.number().min(0), used: z.number().min(0), free: z.number().min(0) }),
  network: z.array(
    z.object({ bytes_sent_rate_per_sec: z.number().min(0), bytes_recv_rate_per_sec: z.number().min(0) }),
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
    .regex(uptimePattern)
    .transform((value) => {
      const groups = uptimePattern.exec(value)?.groups;
      if (!groups) throw new Error(`Unable to parse uptime value '${value}' with regex.`);
      return (
        Number(groups.days ?? 0) * 86400 +
        Number(groups.hours ?? 0) * 3600 +
        Number(groups.minutes ?? 0) * 60 +
        Number(groups.seconds ?? 0)
      );
    }),
  quicklook: z.object({ cpu_name: z.string() }).optional(),
  gpu: z
    .array(
      z.object({
        gpu_id: z.string(),
        name: z.string(),
        mem: z.number().nullish(),
        proc: z.number().nullish(),
        temperature: z.number().nullish(),
        fan_speed: z.number().nullish(),
      }),
    )
    .default([]),
});
const sensorsSchema = z.array(z.object({ label: z.string(), value: z.number(), type: z.string().optional() }));
const smartSchema = z.array(z.object({ DeviceName: z.string() }).catchall(z.unknown()));
const attributeSchema = z.object({
  name: z.string().nullish(),
  key: z.string().nullish(),
  value: z.union([z.string(), z.number()]).nullish(),
  raw: z.union([z.string(), z.number()]).nullish(),
  when_failed: z.string().nullish(),
});

export class GlancesHttpClient extends SystemsHttpClient {
  private readonly sessionStore;

  constructor(input: IntegrationInput, resources: IntegrationRuntimeResources) {
    super(input, resources);
    this.sessionStore = createSessionStore<{ version: string }>(input, resources.sessions);
  }

  async getStatsAsync() {
    return pickSystemHealthStats(await this.getSystemInfoAsync());
  }

  async getSystemInfoAsync(): Promise<SystemHealthMonitoring> {
    return await this.runAsync(async (http) => {
      let session = await this.sessionStore.getAsync();
      http.assertActive();
      if (!session) {
        await this.sessionStore.setAsync({ version: await http.textAsync(this.url("/api/4/version")) });
        session = await this.sessionStore.getAsync();
      }
      if (!session) throw new Error("Session was unexpectitly null");
      const [stats, cpuTemp, smart] = await settleAllAsync([
        http.jsonAsync(this.url("/api/4/all")).then((data) => allSchema.parse(data)),
        this.getCpuTempAsync(http),
        this.getSmartAsync(http),
      ] as const);
      http.assertActive();
      return {
        cpuUtilization: stats.cpu.total,
        memUsedInBytes: stats.mem.used,
        memAvailableInBytes: stats.mem.total - stats.mem.used,
        network: {
          down: stats.network.reduce((sum, value) => sum + value.bytes_recv_rate_per_sec, 0),
          up: stats.network.reduce((sum, value) => sum + value.bytes_sent_rate_per_sec, 0),
        },
        availablePkgUpdates: 0,
        version: session.version,
        fileSystem: stats.fs.map((fs) => ({
          deviceName: fs.device_name,
          used: `${fs.used}`,
          available: `${fs.free}`,
          percentage: fs.percent,
        })),
        uptime: stats.uptime,
        rebootRequired: false,
        cpuModelName: stats.quicklook?.cpu_name ?? "Unknown",
        loadAverage: null,
        smart,
        cpuTemp,
        gpu: stats.gpu.map((gpu) => ({
          gpuId: gpu.gpu_id,
          name: gpu.name,
          memoryUtilization: gpu.mem ?? 0,
          processorUtilization: gpu.proc ?? 0,
          temperature: gpu.temperature ?? null,
          fanSpeed: gpu.fan_speed ?? null,
        })),
      };
    });
  }

  protected async testingAsync(http: SystemsHttpOperation) {
    return await http.readAsync(
      this.url("/api/4/status"),
      async (response) => (response.ok ? ({ success: true } as const) : TestConnectionError.StatusResult(response)),
      { headers: { "User-Agent": "Homarr" } },
    );
  }

  private async getCpuTempAsync(http: SystemsHttpOperation) {
    try {
      const sensors = sensorsSchema.parse(await http.jsonAsync(this.url("/api/4/sensors")));
      const temperatures = sensors.filter(
        (sensor) => sensor.type === "temperature_core" || sensor.type === "temperature",
      );
      for (const label of ["CPU", "Package id 0"]) {
        const sensor = temperatures.find((sensor) => sensor.label === label);
        if (sensor) return sensor.value;
      }
      return temperatures[0]?.value;
    } catch (error) {
      http.rethrowCritical(error);
      return undefined;
    }
  }

  private async getSmartAsync(http: SystemsHttpOperation): Promise<SystemHealthMonitoring["smart"]> {
    try {
      return smartSchema.parse(await http.jsonAsync(this.url("/api/4/smart"))).flatMap((device) => {
        const attributes = Object.values(device).flatMap((value) => {
          const parsed = attributeSchema.safeParse(value);
          return parsed.success ? [parsed.data] : [];
        });
        const failed = attributes
          .filter((value) => value.when_failed && value.when_failed !== "-")
          .flatMap((value) => value.name ?? value.key ?? []);
        const warning = attributes.find((value) => value.key === "criticalWarning")?.value;
        const warningCount = warning == null ? Number.NaN : Number(warning);
        const isNvme = Number.isFinite(warningCount);
        if (!isNvme && !attributes.some((value) => typeof value.when_failed === "string")) return [];
        const critical = isNvme && warningCount !== 0;
        const healthy = failed.length === 0 && !critical;
        let temperature: number | null = null;
        const nvmeTemperature = attributes.find((value) => value.key === "_temperature")?.value;
        if (typeof nvmeTemperature === "number") temperature = nvmeTemperature;
        else
          for (const name of ["Temperature_Celsius", "Airflow_Temperature_Cel"]) {
            const raw = attributes.find((value) => value.name === name)?.raw;
            const parsed = Number.parseInt(String(raw ?? ""), 10);
            if (!Number.isNaN(parsed)) {
              temperature = parsed;
              break;
            }
          }
        const statusReason: SystemHealthMonitoring["smart"][number]["statusReason"] =
          failed.length > 0
            ? { type: "attributesFailed", attributes: failed }
            : critical
              ? { type: "criticalWarning" }
              : { type: isNvme ? "noCriticalWarning" : "attributesWithinThresholds" };
        return [
          {
            deviceName: `/dev/${device.DeviceName.split(" ")[0]}`,
            temperature,
            overallStatus: healthy ? "PASSED" : "FAILED",
            healthy,
            statusReason,
          },
        ];
      });
    } catch (error) {
      http.rethrowCritical(error);
      return [];
    }
  }
}
