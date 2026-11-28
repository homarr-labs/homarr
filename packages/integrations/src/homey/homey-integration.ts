import type { z } from "zod/v4";
import { ParseError, ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync, getHttpRequestSignal } from "@homarr/core/infrastructure/http";
import { ImageProxy } from "@homarr/image-proxy";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import { SmartHomeActionNotSupportedError, SmartHomeEntityNotFoundError } from "../homeassistant/homeassistant-errors";
import type { IntegrationHttpAuthentication } from "../http-auth";
import { supportsSmartHomeAction } from "../interfaces/smart-home/smart-home-capabilities";
import { bucketHistory } from "../interfaces/smart-home/smart-home-history";
import type {
  ISmartHomeCameraStreamIntegration,
  ISmartHomeCameraWebRtcIntegration,
  ISmartHomeIntegration,
} from "../interfaces/smart-home/smart-home-integration";
import { untilAborted } from "../interfaces/smart-home/smart-home-integration";
import type {
  SmartHomeAction,
  SmartHomeArea,
  SmartHomeCameraStream,
  SmartHomeCatalog,
  SmartHomeWebRtcMessage,
  SmartHomeCatalogDevice,
  SmartHomeEntity,
  SmartHomeEntityPatch,
  SmartHomeEntitySelection,
  SmartHomeForecastDay,
  SmartHomeHistorySeries,
  SmartHomeSnapshot,
} from "../interfaces/smart-home/smart-home-types";
import { SMART_HOME_ENTITY_LIMIT, SmartHomeSelectionLimitError } from "../interfaces/smart-home/smart-home-types";
import type { HomeyEntityRecord } from "./homey-normalize";
import {
  fromHvacMode,
  getHomeyFanSpeedCapability,
  isFractionPercent,
  kelvinToHomeyTemperature,
  normalizeHomeyDevices,
  normalizeHomeyFlows,
  normalizeHomeyZones,
  rgbToHueSaturation,
  supportsHomeyCoverMotion,
  toHomeyFanSpeed,
} from "./homey-normalize";
import type { HomeyDevice, HomeyFlow } from "./homey-types";
import {
  homeyDevicesSchema,
  homeyEnergyDaySchema,
  homeyEnergyLiveSchema,
  homeyFlowsSchema,
  homeyInsightsEntriesSchema,
  homeySystemSchema,
  homeyZonesSchema,
} from "./homey-types";

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_FAILURES = 3;

const insightResolutions = [
  { hours: 1, resolution: "lastHour" },
  { hours: 6, resolution: "last6Hours" },
  { hours: 24, resolution: "last24Hours" },
  { hours: 24 * 7, resolution: "last7Days" },
  { hours: 24 * 14, resolution: "last14Days" },
  { hours: 24 * 31, resolution: "last31Days" },
] as const;

// Energy-monitored devices log their power reading as energy_power instead of measure_power.
const insightLogIds = (capabilityId: string) =>
  capabilityId === "measure_power" ? [capabilityId, "energy_power"] : [capabilityId];

interface CapabilityWrite {
  capabilityId: string;
  value: string | number | boolean;
}

