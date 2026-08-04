import { createPublicKey, publicEncrypt, constants } from "node:crypto";

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
  // Token di sessione, ottenuto al login e riutilizzato tra chiamate.
  // Il login richiede due round-trip: prima /verify/check per ottenere la
  // chiave pubblica RSA (nell'header di risposta x-rsa-token, non nel body!),
  // poi /verify/login con la password cifrata RSA/PKCS1v1.5.
  private cachedToken: string | undefined;

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

    // Un volume UGOS può coprire più dischi fisici (es. JBOD/RAID), quindi
    // non esiste sempre una temperatura o uno stato SMART univoco da
    // associare al volume - stesso limite di TrueNAS/Unraid con i pool
    // ZFS/array multi-disco. Colleghiamo un disco al suo volume solo quando
    // il pool sottostante (used_for) è composto da un unico disco; altrimenti
    // Homarr mostra correttamente "N/A" per lo stato e nessuna temperatura.
    // Nota: questo endpoint elenca solo i dischi interni SATA/NVMe - i dischi
    // USB esterni non compaiono qui, quindi restano sempre senza corrispondenza.
    const diskCountByPool = new Map<string, number>();
    for (const disk of disks.result) {
      diskCountByPool.set(disk.used_for, (diskCountByPool.get(disk.used_for) ?? 0) + 1);
    }
    const volumeLabelByDiskName = new Map<string, string>();
    for (const disk of disks.result) {
      if (diskCountByPool.get(disk.used_for) !== 1) continue;
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
        percentage: (volume.used / volume.total) * 100,
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
    return ugosStatGetAllResponseSchema.parse(response).data;
  }

  private async getDisksAsync() {
    // Nota: a differenza degli altri endpoint (v1), questo è sotto /v2/ -
    // incoerenza osservata nell'API UGOS stessa, non un errore di battitura.
    const response = await this.getAsync("/ugreen/v2/storage/disk/list");
    return ugosDiskListResponseSchema.parse(response).data;
  }

  private async getVolumesAsync() {
    const response = await this.getAsync("/ugreen/v1/sysinfo/storage/info");
    return ugosStorageInfoResponseSchema.parse(response).data;
  }

  private async getCommonInfoAsync() {
    const response = await this.getAsync("/ugreen/v1/sysinfo/machine/common");
    return ugosCommonInfoResponseSchema.parse(response).data;
  }

  private async getAsync(path: `/${string}`, fetchAsync = fetchWithTrustedCertificatesAsync): Promise<unknown> {
    const token = await this.loginAsync(fetchAsync);
    const url = this.url(path);
    url.searchParams.set("token", token);

    logger.debug("Sending UGOS request", { url: url.toString() });

    const response = await fetchAsync(url);
    if (!response.ok) {
      throw new ResponseError(response);
    }

    return response.json();
  }

  /**
   * Recupera la chiave pubblica RSA del NAS.
   * UGOS la restituisce nell'header di risposta `x-rsa-token` (codificata in
   * base64), non nel body JSON - dettaglio ricostruito dal bundle JS ufficiale
   * della web UI (funzione `ue$2` in main-*.js). Il body della POST richiede
   * comunque lo username per cui si vuole autenticare.
   */
  private async getRsaPublicKeyAsync(username: string, fetchAsync = fetchWithTrustedCertificatesAsync): Promise<string> {
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
    // Nota: UGOS etichetta questa chiave come "-----BEGIN RSA PUBLIC KEY-----"
    // (suggerendo il formato legacy PKCS#1), ma i byte ASN.1 al suo interno
    // sono in realtà SPKI/X.509 (contengono l'OID rsaEncryption, assente in
    // un PKCS#1 puro) - verificato decodificando manualmente il DER. Va quindi
    // sempre re-incapsulata con l'etichetta generica SPKI, indipendentemente
    // da quale etichetta arrivi dal server.
    const base64Body = rawKey
      .replace(/-----BEGIN [^-]+-----/, "")
      .replace(/-----END [^-]+-----/, "")
      .replace(/\s+/g, "");
    return `-----BEGIN PUBLIC KEY-----\n${base64Body}\n-----END PUBLIC KEY-----`;
  }

  /**
   * Cifra la password con la chiave pubblica RSA del NAS usando padding
   * PKCS1v1.5 (non OAEP) - stesso schema usato dalla web UI ufficiale e da
   * ugos-cli (client Rust reverse-engineered per UGOS).
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
