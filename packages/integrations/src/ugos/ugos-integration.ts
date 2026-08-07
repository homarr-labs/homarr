import { createPublicKey, publicEncrypt, constants } from "node:crypto";
import type { z } from "zod";

import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

import { HandleIntegrationErrors } from "../base/errors/decorator";
import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ISystemHealthMonitoringIntegration } from "../interfaces/health-monitoring/health-monitoring-integration";
import type { SystemHealthMonitoring } from "../interfaces/health-monitoring/health-monitoring-types";
import {
  ugosCommonInfoResponseSchema,
  ugosDiskListResponseSchema,
  ugosLoginResponseSchema,
  ugosStorageInfoResponseSchema,
  ugosStatGetAllResponseSchema,
} from "./ugos-types";

const logger = createLogger({ module: "UgosIntegration" });

@HandleIntegrationErrors([])
export class UgosIntegration extends Integration implements ISystemHealthMonitoringIntegration {
  // Session token, obtained at login and reused across calls.
  // Login requires two round-trips: first /verify/check to obtain the
  // RSA public key (in the x-rsa-token response header, not the body!),
  // then /verify/login with the RSA/PKCS1v1.5-encrypted password.
  private cachedToken: string | undefined;

  // Shared login promise across concurrent calls. getSystemInfoAsync fires
  // 4 GETs in Promise.all: without this guard, each would find cachedToken
  // empty on the first pass and open a separate login.
  private loginPromise: Promise<string> | undefined;

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    await this.loginAsync(input.fetchAsync);
    return { success: true };
  }

  public async getSystemInfoAsync(): Promise<SystemHealthMonitoring> {
    const [stats, disks, volumesData, common] = await Promise.all([
      this.getStatsAsync(),
      this.getDisksAsync(),
      this.getVolumesAsync(),
      this.getCommonInfoAsync(),
    ]);

    const cpuSample = stats.cpu.series[0];
    const volumes = volumesData.volumes;

    // A UGOS volume can span multiple physical disks (e.g. JBOD/RAID), so
    // there isn't always a single temperature or SMART status to associate
    // with the volume - same limitation as TrueNAS/Unraid with ZFS pools /
    // multi-disk arrays. We link a disk to its volume only when the
    // underlying pool (used_for) consists of a single disk AND that pool has
    // exactly one associated volume (a pool with 1 disk can still have
    // multiple volumes, in which case the association would remain
    // ambiguous); otherwise Homarr correctly shows "N/A" for status and no
    // temperature. Disks not yet assigned to a pool (empty used_for) are
    // excluded from this association but still appear in the SMART list
    // below, identified by model/serial.
    // Note: this endpoint only lists internal SATA/NVMe disks - external USB
    // disks don't appear here, so they always remain unmatched.
    const diskCountByPool = new Map<string, number>();
    for (const disk of disks.result) {
      if (!disk.used_for) continue;
      diskCountByPool.set(disk.used_for, (diskCountByPool.get(disk.used_for) ?? 0) + 1);
    }
    const volumeCountByPool = new Map<string, number>();
    for (const volume of volumes) {
      volumeCountByPool.set(volume.for_pool, (volumeCountByPool.get(volume.for_pool) ?? 0) + 1);
    }
    const volumeLabelByDiskName = new Map<string, string>();
    for (const disk of disks.result) {
      if (!disk.used_for) continue;
      if (diskCountByPool.get(disk.used_for) !== 1) continue;
      if (volumeCountByPool.get(disk.used_for) !== 1) continue;
      const volume = volumes.find((v) => v.for_pool === disk.used_for);
      if (volume) volumeLabelByDiskName.set(disk.name, volume.label);
    }

    return {
      version: common.common.system_version,
      cpuModelName: common.hardware.cpu[0]?.model ?? "",
      cpuUtilization: cpuSample?.used_percent ?? 0,
      cpuTemp: cpuSample?.temp,
      memUsedInBytes: stats.mem.structure.used,
      memAvailableInBytes: stats.mem.structure.free,
      uptime: common.common.run_time,
      network: null,
      loadAverage: null,
      rebootRequired: false,
      availablePkgUpdates: 0,
      fileSystem: volumes.map((volume) => ({
        deviceName: volume.label,
        used: `${volume.used}`,
        available: `${volume.total - volume.used}`,
        percentage: volume.total > 0 ? (volume.used / volume.total) * 100 : 0,
      })),
      smart: disks.result.map((disk) => ({
        deviceName: volumeLabelByDiskName.get(disk.name) ?? `${disk.model} (${disk.serial})`,
        temperature: disk.temperature,
        overallStatus: disk.status === 1 ? "OK" : "UNKNOWN",
        healthy: disk.status === 1,
      })),
      gpu: [],
    };
  }

  private async getStatsAsync() {
    const response = await this.getAsync("/ugreen/v1/taskmgr/stat/get_all");
    return this.parseUgosResponse(ugosStatGetAllResponseSchema, response, "taskmgr/stat/get_all");
  }

  private async getDisksAsync() {
    // Note: unlike the other endpoints (v1), this one is under /v2/ -
    // an inconsistency observed in the UGOS API itself, not a typo.
    const response = await this.getAsync("/ugreen/v2/storage/disk/list");
    return this.parseUgosResponse(ugosDiskListResponseSchema, response, "storage/disk/list");
  }

  private async getVolumesAsync() {
    const response = await this.getAsync("/ugreen/v1/sysinfo/storage/info");
    return this.parseUgosResponse(ugosStorageInfoResponseSchema, response, "sysinfo/storage/info");
  }

  private async getCommonInfoAsync() {
    const response = await this.getAsync("/ugreen/v1/sysinfo/machine/common");
    return this.parseUgosResponse(ugosCommonInfoResponseSchema, response, "sysinfo/machine/common");
  }

  /**
   * Validates the UGOS application-level code (distinct from the HTTP
   * status): a transport-level 200 can still wrap an application error in
   * the body (same pattern already used by /verify/login, where code !== 200
   * means failure even with HTTP 200). Only code === 200 is considered
   * success.
   */
  private parseUgosResponse<TData>(
    schema: z.ZodType<{ code: number; msg: string; data: TData; time: number }>,
    response: unknown,
    endpointLabel: string,
  ): TData {
    const parsed = schema.parse(response);
    if (parsed.code !== 200) {
      throw new Error(`UGOS request to ${endpointLabel} failed: ${parsed.msg}`);
    }
    return parsed.data;
  }

  private async getAsync(
    path: `/${string}`,
    fetchAsync = fetchWithTrustedCertificatesAsync,
    isRetry = false,
  ): Promise<unknown> {
    const token = await this.loginAsync(fetchAsync);
    const url = this.url(path);
    url.searchParams.set("token", token);

    logger.debug("Sending UGOS request", { path, isRetry });

    const response = await fetchAsync(url);

    if (response.status === 401 && !isRetry) {
      // The cached token may have expired on the NAS side: invalidate it and
      // retry once with a fresh login. The isRetry flag prevents infinite
      // loops if the problem isn't actually the token (e.g. changed/revoked
      // credentials).
      this.cachedToken = undefined;
      return this.getAsync(path, fetchAsync, true);
    }

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return response.json();
  }

  /**
   * Retrieves the NAS's RSA public key.
   * UGOS returns it in the `x-rsa-token` response header (base64-encoded),
   * not in the JSON body - detail reconstructed from the official web UI's
   * JS bundle (function `ue$2` in main-*.js). The POST body still requires
   * the username being authenticated.
   */
  private async getRsaPublicKeyAsync(
    username: string,
    fetchAsync = fetchWithTrustedCertificatesAsync,
  ): Promise<string> {
    const url = this.url("/ugreen/v1/verify/check");
    const response = await fetchAsync(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const rsaToken = response.headers.get("x-rsa-token");
    if (!rsaToken) {
      throw new Error("UGOS did not return an x-rsa-token header");
    }

    const rawKey = Buffer.from(rsaToken, "base64").toString("utf-8");
    // Note: UGOS labels this key as "-----BEGIN RSA PUBLIC KEY-----"
    // (suggesting the legacy PKCS#1 format), but the ASN.1 bytes inside are
    // actually SPKI/X.509 (they contain the rsaEncryption OID, absent in a
    // pure PKCS#1) - verified by manually decoding the DER. It must
    // therefore always be re-wrapped with the generic SPKI label,
    // regardless of which label the server sends.
    const base64Body = rawKey
      .replace(/-----BEGIN [^-]+-----/, "")
      .replace(/-----END [^-]+-----/, "")
      .replace(/\s+/g, "");
    return `-----BEGIN PUBLIC KEY-----\n${base64Body}\n-----END PUBLIC KEY-----`;
  }

  /**
   * Encrypts the password with the NAS's RSA public key using PKCS1v1.5
   * padding (not OAEP) - same scheme used by the official web UI and by
   * ugos-cli (a reverse-engineered Rust client for UGOS).
   */
  private encryptPassword(publicKeyPem: string, password: string): string {
    const keyObject = createPublicKey(publicKeyPem);
    const encrypted = publicEncrypt(
      { key: keyObject, padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(password, "utf-8"),
    );
    return encrypted.toString("base64");
  }

  private async loginAsync(fetchAsync = fetchWithTrustedCertificatesAsync): Promise<string> {
    if (this.cachedToken) {
      return this.cachedToken;
    }

    this.loginPromise ??= this.performLoginAsync(fetchAsync).finally(() => {
      this.loginPromise = undefined;
    });

    return this.loginPromise;
  }

  private async performLoginAsync(fetchAsync: typeof fetchWithTrustedCertificatesAsync): Promise<string> {
    const username = this.getSecretValue("username");
    const plainPassword = this.getSecretValue("password");

    const publicKeyPem = await this.getRsaPublicKeyAsync(username, fetchAsync);
    const encryptedPassword = this.encryptPassword(publicKeyPem, plainPassword);

    const url = this.url("/ugreen/v1/verify/login");
    const response = await fetchAsync(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password: encryptedPassword,
        keepalive: false,
        otp: true,
        is_simple: true,
      }),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const json = await response.json();
    const parsed = ugosLoginResponseSchema.parse(json);

    if (parsed.code !== 200) {
      throw new Error(`UGOS login failed: ${parsed.msg}`);
    }

    this.cachedToken = parsed.data.token;
    return this.cachedToken;
  }
}
