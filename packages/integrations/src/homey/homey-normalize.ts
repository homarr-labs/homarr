import type {
  SmartHomeArea,
  SmartHomeEntity,
  SmartHomeEntityAttributes,
} from "../interfaces/smart-home/smart-home-types";
import type { HomeyCapability, HomeyDevice, HomeyFlow, HomeyZone } from "./homey-types";

export type HomeyPrimaryRole =
  | "light"
  | "switch"
  | "cover"
  | "lock"
  | "climate"
  | "fan"
  | "media_player"
  | "vacuum"
  | "button"
  | "humidifier"
  | "water_heater"
  | "alarm"
  | "valve";

export type HomeyEntityTarget =
  | { kind: "device"; role: HomeyPrimaryRole; device: HomeyDevice }
  | { kind: "capability"; device: HomeyDevice; capabilityId: string }
  | { kind: "flow"; flow: HomeyFlow };

export interface HomeyEntityRecord {
  entity: SmartHomeEntity;
  target: HomeyEntityTarget;
  hidden: boolean;
}

// Homey reports light temperature as 0 (cold) to 1 (warm).
export const HOMEY_WARMEST_KELVIN = 2700;
export const HOMEY_COLDEST_KELVIN = 6500;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const kelvinToHomeyTemperature = (kelvin: number) =>
  clamp((HOMEY_COLDEST_KELVIN - kelvin) / (HOMEY_COLDEST_KELVIN - HOMEY_WARMEST_KELVIN), 0, 1);

const homeyTemperatureToKelvin = (value: number) =>
  Math.round(HOMEY_COLDEST_KELVIN - clamp(value, 0, 1) * (HOMEY_COLDEST_KELVIN - HOMEY_WARMEST_KELVIN));

export const hueSaturationToRgb = (hue: number, saturation: number): [number, number, number] => {
  const h = (clamp(hue, 0, 1) * 6) % 6;
  const s = clamp(saturation, 0, 1);
  const c = s;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = 1 - c;
  const [r, g, b] =
    h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
};

export const rgbToHueSaturation = ([red, green, blue]: [number, number, number]) => {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  let hue = 0;
  if (delta > 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
  }
  return { hue: ((hue < 0 ? hue + 6 : hue) / 6) % 1, saturation: max === 0 ? 0 : delta / max };
};

const slug = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "x";

const number = (capability: HomeyCapability | undefined) =>
  typeof capability?.value === "number" && Number.isFinite(capability.value) ? capability.value : undefined;
const boolean = (capability: HomeyCapability | undefined) =>
  typeof capability?.value === "boolean" ? capability.value : undefined;
const text = (capability: HomeyCapability | undefined) =>
  typeof capability?.value === "string" && capability.value.length > 0 ? capability.value : undefined;
const percent = (capability: HomeyCapability | undefined) => {
  const value = number(capability);
  return value === undefined ? undefined : Math.round(value * 100);
};
const optionIds = (capability: HomeyCapability | undefined) => capability?.values?.map((option) => option.id);

const timestamp = (value: HomeyCapability["lastUpdated"]) => {
  if (typeof value === "number") return value;
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
};

const compact = (attributes: SmartHomeEntityAttributes): SmartHomeEntityAttributes =>
  Object.fromEntries(
    Object.entries(attributes).filter(([, value]) => value !== undefined),
  ) as SmartHomeEntityAttributes;

const capabilityState = (capability: HomeyCapability) => {
  const value = capability.value;
  if (value === null || value === undefined || value === "") return "unknown";
  if (typeof value === "boolean") return value ? "on" : "off";
  return value.toString();
};

interface PrimaryEntity {
  domain: string;
  state: string;
  deviceClass?: string | null;
  attributes: SmartHomeEntityAttributes;
  consumed: string[];
}

type DeviceCapabilities = (id: string) => HomeyCapability | undefined;