export class HomeyIntegration
  extends Integration
  implements ISmartHomeIntegration, ISmartHomeCameraStreamIntegration, ISmartHomeCameraWebRtcIntegration
{
  public async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    return { headers: this.getAuthHeaders() };
  }

  public async getStatsAsync() {
    const [devices, flows, energy, system] = await Promise.all([
      this.getDevicesAsync(),
      this.getFlowsAsync(),
      this.getEnergyAsync(),
      this.getSystemAsync(),
    ]);
    const lights = normalizeHomeyDevices(devices).filter(({ entity }) => entity.domain === "light");
    const available = devices.filter((device) => device.available !== false);
    return {
      devices: devices.length,
      unavailable: devices.length - available.length,
      lightsOn: lights.filter(({ entity }) => entity.state === "on").length,
      flows: flows.length,
      ...energy,
      batteriesLow: available.filter((device) => {
        const level = capabilityValue(device, "measure_battery");
        return (
          capabilityValue(device, "alarm_battery") === true ||
          (typeof level === "number" && level < LOW_BATTERY_PERCENT)
        );
      }).length,
      openContacts: available.filter((device) => capabilityValue(device, "alarm_contact") === true).length,
      activeAlarms: available.filter(hasActiveAlarm).length,
      ...system,
    };
  }

  public async getSnapshotAsync(selection: SmartHomeEntitySelection): Promise<SmartHomeSnapshot> {
    const [records, areas] = await Promise.all([this.getRecordsAsync(), this.getAreasAsync()]);
    const entities = await Promise.all(
      selectRecords(records, selection).map((record) => this.withPictureAsync(record)),
    );
    const usedAreas = new Set([...entities.map((entity) => entity.areaId), ...(selection.areaIds ?? [])]);
    return { entities, areas: areas.filter((area) => usedAreas.has(area.id)), updatedAt: Date.now() };
  }

  public async getCatalogAsync(): Promise<SmartHomeCatalog> {
    const [records, areas] = await Promise.all([this.getRecordsAsync(), this.getAreasAsync()]);
    return {
      entities: records
        .map(({ entity, hidden }) => ({
          id: entity.id,
          domain: entity.domain,
          name: entity.name,
          areaId: entity.areaId,
          deviceId: entity.device?.id ?? null,
          icon: entity.icon,
          deviceClass: entity.deviceClass,
          hidden,
        }))
        .toSorted((left, right) => left.name.localeCompare(right.name)),
      devices: toCatalogDevices(records),
      areas,
      floors: [],
    };
  }

  public async getHistoryAsync(entityIds: string[], hours: number, samples: number): Promise<SmartHomeHistorySeries[]> {
    if (entityIds.length === 0) return [];
    const records = new Map((await this.getRecordsAsync()).map((record) => [record.entity.id, record]));
    const resolution = insightResolutions.find((candidate) => candidate.hours >= hours)?.resolution ?? "last31Days";
    const end = Date.now();
    const start = end - hours * 3_600_000;

    return await Promise.all(
      entityIds.map(async (entityId) => {
        const target = records.get(entityId)?.target;
        if (target?.kind !== "capability") return { entityId, points: [] };
        const ownerUri = `homey:device:${target.device.id}`;
        let entries: z.infer<typeof homeyInsightsEntriesSchema> | null = null;
        for (const logId of insightLogIds(target.capabilityId)) {
          const response = await this.getAsync(`/api/manager/insights/log/${ownerUri}/${ownerUri}:${logId}/entry`, {
            resolution,
          });
          if (!response.ok) continue;
          const parsed = homeyInsightsEntriesSchema.safeParse(await response.json());
          if (parsed.success) {
            entries = parsed.data;
            break;
          }
        }
        if (!entries) return { entityId, points: [] };
        const homeyCapability = target.device.capabilitiesObj?.[target.capabilityId];
        const scale = homeyCapability?.setable && isFractionPercent(homeyCapability) ? 100 : 1;
        const observations = entries.values
          .map((entry) => ({
            state: typeof entry.v === "number" ? (entry.v * scale).toString() : "",
            time: Date.parse(entry.t),
          }))
          .toSorted((left, right) => left.time - right.time);
        // Coarse Insights resolutions return entries before the window; only the latest of them is still current.
        const latestBeforeStart = observations.findLast((observation) => observation.time < start);
        const inWindow = observations.filter((observation) => observation.time >= start);
        return {
          entityId,
          points: bucketHistory(latestBeforeStart ? [latestBeforeStart, ...inWindow] : inWindow, {
            start,
            end,
            samples,
          }),
        };
      }),
    );
  }

  /**
   * A camera's snapshot or a speaker's album art goes through Homarr's image proxy, which adds the token; the browser
   * never sees it.
   */
  private async withPictureAsync(record: HomeyEntityRecord): Promise<SmartHomeEntity> {
    const { entity } = record;
    const picture = entity.state === "unavailable" ? null : getRecordPicture(record);
    if (!picture) return entity;
    // A picture that cannot be read (a malformed address included) drops only itself, never the snapshot.
    const pictureUrl = await Promise.resolve()
      .then(() => {
        const source = new URL(picture.url, this.integration.url);
        // A new picture gets a new address, so the proxy's cache never serves an old snapshot.
        source.searchParams.set("homarr", picture.version);
        // The Homey token only goes to Homey: a picture hosted elsewhere is fetched without it.
        const ownOrigin = source.origin === new URL(this.integration.url).origin;
        return new ImageProxy().createImageAsync(source.toString(), ownOrigin ? this.getAuthHeaders() : undefined);
      })
      .catch(() => undefined);
    return pictureUrl ? { ...entity, attributes: { ...entity.attributes, pictureUrl } } : entity;
  }

  /** Homey's cameras stream over WebRTC only; there is no HLS to fall back to. */
  public async getCameraStreamAsync(entityId: string, prefer?: "hls"): Promise<SmartHomeCameraStream | null> {
    if (prefer === "hls") return null;
    const record = (await this.getRecordsAsync()).find((candidate) => candidate.entity.id === entityId);
    if (record?.target.kind !== "camera" || !record.target.videoId) return null;
    return { kind: "webrtc" };
  }

  /**
   * Homey answers the offer in one go, with its candidates in the answer. The media then flows between the browser
   * and Homey directly; the session only ends from the browser's side.
   */
  public async openCameraWebRtcSessionAsync(
    entityId: string,
    offerSdp: string,
    onMessage: (message: SmartHomeWebRtcMessage) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const answer = await this.exchangeCameraOfferAsync(entityId, offerSdp, signal);
    onMessage({ type: "answer", sdp: answer });
    await untilAborted(signal);
  }

  /** Passes the browser's WebRTC offer to Homey's video manager and returns the camera's answer. */
  private async exchangeCameraOfferAsync(entityId: string, offerSdp: string, signal: AbortSignal): Promise<string> {
    const record = (await this.getRecordsAsync(signal)).find((candidate) => candidate.entity.id === entityId);
    // A browser that left during the lookup opens no video session on Homey.
    signal.throwIfAborted();
    if (record?.target.kind !== "camera" || !record.target.videoId) throw new SmartHomeEntityNotFoundError(entityId);
    const response = await fetchWithTrustedCertificatesAsync(
      this.url(`/api/manager/videos/video/${encodeURIComponent(record.target.videoId)}/offer`),
      {
        method: "POST",
        headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ offer: offerSdp }),
        signal,
      },
    );
    if (!response.ok) throw new ResponseError(response);
    const answer = readAnswerSdp(await response.json());
    if (!answer) throw new ParseError("Homey answered the video offer without an answer SDP");
    return answer;
  }

  public getForecastAsync(): Promise<SmartHomeForecastDay[]> {
    return Promise.resolve([]);
  }

  public async executeActionAsync(entityId: string, action: SmartHomeAction): Promise<void> {
    const record = (await this.getRecordsAsync()).find((candidate) => candidate.entity.id === entityId);
    if (!record) throw new SmartHomeEntityNotFoundError(entityId);
    if (!supportsSmartHomeAction(record.entity, action)) {
      throw new SmartHomeActionNotSupportedError(entityId, action.type);
    }

    const { target } = record;
    if (target.kind === "flow") {
      await this.executeFlowActionAsync(entityId, target.flow, action);
      return;
    }

    const writes = toCapabilityWrites(record, action);
    if (!writes) throw new SmartHomeActionNotSupportedError(entityId, action.type);
    for (const write of writes) {
      await this.setCapabilityAsync(target.device.id, write);
    }
  }

  public async subscribeEntitiesAsync(
    selection: SmartHomeEntitySelection,
    onPatch: (patch: SmartHomeEntityPatch) => void,
    signal: AbortSignal,
  ): Promise<void> {
    let previous: Map<string, string> | null = null;
    let previousAreas: string | null = null;
    let failures = 0;
    while (!signal.aborted) {
      try {
        const snapshot = await this.getSnapshotAsync(selection);
        failures = 0;
        if (signal.aborted) return;
        const current = new Map(snapshot.entities.map((entity) => [entity.id, signature(entity)]));
        const changed = previous
          ? snapshot.entities.filter((entity) => previous?.get(entity.id) !== current.get(entity.id))
          : snapshot.entities;
        const removed = previous ? [...previous.keys()].filter((id) => !current.has(id)) : [];
        const areas = JSON.stringify(snapshot.areas);
        const areasChanged = areas !== previousAreas;
        if (!previous || changed.length > 0 || removed.length > 0 || areasChanged) {
          onPatch({ changed, removed, areas: areasChanged ? snapshot.areas : undefined });
        }
        previous = current;
        previousAreas = areas;
      } catch (error) {
        if (error instanceof SmartHomeSelectionLimitError || ++failures >= MAX_POLL_FAILURES) throw error;
      }
      await waitAsync(POLL_INTERVAL_MS, signal);
    }
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/api/manager/devices/device/"), {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) return TestConnectionError.StatusResult(response);

    const devices = homeyDevicesSchema.safeParse(await response.json());
    if (!devices.success) return TestConnectionError.ParseResult(new ParseError("Expected Homey devices"));
    return { success: true };
  }

  /** Energy needs its own API key permission; without it these statistics stay empty. */
  private async getEnergyAsync() {
    const now = new Date();
    const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
      .map((part) => part.toString().padStart(2, "0"))
      .join("-");
    const [liveData, dayData] = await Promise.all([
      this.getOptionalJsonAsync("/api/manager/energy/live"),
      this.getOptionalJsonAsync("/api/manager/energy/report/day", { date }),
    ]);
    const live = homeyEnergyLiveSchema.safeParse(liveData);
    const day = homeyEnergyDaySchema.safeParse(dayData);
    return {
      powerUsage: (live?.success ? live.data.totalConsumed?.W : null) ?? null,
      powerGenerated: (live?.success ? live.data.totalGenerated?.W : null) ?? null,
      energyToday: (day?.success ? day.data.electricity?.consumedPeriod : null) ?? null,
      energyGeneratedToday: (day?.success ? day.data.electricity?.generatedPeriod : null) ?? null,
    };
  }

  /** System information needs its own API key permission; without it these statistics stay empty. */
  private async getSystemAsync() {
    const parsed = homeySystemSchema.safeParse(await this.getOptionalJsonAsync("/api/manager/system/"));
    const system = parsed?.success ? parsed.data : null;
    const cores = system?.cpus?.length ?? 0;
    const load = system?.loadavg?.[0];
    const { totalmem: total, freemem: free } = system ?? {};
    return {
      uptime: typeof system?.uptime === "number" ? formatUptime(system.uptime) : null,
      cpuLoad: typeof load === "number" && cores > 0 ? Math.round((load / cores) * 1000) / 10 : null,
      memoryUsage:
        typeof total === "number" && typeof free === "number" && total > 0
          ? Math.round(((total - free) / total) * 1000) / 10
          : null,
      temperature: system?.videoCoreTemperature ?? null,
      version: system?.homeyVersion ?? null,
    };
  }

  private async getRecordsAsync(signal?: AbortSignal): Promise<HomeyEntityRecord[]> {
    const [devices, flows] = await Promise.all([this.getDevicesAsync(signal), this.getFlowsAsync(signal)]);
    return [...normalizeHomeyDevices(devices), ...normalizeHomeyFlows(flows)];
  }

  private async getDevicesAsync(signal?: AbortSignal): Promise<HomeyDevice[]> {
    return Object.values(homeyDevicesSchema.parse(await this.getJsonAsync("/api/manager/devices/device/", signal)));
  }

  private async getAreasAsync(): Promise<SmartHomeArea[]> {
    const zones = homeyZonesSchema.parse(await this.getJsonAsync("/api/manager/zones/zone/"));
    return normalizeHomeyZones(Object.values(zones));
  }

  /** Flows are optional: API keys without the flow scope still expose devices. */
  private async getFlowsAsync(signal?: AbortSignal): Promise<HomeyFlow[]> {
    const load = async (path: "/api/manager/flow/flow/" | "/api/manager/flow/advancedflow/", advanced: boolean) => {
      const flows = homeyFlowsSchema.safeParse(await this.getOptionalJsonAsync(path, undefined, signal));
      if (!flows.success) return [];
      return Object.values(flows.data).map((flow) => ({ ...flow, advanced }));
    };
    const [flows, advancedFlows] = await Promise.all([
      load("/api/manager/flow/flow/", false),
      load("/api/manager/flow/advancedflow/", true),
    ]);
    return [...flows, ...advancedFlows];
  }

  private async executeFlowActionAsync(entityId: string, flow: HomeyFlow, action: SmartHomeAction) {
    const path = `/api/manager/flow/${flow.advanced ? "advancedflow" : "flow"}/${encodeURIComponent(flow.id)}` as const;
    if (action.type === "trigger") {
      await this.sendAsync("POST", `${path}/trigger`, {});
      return;
    }
    const enabled = flow.enabled !== false;
    let next: boolean | undefined;
    if (action.type === "toggle") next = !enabled;
    else if (action.type === "turnOn") next = true;
    else if (action.type === "turnOff") next = false;
    if (next === undefined) throw new SmartHomeActionNotSupportedError(entityId, action.type);
    await this.sendAsync("PUT", path, { enabled: next });
  }

  private async setCapabilityAsync(deviceId: string, { capabilityId, value }: CapabilityWrite) {
    await this.sendAsync(
      "PUT",
      `/api/manager/devices/device/${encodeURIComponent(deviceId)}/capability/${encodeURIComponent(capabilityId)}`,
      { value },
    );
  }

  private async getOptionalJsonAsync(
    path: `/api/${string}`,
    queryParams?: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<unknown> {
    try {
      const response = await this.getAsync(path, queryParams, signal);
      return response.ok ? await response.json() : null;
    } catch (error) {
      getHttpRequestSignal()?.throwIfAborted();
      signal?.throwIfAborted();
      if (error instanceof Error && error.name === "AbortError") throw error;
      return null;
    }
  }

  private async getJsonAsync(path: `/api/${string}`, signal?: AbortSignal): Promise<unknown> {
    const response = await this.getAsync(path, undefined, signal);
    if (!response.ok) throw new ResponseError(response);
    return await response.json();
  }

  private async getAsync(path: `/api/${string}`, queryParams?: Record<string, string>, signal?: AbortSignal) {
    return await fetchWithTrustedCertificatesAsync(this.url(path, queryParams), {
      headers: this.getAuthHeaders(),
      ...(signal ? { signal } : {}),
    });
  }

  private async sendAsync(method: "POST" | "PUT", path: `/api/${string}`, body: unknown) {
    const response = await fetchWithTrustedCertificatesAsync(this.url(path), {
      method,
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new ResponseError(response);
  }

  private getAuthHeaders() {
    return { Authorization: `Bearer ${this.getSecretValue("apiKey")}` };
  }
}

/**
 * The picture an entity shows: a camera's snapshot, or the album art of what a speaker plays. Album art keeps its
 * address while the track changes, so the track is part of its version.
 */
const getRecordPicture = ({ target, entity }: HomeyEntityRecord): { url: string; version: string } | null => {
  if (target.kind === "camera") {
    return target.imageUrl ? { url: target.imageUrl, version: String(target.imageUpdated) } : null;
  }
  if (target.kind !== "device" || entity.domain !== "media_player") return null;
  const art = target.device.images?.find((image) => image.type === "media" && image.imageObj?.url)?.imageObj;
  if (!art?.url) return null;
  const capabilities = target.device.capabilitiesObj ?? {};
  // A speaker without a track has no art; Homey answers its image with an error.
  const track = capabilities.speaker_track?.value;
  if (typeof track !== "string" || track === "") return null;
  return { url: art.url, version: `${art.lastUpdated ?? 0}-${track}-${String(capabilities.speaker_album?.value)}` };
};

/** The answer SDP from Homey's offer response, whichever of the usual shapes it comes in. */
const readAnswerSdp = (body: unknown): string | null => {
  if (typeof body === "string") return body;
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  for (const key of ["answerSdp", "answer", "sdp"]) {
    const value = record[key];
    if (typeof value === "string" && value.includes("v=0")) return value;
    if (typeof value === "object" && value !== null && typeof (value as { sdp?: unknown }).sdp === "string") {
      return (value as { sdp: string }).sdp;
    }
  }
  return null;
};

const LOW_BATTERY_PERCENT = 20;

const capabilityValue = (device: HomeyDevice, id: string) => device.capabilitiesObj?.[id]?.value;

/** Battery and contact alarms have their own statistics. */
const hasActiveAlarm = (device: HomeyDevice) =>
  Object.values(device.capabilitiesObj ?? {}).some(
    (capability) =>
      capability.id.startsWith("alarm_") &&
      !capability.id.startsWith("alarm_battery") &&
      !capability.id.startsWith("alarm_contact") &&
      capability.value === true,
  );

const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const signature = (entity: SmartHomeEntity) =>
  JSON.stringify([entity.state, entity.name, entity.areaId, entity.lastChanged, entity.attributes]);

const waitAsync = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timeout = setTimeout(done, ms);
    function done() {
      clearTimeout(timeout);
      signal.removeEventListener("abort", done);
      resolve();
    }
    signal.addEventListener("abort", done, { once: true });
  });

