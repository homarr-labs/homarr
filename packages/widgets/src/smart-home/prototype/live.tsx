"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { clientApi } from "@homarr/api/client";
import { applySmartHomeAction, supportsSmartHomeAction } from "@homarr/integrations/types";
import type {
  SmartHomeArea,
  SmartHomeEntity,
  SmartHomeEntityAttributes,
  SmartHomeEntitySelection,
  SmartHomeHistorySeries,
  SmartHomeSnapshot,
} from "@homarr/integrations/types";
import { showErrorNotification, showWarningNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import { toSmartHomeActionInput, useSmartHomeSnapshot } from "../_shared/use-smart-home";
import { parseBlockId } from "./configuration";
import { registerAreas } from "./semantics";
import { PrototypeSourceProvider } from "./store";
import type { PrototypeEntityMap, PrototypeEntitySource } from "./store";
import { toPrototypeDomain } from "./types";
import type { HaAction, HaArea, HaAttributes, HaEntity, PrototypeActionResult, PrototypeEntityError } from "./types";

const SETTLE_TIMEOUT_MS = 8_000;
const HISTORY_LIMIT = 20;
const ENTITY_ID_PATTERN = /^[a-z0-9_]+\.[a-z0-9_]+$/;

const toImageAttributes = (domain: string, pictureUrl: string | undefined): Partial<HaAttributes> => {
  if (!pictureUrl) return {};
  if (domain === "camera") return { snapshotUrl: pictureUrl };
  if (domain === "media_player") return { artworkUrl: pictureUrl };
  return { pictureUrl };
};

const toAttributes = (domain: string, attributes: SmartHomeEntityAttributes): HaAttributes => ({
  supportedFeatures: attributes.supportedFeatures,
  brightness: attributes.brightness,
  colorTempKelvin: attributes.colorTempKelvin,
  minColorTempKelvin: attributes.minColorTempKelvin,
  maxColorTempKelvin: attributes.maxColorTempKelvin,
  rgbColor: attributes.rgbColor,
  colorMode: attributes.colorMode,
  colorModes: attributes.colorModes,
  currentTemperature: attributes.currentTemperature,
  targetTemperature: attributes.targetTemperature,
  targetTemperatureLow: attributes.targetTemperatureLow,
  targetTemperatureHigh: attributes.targetTemperatureHigh,
  minTemperature: attributes.minTemperature,
  maxTemperature: attributes.maxTemperature,
  temperatureStep: attributes.temperatureStep,
  temperatureUnit: attributes.temperatureUnit,
  hvacModes: attributes.hvacModes,
  hvacAction: attributes.hvacAction,
  presetMode: attributes.presetMode,
  presetModes: attributes.presetModes,
  currentHumidity: attributes.currentHumidity,
  targetHumidity: attributes.targetHumidity,
  position: attributes.position,
  percentage: attributes.percentage,
  mediaTitle: attributes.mediaTitle,
  mediaArtist: attributes.mediaArtist,
  mediaAlbum: attributes.mediaAlbum,
  mediaSource: attributes.mediaSource,
  volume: attributes.volume,
  isMuted: attributes.isMuted,
  mediaDuration: attributes.mediaDuration,
  mediaPosition: attributes.mediaPosition,
  batteryLevel: attributes.batteryLevel,
  options: attributes.options,
  humidity: attributes.humidity,
  windSpeed: attributes.windSpeed,
  windSpeedUnit: attributes.windSpeedUnit,
  installedVersion: attributes.installedVersion,
  latestVersion: attributes.latestVersion,
  releaseSummary: attributes.releaseSummary,
  lastTriggered: attributes.lastTriggered,
  zone: attributes.zone,
  nextSetting: attributes.nextSetting,
  nextRising: attributes.nextRising,
  codeRequired: attributes.codeRequired,
  codeFormat: attributes.codeFormat,
  status: attributes.status,
  ...toImageAttributes(domain, attributes.pictureUrl),
});

const createAreaKey = (integrationId: string, areaId: string) => `ha:${integrationId}:${areaId}`;

const toAreaKey = (integrationId: string, areaId: string | null) => {
  if (areaId === null) return null;
  return createAreaKey(integrationId, areaId);
};

const toPrototypeEntity = (integrationId: string, entity: SmartHomeEntity, history: number[] | null): HaEntity => {
  const { domain, readOnly } = toPrototypeDomain(entity.domain);
  return {
    id: entity.id,
    domain,
    name: entity.name,
    areaId: toAreaKey(integrationId, entity.areaId),
    state: entity.state,
    icon: entity.icon,
    deviceClass: entity.deviceClass,
    unit: entity.unit,
    lastChanged: entity.lastChanged,
    attributes: toAttributes(entity.domain, entity.attributes),
    history,
    sourceDomain: entity.domain,
    sourceAreaId: entity.areaId,
    readOnly,
  };
};

const toPrototypeArea = (integrationId: string, area: SmartHomeArea): HaArea => ({
  id: createAreaKey(integrationId, area.id),
  sourceId: area.id,
  name: area.name,
  floor: null,
  temperatureEntityId: area.temperatureEntityId,
  humidityEntityId: area.humidityEntityId,
});

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) return error.message;
  return null;
};