// Device classes from homey-lib (assets/device/classes); other classes become a switch when they have onoff.
const coverClasses = new Set(["windowcoverings", "blinds", "curtain", "sunshade", "shutterblinds", "garagedoor"]);
const climateClasses = new Set(["thermostat", "heater", "airconditioning", "heatpump", "radiator"]);
const waterHeaterClasses = new Set(["waterheater", "boiler"]);
const fanClasses = new Set(["fan", "airpurifier", "airtreatment"]);
const humidifierClasses = new Set(["humidifier", "dehumidifier"]);
const mediaClasses = new Set(["speaker", "tv", "amplifier", "settopbox", "mediaplayer"]);
const vacuumClasses = new Set(["vacuumcleaner", "mop"]);
const sensorOnlyClasses = new Set(["sensor", "smokealarm", "doorbell", "camera", "remote"]);

/** Homey stores many setpoints as 0..1 with a "%" unit; Homarr shows them as 0..100. */
export const isFractionPercent = (capability: Pick<HomeyCapability, "units" | "max">) =>
  capability.units === "%" && capability.max === 1;

export const getHomeyPrimaryRole = (device: HomeyDevice): HomeyPrimaryRole | null => {
  const deviceClass = device.class;
  if (deviceClass === "light" || device.virtualClass === "light") return "light";
  if (coverClasses.has(deviceClass)) return "cover";
  if (deviceClass === "lock") return "lock";
  if (climateClasses.has(deviceClass)) return "climate";
  if (waterHeaterClasses.has(deviceClass)) return "water_heater";
  if (fanClasses.has(deviceClass)) return "fan";
  if (humidifierClasses.has(deviceClass)) return "humidifier";
  if (mediaClasses.has(deviceClass)) return "media_player";
  if (vacuumClasses.has(deviceClass)) return "vacuum";
  if (deviceClass === "homealarm") return "alarm";
  if (deviceClass === "watervalve") return "valve";
  if (deviceClass === "button") return "button";
  if (sensorOnlyClasses.has(deviceClass)) return null;
  return "switch";
};

const toHvacMode = (mode: string) => (mode === "fan" ? "fan_only" : mode);
export const fromHvacMode = (mode: string) => (mode === "fan_only" ? "fan" : mode);

const buildLight = (cap: DeviceCapabilities): PrimaryEntity | null => {
  const onoff = cap("onoff");
  const dim = cap("dim");
  if (!onoff && !dim) return null;
  const hue = cap("light_hue");
  const saturation = cap("light_saturation");
  const temperature = cap("light_temperature");
  const hasColor = hue?.setable === true && saturation?.setable === true;
  const hasTemperature = temperature?.setable === true;
  const colorModes = [...(hasColor ? ["hs"] : []), ...(hasTemperature ? ["color_temp"] : [])];
  if (colorModes.length === 0) colorModes.push(dim?.setable ? "brightness" : "onoff");
  const usesTemperature = hasTemperature && (!hasColor || text(cap("light_mode")) === "temperature");
  const isOn = boolean(onoff) ?? (number(dim) ?? 0) > 0;
  return {
    domain: "light",
    state: isOn ? "on" : "off",
    attributes: {
      brightness: percent(dim),
      colorModes,
      colorMode: usesTemperature ? "color_temp" : colorModes[0],
      rgbColor:
        hasColor && !usesTemperature ? hueSaturationToRgb(number(hue) ?? 0, number(saturation) ?? 0) : undefined,
      colorTempKelvin:
        usesTemperature && number(temperature) !== undefined
          ? homeyTemperatureToKelvin(number(temperature) ?? 0)
          : undefined,
      minColorTempKelvin: hasTemperature ? HOMEY_WARMEST_KELVIN : undefined,
      maxColorTempKelvin: hasTemperature ? HOMEY_COLDEST_KELVIN : undefined,
    },
    consumed: ["onoff", "dim", "light_hue", "light_saturation", "light_temperature", "light_mode"],
  };
};

