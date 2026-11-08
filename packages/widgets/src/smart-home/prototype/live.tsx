"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { clientApi } from "@homarr/api/client";
import { applySmartHomeAction, supportsSmartHomeAction } from "@homarr/integrations/types";
import type {
  SmartHomeAction,
  SmartHomeArea,
  SmartHomeCatalogEntity,
  SmartHomeEntity,
  SmartHomeEntityAttributes,
  SmartHomeEntitySelection,
  SmartHomeForecastDay,
  SmartHomeHistorySeries,
  SmartHomeSnapshot,
} from "@homarr/integrations/types";
import { showErrorNotification, showWarningNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import { toSmartHomeActionInput, useSmartHomeSnapshot } from "../_shared/use-smart-home";
import { useSmartHomeCatalog } from "../_inputs/use-smart-home-catalog";
import { parseBlockId } from "./configuration";
import { registerAreas } from "./semantics";
import { PrototypeSourceProvider } from "./store";
import type { PrototypeEntityMap, PrototypeEntitySource } from "./store";
import { toPrototypeDomain } from "./types";
import type {
  HaAction,
  HaArea,
  HaAttributes,
  HaEntity,
  HaForecastDay,
  PrototypeActionResult,
  PrototypeEntityError,
} from "./types";

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
  minHumidity: attributes.minHumidity,
  maxHumidity: attributes.maxHumidity,
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

const toPrototypeEntity = (integrationId: string, entity: SmartHomeEntity, history: HaEntity["history"]): HaEntity => {
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
  matches: (confirmed: SmartHomeEntity, base: number, contextId?: string) => boolean;
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

const changedSince = (confirmed: SmartHomeEntity, base: number) => confirmed.lastUpdated > base;

const isNativeColor = (entity: SmartHomeEntity) =>
  entity.state === "on" &&
  entity.attributes.rgbColor !== undefined &&
  (entity.attributes.colorMode === "hs" || entity.attributes.colorMode === "xy");

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
      return { keys: ["state"], matches: stateIn(optimistic.state) };
    case "open":
    case "close":
      return { keys: ["state", "position"], matches: stateIn(optimistic.state) };
    case "stop":
      return { keys: ["state", "position"], matches: changedSince };
    case "setPosition":
      return {
        keys: ["state", "position"],
        matches: (confirmed, base) =>
          confirmed.state === optimistic.state &&
          reaches((entity) => entity.attributes.position, action.value, 1)(confirmed, base),
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
        matches: (entity, base, contextId) => {
          const rgb = entity.attributes.rgbColor;
          if (entity.state !== "on" || !rgb) return false;
          const colorMode = entity.attributes.colorMode;
          if (colorMode && !["rgb", "hs", "xy", "rgbw", "rgbww"].includes(colorMode)) return false;
          if (rgb.every((channel, index) => channel === action.value[index])) return true;
          if (isNativeColor(entity)) {
            return changedSince(entity, base) && contextId !== undefined && entity.contextId === contextId;
          }
          const actual = normalizeRgb(rgb);
          const target = normalizeRgb(action.value);
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
      return { keys: ["state"], matches: stateIn("locked") };
    case "unlock":
      return { keys: ["state"], matches: stateIn("unlocked") };
    case "vacuumStart":
      return { keys: ["state"], matches: stateIn("cleaning") };
    case "vacuumReturn":
      return { keys: ["state"], matches: stateIn("returning", "docked") };
    case "alarmArm":
      return { keys: ["state"], matches: stateIn(`armed_${action.mode}`) };
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

interface ActionReceipt {
  contextId?: string;
}

interface ActionContext {
  execute: (entityId: string, action: SmartHomeAction) => Promise<ActionReceipt | void>;
  refresh: () => void;
  notify: (entityName: string, error: PrototypeEntityError) => void;
  messages: Record<PrototypeEntityError["kind"], string>;
}

interface Step {
  action: HaAction;
  command: SmartHomeAction;
  contextId?: string;
  observations: Map<string, SmartHomeEntity>;
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

const resolveCommand = (action: HaAction, optimistic: SmartHomeEntity): SmartHomeAction => {
  if (action.type === "mediaPlayPause" || (action.type === "toggle" && optimistic.domain === "media_player")) {
    if (optimistic.state === "playing") return { type: "mediaPlay" };
    return { type: "mediaPause" };
  }
  if (action.type !== "toggle") return action;
  switch (optimistic.domain) {
    case "cover":
    case "valve":
      if (optimistic.state === "closed") return { type: "close" };
      return { type: "open" };
    case "climate":
      return { type: "setHvacMode", value: optimistic.state };
    case "lock":
      if (optimistic.state === "locked") return { type: "lock" };
      return { type: "unlock" };
    case "scene":
    case "button":
    case "input_button":
      return { type: "trigger" };
    default:
      if (optimistic.state === "on") return { type: "turnOn" };
      return { type: "turnOff" };
  }
};

const sameTarget = (left: SmartHomeAction, right: SmartHomeAction) => {
  if (["trigger", "mediaNext", "mediaPrevious", "stop", "install"].includes(left.type)) return false;
  return JSON.stringify(left) === JSON.stringify(right);
};

const isTransition = (entity: SmartHomeEntity, command: SmartHomeAction) => {
  switch (command.type) {
    case "lock":
      return entity.state === "locking";
    case "unlock":
      return entity.state === "unlocking";
    case "alarmArm":
      return entity.state === "arming";
    case "open":
      return entity.state === "opening";
    case "close":
      return entity.state === "closing";
    case "setPosition":
      return entity.state === "opening" || entity.state === "closing";
    default:
      return false;
  }
};

class SharedActionStore {
  private steps = new Map<string, Step[]>();
  // Display expiry must not release an unresolved service request.
  private executing = new Set<string>();
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
      for (const step of this.steps.get(entity.id) ?? []) {
        if (step.command.type !== "setRgbColor" || !entity.contextId) continue;
        if (step.status === "queued" || !changedSince(entity, step.base) || !isNativeColor(entity)) continue;
        step.observations.set(entity.contextId, entity);
      }
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
    let value = steps.reduce((entity, step) => step.project(entity), base);
    const latest = steps.findLast((step) => !step.superseded);
    if (latest && latest.status !== "queued" && changedSince(base, latest.base) && isTransition(base, latest.command)) {
      value = { ...value, state: base.state };
    }
    this.overlays.set(base.id, { base, steps, value });
    return value;
  }

  run(base: SmartHomeEntity, action: HaAction, context: ActionContext): Promise<PrototypeActionResult> {
    const entityId = base.id;
    const previous = this.display(base);
    const optimistic = applySmartHomeAction(previous, action);
    const intent = createIntent(action, optimistic);
    const command = resolveCommand(action, optimistic);
    const overlaps = (step: Step) => step.intent.keys.some((key) => intent.keys.includes(key));
    const existing = this.steps.get(entityId) ?? [];
    const latest = existing.findLast(overlaps);
    let reusable = existing.find((step) => step.status === "sent" && sameTarget(step.command, command));
    if (latest && !latest.superseded && sameTarget(latest.command, command)) reusable = latest;
    if (reusable) {
      reusable.resolve("superseded");
      const { promise, resolve } = Promise.withResolvers<PrototypeActionResult>();
      reusable.resolve = resolve;
      reusable.superseded = false;
      const remaining = existing.filter((step) => {
        if (step === reusable || step.status === "sent" || !overlaps(step)) return true;
        this.settle(step, "superseded");
        return false;
      });
      this.setSteps(entityId, remaining);
      this.errors.delete(entityId);
      this.emit();
      this.sendNext(entityId);
      return promise;
    }
    let requiresFresh = false;

    const remaining: Step[] = [];
    for (const step of existing) {
      const overlapping = overlaps(step);
      if (overlapping && (step.status !== "queued" || step.requiresFresh)) requiresFresh = true;
      if (overlapping && step.status !== "sent") {
        this.settle(step, "superseded");
        continue;
      }
      if (overlapping) step.superseded = true;
      remaining.push(step);
    }

    this.errors.delete(entityId);
    const { promise, resolve } = Promise.withResolvers<PrototypeActionResult>();
    const step: Step = {
      action,
      command,
      observations: new Map(),
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
    this.sendNext(entityId);
    return promise;
  }

  private async send(entityId: string, step: Step) {
    step.base = Math.max(step.base, this.confirmed.get(entityId)?.lastUpdated ?? 0);
    step.status = "sent";
    this.executing.add(entityId);
    step.timer = setTimeout(() => this.expire(entityId, step), SETTLE_TIMEOUT_MS);
    let failure: { error: unknown } | null = null;
    try {
      const receipt = await step.context.execute(entityId, step.command);
      if (receipt) step.contextId = receipt.contextId;
    } catch (error) {
      failure = { error };
    }

    const confirmed = this.confirmed.get(entityId);
    if (
      confirmed &&
      (!step.requiresFresh || changedSince(confirmed, step.base)) &&
      step.intent.matches(confirmed, step.base, step.contextId)
    ) {
      // Returning to an already-confirmed command need not produce another state change.
      for (const queued of this.steps.get(entityId) ?? []) {
        if (queued.status === "queued" && sameTarget(queued.command, step.command)) queued.requiresFresh = false;
      }
    }
    this.executing.delete(entityId);
    if (!this.steps.get(entityId)?.includes(step)) {
      this.sendNext(entityId);
      return;
    }
    if (step.superseded) {
      this.removeStep(entityId, step);
      this.settle(step, "superseded");
    } else if (failure) {
      this.removeStep(entityId, step);
      const message = getErrorMessage(failure.error) ?? step.context.messages.failed;
      this.reject(entityId, step, { kind: "failed", action: step.action.type, message, at: Date.now() });
    } else {
      step.status = "acknowledged";
      step.context.refresh();
      this.reconcile(entityId);
    }
    this.emit();
    this.sendNext(entityId);
  }

  private sendNext(entityId: string) {
    if (this.executing.has(entityId)) return;
    const steps = this.steps.get(entityId);
    const next = steps?.find((candidate) => candidate.status === "queued");
    if (!next) return;
    void this.send(entityId, next);
  }

  private expire(entityId: string, step: Step) {
    if (!this.steps.get(entityId)?.includes(step)) return;
    this.removeStep(entityId, step);
    if (step.superseded) this.settle(step, "superseded");
    else {
      const message = step.context.messages.unconfirmed;
      this.reject(entityId, step, { kind: "unconfirmed", action: step.action.type, message, at: Date.now() });
    }
    this.emit();
    this.sendNext(entityId);
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
    const matched = steps.filter((step) => {
      const observed = step.contextId && step.observations.get(step.contextId);
      const confirmation = observed || confirmed;
      return (
        step.status === "acknowledged" &&
        (!step.requiresFresh || changedSince(confirmation, step.base)) &&
        step.intent.matches(confirmation, step.base, step.contextId)
      );
    });
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
  history: HaEntity["history"] | undefined;
  forecast: EntityForecast | undefined;
  value: HaEntity;
}

interface EntityForecast {
  status: NonNullable<HaAttributes["forecastStatus"]>;
  days: HaForecastDay[] | undefined;
}

class LivePrototypeSource implements PrototypeEntitySource {
  private confirmed = new Map<string, SmartHomeEntity>();
  private history = new Map<string, NonNullable<HaEntity["history"]>>();
  private forecasts = new Map<string, EntityForecast>();
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

  clear() {
    this.context = null;
    this.confirmed.clear();
    this.history.clear();
    this.forecasts.clear();
    this.cache.clear();
    this.areas = [];
    this.areaSource = null;
    this.publish();
  }

  sync(snapshot: SmartHomeSnapshot) {
    const next = new Map<string, SmartHomeEntity>();
    for (const entity of snapshot.entities) next.set(entity.id, newest(this.confirmed.get(entity.id), entity));
    this.confirmed = next;
    for (const entityId of this.forecasts.keys()) {
      if (!next.has(entityId)) this.forecasts.delete(entityId);
    }
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

  setForecast(entityId: string, forecast: EntityForecast) {
    this.forecasts.set(entityId, forecast);
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
    const forecast = this.forecasts.get(source.id);
    const cached = this.cache.get(source.id);
    if (cached?.source === source && cached.history === history && cached.forecast === forecast) return cached.value;
    const value = toPrototypeEntity(this.integrationId, source, history ?? null);
    if (forecast) {
      value.attributes.forecast = forecast.days;
      value.attributes.forecastStatus = forecast.status;
    }
    this.cache.set(source.id, { source, history, forecast, value });
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
  message?: string;
}

const LiveStatusContext = createContext<PrototypeLiveStatus | null>(null);

export const usePrototypeLiveStatus = () => useContext(LiveStatusContext);

type LiveSelection = Required<SmartHomeEntitySelection>;

const toSelection = (
  integrationId: string,
  blockIds: readonly string[],
  roomDomains: readonly string[],
  excludedEntityIds: readonly string[],
  catalogEntities: readonly SmartHomeCatalogEntity[] = [],
): LiveSelection | null => {
  const entityIds = new Set<string>();
  const areaIds = new Set<string>();
  const blocks = blockIds.flatMap((id) => parseBlockId(id) ?? []).filter((block) => block.source === integrationId);
  for (const block of blocks) {
    if (block.kind === "entity" && ENTITY_ID_PATTERN.test(block.entityId)) entityIds.add(block.entityId);
    if (block.kind === "areas") block.areaIds.forEach((areaId) => areaIds.add(areaId));
  }
  const exclusions = [...new Set(excludedEntityIds)].toSorted();
  if (entityIds.size > 200 || areaIds.size > 50 || exclusions.length > 400) return null;
  const domains = new Set(roomDomains);
  if (domains.has("input_select")) domains.add("select");
  if (domains.has("button")) domains.add("input_button");
  if (domains.has("sensor")) {
    for (const entity of catalogEntities) {
      if (entity.areaId === null || !areaIds.has(entity.areaId)) continue;
      if (toPrototypeDomain(entity.domain).domain === "sensor") domains.add(entity.domain);
    }
  }
  if (domains.size > 400) return null;
  return {
    entityIds: [...entityIds].toSorted(),
    areaIds: [...areaIds].toSorted(),
    domains: [...domains].toSorted(),
    excludedEntityIds: exclusions,
  };
};

const isHistoryCandidate = (entity: SmartHomeEntity) =>
  entity.domain === "sensor" && entity.stateClass === "measurement";

const toForecastDay = (day: SmartHomeForecastDay, type: "daily" | "hourly"): HaForecastDay => {
  const time = new Date(day.time);
  let label = time.toLocaleDateString(undefined, { weekday: "short" });
  if (type === "hourly") label = time.toLocaleTimeString(undefined, { hour: "numeric" });
  return {
    time: day.time,
    day: label,
    condition: day.condition ?? null,
    high: day.temperatureHigh,
    low: day.temperatureLow,
    precipitationProbability: day.precipitationProbability,
  };
};

interface LiveForecastProps {
  integrationId: string;
  entityId: string;
  supportedFeatures: number | undefined;
  source: LivePrototypeSource;
}

function LiveForecast({ integrationId, entityId, supportedFeatures, source }: LiveForecastProps) {
  const features = supportedFeatures ?? 0;
  let type: "daily" | "hourly" | null = null;
  if ((features & 1) !== 0) type = "daily";
  else if ((features & 2) !== 0) type = "hourly";
  const { data, error } = clientApi.widget.smartHome.forecast.useQuery(
    { integrationId, entityId, type: type ?? "daily" },
    {
      enabled: type !== null,
      staleTime: 300_000,
      refetchInterval: 300_000,
      refetchOnWindowFocus: false,
      retry: false,
    },
  );
  let status: EntityForecast["status"] = "loading";
  if (type === null) status = "unsupported";
  else if (error) status = "error";
  else if (data) status = "ready";
  const days = useMemo(() => {
    if (type === null) return undefined;
    return data?.map((day) => toForecastDay(day, type));
  }, [data, type]);

  useEffect(() => {
    source.setForecast(entityId, { status, days });
  }, [source, entityId, status, days]);

  return null;
}

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
  const { mutateAsync: mutateProtectedAsync, reset: resetProtected } =
    clientApi.widget.smartHome.executeProtectedAction.useMutation({ gcTime: 0 });
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
      execute: (entityId, action) => {
        const input = { integrationId, entityId, ...toSmartHomeActionInput(action) };
        if ("code" in input && input.code) {
          return mutateProtectedAsync({ ...input, code: input.code }).finally(resetProtected);
        }
        return mutateAsync(input);
      },
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
  }, [source, mutateAsync, mutateProtectedAsync, resetProtected, integrationId, utils, t]);

  useEffect(() => {
    if (snapshot.data) source.sync(snapshot.data);
  }, [snapshot.data, source]);

  useEffect(() => {
    source.setHistory(history.data ?? []);
  }, [history.data, source]);

  let status: PrototypeLiveStatus["status"] = "loading";
  let message: string | undefined;
  if (snapshot.error?.data?.code === "BAD_REQUEST") {
    status = "error";
    message = snapshot.error.message;
  } else if (snapshot.data) status = "ready";
  else if (snapshot.error) status = "error";
  const { refetch } = snapshot;
  const value = useMemo<PrototypeLiveStatus>(
    () => ({ status, message, isLive: snapshot.isLive, retry: () => void refetch() }),
    [status, message, snapshot.isLive, refetch],
  );

  return (
    <LiveStatusContext.Provider value={value}>
      {(snapshot.data?.entities ?? [])
        .filter((entity) => entity.domain === "weather")
        .map((entity) => (
          <LiveForecast
            key={entity.id}
            integrationId={integrationId}
            entityId={entity.id}
            supportedFeatures={entity.attributes.supportedFeatures}
            source={source}
          />
        ))}
      {children}
    </LiveStatusContext.Provider>
  );
}

const emptyStatus: PrototypeLiveStatus = { status: "ready", isLive: false, retry: () => undefined };

interface PrototypeLiveProviderProps {
  integrationId: string;
  blockIds: readonly string[];
  roomDomains: readonly string[];
  excludedEntityIds: readonly string[];
  children: ReactNode;
}

export function PrototypeLiveProvider({
  integrationId,
  blockIds,
  roomDomains,
  excludedEntityIds,
  children,
}: PrototypeLiveProviderProps) {
  const t = useI18n("widget.smartHome-prototype.live");
  const [source] = useState(() => new LivePrototypeSource(integrationId));
  const needsCatalog =
    roomDomains.includes("sensor") &&
    blockIds.some((id) => {
      const block = parseBlockId(id);
      return block?.source === integrationId && block.kind === "areas";
    });
  const catalog = useSmartHomeCatalog(needsCatalog ? integrationId : undefined);
  const catalogIndex = catalog.status === "ready" ? catalog.index : null;
  const catalogEntities = useMemo(() => [...(catalogIndex?.entitiesById.values() ?? [])], [catalogIndex]);
  const catalogReady = !needsCatalog || catalog.status === "ready";
  const selection = useMemo(
    () => toSelection(integrationId, blockIds, roomDomains, excludedEntityIds, catalogEntities),
    [integrationId, blockIds, roomDomains, excludedEntityIds, catalogEntities],
  );
  const hasSelection =
    catalogReady && selection !== null && (selection.entityIds.length > 0 || selection.areaIds.length > 0);
  const inactiveStatus = useMemo<PrototypeLiveStatus>(() => {
    if (!catalogReady) {
      if (catalog.status === "error")
        return { ...emptyStatus, status: "error", message: t("error"), retry: catalog.retry };
      return { ...emptyStatus, status: "loading" };
    }
    if (selection) return emptyStatus;
    return { ...emptyStatus, status: "error", message: t("selectionLimit") };
  }, [catalogReady, catalog, selection, t]);

  useEffect(() => source.attach(), [source]);
  useEffect(() => {
    if (!hasSelection) source.clear();
  }, [source, hasSelection]);

  return (
    <PrototypeSourceProvider source={source}>
      {hasSelection && selection && (
        <LiveSnapshot integrationId={integrationId} selection={selection} source={source}>
          {children}
        </LiveSnapshot>
      )}
      {!hasSelection && <LiveStatusContext.Provider value={inactiveStatus}>{children}</LiveStatusContext.Provider>}
    </PrototypeSourceProvider>
  );
}