const newest = (current: SmartHomeEntity | undefined, incoming: SmartHomeEntity) => {
  if (current && current.lastUpdated > incoming.lastUpdated) return current;
  return incoming;
};

type IntentKey =
  | "state"
  | "brightness"
  | "color"
  | "targetTemperature"
  | "presetMode"
  | "targetHumidity"
  | "position"
  | "volume"
  | "percentage"
  | "media"
  | "trigger";

interface Intent {
  keys: IntentKey[];
  matches: (confirmed: SmartHomeEntity, base: number) => boolean;
}

const near = (value: number | undefined, target: number, tolerance: number) =>
  value !== undefined && Math.abs(value - target) <= tolerance;

const normalizeRgb = (color: [number, number, number]) => {
  const max = Math.max(...color);
  return color.map((channel) => {
    if (max === 0) return 0;
    return channel / max;
  });
};

const isActive = (entity: SmartHomeEntity) => {
  switch (entity.domain) {
    case "cover":
    case "valve":
      return entity.state !== "closed" && entity.state !== "closing";
    case "lock":
      return entity.state !== "locked" && entity.state !== "locking";
    case "media_player":
      return entity.state === "playing";
    case "climate":
      return entity.state !== "off";
    default:
      return entity.state === "on";
  }
};

const changedSince = (confirmed: SmartHomeEntity, base: number) => confirmed.lastUpdated > base;

const stateIn =
  (...states: string[]) =>
  (confirmed: SmartHomeEntity) =>
    states.includes(confirmed.state);

const reaches =
  (read: (entity: SmartHomeEntity) => number | undefined, target: number, tolerance: number) =>
  (confirmed: SmartHomeEntity, base: number) => {
    const value = read(confirmed);
    if (value === target) return true;
    return changedSince(confirmed, base) && near(value, target, tolerance);
  };

