import type { z } from "zod";

import { ResponseError } from "@homarr/common/response-error";

import type { IntegrationInput } from "../../base/integration";
import { createSessionStore } from "../../base/session-store";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import type { SystemHealthMonitoring } from "../../interfaces/health-monitoring/health-monitoring-types";
import type { IntegrationRuntimeResources } from "../../runtime/contracts";
import type { SynologyDiskRecord, SynologyVolumeRecord } from "../../synology/synology-types";
import {
  AUTH_API_NAME,
  INFO_API_NAME,
  REQUEST_TIMEOUT_MS,
  SESSION_ERROR_CODES,
  parseSynologyNumber,
  synologyApiInfoResponseSchema,
  synologyAuthResponseSchema,
  synologyEnvelopeSchema,
  synologyLegacyStorageDataSchema,
  synologyStorageV2DataSchema,
  synologySystemInfoDataSchema,
  synologyUtilizationDataSchema,
  synologyStorageLoadInfoDataSchema,
  synologySmartInfoDataSchema,
  synologySystemStatusDataSchema,
  synologyUpgradeStatusDataSchema,
  synologyUpgradeCheckDataSchema,
} from "../../synology/synology-types";
import { settleAllAsync, SystemsHttpClient } from "./http";
import type { SystemsHttpOperation } from "./http";
import { pickSystemHealthStats } from "./stats";

type StoredSession = { cookieHeader: string };
type ApiDefinition = { cgiPath: string; maxVersion: number };

class SynologySessionError extends Error {
  constructor(public readonly errorCode: number) {
    super(`Synology session error ${String(errorCode)}`);
    this.name = "SynologySessionError";
  }
}

export class SynologyHttpClient extends SystemsHttpClient {
  private readonly sessionStore;
  private readonly definitions = new Map<string, ApiDefinition>();

  constructor(input: IntegrationInput, resources: IntegrationRuntimeResources) {
    super(input, resources);
    this.sessionStore = createSessionStore<StoredSession>(input, resources.sessions);
  }

  async getStatsAsync() {
    return pickSystemHealthStats(await this.getSystemInfoAsync());
  }

