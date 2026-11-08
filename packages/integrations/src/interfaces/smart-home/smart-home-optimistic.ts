import type { SmartHomeAction, SmartHomeEntity } from "./smart-home-types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const applySmartHomeAction = (entity: SmartHomeEntity, action: SmartHomeAction): SmartHomeEntity => {
  const now = Date.now();
  const next = (patch: Partial<SmartHomeEntity>): SmartHomeEntity => ({
    ...entity,
    ...patch,
    attributes: { ...entity.attributes, ...patch.attributes },
    lastUpdated: now,
    lastChanged: patch.state && patch.state !== entity.state ? now : entity.lastChanged,
  });
  const attributes = entity.attributes;

  switch (action.type) {
    case "toggle":
      return toggleEntity(entity, next);
    case "turnOn":
      return entity.state === "on" ? entity : toggleEntity(entity, next);
    case "turnOff":
      return entity.state === "off" ? entity : toggleEntity(entity, next);
    case "setBrightness": {
      const value = clamp(Math.round(action.value), 0, 100);
      return next({ state: value > 0 ? "on" : "off", attributes: { brightness: value } });
    }
    case "setColorTemp":
      return next({
        state: "on",
        attributes: { colorTempKelvin: Math.round(action.value), rgbColor: undefined, colorMode: "color_temp" },
      });
    case "setRgbColor":
      return next({
        state: "on",
        attributes: { rgbColor: action.value, colorTempKelvin: undefined, colorMode: "rgb" },
      });
    case "setTemperature":
      return next({
        attributes: {
          targetTemperature: action.value,
        },
      });
    case "setTemperatureRange":
      return next({ attributes: { targetTemperatureLow: action.low, targetTemperatureHigh: action.high } });
    case "setHvacMode":
      return next({ state: action.value, attributes: { hvacAction: action.value === "off" ? "off" : "idle" } });
    case "setPresetMode":
      return next({ attributes: { presetMode: action.value } });
    case "setHumidity":
      return next({ attributes: { targetHumidity: clamp(action.value, 0, 100) } });
    case "setPosition": {
      const value = clamp(Math.round(action.value), 0, 100);
      return next({ state: value > 0 ? "open" : "closed", attributes: { position: value } });
    }
    case "open":
      return next({ state: "open", attributes: { position: 100 } });
    case "close":
      return next({ state: "closed", attributes: { position: 0 } });
    case "lock":
      return next({ state: "locked" });
    case "unlock":
      return next({ state: "unlocked" });
    case "mediaPlayPause":
      return next({ state: entity.state === "playing" ? "paused" : "playing" });
    case "mediaPlay":
      return next({ state: "playing" });
    case "mediaPause":
      return next({ state: "paused" });
    case "mediaNext":
    case "mediaPrevious":
      return next({ attributes: { mediaPosition: 0 } });
    case "setVolume":
      return next({ attributes: { volume: clamp(action.value, 0, 1) } });
    case "setMuted":
      return next({ attributes: { isMuted: action.value } });
    case "trigger":
      if (entity.domain === "automation" || entity.domain === "script")
        return next({ attributes: { lastTriggered: now } });
      return next({ state: new Date(now).toISOString() });
    case "selectOption":
      return next({ state: action.value });
    case "setValue":
      return next({ state: action.value.toString() });
    case "setFanPercentage": {
      const value = clamp(Math.round(action.value), 0, 100);
      return next({ state: value > 0 ? "on" : "off", attributes: { percentage: value } });
    }
    case "vacuumStart":
      return next({ state: "cleaning", attributes: { status: "Cleaning" } });
    case "vacuumPause":
      return next({ state: "paused", attributes: { status: "Paused" } });
    case "vacuumReturn":
      return next({ state: "returning", attributes: { status: "Returning to dock" } });
    case "alarmArm":
      return next({ state: `armed_${action.mode}` });
    case "alarmDisarm":
      return next({ state: "disarmed" });
    case "install":
      return next({ state: "off", attributes: { installedVersion: attributes.latestVersion } });
    default:
      return entity;
  }
};

const toggleEntity = (entity: SmartHomeEntity, next: (patch: Partial<SmartHomeEntity>) => SmartHomeEntity) => {
  switch (entity.domain) {
    case "cover":
    case "valve": {
      const opening = entity.state === "closed";
      return next({ state: opening ? "open" : "closed", attributes: { position: opening ? 100 : 0 } });
    }
    case "lock":
      return next({ state: entity.state === "locked" ? "unlocked" : "locked" });
    case "media_player":
      return next({ state: entity.state === "playing" ? "paused" : "playing" });
    case "climate":
      return next({
        state:
          entity.state === "off"
            ? (["heat_cool", "heat", "cool"].find((mode) => entity.attributes.hvacModes?.includes(mode)) ??
              entity.attributes.hvacModes?.find((mode) => mode !== "off") ??
              entity.state)
            : "off",
      });
    case "scene":
    case "button":
      return next({ state: new Date().toISOString() });
    case "light": {
      const turningOn = entity.state !== "on";
      return next({
        state: turningOn ? "on" : "off",
        attributes: { brightness: turningOn ? entity.attributes.brightness || 80 : undefined },
      });
    }
    case "fan": {
      const turningOn = entity.state !== "on";
      return next({ state: turningOn ? "on" : "off", attributes: { percentage: turningOn ? 50 : 0 } });
    }
    default:
      return next({ state: entity.state === "on" ? "off" : "on" });
  }
};
