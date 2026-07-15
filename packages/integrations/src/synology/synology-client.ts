import type { Headers } from "undici";
import type { z } from "zod";

import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

import type { SessionStore } from "../base/session-store";
import type { SynologyDiskRecord, SynologyVolumeRecord } from "./synology-types";
import {
  AUTH_API_NAME,
  INFO_API_NAME,
  REQUEST_TIMEOUT_MS,
  SESSION_ERROR_CODES,
  synologyApiInfoResponseSchema,
  synologyAuthResponseSchema,
  synologyEnvelopeSchema,
  synologyLegacyStorageDataSchema,
  synologySmartInfoDataSchema,
  synologyStorageLoadInfoDataSchema,
  synologyStorageV2DataSchema,
  synologySystemInfoDataSchema,
  synologySystemStatusDataSchema,
  synologyUpgradeCheckDataSchema,
  synologyUpgradeStatusDataSchema,
  synologyUtilizationDataSchema,
} from "./synology-types";

const logger = createLogger({ module: "synologyClient" });

const AUTH_SESSION_NAME = "DownloadStation";

type ApiDefinition = {
  cgiPath: string;
  maxVersion: number;
};

type StoredSession = {
  cookieHeader: string;
};

type SynologyClientOptions = {
  integrationId: string;
  baseUrl: string;
  username: string;
  password: string;
  sessionStore: SessionStore<StoredSession>;
};

const apiDefinitionCache = new Map<string, ApiDefinition>();

export class SynologyClient {
  private readonly integrationId: string;
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private readonly sessionStore: SessionStore<StoredSession>;

  constructor(options: SynologyClientOptions) {
    this.integrationId = options.integrationId;
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.username = options.username;
    this.password = options.password;
    this.sessionStore = options.sessionStore;
  }

  public async getSystemInfoAsync() {
    const response = await this.requestAsync("SYNO.Core.System", { method: "info" });
    return synologySystemInfoDataSchema.parse(response.data);
  }

  public async getUtilizationAsync() {
    const response = await this.requestAsync("SYNO.Core.System.Utilization", { method: "get" });
    return synologyUtilizationDataSchema.parse(response.data);
  }

  public async getStorageVolumesAsync(): Promise<SynologyVolumeRecord[]> {
    try {
      const storageV2Response = await this.requestAsync("SYNO.Core.System", {
        method: "info",
        extraParams: { type: "storage_v2" },
      });
      const storageV2 = synologyStorageV2DataSchema.parse(storageV2Response.data);
      const volumesFromV2 = this.mapStorageV2Volumes(storageV2);
      if (volumesFromV2.length > 0) {
        return volumesFromV2;
      }
    } catch (error) {
      logger.debug("storage_v2 unavailable, falling back to legacy storage info", {
        integrationId: this.integrationId,
        error,
      });
    }

    const legacyResponse = await this.requestAsync("SYNO.Core.System", {
      method: "info",
      extraParams: { type: "storage" },
    });
    const legacyStorage = synologyLegacyStorageDataSchema.parse(legacyResponse.data);
    return this.mapLegacyVolumes(legacyStorage.vol_info ?? []);
  }

  public async getStorageLoadInfoAsync() {
    const response = await this.requestOptionalAsync("SYNO.Storage.CGI.Storage", { method: "load_info" });
    if (!response) {
      return null;
    }
    return synologyStorageLoadInfoDataSchema.parse(response.data);
  }

  public async getSmartInfoAsync() {
    const response = await this.requestOptionalAsync("SYNO.Storage.CGI.Smart", { method: "get_smart_info" });
    if (!response) {
      return null;
    }
    return synologySmartInfoDataSchema.parse(response.data);
  }

  public async getSystemStatusAsync() {
    const response = await this.requestOptionalAsync("SYNO.Core.System.Status", { method: "get" });
    if (!response) {
      return null;
    }
    return synologySystemStatusDataSchema.parse(response.data);
  }

  public async getUpgradeStatusAsync() {
    const response = await this.requestOptionalAsync("SYNO.Core.Upgrade", { method: "status" });
    if (!response) {
      return null;
    }
    return synologyUpgradeStatusDataSchema.parse(response.data);
  }

