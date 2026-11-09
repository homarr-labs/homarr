import type { SmartHomeAction, SmartHomeEntity, SmartHomeEntityAttributes } from "./smart-home-types";

type CapabilityEntity = Pick<SmartHomeEntity, "domain" | "state" | "attributes">;

export const getClimateTemperatureMode = (entity: CapabilityEntity): "single" | "range" | null => {
  if (entity.domain !== "climate") return null;
  if (["dry", "fan_only", "unknown", "unavailable"].includes(entity.state)) return null;
  const features = entity.attributes.supportedFeatures ?? 0;
  const single = (features & 1) !== 0;
  const range = (features & 2) !== 0;
  const reportedRange =
    entity.attributes.targetTemperatureLow !== undefined && entity.attributes.targetTemperatureHigh !== undefined;
  if (range && (entity.state === "heat_cool" || !single || (entity.state === "auto" && reportedRange))) return "range";
  if (single) return "single";
  return null;
};

const colorModes = new Set(["hs", "xy", "rgb", "rgbw", "rgbww"]);
const brightnessModes = new Set(["brightness", "color_temp", "hs", "xy", "rgb", "rgbw", "rgbww", "white"]);

export const getLightCapabilities = (attributes: SmartHomeEntityAttributes) => {
  const modes = attributes.colorModes ?? [];
  return {
    brightness: modes.some((mode) => brightnessModes.has(mode)),
    color: modes.some((mode) => colorModes.has(mode)),
    colorTemperature: modes.includes("color_temp"),
  };
};

// Home Assistant optional entity feature flags.
const coverFeatures = { open: 1, close: 2, setPosition: 4, stop: 8, setTiltPosition: 128 };
const mediaFeatures = { pause: 1, volume: 4, mute: 8, previous: 16, next: 32, source: 2048, play: 16384 };
const alarmFeatures = { home: 1, away: 2, night: 4, custom_bypass: 16, vacation: 32 };

const hasFeature = (attributes: SmartHomeEntityAttributes, feature: number) =>
  ((attributes.supportedFeatures ?? 0) & feature) !== 0;

const within = (value: number, min: number | undefined, max: number | undefined) =>
  Number.isFinite(value) && (min === undefined || value >= min) && (max === undefined || value <= max);

export const supportsSmartHomeAction = (entity: CapabilityEntity, action: SmartHomeAction) => {
  const attributes = entity.attributes;
  switch (action.type) {
    case "toggle":
      if (entity.domain === "cover") {
        const moving = entity.state === "opening" || entity.state === "closing";
        if (moving && hasFeature(attributes, coverFeatures.stop)) return true;
        if (entity.state === "closed" || entity.state === "closing") return hasFeature(attributes, coverFeatures.open);
        if (entity.state === "opening" || attributes.position === 100)
          return hasFeature(attributes, coverFeatures.close);
        // Native toggle can reverse a partly open cover's remembered direction, which HA does not expose.
        return hasFeature(attributes, coverFeatures.open) || hasFeature(attributes, coverFeatures.close);
      }
      return true;
    case "setFanPercentage":
      return entity.domain === "fan" && hasFeature(attributes, 1) && within(action.value, 0, 100);
    case "setOscillating":
      return entity.domain === "fan" && hasFeature(attributes, 2);
    case "setPosition":
    case "setTiltPosition":
      if (entity.domain === "valve") return action.type === "setPosition";
      return (
        entity.domain === "cover" && hasFeature(attributes, coverFeatures[action.type]) && within(action.value, 0, 100)
      );
    case "open":
    case "close":
    case "stop":
      if (entity.domain === "valve") return true;
      return entity.domain === "cover" && hasFeature(attributes, coverFeatures[action.type]);
    case "mediaPlayPause":
      return (
        entity.domain === "media_player" &&
        hasFeature(attributes, mediaFeatures[entity.state === "playing" ? "pause" : "play"])
      );
    case "mediaPlay":
      return entity.domain === "media_player" && hasFeature(attributes, mediaFeatures.play);
    case "mediaPause":
      return entity.domain === "media_player" && hasFeature(attributes, mediaFeatures.pause);
    case "mediaNext":
      return entity.domain === "media_player" && hasFeature(attributes, mediaFeatures.next);
    case "mediaPrevious":
      return entity.domain === "media_player" && hasFeature(attributes, mediaFeatures.previous);
    case "setVolume":
      return (
        entity.domain === "media_player" && hasFeature(attributes, mediaFeatures.volume) && within(action.value, 0, 1)
      );
    case "setMuted":
      return entity.domain === "media_player" && hasFeature(attributes, mediaFeatures.mute);
    case "selectSource":
      return (
        entity.domain === "media_player" &&
        hasFeature(attributes, mediaFeatures.source) &&
        attributes.sources?.includes(action.value) === true
      );
    case "alarmArm":
      return entity.domain === "alarm_control_panel" && hasFeature(attributes, alarmFeatures[action.mode]);
    case "alarmDisarm":
      return entity.domain === "alarm_control_panel";
    case "setTemperature":
      return (
        (entity.domain === "water_heater" || getClimateTemperatureMode(entity) === "single") &&
        within(action.value, attributes.minTemperature, attributes.maxTemperature)
      );
    case "setTemperatureRange":
      return (
        getClimateTemperatureMode(entity) === "range" &&
        action.low <= action.high &&
        within(action.low, attributes.minTemperature, attributes.maxTemperature) &&
        within(action.high, attributes.minTemperature, attributes.maxTemperature)
      );
    case "setHvacMode":
      return entity.domain === "climate" && attributes.hvacModes?.includes(action.value) === true;
    case "setHumidity":
      return (
        (entity.domain === "humidifier" ||
          (entity.domain === "climate" && ((attributes.supportedFeatures ?? 0) & 4) !== 0)) &&
        Number.isInteger(action.value) &&
        within(action.value, attributes.minHumidity ?? 0, attributes.maxHumidity ?? 100)
      );
    case "setBrightness":
      return entity.domain === "light" && getLightCapabilities(attributes).brightness;
    case "setRgbColor":
      return (
        entity.domain === "light" &&
        getLightCapabilities(attributes).color &&
        action.value.every((channel) => Number.isInteger(channel) && within(channel, 0, 255))
      );
    case "setColorTemp":
      return (
        entity.domain === "light" &&
        getLightCapabilities(attributes).colorTemperature &&
        within(action.value, attributes.minColorTempKelvin, attributes.maxColorTempKelvin)
      );
    default:
      return true;
  }
};