const buildSwitch = (cap: DeviceCapabilities): PrimaryEntity | null => {
  const onoff = cap("onoff");
  if (!onoff?.setable) return null;
  return { domain: "switch", state: capabilityState(onoff), attributes: {}, consumed: ["onoff"] };
};

const coverCapabilities = [
  "windowcoverings_set",
  "windowcoverings_state",
  "windowcoverings_closed",
  "windowcoverings_tilt_set",
  "garagedoor_closed",
];

export const supportsHomeyCoverMotion = (capability: HomeyCapability | undefined, value: "up" | "down" | "idle") =>
  capability?.setable === true && optionIds(capability)?.includes(value) !== false;

const buildCover = (cap: DeviceCapabilities, device: HomeyDevice): PrimaryEntity | null => {
  const position = cap("windowcoverings_set");
  const motion = cap("windowcoverings_state");
  const closed = cap("windowcoverings_closed");
  const tilt = cap("windowcoverings_tilt_set");
  const garage = cap("garagedoor_closed");
  if (!position && !motion && !closed && !garage) return null;

  const positionValue = percent(position);
  const isClosed = boolean(garage) ?? (positionValue === undefined ? boolean(closed) : positionValue <= 0);
  const motionValue = text(motion);
  let state = "unknown";
  if (isClosed !== undefined) state = isClosed ? "closed" : "open";
  else if (motionValue === "up") state = "opening";
  else if (motionValue === "down") state = "closing";
  else if (motionValue === "idle") state = "idle";

  const canSetPosition = [position, closed, garage].some((capability) => capability?.setable === true);
  const features =
    (canSetPosition || supportsHomeyCoverMotion(motion, "up") ? 1 : 0) |
    (canSetPosition || supportsHomeyCoverMotion(motion, "down") ? 2 : 0) |
    (position?.setable ? 4 : 0) |
    (supportsHomeyCoverMotion(motion, "idle") ? 8 : 0) |
    (tilt?.setable ? 128 : 0);

  return {
    domain: "cover",
    state,
    deviceClass: garage ? "garage" : (device.virtualClass ?? null),
    attributes: {
      supportedFeatures: features,
      position: positionValue,
      coverPositionUnknown: isClosed === undefined || undefined,
      tiltPosition: percent(tilt),
    },
    consumed: coverCapabilities,
  };
};

const buildLock = (cap: DeviceCapabilities): PrimaryEntity | null => {
  const locked = cap("locked");
  if (!locked) return null;
  const value = boolean(locked);
  return {
    domain: "lock",
    state: value === undefined ? "unknown" : value ? "locked" : "unlocked",
    attributes: {},
    consumed: ["locked"],
  };
};

const buildClimate = (cap: DeviceCapabilities): PrimaryEntity | null => {
  const target = cap("target_temperature");
  const mode = cap("thermostat_mode");
  if (!target && !mode && !cap("target_temperature_min")) return null;
  const onoff = cap("onoff");
  const fanSpeed = cap("thermostat_fan_speed")?.setable ? cap("thermostat_fan_speed") : cap("fan_mode");
  const low = cap("target_temperature_min");
  const high = cap("target_temperature_max");
  const hasRange = low?.setable === true && high?.setable === true;
  const humidity = cap("target_humidity");
  const modes = mode?.setable ? (optionIds(mode) ?? []).map(toHvacMode) : [];
  const hvacModes = [...new Set([...(onoff?.setable ? ["off"] : []), ...(modes.length > 0 ? modes : ["heat"])])];
  let state = "heat";
  if (boolean(onoff) === false) state = "off";
  else if (text(mode)) state = toHvacMode(text(mode) ?? "heat");

  return {
    domain: "climate",
    state,
    attributes: {
      supportedFeatures: (target?.setable ? 1 : 0) | (hasRange ? 2 : 0) | (humidity?.setable ? 4 : 0),
      currentTemperature: number(cap("measure_temperature")),
      targetTemperature: number(target),
      targetTemperatureLow: hasRange ? number(low) : undefined,
      targetTemperatureHigh: hasRange ? number(high) : undefined,
      minTemperature: target?.min ?? low?.min ?? undefined,
      maxTemperature: target?.max ?? high?.max ?? undefined,
      temperatureStep: target?.step ?? undefined,
      temperatureUnit: (target ?? low)?.units ?? undefined,
      currentHumidity: number(cap("measure_humidity")),
      targetHumidity: humidity?.setable ? percent(humidity) : undefined,
      hvacModes,
      fanMode: fanSpeed?.setable ? text(fanSpeed) : undefined,
      fanModes: fanSpeed?.setable ? optionIds(fanSpeed) : undefined,
    },
    consumed: [
      "onoff",
      "target_temperature",
      "thermostat_mode",
      ...(fanSpeed?.setable ? [fanSpeed.id] : []),
      ...(hasRange ? ["target_temperature_min", "target_temperature_max"] : []),
      ...(humidity?.setable ? ["target_humidity"] : []),
    ],
  };
};

