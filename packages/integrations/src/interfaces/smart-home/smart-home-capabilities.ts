import type { SmartHomeAction, SmartHomeEntity, SmartHomeEntityAttributes } from "./smart-home-types";

type CapabilityEntity = Pick<SmartHomeEntity, "domain" | "state" | "attributes">;

export const getClimateTemperatureMode = (entity: CapabilityEntity): "single" | "range" | null => {
  if (entity.domain !== "climate") return null;
  if (["auto", "dry", "fan_only", "unknown", "unavailable"].includes(entity.state)) return null;
  const features = entity.attributes.supportedFeatures ?? 0;
  const single = (features & 1) !== 0;
  const range = (features & 2) !== 0;
  if (range && (entity.state === "heat_cool" || !single)) return "range";
  if (single && entity.state !== "heat_cool") return "single";
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

const within = (value: number, min: number | undefined, max: number | undefined) =>
  Number.isFinite(value) && (min === undefined || value >= min) && (max === undefined || value <= max);

export const supportsSmartHomeAction = (entity: CapabilityEntity, action: SmartHomeAction) => {
  const attributes = entity.attributes;
  switch (action.type) {
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