const toCatalogDevices = (records: HomeyEntityRecord[]): SmartHomeCatalogDevice[] => {
  const devices = new Map<string, SmartHomeCatalogDevice>();
  for (const { entity, hidden } of records) {
    if (hidden || !entity.device || devices.has(entity.device.id)) continue;
    devices.set(entity.device.id, { id: entity.device.id, name: entity.device.name, areaId: entity.areaId });
  }
  return [...devices.values()].toSorted((left, right) => left.name.localeCompare(right.name));
};

const selectRecords = (records: HomeyEntityRecord[], selection: SmartHomeEntitySelection) => {
  const byId = new Map(records.map((record) => [record.entity.id, record]));
  const requested = selection.entityIds ?? [];
  const explicit = requested.flatMap((id) => byId.get(id) ?? []);
  const domains = selection.domains && selection.domains.length > 0 ? new Set(selection.domains) : null;
  const areaIds = selection.areaIds && selection.areaIds.length > 0 ? new Set(selection.areaIds) : null;
  const deviceIds = selection.deviceIds && selection.deviceIds.length > 0 ? new Set(selection.deviceIds) : null;
  const excludedIds = new Set(selection.excludedEntityIds ?? []);
  const includeAll = requested.length === 0 && !areaIds && !deviceIds;

  const implicit = records.filter(({ entity, hidden }) => {
    if (hidden || excludedIds.has(entity.id)) return false;
    if (deviceIds && entity.device && deviceIds.has(entity.device.id)) return true;
    if (domains && !domains.has(entity.domain)) return false;
    if (areaIds) return entity.areaId !== null && areaIds.has(entity.areaId);
    return includeAll;
  });

  const selected = [...new Set([...explicit, ...implicit])];
  if (selected.length > SMART_HOME_ENTITY_LIMIT) throw new SmartHomeSelectionLimitError(selected.length);
  return selected;
};