/**
 * Homey's own `fan_speed` runs from 0 to 1, but apps add stepped variants such as `fanSpeed0to12` (0–12).
 * Any settable number whose id starts with `fan_speed` or `fanSpeed` drives the fan's speed slider.
 */
const FAN_SPEED_ID = /^fan_?speed/i;

export const getHomeyFanSpeedCapability = (capabilities: Record<string, HomeyCapability>) => {
  const standard = capabilities.fan_speed;
  if (standard?.setable) return standard;
  return Object.values(capabilities)
    .filter((capability) => FAN_SPEED_ID.test(capability.id) && capability.type === "number" && capability.setable)
    .toSorted((left, right) => left.id.localeCompare(right.id))
    .at(0);
};

const speedRange = (capability: HomeyCapability) => {
  const min = capability.min ?? 0;
  const max = capability.max ?? 1;
  return { min, max: max > min ? max : min + 1 };
};

const fanSpeedPercent = (capability: HomeyCapability | undefined) => {
  const value = number(capability);
  if (!capability || value === undefined) return undefined;
  const { min, max } = speedRange(capability);
  return Math.round(((value - min) / (max - min)) * 100);
};

/** The slider distance between two speed levels, e.g. 8.33 % for a fan with twelve levels. */
const fanSpeedStepPercent = (capability: HomeyCapability | undefined) => {
  if (!capability?.step) return undefined;
  const { min, max } = speedRange(capability);
  return (capability.step / (max - min)) * 100;
};

/** Converts a 0–100 slider value back to the capability's own range, snapped to its step. */
export const toHomeyFanSpeed = (capability: HomeyCapability, percentage: number) => {
  const { min, max } = speedRange(capability);
  const raw = min + (Math.min(100, Math.max(0, percentage)) / 100) * (max - min);
  const step = capability.step ?? (max - min > 1 ? 1 : undefined);
  if (!step) return raw;
  // Any speed above zero should still turn the fan, so round up from the lowest step.
  return Math.min(max, Math.max(min + step, Math.round((raw - min) / step) * step + min));
};

const buildFan = (cap: DeviceCapabilities, capabilities: Record<string, HomeyCapability>): PrimaryEntity | null => {
  const onoff = cap("onoff");
  if (!onoff?.setable) return null;
  const speed = getHomeyFanSpeedCapability(capabilities);
  const oscillating = cap("oscillating");
  return {
    domain: "fan",
    state: capabilityState(onoff),
    attributes: {
      supportedFeatures: (speed ? 1 : 0) | (oscillating?.setable ? 2 : 0),
      percentage: fanSpeedPercent(speed),
      percentageStep: fanSpeedStepPercent(speed),
      oscillating: boolean(oscillating),
    },
    consumed: ["onoff", "fan_speed", "oscillating", ...(speed ? [speed.id] : [])],
  };
};