const createIntent = (action: HaAction, optimistic: SmartHomeEntity): Intent => {
  switch (action.type) {
    case "toggle":
    case "turnOn":
    case "turnOff":
    case "mediaPlayPause":
      return { keys: ["state"], matches: (confirmed) => isActive(confirmed) === isActive(optimistic) };
    case "open":
    case "close":
      return { keys: ["state", "position"], matches: (confirmed) => isActive(confirmed) === isActive(optimistic) };
    case "stop":
      return { keys: ["state", "position"], matches: changedSince };
    case "setPosition":
      return {
        keys: ["state", "position"],
        matches: reaches((entity) => entity.attributes.position, action.value, 1),
      };
    case "setBrightness": {
      if (action.value <= 0) return { keys: ["state", "brightness"], matches: stateIn("off") };
      const brightness = reaches((entity) => entity.attributes.brightness, action.value, 1);
      return {
        keys: ["state", "brightness"],
        matches: (confirmed, base) => confirmed.state === "on" && brightness(confirmed, base),
      };
    }
    case "setFanPercentage": {
      if (action.value <= 0) return { keys: ["state", "percentage"], matches: stateIn("off") };
      const tolerance = Math.max(1, optimistic.attributes.percentageStep ?? 1);
      return {
        keys: ["state", "percentage"],
        matches: reaches((entity) => entity.attributes.percentage, action.value, tolerance),
      };
    }
    case "setColorTemp":
      return {
        keys: ["state", "color"],
        matches: (entity, base) =>
          entity.state === "on" &&
          (entity.attributes.colorMode === undefined || entity.attributes.colorMode === "color_temp") &&
          reaches(
            (confirmed) => confirmed.attributes.colorTempKelvin,
            action.value,
            Math.max(50, action.value * 0.02),
          )(entity, base),
      };
    case "setRgbColor":
      return {
        keys: ["state", "color"],
        matches: (entity, base) => {
          const rgb = entity.attributes.rgbColor;
          if (entity.state !== "on" || !rgb) return false;
          const colorMode = entity.attributes.colorMode;
          if (colorMode && !["rgb", "hs", "xy", "rgbw", "rgbww"].includes(colorMode)) return false;
          const actual = normalizeRgb(rgb);
          const target = normalizeRgb(action.value);
          if (rgb.every((channel, index) => channel === action.value[index])) return true;
          return (
            changedSince(entity, base) &&
            actual.every((channel, index) => Math.abs(channel - (target[index] ?? 0)) <= 0.06)
          );
        },
      };
    case "setTemperature":
      return {
        keys: ["targetTemperature"],
        matches: reaches((entity) => entity.attributes.targetTemperature, action.value, 0.05),
      };
    case "setTemperatureRange":
      return {
        keys: ["targetTemperature"],
        matches: (entity, base) =>
          reaches((confirmed) => confirmed.attributes.targetTemperatureLow, action.low, 0.05)(entity, base) &&
          reaches((confirmed) => confirmed.attributes.targetTemperatureHigh, action.high, 0.05)(entity, base),
      };
    case "setHumidity":
      return {
        keys: ["targetHumidity"],
        matches: reaches((entity) => entity.attributes.targetHumidity, action.value, 1),
      };
    case "setVolume":
      return { keys: ["volume"], matches: reaches((entity) => entity.attributes.volume, action.value, 0.011) };
    case "setHvacMode":
    case "selectOption":
      return { keys: ["state"], matches: stateIn(action.value) };
    case "setPresetMode":
      return { keys: ["presetMode"], matches: (confirmed) => confirmed.attributes.presetMode === action.value };
    case "lock":
      return { keys: ["state"], matches: stateIn("locked", "locking") };
    case "unlock":
      return { keys: ["state"], matches: stateIn("unlocked", "unlocking", "open", "opening") };
    case "vacuumStart":
      return { keys: ["state"], matches: stateIn("cleaning") };
    case "vacuumReturn":
      return { keys: ["state"], matches: stateIn("returning", "docked") };
    case "alarmArm":
      return { keys: ["state"], matches: stateIn(`armed_${action.mode}`, "arming") };
    case "alarmDisarm":
      return { keys: ["state"], matches: stateIn("disarmed") };
    case "mediaNext":
    case "mediaPrevious":
      return { keys: ["media"], matches: changedSince };
    case "trigger":
      return { keys: ["trigger"], matches: changedSince };
    case "install":
      return { keys: ["state"], matches: changedSince };
  }
};

interface ActionContext {
  execute: (entityId: string, action: HaAction) => Promise<unknown>;
  refresh: () => void;
  notify: (entityName: string, error: PrototypeEntityError) => void;
  messages: Record<PrototypeEntityError["kind"], string>;
}