const capability = (device: HomeyDevice, id: string) => device.capabilitiesObj?.[id];
const settable = (device: HomeyDevice, id: string) => capability(device, id)?.setable === true;

const toCapabilityWrites = (record: HomeyEntityRecord, action: SmartHomeAction): CapabilityWrite[] | null => {
  const { target, entity } = record;
  if (target.kind === "capability") return toSecondaryWrites(entity, target.device, target.capabilityId, action);
  if (target.kind !== "device") return null;
  const { device } = target;
  const has = (id: string) => settable(device, id);
  const write = (capabilityId: string, value: CapabilityWrite["value"]): CapabilityWrite[] | null =>
    has(capabilityId) ? [{ capabilityId, value }] : null;
  const power = (on: boolean) => write("onoff", on);
  const isOn = entity.state !== "off";

  switch (target.role) {
    case "light":
      switch (action.type) {
        case "toggle":
          return power(!isOn) ?? write("dim", isOn ? 0 : 1);
        case "turnOn":
          return power(true) ?? write("dim", 1);
        case "turnOff":
          return power(false) ?? write("dim", 0);
        case "setBrightness":
          if (action.value <= 0) return power(false) ?? write("dim", 0);
          return write("dim", Math.min(100, action.value) / 100);
        case "setColorTemp": {
          const writes = write("light_temperature", kelvinToHomeyTemperature(action.value));
          return writes && [...(write("light_mode", "temperature") ?? []), ...writes];
        }
        case "setRgbColor": {
          const { hue, saturation } = rgbToHueSaturation(action.value);
          if (!has("light_hue") || !has("light_saturation")) return null;
          return [
            ...(write("light_mode", "color") ?? []),
            { capabilityId: "light_hue", value: hue },
            { capabilityId: "light_saturation", value: saturation },
          ];
        }
        default:
          return null;
      }
    case "switch":
    case "fan":
      switch (action.type) {
        case "toggle":
          return power(!isOn);
        case "turnOn":
          return power(true);
        case "turnOff":
          return power(false);
        case "setFanPercentage": {
          if (action.value <= 0) return power(false);
          const speed = getHomeyFanSpeedCapability(device.capabilitiesObj ?? {});
          if (!speed) return null;
          return [
            ...(isOn ? [] : (power(true) ?? [])),
            { capabilityId: speed.id, value: toHomeyFanSpeed(speed, action.value) },
          ];
        }
        case "setOscillating":
          return write("oscillating", action.value);
        default:
          return null;
      }
    case "cover":
      return toCoverWrites(device, entity, action);
    case "lock":
      if (action.type === "lock") return write("locked", true);
      if (action.type === "unlock") return write("locked", false);
      if (action.type === "toggle") return write("locked", entity.state !== "locked");
      return null;
    case "climate":
      return toClimateWrites(device, entity, action);
    case "media_player":
      return toMediaWrites(device, entity, action);
    case "vacuum": {
      const vacuum = (state: string, fallback: boolean | null) =>
        write("vacuumcleaner_state", state) ?? (fallback === null ? null : power(fallback));
      if (action.type === "vacuumStart") return vacuum("cleaning", true);
      if (action.type === "vacuumPause") return vacuum("stopped", false);
      if (action.type === "vacuumReturn") return vacuum("docked", null);
      if (action.type === "toggle")
        return entity.state === "cleaning" ? vacuum("stopped", false) : vacuum("cleaning", true);
      return null;
    }
    case "button":
      return action.type === "trigger" || action.type === "toggle" ? write("button", true) : null;
    case "humidifier":
      if (action.type === "toggle") return power(!isOn);
      if (action.type === "turnOn") return power(true);
      if (action.type === "turnOff") return power(false);
      if (action.type === "setHumidity") return write("target_humidity", action.value / 100);
      return null;
    case "water_heater":
      if (action.type === "setTemperature") return write("target_temperature", action.value);
      if (action.type === "setMode") return write("heater_operation_mode", action.value);
      if (action.type === "toggle") return power(!isOn);
      if (action.type === "turnOn") return power(true);
      if (action.type === "turnOff") return power(false);
      return null;
    case "alarm":
      if (action.type === "alarmDisarm") return write("homealarm_state", "disarmed");
      if (action.type === "alarmArm")
        return write("homealarm_state", action.mode === "away" ? "armed" : "partially_armed");
      return null;
    case "valve": {
      const open = (value: boolean) => power(value) ?? write("valve_position", value ? 1 : 0);
      if (action.type === "open") return open(true);
      if (action.type === "close") return open(false);
      if (action.type === "toggle") return open(entity.state === "closed");
      if (action.type === "setPosition") return write("valve_position", action.value / 100);
      return null;
    }
  }
};