const repeatModes: Record<string, string> = { none: "off", track: "one", playlist: "all" };

const buildMediaPlayer = (cap: DeviceCapabilities, device: HomeyDevice): PrimaryEntity | null => {
  const onoff = cap("onoff");
  const playing = cap("speaker_playing");
  const volume = cap("volume_set");
  if (!onoff && !playing && !volume) return null;
  let state = "idle";
  if (boolean(onoff) === false) state = "off";
  else if (playing) state = boolean(playing) ? "playing" : "paused";
  else if (onoff) state = "on";

  const features =
    (playing?.setable ? 1 | 16384 : 0) |
    (volume?.setable ? 4 : 0) |
    (cap("volume_mute")?.setable ? 8 : 0) |
    (cap("speaker_prev")?.setable ? 16 : 0) |
    (cap("speaker_next")?.setable ? 32 : 0) |
    (onoff?.setable ? 128 | 256 : 0) |
    (cap("media_input")?.setable ? 2048 : 0);

  return {
    domain: "media_player",
    state,
    deviceClass: device.class === "tv" ? "tv" : "speaker",
    attributes: {
      supportedFeatures: features,
      mediaTitle: text(cap("speaker_track")),
      mediaArtist: text(cap("speaker_artist")),
      mediaAlbum: text(cap("speaker_album")),
      volume: number(volume),
      isMuted: boolean(cap("volume_mute")),
      mediaDuration: number(cap("speaker_duration")),
      mediaPosition: number(cap("speaker_position")),
      shuffle: boolean(cap("speaker_shuffle")),
      repeat: repeatModes[text(cap("speaker_repeat")) ?? ""],
      mediaSource: text(cap("media_input")),
      sources: cap("media_input")?.setable ? optionIds(cap("media_input")) : undefined,
    },
    consumed: [
      "onoff",
      "speaker_playing",
      "speaker_next",
      "speaker_prev",
      "speaker_track",
      "speaker_artist",
      "speaker_album",
      "speaker_duration",
      "speaker_position",
      "speaker_shuffle",
      "speaker_repeat",
      "speaker_stop",
      "media_input",
      "volume_set",
      "volume_mute",
      "volume_up",
      "volume_down",
    ],
  };
};

const vacuumStates: Record<string, string> = {
  cleaning: "cleaning",
  spot_cleaning: "cleaning",
  docked: "docked",
  charging: "docked",
  stopped: "idle",
};

const buildVacuum = (cap: DeviceCapabilities): PrimaryEntity | null => {
  const vacuumState = cap("vacuumcleaner_state");
  const onoff = cap("onoff");
  if (!vacuumState?.setable && !onoff?.setable) return null;
  let state = "idle";
  if (vacuumState) state = vacuumStates[text(vacuumState) ?? ""] ?? "idle";
  else if (boolean(onoff)) state = "cleaning";
  else if (boolean(cap("docked"))) state = "docked";
  return {
    domain: "vacuum",
    state,
    attributes: { batteryLevel: number(cap("measure_battery")) },
    consumed: ["vacuumcleaner_state", "onoff", "docked"],
  };
};

const buildButton = (cap: DeviceCapabilities): PrimaryEntity | null => {
  const button = cap("button");
  if (!button?.setable) return null;
  const pressed = timestamp(button.lastUpdated);
  return {
    domain: "button",
    state: pressed > 0 ? new Date(pressed).toISOString() : "idle",
    attributes: {},
    consumed: ["button"],
  };
};

const buildHumidifier = (cap: DeviceCapabilities, device: HomeyDevice): PrimaryEntity | null => {
  const onoff = cap("onoff");
  if (!onoff?.setable) return null;
  const target = cap("target_humidity");
  return {
    domain: "humidifier",
    state: capabilityState(onoff),
    deviceClass: device.class,
    attributes: {
      currentHumidity: number(cap("measure_humidity")),
      targetHumidity: target?.setable ? percent(target) : undefined,
      minHumidity: target?.setable ? 0 : undefined,
      maxHumidity: target?.setable ? 100 : undefined,
    },
    consumed: ["onoff", "target_humidity"],
  };
};