  public async getUpgradeCheckAsync() {
    const response = await this.requestOptionalAsync("SYNO.Core.Upgrade.Server", { method: "check" });
    if (!response) {
      return null;
    }
    return synologyUpgradeCheckDataSchema.parse(response.data);
  }

  public async testConnectionAsync() {
    await this.getSystemInfoAsync();
  }

  private mapLegacyVolumes(volumes: z.infer<typeof synologyLegacyStorageDataSchema>["vol_info"]) {
    return (volumes ?? [])
      .map((volume) => this.mapVolumeRecord(volume.name, volume.used_size, volume.total_size, volume.status))
      .filter((volume): volume is SynologyVolumeRecord => volume !== null);
  }

  private mapStorageV2Volumes(storage: z.infer<typeof synologyStorageV2DataSchema>) {
    return (storage.volumes ?? [])
      .map((volume) => {
        const name = volume.id ?? volume.vol_path ?? volume.display_name;
        if (!name) {
          return null;
        }
        return this.mapVolumeRecord(name, volume.size?.used, volume.size?.total, volume.status, volume.display_name);
      })
      .filter((volume): volume is SynologyVolumeRecord => volume !== null);
  }

  private mapVolumeRecord(
    name: string,
    usedValue: number | string | undefined,
    totalValue: number | string | undefined,
    status: string | undefined,
    displayName?: string,
  ): SynologyVolumeRecord | null {
    const usedBytes = parseNumericValue(usedValue);
    const totalBytes = parseNumericValue(totalValue);
    if (usedBytes === null || totalBytes === null || totalBytes <= 0) {
      return null;
    }

    return {
      name,
      displayName: displayName && displayName !== name ? displayName : undefined,
      usedBytes,
      totalBytes,
      status,
    };
  }

  public mapDisksFromLoadInfo(loadInfo: z.infer<typeof synologyStorageLoadInfoDataSchema>): SynologyDiskRecord[] {
    return (loadInfo.disks ?? []).map((disk) => ({
      identifier: disk.id ?? disk.name ?? disk.display_name ?? "unknown-disk",
      name: disk.display_name ?? disk.name ?? disk.id ?? "unknown-disk",
      status: disk.smart_status ?? disk.status,
      temperature: parseOptionalNumericValue(disk.temp ?? disk.temperature),
      volumeName: disk.volume_id ?? disk.vol_path,
    }));
  }

  public mapDisksFromSmartInfo(smartInfo: z.infer<typeof synologySmartInfoDataSchema>): SynologyDiskRecord[] {
    const disks = smartInfo.disks ?? smartInfo.items ?? [];
    return disks.map((disk) => ({
      identifier: disk.disk_id ?? disk.id ?? disk.name ?? "unknown-disk",
      name: disk.name ?? disk.disk_id ?? disk.id ?? "unknown-disk",
      status: disk.overall_status ?? disk.status,
      temperature: parseOptionalNumericValue(disk.temp ?? disk.temperature),
      volumeName: undefined,
    }));
  }

  private async requestOptionalAsync(
    apiName: string,
    options: { method: string; extraParams?: Record<string, string> },
  ) {
    try {
      return await this.requestAsync(apiName, options);
    } catch (error) {
      logger.debug("Optional Synology API request failed", {
        integrationId: this.integrationId,
        apiName,
        method: options.method,
        error,
      });
      return null;
    }
  }