interface Step {
  action: HaAction;
  intent: Intent;
  base: number;
  requiresFresh: boolean;
  project: (entity: SmartHomeEntity) => SmartHomeEntity;
  status: "queued" | "sent" | "acknowledged";
  superseded: boolean;
  context: ActionContext;
  resolve: (result: PrototypeActionResult) => void;
  timer?: ReturnType<typeof setTimeout>;
}

interface TrackedError {
  error: PrototypeEntityError;
  base: number;
}

interface CachedOverlay {
  base: SmartHomeEntity;
  steps: readonly Step[];
  value: SmartHomeEntity;
}

const createProjection = (action: HaAction, previous: SmartHomeEntity, optimistic: SmartHomeEntity) => {
  if (action.type !== "toggle" && action.type !== "mediaPlayPause") {
    return (entity: SmartHomeEntity) => applySmartHomeAction(entity, action);
  }
  const attributes = Object.fromEntries(
    Object.entries(optimistic.attributes).filter(([key, value]) => value !== Reflect.get(previous.attributes, key)),
  );
  return (entity: SmartHomeEntity): SmartHomeEntity => ({
    ...entity,
    state: optimistic.state,
    attributes: { ...entity.attributes, ...attributes },
    lastChanged: optimistic.lastChanged,
  });
};

class SharedActionStore {
  private steps = new Map<string, Step[]>();
  private confirmed = new Map<string, SmartHomeEntity>();
  private errors = new Map<string, TrackedError>();
  private overlays = new Map<string, CachedOverlay>();
  private listeners = new Set<() => void>();

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  isPending(entityId: string) {
    return this.steps.has(entityId);
  }

  getError(entityId: string) {
    return this.errors.get(entityId)?.error ?? null;
  }

  getConfirmed(entityId: string) {
    return this.confirmed.get(entityId);
  }

  observe(entities: readonly SmartHomeEntity[]) {
    let changed = false;
    for (const entity of entities) {
      const current = this.confirmed.get(entity.id);
      const next = newest(current, entity);
      if (next !== current) this.confirmed.set(entity.id, next);
      const tracked = this.errors.get(entity.id);
      if (tracked && next.lastUpdated > tracked.base) {
        this.errors.delete(entity.id);
        changed = true;
      }
      if (this.reconcile(entity.id)) changed = true;
    }
    if (changed) this.emit();
  }

  display(base: SmartHomeEntity) {
    const steps = this.steps.get(base.id);
    if (!steps) return base;
    const cached = this.overlays.get(base.id);
    if (cached?.base === base && cached.steps === steps) return cached.value;
    const value = steps.reduce((entity, step) => step.project(entity), base);
    this.overlays.set(base.id, { base, steps, value });
    return value;
  }

  run(base: SmartHomeEntity, action: HaAction, context: ActionContext): Promise<PrototypeActionResult> {
    const entityId = base.id;
    const previous = this.display(base);
    const optimistic = applySmartHomeAction(previous, action);
    const intent = createIntent(action, optimistic);
    let requiresFresh = false;

    const remaining: Step[] = [];
    for (const step of this.steps.get(entityId) ?? []) {
      const overlaps = step.intent.keys.some((key) => intent.keys.includes(key));
      if (overlaps && (step.status !== "queued" || step.requiresFresh)) requiresFresh = true;
      if (overlaps && step.status !== "sent") {
        this.settle(step, "superseded");
        continue;
      }
      if (overlaps) step.superseded = true;
      remaining.push(step);
    }

    this.errors.delete(entityId);
    return new Promise((resolve) => {
      const step: Step = {
        action,
        intent,
        base: this.confirmed.get(entityId)?.lastUpdated ?? base.lastUpdated,
        requiresFresh,
        project: createProjection(action, previous, optimistic),
        status: "queued",
        superseded: false,
        context,
        resolve,
      };
      this.setSteps(entityId, [...remaining, step]);
      this.emit();
      if (!remaining.some((candidate) => candidate.status !== "acknowledged")) void this.send(entityId, step);
    });
  }