const buildWaterHeater = (cap: DeviceCapabilities): PrimaryEntity | null => {
  const target = cap("target_temperature");
  const mode = cap("heater_operation_mode");
  const onoff = cap("onoff");
  if (!target && !mode && !onoff) return null;
  let state = boolean(onoff) === false ? "off" : "on";
  if (text(mode)) state = text(mode) ?? state;
  return {
    domain: "water_heater",
    state,
    attributes: {
      currentTemperature: number(cap("measure_temperature")),
      targetTemperature: number(target),
      minTemperature: target?.min ?? undefined,
      maxTemperature: target?.max ?? undefined,
      temperatureUnit: target?.units ?? undefined,
      mode: text(mode),
      modes: mode?.setable ? optionIds(mode) : undefined,
    },
    consumed: ["onoff", "target_temperature", "heater_operation_mode"],
  };
};

const alarmStates: Record<string, string> = {
  armed: "armed_away",
  partially_armed: "armed_home",
  disarmed: "disarmed",
};

const buildAlarm = (cap: DeviceCapabilities): PrimaryEntity | null => {
  const alarmState = cap("homealarm_state");
  if (!alarmState) return null;
  return {
    domain: "alarm_control_panel",
    state: alarmStates[text(alarmState) ?? ""] ?? "unknown",
    // Arm home (1) maps to "partially_armed", arm away (2) to "armed".
    attributes: { supportedFeatures: alarmState.setable ? 1 | 2 : 0, codeRequired: false },
    consumed: ["homealarm_state"],
  };
};

const buildValve = (cap: DeviceCapabilities): PrimaryEntity | null => {
  const onoff = cap("onoff");
  const position = cap("valve_position");
  if (!onoff && !position) return null;
  const positionValue = percent(position);
  let state = boolean(onoff) ? "open" : "closed";
  if (!onoff && positionValue !== undefined) state = positionValue > 0 ? "open" : "closed";
  return {
    domain: "valve",
    state,
    attributes: { position: positionValue },
    consumed: ["onoff", "valve_position"],
  };
};

const buildPrimary = (device: HomeyDevice, role: HomeyPrimaryRole, cap: DeviceCapabilities) => {
  switch (role) {
    case "light":
      return buildLight(cap);
    case "switch":
      return buildSwitch(cap);
    case "cover":
      return buildCover(cap, device);
    case "lock":
      return buildLock(cap);
    case "climate":
      return buildClimate(cap);
    case "fan":
      return buildFan(cap, device.capabilitiesObj ?? {});
    case "media_player":
      return buildMediaPlayer(cap, device);
    case "vacuum":
      return buildVacuum(cap);
    case "button":
      return buildButton(cap);
    case "humidifier":
      return buildHumidifier(cap, device);
    case "water_heater":
      return buildWaterHeater(cap);
    case "alarm":
      return buildAlarm(cap);
    case "valve":
      return buildValve(cap);
  }
};

const sensorClasses: Record<string, string> = {
  measure_temperature: "temperature",
  measure_humidity: "humidity",
  measure_power: "power",
  measure_apparent_power: "apparent_power",
  measure_voltage: "voltage",
  measure_current: "current",
  measure_battery: "battery",
  measure_pressure: "pressure",
  measure_luminance: "illuminance",
  measure_co2: "carbon_dioxide",
  measure_co: "carbon_monoxide",
  measure_pm25: "pm25",
  measure_pm10: "pm10",
  measure_noise: "sound_pressure",
  measure_rain: "precipitation",
  measure_wind_strength: "wind_speed",
  measure_gust_strength: "wind_speed",
  meter_power: "energy",
  meter_gas: "gas",
  meter_water: "water",
};