const toSecondaryWrites = (
  entity: SmartHomeEntity,
  device: HomeyDevice,
  capabilityId: string,
  action: SmartHomeAction,
): CapabilityWrite[] | null => {
  const write = (value: CapabilityWrite["value"]) => [{ capabilityId, value }];
  switch (entity.domain) {
    case "switch":
      if (action.type === "toggle") return write(entity.state !== "on");
      if (action.type === "turnOn") return write(true);
      if (action.type === "turnOff") return write(false);
      return null;
    case "button":
      return action.type === "trigger" || action.type === "toggle" ? write(true) : null;
    case "select":
      if (action.type !== "selectOption" || entity.attributes.options?.includes(action.value) !== true) return null;
      return write(action.value);
    case "number": {
      if (action.type !== "setValue") return null;
      const { min, max } = entity.attributes;
      if ((min !== undefined && action.value < min) || (max !== undefined && action.value > max)) return null;
      const homeyCapability = capability(device, capabilityId);
      return write(homeyCapability && isFractionPercent(homeyCapability) ? action.value / 100 : action.value);
    }
    default:
      return null;
  }
};

const toCoverWrites = (device: HomeyDevice, entity: SmartHomeEntity, action: SmartHomeAction) => {
  const motion = capability(device, "windowcoverings_state");
  const move = (open: boolean): CapabilityWrite[] | null => {
    if (settable(device, "garagedoor_closed")) return [{ capabilityId: "garagedoor_closed", value: !open }];
    const direction = open ? "up" : "down";
    if (supportsHomeyCoverMotion(motion, direction))
      return [{ capabilityId: "windowcoverings_state", value: direction }];
    if (settable(device, "windowcoverings_closed")) return [{ capabilityId: "windowcoverings_closed", value: !open }];
    if (settable(device, "windowcoverings_set")) return [{ capabilityId: "windowcoverings_set", value: open ? 1 : 0 }];
    return null;
  };
  switch (action.type) {
    case "open":
      return move(true);
    case "close":
      return move(false);
    case "toggle":
      return move(entity.state === "closed");
    case "stop":
      return supportsHomeyCoverMotion(motion, "idle")
        ? [{ capabilityId: "windowcoverings_state", value: "idle" }]
        : null;
    case "setPosition":
      return [{ capabilityId: "windowcoverings_set", value: action.value / 100 }];
    case "setTiltPosition":
      return [{ capabilityId: "windowcoverings_tilt_set", value: action.value / 100 }];
    default:
      return null;
  }
};