  private async send(entityId: string, step: Step) {
    step.base = Math.max(step.base, this.confirmed.get(entityId)?.lastUpdated ?? 0);
    step.status = "sent";
    let failure: { error: unknown } | null = null;
    try {
      await step.context.execute(entityId, step.action);
    } catch (error) {
      failure = { error };
    }

    if (failure) {
      this.removeStep(entityId, step);
      const message = getErrorMessage(failure.error) ?? step.context.messages.failed;
      this.reject(entityId, step, { kind: "failed", action: step.action.type, message, at: Date.now() });
    } else if (step.superseded) {
      this.removeStep(entityId, step);
      this.settle(step, "superseded");
    } else {
      step.status = "acknowledged";
      step.timer = setTimeout(() => this.expire(entityId, step), SETTLE_TIMEOUT_MS);
      step.context.refresh();
      this.reconcile(entityId);
    }
    this.emit();

    const next = this.steps.get(entityId)?.find((candidate) => candidate.status === "queued");
    if (next) void this.send(entityId, next);
  }

  private expire(entityId: string, step: Step) {
    if (!this.steps.get(entityId)?.includes(step)) return;
    this.removeStep(entityId, step);
    const message = step.context.messages.unconfirmed;
    this.reject(entityId, step, { kind: "unconfirmed", action: step.action.type, message, at: Date.now() });
    this.emit();
  }

  private reject(entityId: string, step: Step, error: PrototypeEntityError) {
    const confirmed = this.confirmed.get(entityId);
    this.errors.set(entityId, { error, base: confirmed?.lastUpdated ?? 0 });
    step.context.notify(confirmed?.name ?? entityId, error);
    this.settle(step, error.kind);
  }

  private reconcile(entityId: string) {
    const steps = this.steps.get(entityId);
    const confirmed = this.confirmed.get(entityId);
    if (!steps || !confirmed) return false;
    const matched = steps.filter(
      (step) =>
        step.status === "acknowledged" &&
        (!step.requiresFresh || changedSince(confirmed, step.base)) &&
        step.intent.matches(confirmed, step.base),
    );
    if (matched.length === 0) return false;
    this.setSteps(
      entityId,
      steps.filter((step) => !matched.includes(step)),
    );
    matched.forEach((step) => this.settle(step, "applied"));
    return true;
  }

  private settle(step: Step, result: PrototypeActionResult) {
    clearTimeout(step.timer);
    step.resolve(result);
  }

  private removeStep(entityId: string, step: Step) {
    this.setSteps(
      entityId,
      (this.steps.get(entityId) ?? []).filter((candidate) => candidate !== step),
    );
  }

  private setSteps(entityId: string, steps: Step[]) {
    if (steps.length > 0) {
      this.steps.set(entityId, steps);
      return;
    }
    this.steps.delete(entityId);
    this.overlays.delete(entityId);
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}

const actionStores = new Map<string, SharedActionStore>();

const getActionStore = (integrationId: string) => {
  let store = actionStores.get(integrationId);
  if (!store) {
    store = new SharedActionStore();
    actionStores.set(integrationId, store);
  }
  return store;
};

interface CachedEntity {
  source: SmartHomeEntity;
  history: number[] | undefined;
  value: HaEntity;
}

class LivePrototypeSource implements PrototypeEntitySource {
  private confirmed = new Map<string, SmartHomeEntity>();
  private history = new Map<string, number[]>();
  private cache = new Map<string, CachedEntity>();
  private listeners = new Set<() => void>();
  private entities: PrototypeEntityMap = {};
  private areas: readonly HaArea[] = [];
  private areaSource: readonly SmartHomeArea[] | null = null;
  private context: ActionContext | null = null;
  private readonly actions: SharedActionStore;