const binarySensorClasses: Record<string, string> = {
  alarm_motion: "motion",
  alarm_contact: "door",
  alarm_smoke: "smoke",
  alarm_fire: "smoke",
  alarm_water: "moisture",
  alarm_battery: "battery",
  alarm_tamper: "tamper",
  alarm_heat: "heat",
  alarm_co: "carbon_monoxide",
  alarm_co2: "gas",
  alarm_presence: "presence",
  alarm_vibration: "vibration",
};

interface SecondaryEntity {
  domain: string;
  state: string;
  deviceClass: string | null;
  stateClass: string | null;
  unit: string | null;
  attributes: SmartHomeEntityAttributes;
}

const buildSecondary = (capability: HomeyCapability): SecondaryEntity | null => {
  const base = capability.id.split(".")[0] ?? capability.id;
  const isMeasurement = base.startsWith("measure_") || base.startsWith("meter_");
  const sensor = (state = capabilityState(capability)): SecondaryEntity => ({
    domain: "sensor",
    state,
    deviceClass: sensorClasses[base] ?? null,
    stateClass: base.startsWith("meter_") ? "total_increasing" : isMeasurement ? "measurement" : null,
    unit: capability.units ?? null,
    attributes: {},
  });

  switch (capability.type) {
    case "boolean":
      if (capability.setable && capability.getable === false) {
        const pressed = timestamp(capability.lastUpdated);
        return {
          domain: "button",
          state: pressed > 0 ? new Date(pressed).toISOString() : "idle",
          deviceClass: null,
          stateClass: null,
          unit: null,
          attributes: {},
        };
      }
      return {
        domain: capability.setable ? "switch" : "binary_sensor",
        state: capabilityState(capability),
        deviceClass: capability.setable
          ? null
          : (binarySensorClasses[base] ?? (base.startsWith("alarm_") ? "problem" : null)),
        stateClass: null,
        unit: null,
        attributes: {},
      };
    case "number":
      if (!capability.setable || isMeasurement) return sensor();
      if (isFractionPercent(capability)) {
        const value = typeof capability.value === "number" ? Math.round(capability.value * 100) : null;
        return {
          domain: "number",
          state: value === null ? "unknown" : value.toString(),
          deviceClass: null,
          stateClass: null,
          unit: "%",
          attributes: { min: Math.round((capability.min ?? 0) * 100), max: 100, step: 1 },
        };
      }
      return {
        domain: "number",
        state: capabilityState(capability),
        deviceClass: null,
        stateClass: null,
        unit: capability.units ?? null,
        attributes: {
          min: capability.min ?? undefined,
          max: capability.max ?? undefined,
          step: capability.step ?? undefined,
        },
      };
    case "enum":
      if (!capability.setable) return sensor();
      return {
        domain: "select",
        state: capabilityState(capability),
        deviceClass: null,
        stateClass: null,
        unit: null,
        attributes: { options: optionIds(capability) },
      };
    case "string":
      return sensor();
    default:
      return null;
  }
};

const uniqueId = (used: Set<string>, candidate: string) => {
  let id = candidate;
  for (let suffix = 2; used.has(id); suffix++) id = `${candidate}_${suffix}`;
  used.add(id);
  return id;
};