  private async requestAsync(
    apiName: string,
    options: { method: string; extraParams?: Record<string, string> },
  ): Promise<z.infer<typeof synologyEnvelopeSchema>> {
    return await this.withAuthenticatedSessionAsync(async (session) => {
      const apiDefinition = await this.getApiDefinitionAsync(apiName);
      const requestUrl = new URL(`${this.baseUrl}/webapi/${apiDefinition.cgiPath}`);
      requestUrl.searchParams.set("api", apiName);
      requestUrl.searchParams.set("version", String(apiDefinition.maxVersion));
      requestUrl.searchParams.set("method", options.method);
      for (const [key, value] of Object.entries(options.extraParams ?? {})) {
        requestUrl.searchParams.set(key, value);
      }

      const response = await fetchWithTrustedCertificatesAsync(requestUrl, {
        headers: {
          Cookie: session.cookieHeader,
          "User-Agent": "Homarr",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new ResponseError(response);
      }

      const payload = synologyEnvelopeSchema.parse(await response.json());
      if (!payload.success) {
        const errorCode = payload.error?.code;
        if (errorCode !== undefined && SESSION_ERROR_CODES.has(errorCode)) {
          throw new SynologySessionError(errorCode);
        }
        throw new ResponseError({
          status: 502,
          url: requestUrl.toString(),
        });
      }

      return payload;
    });
  }

  private async withAuthenticatedSessionAsync<T>(callback: (session: StoredSession) => Promise<T>): Promise<T> {
    const storedSession = await this.sessionStore.getAsync();
    if (storedSession) {
      try {
        return await callback(storedSession);
      } catch (error) {
        if (!(error instanceof SynologySessionError)) {
          throw error;
        }
        logger.debug("Synology session expired, re-authenticating", {
          integrationId: this.integrationId,
          errorCode: error.errorCode,
        });
        await this.sessionStore.clearAsync();
      }
    }

    const session = await this.loginAsync();
    await this.sessionStore.setAsync(session);
    return await callback(session);
  }

  private async loginAsync(): Promise<StoredSession> {
    const authDefinition = await this.getApiDefinitionAsync(AUTH_API_NAME);
    const loginUrl = new URL(`${this.baseUrl}/webapi/${authDefinition.cgiPath}`);
    loginUrl.searchParams.set("api", AUTH_API_NAME);
    loginUrl.searchParams.set("version", String(authDefinition.maxVersion));
    loginUrl.searchParams.set("method", "login");
    const safeLoginUrl = loginUrl.toString();

    const response = await fetchWithTrustedCertificatesAsync(loginUrl, {
      method: "POST",
      headers: {
        "User-Agent": "Homarr",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        account: this.username,
        passwd: this.password,
        session: AUTH_SESSION_NAME,
        format: "cookie",
      }).toString(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new ResponseError({ status: response.status, url: safeLoginUrl });
    }

    const payload = synologyAuthResponseSchema.parse(await response.json());
    if (!payload.success) {
      throw new ResponseError({
        status: 401,
        url: safeLoginUrl,
      });
    }

    const cookieHeader = extractCookieHeader(response.headers);
    if (!cookieHeader) {
      throw new ResponseError({
        status: 401,
        url: safeLoginUrl,
      });
    }

    return { cookieHeader };
  }

  private async getApiDefinitionAsync(apiName: string): Promise<ApiDefinition> {
    const cacheKey = `${this.integrationId}:${apiName}`;
    const cachedDefinition = apiDefinitionCache.get(cacheKey);
    if (cachedDefinition) {
      return cachedDefinition;
    }

    const infoUrl = new URL(`${this.baseUrl}/webapi/query.cgi`);
    infoUrl.searchParams.set("api", INFO_API_NAME);
    infoUrl.searchParams.set("version", "1");
    infoUrl.searchParams.set("method", "query");
    infoUrl.searchParams.set("query", apiName);

    const response = await fetchWithTrustedCertificatesAsync(infoUrl, {
      headers: {
        "User-Agent": "Homarr",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const payload = synologyApiInfoResponseSchema.parse(await response.json());
    const apiDefinition = payload.data?.[apiName];
    if (!payload.success || !apiDefinition) {
      throw new ResponseError({
        status: 502,
        url: infoUrl.toString(),
      });
    }

    const definition = {
      cgiPath: apiDefinition.path,
      maxVersion: apiDefinition.maxVersion,
    };
    apiDefinitionCache.set(cacheKey, definition);
    return definition;
  }
}

class SynologySessionError extends Error {
  constructor(public readonly errorCode: number) {
    super(`Synology session error ${String(errorCode)}`);
    this.name = SynologySessionError.name;
  }
}

function extractCookieHeader(headers: Headers): string | null {
  const cookies = headers.getSetCookie();
  if (cookies.length === 0) {
    return null;
  }

  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

function parseNumericValue(value: number | string | undefined): number | null {
  if (value === undefined) {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalNumericValue(value: number | string | undefined): number | null {
  const parsed = parseNumericValue(value);
  return parsed === null ? null : parsed;
}