  constructor(private readonly integrationId: string) {
    this.actions = getActionStore(integrationId);
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getEntities = () => this.entities;

  getAreas = () => this.areas;

  isPending = (entityId: string) => this.confirmed.has(entityId) && this.actions.isPending(entityId);

  getError = (entityId: string) => {
    if (!this.confirmed.has(entityId)) return null;
    return this.actions.getError(entityId);
  };

  attach() {
    const detach = this.actions.subscribe(() => this.publish());
    this.publish();
    return () => {
      detach();
      this.context = null;
    };
  }

  setContext(context: ActionContext) {
    this.context = context;
  }

  sync(snapshot: SmartHomeSnapshot) {
    const next = new Map<string, SmartHomeEntity>();
    for (const entity of snapshot.entities) next.set(entity.id, newest(this.confirmed.get(entity.id), entity));
    this.confirmed = next;
    if (snapshot.areas !== this.areaSource) {
      this.areaSource = snapshot.areas;
      this.areas = snapshot.areas.map((area) => toPrototypeArea(this.integrationId, area));
      registerAreas(this.areas);
    }
    this.actions.observe(snapshot.entities);
    this.publish();
  }

  setHistory(series: readonly SmartHomeHistorySeries[]) {
    this.history = new Map(
      series
        .filter((entry) => entry.points.length > 1)
        .map((entry) => [entry.entityId, entry.points.map((point) => point.value)]),
    );
    this.publish();
  }

  run = (entityId: string, action: HaAction): Promise<PrototypeActionResult> => {
    const display = this.entities[entityId];
    const base = this.getBase(entityId);
    if (!this.context || !display || !base || display.readOnly || base.state === "unavailable") {
      return Promise.resolve("blocked");
    }
    if (!supportsSmartHomeAction(base, action)) return Promise.resolve("blocked");
    return this.actions.run(base, action, this.context);
  };

  private getBase(entityId: string) {
    const own = this.confirmed.get(entityId);
    if (!own) return undefined;
    const shared = this.actions.getConfirmed(entityId);
    if (!shared) return own;
    return newest(own, shared);
  }

  private toEntity(source: SmartHomeEntity) {
    const history = this.history.get(source.id);
    const cached = this.cache.get(source.id);
    if (cached?.source === source && cached.history === history) return cached.value;
    const value = toPrototypeEntity(this.integrationId, source, history ?? null);
    this.cache.set(source.id, { source, history, value });
    return value;
  }

  private publish() {
    const next: PrototypeEntityMap = {};
    for (const entityId of this.confirmed.keys()) {
      const base = this.getBase(entityId);
      if (base) next[entityId] = this.toEntity(this.actions.display(base));
    }
    for (const entityId of this.cache.keys()) {
      if (!this.confirmed.has(entityId)) this.cache.delete(entityId);
    }
    const previous = this.entities;
    const keys = Object.keys(next);
    const unchanged =
      keys.length === Object.keys(previous).length && keys.every((entityId) => previous[entityId] === next[entityId]);
    if (!unchanged) this.entities = next;
    this.listeners.forEach((listener) => listener());
  }
}

export interface PrototypeLiveStatus {
  status: "loading" | "error" | "ready";
  isLive: boolean;
  retry: () => void;
}

const LiveStatusContext = createContext<PrototypeLiveStatus | null>(null);

export const usePrototypeLiveStatus = () => useContext(LiveStatusContext);

type LiveSelection = Required<SmartHomeEntitySelection>;

const toSelection = (integrationId: string, blockIds: readonly string[]): LiveSelection => {
  const entityIds = new Set<string>();
  const areaIds = new Set<string>();
  const blocks = blockIds.flatMap((id) => parseBlockId(id) ?? []).filter((block) => block.source === integrationId);
  for (const block of blocks) {
    if (block.kind === "entity" && ENTITY_ID_PATTERN.test(block.entityId)) entityIds.add(block.entityId);
    if (block.kind === "areas") block.areaIds.forEach((areaId) => areaIds.add(areaId));
  }
  return {
    entityIds: [...entityIds].toSorted().slice(0, 200),
    areaIds: [...areaIds].toSorted().slice(0, 50),
    domains: [],
  };
};

const isHistoryCandidate = (entity: SmartHomeEntity) =>
  entity.domain === "sensor" && entity.stateClass === "measurement" && Number.isFinite(Number(entity.state));

interface LiveSnapshotProps {
  integrationId: string;
  selection: LiveSelection;
  source: LivePrototypeSource;
  children: ReactNode;
}

function LiveSnapshot({ integrationId, selection, source, children }: LiveSnapshotProps) {
  const t = useI18n("widget.smartHome-prototype.live");
  const utils = clientApi.useUtils();
  const { mutateAsync } = clientApi.widget.smartHome.executeAction.useMutation();
  const snapshot = useSmartHomeSnapshot(integrationId, selection, { live: true });
  const historyKey = (snapshot.data?.entities ?? [])
    .filter(isHistoryCandidate)
    .map((entity) => entity.id)
    .toSorted()
    .slice(0, HISTORY_LIMIT)
    .join(",");
  const historyIds = useMemo(() => historyKey.split(",").filter(Boolean), [historyKey]);
  const history = clientApi.widget.smartHome.history.useQuery(
    { integrationId, entityIds: historyIds, hours: 24, samples: 32 },
    { enabled: historyIds.length > 0, staleTime: 300_000, refetchInterval: 300_000, refetchOnWindowFocus: false },
  );

  useEffect(() => {
    source.setContext({
      execute: (entityId, action) => mutateAsync({ integrationId, entityId, ...toSmartHomeActionInput(action) }),
      refresh: () => void utils.widget.smartHome.snapshot.invalidate({ integrationId }),
      notify: (name, error) => {
        if (error.kind === "unconfirmed") {
          showWarningNotification({ title: t("actionUnconfirmed", { name }), message: error.message });
          return;
        }
        showErrorNotification({ title: t("actionFailed", { name }), message: error.message });
      },
      messages: { failed: t("unknownError"), unconfirmed: t("unconfirmed") },
    });
  }, [source, mutateAsync, integrationId, utils, t]);

  useEffect(() => {
    if (snapshot.data) source.sync(snapshot.data);
  }, [snapshot.data, source]);

  useEffect(() => {
    source.setHistory(history.data ?? []);
  }, [history.data, source]);

  let status: PrototypeLiveStatus["status"] = "loading";
  if (snapshot.data) status = "ready";
  else if (snapshot.error) status = "error";
  const { refetch } = snapshot;
  const value = useMemo<PrototypeLiveStatus>(
    () => ({ status, isLive: snapshot.isLive, retry: () => void refetch() }),
    [status, snapshot.isLive, refetch],
  );

  return <LiveStatusContext.Provider value={value}>{children}</LiveStatusContext.Provider>;
}

const emptyStatus: PrototypeLiveStatus = { status: "ready", isLive: false, retry: () => undefined };

interface PrototypeLiveProviderProps {
  integrationId: string;
  blockIds: readonly string[];
  children: ReactNode;
}

export function PrototypeLiveProvider({ integrationId, blockIds, children }: PrototypeLiveProviderProps) {
  const [source] = useState(() => new LivePrototypeSource(integrationId));
  const selection = useMemo(() => toSelection(integrationId, blockIds), [integrationId, blockIds]);
  const hasSelection = selection.entityIds.length > 0 || selection.areaIds.length > 0;

  useEffect(() => source.attach(), [source]);

  return (
    <PrototypeSourceProvider source={source}>
      {hasSelection && (
        <LiveSnapshot integrationId={integrationId} selection={selection} source={source}>
          {children}
        </LiveSnapshot>
      )}
      {!hasSelection && <LiveStatusContext.Provider value={emptyStatus}>{children}</LiveStatusContext.Provider>}
    </PrototypeSourceProvider>
  );
}