export const normalizeHomeyDevices = (devices: HomeyDevice[]): HomeyEntityRecord[] => {
  const used = new Set<string>();
  const records: HomeyEntityRecord[] = [];
  for (const device of devices.toSorted((left, right) => left.id.localeCompare(right.id))) {
    const capabilities = device.capabilitiesObj ?? {};
    const cap: DeviceCapabilities = (id) => capabilities[id];
    const deviceUpdated = Math.max(
      0,
      ...Object.values(capabilities).map((capability) => timestamp(capability.lastUpdated)),
    );
    const available = device.available !== false;
    const deviceSlug = slug(device.id);
    const hidden = device.hidden === true;

    const role = getHomeyPrimaryRole(device);
    let primary = role ? buildPrimary(device, role, cap) : null;
    let primaryRole = role;
    if (!primary && role !== "switch" && role !== null) {
      primary = buildSwitch(cap);
      primaryRole = "switch";
    }
    const consumed = new Set(primary?.consumed ?? []);

    if (primary && primaryRole) {
      const updated = Math.max(0, ...primary.consumed.map((id) => timestamp(cap(id)?.lastUpdated))) || deviceUpdated;
      records.push({
        hidden,
        target: { kind: "device", role: primaryRole, device },
        entity: {
          id: uniqueId(used, `${primary.domain}.${deviceSlug}`),
          domain: primary.domain,
          name: device.name,
          areaId: device.zone ?? null,
          device: { id: device.id, name: device.name, entityName: null },
          state: available ? primary.state : "unavailable",
          icon: null,
          deviceClass: primary.deviceClass ?? null,
          stateClass: null,
          unit: null,
          lastChanged: updated,
          lastUpdated: updated,
          attributes: compact({ batteryLevel: number(cap("measure_battery")), ...primary.attributes }),
        },
      });
    }

    for (const capability of Object.values(capabilities)) {
      if (consumed.has(capability.id)) continue;
      // Apps use capabilities that are neither readable nor settable as internal markers, e.g. a device generation.
      if (capability.getable === false && !capability.setable) continue;
      const secondary = buildSecondary(capability);
      if (!secondary) continue;
      const updated = timestamp(capability.lastUpdated) || deviceUpdated;
      records.push({
        hidden: hidden || capability.maintenanceAction === true,
        target: { kind: "capability", device, capabilityId: capability.id },
        entity: {
          id: uniqueId(used, `${secondary.domain}.${deviceSlug}_${slug(capability.id)}`),
          domain: secondary.domain,
          // The capability comes first so truncated names of one device's sensors stay distinguishable.
          name: `${capability.title ?? capability.id} · ${device.name}`,
          areaId: device.zone ?? null,
          device: { id: device.id, name: device.name, entityName: capability.title ?? capability.id },
          state: available ? secondary.state : "unavailable",
          icon: null,
          deviceClass: secondary.deviceClass,
          stateClass: secondary.stateClass,
          unit: secondary.unit,
          lastChanged: updated,
          lastUpdated: updated,
          attributes: compact(secondary.attributes),
        },
      });
    }
  }
  return records;
};

export const normalizeHomeyFlows = (flows: HomeyFlow[]): HomeyEntityRecord[] =>
  flows
    .filter((flow) => flow.triggerable !== false && flow.broken !== true)
    .toSorted((left, right) => left.id.localeCompare(right.id))
    .map((flow) => ({
      hidden: false,
      target: { kind: "flow", flow },
      entity: {
        id: `automation.${slug(flow.id)}`,
        domain: "automation",
        name: flow.name,
        areaId: null,
        state: flow.enabled === false ? "off" : "on",
        icon: null,
        deviceClass: null,
        stateClass: null,
        unit: null,
        lastChanged: 0,
        lastUpdated: 0,
        attributes: {},
      },
    }));

const zoneIcon = (icon: string | null | undefined) => {
  if (!icon) return null;
  if (icon.startsWith("bedroom")) return "bedroom";
  if (["garden", "terrace", "balcony", "outside", "yard", "patio"].includes(icon)) return "outside";
  if (icon === "study") return "office";
  return slug(icon);
};

export const normalizeHomeyZones = (zones: HomeyZone[]): SmartHomeArea[] =>
  zones
    .map((zone) => ({
      id: zone.id,
      name: zone.name,
      floorId: null,
      icon: zoneIcon(zone.icon),
      temperatureEntityId: null,
      humidityEntityId: null,
    }))
    .toSorted((left, right) => left.name.localeCompare(right.name));