const toClimateWrites = (device: HomeyDevice, entity: SmartHomeEntity, action: SmartHomeAction) => {
  const modes = capability(device, "thermostat_mode")?.values?.map((mode) => mode.id) ?? [];
  const setMode = (mode: string): CapabilityWrite[] | null => {
    const homeyMode = fromHvacMode(mode);
    const canPower = settable(device, "onoff");
    if (mode === "off") {
      if (canPower) return [{ capabilityId: "onoff", value: false }];
      return modes.includes("off") ? [{ capabilityId: "thermostat_mode", value: "off" }] : null;
    }
    const writes: CapabilityWrite[] = [];
    if (canPower && entity.state === "off") writes.push({ capabilityId: "onoff", value: true });
    if (settable(device, "thermostat_mode") && modes.includes(homeyMode)) {
      writes.push({ capabilityId: "thermostat_mode", value: homeyMode });
    }
    return writes.length > 0 ? writes : null;
  };

  switch (action.type) {
    case "setTemperature":
      return settable(device, "target_temperature")
        ? [{ capabilityId: "target_temperature", value: action.value }]
        : null;
    case "setHvacMode":
      return setMode(action.value);
    case "toggle": {
      if (entity.state !== "off") return setMode("off");
      const mode = entity.attributes.hvacModes?.find((candidate) => candidate !== "off");
      return mode ? setMode(mode) : null;
    }
    case "turnOn":
    case "turnOff":
      return settable(device, "onoff") ? [{ capabilityId: "onoff", value: action.type === "turnOn" }] : null;
    case "setTemperatureRange":
      return settable(device, "target_temperature_min") && settable(device, "target_temperature_max")
        ? [
            { capabilityId: "target_temperature_min", value: action.low },
            { capabilityId: "target_temperature_max", value: action.high },
          ]
        : null;
    case "setHumidity":
      return settable(device, "target_humidity")
        ? [{ capabilityId: "target_humidity", value: action.value / 100 }]
        : null;
    case "setFanMode": {
      if (!entity.attributes.fanModes?.includes(action.value)) return null;
      const fanCapability = settable(device, "thermostat_fan_speed") ? "thermostat_fan_speed" : "fan_mode";
      return [{ capabilityId: fanCapability, value: action.value }];
    }
    default:
      return null;
  }
};

const toMediaWrites = (device: HomeyDevice, entity: SmartHomeEntity, action: SmartHomeAction) => {
  const write = (capabilityId: string, value: CapabilityWrite["value"]): CapabilityWrite[] | null =>
    settable(device, capabilityId) ? [{ capabilityId, value }] : null;
  switch (action.type) {
    case "mediaPlayPause":
      return write("speaker_playing", entity.state !== "playing");
    case "mediaPlay":
      return write("speaker_playing", true);
    case "mediaPause":
      return write("speaker_playing", false);
    case "mediaNext":
      return write("speaker_next", true);
    case "mediaPrevious":
      return write("speaker_prev", true);
    case "setVolume":
      return write("volume_set", action.value);
    case "setMuted":
      return write("volume_mute", action.value);
    case "selectSource":
      return write("media_input", action.value);
    case "turnOn":
      return write("onoff", true);
    case "turnOff":
      return write("onoff", false);
    case "toggle":
      if (settable(device, "onoff")) return write("onoff", entity.state === "off");
      return write("speaker_playing", entity.state !== "playing");
    default:
      return null;
  }
};