  override async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    return await this.runAsync(async (http) => {
      let session = await this.sessionStore.getAsync();
      http.assertActive();
      if (!session) {
        session = await this.loginAsync(http);
        await this.sessionStore.setAsync(session, { ttlSeconds: 600 });
      }
      http.assertActive();
      return { headers: { Cookie: session.cookieHeader }, redactValues: [session.cookieHeader] };
    });
  }

  async getSystemInfoAsync(): Promise<SystemHealthMonitoring> {
    return await this.runAsync(async (http) => {
      const [system, utilization, volumes] = await settleAllAsync([
        this.requestAsync(http, "SYNO.Core.System", "info").then((value) =>
          synologySystemInfoDataSchema.parse(value.data),
        ),
        this.requestAsync(http, "SYNO.Core.System.Utilization", "get").then((value) =>
          synologyUtilizationDataSchema.parse(value.data),
        ),
        this.volumesAsync(http),
      ] as const);
      const optional = await Promise.allSettled([
        this.optionalAsync(http, "SYNO.Storage.CGI.Storage", "load_info", (value) =>
          synologyStorageLoadInfoDataSchema.parse(value),
        ),
        this.optionalAsync(http, "SYNO.Storage.CGI.Smart", "get_smart_info", (value) =>
          synologySmartInfoDataSchema.parse(value),
        ),
        this.optionalAsync(http, "SYNO.Core.System.Status", "get", (value) =>
          synologySystemStatusDataSchema.parse(value),
        ),
        this.optionalAsync(http, "SYNO.Core.Upgrade", "status", (value) =>
          synologyUpgradeStatusDataSchema.parse(value),
        ),
        this.optionalAsync(http, "SYNO.Core.Upgrade.Server", "check", (value) =>
          synologyUpgradeCheckDataSchema.parse(value),
        ),
      ] as const);
      for (const value of optional) {
        if (value.status === "rejected") http.rethrowCritical(value.reason);
        if (value.status === "rejected")
          this.resources.log?.write("debug", "Optional Synology API call failed", {
            integrationId: this.integration.id,
          });
      }
      const load = optional[0].status === "fulfilled" ? optional[0].value : null;
      const smart = optional[1].status === "fulfilled" ? optional[1].value : null;
      const systemStatus = optional[2].status === "fulfilled" ? optional[2].value : null;
      const upgradeStatus = optional[3].status === "fulfilled" ? optional[3].value : null;
      const upgradeCheck = optional[4].status === "fulfilled" ? optional[4].value : null;
      const loadDisks: SynologyDiskRecord[] = (load?.disks ?? []).map((disk) => ({
        identifier: disk.id ?? disk.name ?? disk.display_name ?? "unknown-disk",
        name: disk.display_name ?? disk.name ?? disk.id ?? "unknown-disk",
        status: disk.smart_status ?? disk.status,
        temperature: parseSynologyNumber(disk.temp ?? disk.temperature),
        volumeName: disk.volume_id ?? disk.vol_path,
      }));
      const smartDisks: SynologyDiskRecord[] = (smart?.disks ?? smart?.items ?? []).map((disk) => ({
        identifier: disk.disk_id ?? disk.id ?? disk.name ?? "unknown-disk",
        name: disk.name ?? disk.disk_id ?? disk.id ?? "unknown-disk",
        status: disk.overall_status ?? disk.status,
        temperature: parseSynologyNumber(disk.temp ?? disk.temperature),
        volumeName: undefined,
      }));
      const disks = mergeDisks(loadDisks, smartDisks);
      const memory = mapMemory(utilization);
      const network = utilization.network?.find((entry) => entry.device === "total");
      const rx = parseSynologyNumber(network?.rx);
      const tx = parseSynologyNumber(network?.tx);
      const one = parseSynologyNumber(utilization.cpu?.["1min_load"]);
      const five = parseSynologyNumber(utilization.cpu?.["5min_load"]);
      const fifteen = parseSynologyNumber(utilization.cpu?.["15min_load"]);
      http.assertActive();
      return {
        version:
          system.version_string ||
          system.firmware_ver ||
          (system.version !== undefined ? String(system.version) : "Unknown"),
        cpuModelName: system.model ?? "Unknown CPU",
        cpuUtilization: Math.min(
          (parseSynologyNumber(utilization.cpu?.user_load) ?? 0) +
            (parseSynologyNumber(utilization.cpu?.system_load) ?? 0),
          100,
        ),
        memUsedInBytes: memory.usedBytes,
        memAvailableInBytes: memory.availableBytes,
        uptime: mapUptime(system),
        network: rx === null || tx === null ? null : { up: tx, down: rx },
        loadAverage:
          one === null && five === null && fifteen === null
            ? null
            : { "1min": one ?? 0, "5min": five ?? 0, "15min": fifteen ?? 0 },
        rebootRequired: Boolean(systemStatus?.reboot_required ?? upgradeStatus?.reboot_required ?? false),
        availablePkgUpdates: upgradeCheck?.update_count ?? (upgradeCheck?.available ? 1 : 0),
        cpuTemp: parseSynologyNumber(system.sys_temp ?? system.temperature) ?? undefined,
        fileSystem: volumes.map((volume) => ({
          deviceName: volume.name,
          used: `${volume.usedBytes}`,
          available: `${Math.max(volume.totalBytes - volume.usedBytes, 0)}`,
          percentage: (volume.usedBytes / volume.totalBytes) * 100,
        })),
        smart: volumes.map((volume) => {
          const matching = disks.filter(
            (disk) =>
              disk.volumeName &&
              (disk.volumeName === volume.name ||
                disk.volumeName.endsWith(volume.name) ||
                volume.name.endsWith(disk.volumeName) ||
                disk.volumeName.includes(volume.name) ||
                volume.name.includes(disk.volumeName)),
          );
          const temperatures = matching
            .map((disk) => disk.temperature)
            .filter((value): value is number => value !== null);
          const overallStatus = volume.status ?? worstDiskStatus(matching);
          return {
            deviceName: volume.name,
            overallStatus,
            healthy: !["crash", "degraded", "fail", "failed", "warning", "error", "critical"].some((token) =>
              overallStatus.toLowerCase().includes(token),
            ),
            temperature: temperatures.length > 0 ? Math.max(...temperatures) : null,
          };
        }),
        gpu: [],
      };
    });
  }

  async listStorageVolumesAsync() {
    return await this.runAsync(async (http) =>
      (await this.volumesAsync(http)).map((volume) => ({
        value: `${this.integration.id}:${volume.name}`,
        label: `${volume.displayName ?? volume.name} (${this.integration.name})`,
      })),
    );
  }

  protected async testingAsync(http: SystemsHttpOperation) {
    const response = await this.requestAsync(http, "SYNO.Core.System", "info");
    synologySystemInfoDataSchema.parse(response.data);
    return { success: true } as const;
  }

  private async volumesAsync(http: SystemsHttpOperation): Promise<SynologyVolumeRecord[]> {
    try {
      const response = await this.requestAsync(http, "SYNO.Core.System", "info", { type: "storage_v2" });
      const data = synologyStorageV2DataSchema.parse(response.data);
      const volumes = (data.volumes ?? []).flatMap((volume) => {
        const name = volume.id ?? volume.vol_path ?? volume.display_name;
        if (!name) return [];
        const record = mapVolume(name, volume.size?.used, volume.size?.total, volume.status, volume.display_name);
        return record ? [record] : [];
      });
      if (volumes.length > 0) return volumes;
      const legacy = mapLegacyVolumes(data.vol_info);
      if (legacy.length > 0) return legacy;
    } catch (error) {
      http.rethrowCritical(error);
      this.resources.log?.write("debug", "storage_v2 unavailable, falling back to legacy storage info", {
        integrationId: this.integration.id,
      });
    }
    const response = await this.requestAsync(http, "SYNO.Core.System", "info", { type: "storage" });
    return mapLegacyVolumes(synologyLegacyStorageDataSchema.parse(response.data).vol_info);
  }

  private async optionalAsync<T>(
    http: SystemsHttpOperation,
    api: string,
    method: string,
    parse: (value: unknown) => T,
  ): Promise<T | null> {
    let response: z.infer<typeof synologyEnvelopeSchema>;
    try {
      response = await this.requestAsync(http, api, method);
    } catch (error) {
      http.rethrowCritical(error);
      this.resources.log?.write("debug", "Optional Synology API request failed", {
        integrationId: this.integration.id,
        apiName: api,
        method,
      });
      return null;
    }
    return parse(response.data);
  }

  private async requestAsync(
    http: SystemsHttpOperation,
    api: string,
    method: string,
    extra: Record<string, string> = {},
  ) {
    const request = async (session: StoredSession) => {
      const definition = await this.definitionAsync(http, api);
      const url = this.url(`/webapi/${definition.cgiPath}`, {
        api,
        version: String(definition.maxVersion),
        method,
        ...extra,
      });
      const payload = synologyEnvelopeSchema.parse(
        await http.jsonAsync(url, {
          headers: { Cookie: session.cookieHeader, "User-Agent": "Homarr" },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }),
      );
      if (!payload.success) {
        const code = payload.error?.code;
        if (code !== undefined && SESSION_ERROR_CODES.has(code)) throw new SynologySessionError(code);
        throw new ResponseError({ status: 502 });
      }
      return payload;
    };
    const stored = await this.sessionStore.getAsync();
    http.assertActive();
    if (stored) {
      try {
        return await request(stored);
      } catch (error) {
        if (!(error instanceof SynologySessionError)) throw error;
        this.resources.log?.write("debug", "Synology session expired, re-authenticating", {
          integrationId: this.integration.id,
          errorCode: error.errorCode,
        });
        http.assertActive();
        await this.sessionStore.clearAsync();
      }
    }
    const session = await this.loginAsync(http);
    http.assertActive();
    await this.sessionStore.setAsync(session);
    return await request(session);
  }

  private async loginAsync(http: SystemsHttpOperation): Promise<StoredSession> {
    const definition = await this.definitionAsync(http, AUTH_API_NAME);
    return await http.readAsync(
      this.url(`/webapi/${definition.cgiPath}`, {
        api: AUTH_API_NAME,
        version: String(definition.maxVersion),
        method: "login",
      }),
      async (response) => {
        if (!response.ok) throw new ResponseError({ status: response.status });
        const payload = synologyAuthResponseSchema.parse(await response.json());
        if (!payload.success) throw new ResponseError({ status: 401 });
        const cookies = response.headers.getSetCookie();
        if (cookies.length === 0) throw new ResponseError({ status: 401 });
        const cookieHeader = cookies.map((cookie) => cookie.split(";")[0]).join("; ");
        if (!cookieHeader) throw new ResponseError({ status: 401 });
        return { cookieHeader };
      },
      {
        method: "POST",
        headers: { "User-Agent": "Homarr", "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          account: this.secret("username"),
          passwd: this.secret("password"),
          session: "DownloadStation",
          format: "cookie",
        }).toString(),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
  }

  private async definitionAsync(http: SystemsHttpOperation, api: string): Promise<ApiDefinition> {
    http.assertActive();
    const existing = this.definitions.get(api);
    if (existing) return existing;
    const payload = synologyApiInfoResponseSchema.parse(
      await http.jsonAsync(
        this.url("/webapi/query.cgi", { api: INFO_API_NAME, version: "1", method: "query", query: api }),
        { headers: { "User-Agent": "Homarr" }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
      ),
    );
    const definition = payload.data?.[api];
    if (!payload.success || !definition) throw new ResponseError({ status: 502 });
    http.assertActive();
    const result = { cgiPath: definition.path, maxVersion: definition.maxVersion };
    this.definitions.set(api, result);
    return result;
  }
}

function mapVolume(
  name: string,
  usedValue: number | string | undefined,
  totalValue: number | string | undefined,
  status: string | undefined,
  displayName?: string,
): SynologyVolumeRecord | null {
  const usedBytes = parseSynologyNumber(usedValue);
  const totalBytes = parseSynologyNumber(totalValue);
  if (usedBytes === null || totalBytes === null || totalBytes <= 0) return null;
  return {
    name,
    displayName: displayName && displayName !== name ? displayName : undefined,
    usedBytes,
    totalBytes,
    status,
  };
}

function mapLegacyVolumes(volumes: z.infer<typeof synologyLegacyStorageDataSchema>["vol_info"]) {
  return (volumes ?? []).flatMap((volume) => {
    const record = mapVolume(volume.name, volume.used_size, volume.total_size, volume.status);
    return record ? [record] : [];
  });
}

function mapMemory(utilization: z.infer<typeof synologyUtilizationDataSchema>) {
  const total = parseSynologyNumber(utilization.memory?.total_real);
  const percent = parseSynologyNumber(utilization.memory?.real_usage);
  if (total !== null && percent !== null) {
    const totalBytes = total * 1024;
    const usedBytes = Math.round((totalBytes * percent) / 100);
    return { usedBytes, availableBytes: Math.max(totalBytes - usedBytes, 0) };
  }
  const available = parseSynologyNumber(utilization.memory?.avail_real) ?? 0;
  const cached = parseSynologyNumber(utilization.memory?.cached) ?? 0;
  return { usedBytes: Math.max((total ?? available + cached) - available, 0) * 1024, availableBytes: available * 1024 };
}

function mapUptime(system: z.infer<typeof synologySystemInfoDataSchema>) {
  if (typeof system.uptime === "number") return system.uptime;
  if (!system.up_time) return 0;
  const parts = system.up_time.split(":").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) return 0;
  const [hours = 0, minutes = 0, seconds = 0] = parts;
  return hours * 3600 + minutes * 60 + seconds;
}

function mergeDisks(load: SynologyDiskRecord[], smart: SynologyDiskRecord[]) {
  const disks = new Map(load.map((disk) => [disk.identifier, disk]));
  for (const disk of smart) {
    const existing = disks.get(disk.identifier);
    disks.set(disk.identifier, {
      identifier: disk.identifier,
      name: existing?.name ?? disk.name,
      status: disk.status ?? existing?.status,
      temperature: disk.temperature ?? existing?.temperature ?? null,
      volumeName: existing?.volumeName ?? disk.volumeName,
    });
  }
  return [...disks.values()];
}

function worstDiskStatus(disks: SynologyDiskRecord[]) {
  const tokens = ["critical", "error", "crash", "failed", "fail", "degraded", "warning"];
  const severity = (status: string) => {
    const index = tokens.findIndex((token) => status.toLowerCase().includes(token));
    return index === -1 ? tokens.length : index;
  };
  const statuses = disks
    .map((disk) => disk.status)
    .filter((status): status is string => status !== undefined && status.length > 0);
  if (statuses.length === 0) return "normal";
  return statuses.reduce((worst, current) => (severity(current) < severity(worst) ? current : worst));
}
