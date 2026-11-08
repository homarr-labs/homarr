import {
  IconActivity,
  IconAirConditioning,
  IconAlarmSmoke,
  IconArrowUpCircle,
  IconAutomation,
  IconBattery1,
  IconBattery3,
  IconBatteryCharging,
  IconBed,
  IconBlind,
  IconBolt,
  IconBriefcase,
  IconBulb,
  IconBulbOff,
  IconCarGarage,
  IconClick,
  IconCloud,
  IconCloudFog,
  IconCloudRain,
  IconCloudSnow,
  IconCloudStorm,
  IconCoffee,
  IconDeviceCctv,
  IconDeviceDesktop,
  IconDeviceSpeaker,
  IconDeviceTv,
  IconDoor,
  IconDroplet,
  IconFlame,
  IconGauge,
  IconHome,
  IconLamp,
  IconLeaf,
  IconLock,
  IconLockOpen,
  IconMoon,
  IconMovie,
  IconPlug,
  IconPropeller,
  IconRipple,
  IconRobot,
  IconRouter,
  IconRun,
  IconShieldCheck,
  IconShieldLock,
  IconSnowflake,
  IconSofa,
  IconSolarPanel,
  IconSparkles,
  IconSun,
  IconSunrise,
  IconTemperature,
  IconToolsKitchen2,
  IconToggleLeft,
  IconTrees,
  IconUser,
  IconWand,
  IconWashMachine,
  IconWind,
  IconWindow,
} from "@tabler/icons-react";

import type { TablerIcon } from "@homarr/ui";
import { getClimateTemperatureMode } from "@homarr/integrations/types";

import { prototypeActionDomains, prototypeAreas, prototypeSensorIds } from "./fixtures";
import type { HaAction, HaArea, HaEntity, PrototypePreset } from "./types";

const customIcons: Record<string, TablerIcon> = {
  "mdi:led-strip-variant": IconBulb,
  "mdi:led-strip": IconBulb,
  "mdi:coffee-maker": IconCoffee,
  "mdi:lamp": IconLamp,
  "mdi:monitor-multiple": IconDeviceDesktop,
  "mdi:ev-station": IconPlug,
  "mdi:dishwasher": IconRipple,
  "mdi:washing-machine": IconWashMachine,
  "mdi:movie-open": IconMovie,
  "mdi:sofa": IconSofa,
  "mdi:weather-sunset-up": IconSunrise,
  "mdi:weather-night": IconMoon,
  "mdi:exit-run": IconRun,
  "mdi:account-group": IconUser,
  "mdi:home-switch": IconHome,
};

const sensorIcons: Record<string, TablerIcon> = {
  temperature: IconTemperature,
  humidity: IconDroplet,
  power: IconBolt,
  energy: IconBolt,
  carbon_dioxide: IconLeaf,
  battery: IconBattery3,
};

const binarySensorIcons: Record<string, TablerIcon> = {
  door: IconDoor,
  window: IconWindow,
  motion: IconRun,
  moisture: IconDroplet,
  smoke: IconAlarmSmoke,
};

const weatherIcons: Record<string, TablerIcon> = {
  sunny: IconSun,
  "clear-night": IconMoon,
  partlycloudy: IconCloud,
  cloudy: IconCloud,
  rainy: IconCloudRain,
  pouring: IconCloudRain,
  snowy: IconCloudSnow,
  fog: IconCloudFog,
  lightning: IconCloudStorm,
  windy: IconWind,
};

export const areaIcons: Record<string, TablerIcon> = {
  living_room: IconSofa,
  kitchen: IconToolsKitchen2,
  bedroom: IconBed,
  office: IconBriefcase,
  garage: IconCarGarage,
  outside: IconTrees,
};

export const getEntityIcon = (entity: HaEntity): TablerIcon => {
  const custom = entity.icon ? customIcons[entity.icon] : undefined;
  if (custom) return custom;
  switch (entity.domain) {
    case "light":
      return entity.state === "on" ? IconBulb : IconBulbOff;
    case "switch":
    case "input_boolean":
      return IconToggleLeft;
    case "fan":
      return IconPropeller;
    case "cover":
      return entity.deviceClass === "garage" ? IconCarGarage : IconBlind;
    case "climate":
      if (entity.state === "cool") return IconSnowflake;
      if (entity.state === "heat") return IconFlame;
      return IconAirConditioning;
    case "media_player":
      return entity.deviceClass === "tv" ? IconDeviceTv : IconDeviceSpeaker;
    case "lock":
      return entity.state === "locked" ? IconLock : IconLockOpen;
    case "sensor":
      if (entity.deviceClass === "battery") {
        const level = Number(entity.state);
        if (level < 30) return IconBattery1;
        return entity.id.includes("ev") ? IconBatteryCharging : IconBattery3;
      }
      if (entity.id.includes("solar")) return IconSolarPanel;
      return sensorIcons[entity.deviceClass ?? ""] ?? IconGauge;
    case "binary_sensor":
      return binarySensorIcons[entity.deviceClass ?? ""] ?? IconActivity;
    case "person":
      return IconUser;
    case "camera":
      return IconDeviceCctv;
    case "scene":
      return IconSparkles;
    case "script":
      return IconWand;
    case "automation":
      return IconAutomation;
    case "button":
      return entity.deviceClass === "restart" ? IconRouter : IconClick;
    case "alarm_control_panel":
      return entity.state === "disarmed" ? IconShieldLock : IconShieldCheck;
    case "vacuum":
      return IconRobot;
    case "valve":
      return IconDroplet;
    case "humidifier":
      return IconDroplet;
    case "weather":
      return weatherIcons[entity.state] ?? IconCloud;
    case "sun":
      return entity.state === "above_horizon" ? IconSun : IconMoon;
    case "update":
      return IconArrowUpCircle;
    case "input_select":
      return IconHome;
  }
};

export const isUnavailable = (entity: HaEntity) => entity.state === "unavailable" || entity.state === "unknown";

export const isEntityActive = (entity: HaEntity): boolean => {
  if (isUnavailable(entity)) return false;
  switch (entity.domain) {
    case "cover":
    case "valve":
      return entity.state !== "closed";
    case "lock":
      return entity.state !== "locked";
    case "person":
      return entity.state === "home";
    case "media_player":
      return entity.state === "playing";
    case "alarm_control_panel":
      return entity.state !== "disarmed";
    case "vacuum":
      return entity.state === "cleaning" || entity.state === "returning";
    case "climate":
      return entity.state !== "off";
    case "camera":
      return entity.state === "recording" || entity.state === "streaming";
    case "sensor":
    case "weather":
    case "scene":
    case "button":
    case "input_select":
      return true;
    case "sun":
      return entity.state === "above_horizon";
    default:
      return entity.state === "on";
  }
};

const climateColors: Record<string, string> = {
  heat: "orange",
  cool: "blue",
  auto: "green",
  heat_cool: "yellow",
  dry: "orange",
  fan_only: "cyan",
};

export const getStateColor = (entity: HaEntity): string => {
  if (isUnavailable(entity)) return "gray";
  const active = isEntityActive(entity);
  switch (entity.domain) {
    case "light":
    case "switch":
    case "input_boolean":
    case "automation":
    case "script":
      return active ? "yellow" : "gray";
    case "climate":
      return climateColors[entity.state] ?? "gray";
    case "cover":
      return active ? "violet" : "gray";
    case "fan":
      return active ? "cyan" : "gray";
    case "lock":
      return entity.state === "locked" ? "green" : "red";
    case "person":
      return active ? "green" : "blue";
    case "media_player":
      return active ? "grape" : "gray";
    case "alarm_control_panel":
      if (entity.state === "triggered") return "red";
      return entity.state === "disarmed" ? "gray" : "green";
    case "binary_sensor":
      if (["moisture", "smoke", "problem", "safety"].includes(entity.deviceClass ?? "")) {
        return active ? "red" : "green";
      }
      return active ? "orange" : "gray";
    case "vacuum":
      return active ? "teal" : "gray";
    case "humidifier":
    case "valve":
      return active ? "blue" : "gray";
    case "update":
      return active ? "orange" : "gray";
    case "camera":
      return active ? "red" : "gray";
    case "sun":
      return active ? "yellow" : "indigo";
    case "weather":
      return "blue";
    case "sensor":
      if (entity.deviceClass === "battery") {
        const level = Number(entity.state);
        if (level >= 70) return "green";
        return level >= 30 ? "orange" : "red";
      }
      return "blue";
    default:
      return "blue";
  }
};

const stateLabels: Record<string, string> = {
  on: "On",
  off: "Off",
  open: "Open",
  closed: "Closed",
  opening: "Opening",
  closing: "Closing",
  locked: "Locked",
  unlocked: "Unlocked",
  playing: "Playing",
  paused: "Paused",
  idle: "Idle",
  standby: "Standby",
  home: "Home",
  not_home: "Away",
  heat: "Heat",
  cool: "Cool",
  auto: "Auto",
  heat_cool: "Heat/cool",
  dry: "Dry",
  fan_only: "Fan",
  armed_home: "Armed home",
  armed_away: "Armed away",
  armed_night: "Armed night",
  disarmed: "Disarmed",
  triggered: "Triggered",
  cleaning: "Cleaning",
  docked: "Docked",
  returning: "Returning",
  recording: "Recording",
  streaming: "Streaming",
  above_horizon: "Above horizon",
  below_horizon: "Below horizon",
  unavailable: "Unavailable",
  unknown: "Unknown",
  partlycloudy: "Partly cloudy",
  cloudy: "Cloudy",
  sunny: "Sunny",
  rainy: "Rainy",
};

const binaryLabels: Record<string, [string, string]> = {
  door: ["Open", "Closed"],
  window: ["Open", "Closed"],
  motion: ["Detected", "Clear"],
  moisture: ["Wet", "Dry"],
  smoke: ["Smoke", "Clear"],
};

export const formatNumber = (value: number, maximumFractionDigits = 1) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(value);

export const formatRelativeTime = (timestamp: number) => {
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return formatter.format(seconds, "second");
};

export const formatEntityState = (entity: HaEntity): string => {
  if (isUnavailable(entity)) return stateLabels[entity.state] ?? entity.state;
  const attributes = entity.attributes;
  switch (entity.domain) {
    case "sensor": {
      if (attributes.stateLabel) return attributes.stateLabel;
      const value = Number(entity.state);
      if (Number.isNaN(value)) return entity.state;
      return `${formatNumber(value)}${entity.unit === "%" ? "" : " "}${entity.unit ?? ""}`.trim();
    }
    case "binary_sensor": {
      const labels = binaryLabels[entity.deviceClass ?? ""];
      if (!labels) return stateLabels[entity.state] ?? entity.state;
      return entity.state === "on" ? labels[0] : labels[1];
    }
    case "light":
      if (entity.state === "on" && attributes.brightness !== undefined) return `${attributes.brightness}%`;
      return stateLabels[entity.state] ?? entity.state;
    case "cover":
      if (entity.state === "open" && attributes.position !== undefined && attributes.position < 100) {
        return `Open · ${attributes.position}%`;
      }
      return stateLabels[entity.state] ?? entity.state;
    case "fan":
      return entity.state === "on" ? `${attributes.percentage ?? 0}%` : "Off";
    case "climate": {
      const action = attributes.hvacAction;
      if (entity.state === "off") return "Off";
      const mode = getClimateTemperatureMode(entity);
      let target = "";
      if (mode === "single" && attributes.targetTemperature !== undefined)
        target = ` · ${formatNumber(attributes.targetTemperature)}°`;
      if (
        mode === "range" &&
        attributes.targetTemperatureLow !== undefined &&
        attributes.targetTemperatureHigh !== undefined
      ) {
        target = ` · ${formatNumber(attributes.targetTemperatureLow)}–${formatNumber(attributes.targetTemperatureHigh)}°`;
      }
      const label = action === "heating" ? "Heating" : action === "cooling" ? "Cooling" : stateLabels[entity.state];
      return `${label ?? entity.state}${target}`;
    }
    case "media_player":
      if (entity.state === "playing" || entity.state === "paused")
        return attributes.mediaTitle ?? stateLabels[entity.state] ?? "";
      return stateLabels[entity.state] ?? entity.state;
    case "person":
      return entity.state === "home" ? "Home" : (attributes.zone ?? "Away");
    case "scene":
    case "button":
      return `Last ${formatRelativeTime(entity.lastChanged)}`;
    case "script":
    case "automation":
      if (entity.domain === "automation" && entity.state === "off") return "Disabled";
      return attributes.lastTriggered ? `Ran ${formatRelativeTime(attributes.lastTriggered)}` : "Never ran";
    case "weather":
      return `${formatNumber(attributes.currentTemperature ?? 0)}° · ${stateLabels[entity.state] ?? entity.state}`;
    case "update":
      return entity.state === "on" ? `${attributes.latestVersion} available` : "Up to date";
    case "vacuum":
      return attributes.status ?? stateLabels[entity.state] ?? entity.state;
    case "humidifier":
      return entity.state === "on" ? `Target ${attributes.targetHumidity ?? 0}%` : "Off";
    case "input_select":
      return entity.state;
    default:
      return stateLabels[entity.state] ?? entity.state;
  }
};

export const getPrimaryAction = (entity: HaEntity): HaAction | null => {
  if (isUnavailable(entity)) return null;
  switch (entity.domain) {
    case "light":
    case "switch":
    case "fan":
    case "input_boolean":
    case "humidifier":
    case "automation":
    case "cover":
    case "valve":
      return { type: "toggle" };
    case "climate": {
      const modes = entity.attributes.hvacModes ?? [];
      if (entity.state === "off" && modes.some((mode) => mode !== "off")) return { type: "toggle" };
      if (entity.state !== "off" && modes.includes("off")) return { type: "toggle" };
      return null;
    }
    case "lock":
      return entity.state === "locked" ? { type: "unlock" } : { type: "lock" };
    case "media_player":
      return { type: "mediaPlayPause" };
    case "scene":
    case "script":
    case "button":
      return { type: "trigger" };
    case "vacuum":
      return entity.state === "cleaning" ? { type: "vacuumReturn" } : { type: "vacuumStart" };
    default:
      return null;
  }
};

export const requiresConfirmation = (entity: HaEntity, action: HaAction) =>
  (entity.domain === "lock" && action.type === "unlock") ||
  (entity.domain === "alarm_control_panel" && action.type === "alarmDisarm") ||
  (entity.domain === "cover" && entity.deviceClass === "garage");

const registeredAreas = new Map<string, HaArea>();

export const registerAreas = (areas: readonly HaArea[]) => {
  areas.forEach((area) => registeredAreas.set(area.id, area));
};

export const getArea = (areaId: string | null): HaArea | undefined => {
  if (areaId === null) return undefined;
  return registeredAreas.get(areaId) ?? prototypeAreas.find((area) => area.id === areaId);
};

const outdoorPattern = /outside|outdoor|exterior|garden|yard|balcony|terrace|patio/i;

const isOutdoor = (entity: HaEntity) => {
  if (entity.areaId === "outside") return true;
  const area = getArea(entity.areaId);
  return outdoorPattern.test(entity.id) || (area !== undefined && outdoorPattern.test(area.name));
};

const isDailyEnergy = (entity: HaEntity) =>
  entity.domain === "sensor" && entity.deviceClass === "energy" && /today|daily/i.test(entity.id);

export const getPresetEntities = (
  entities: Record<string, HaEntity>,
  preset: PrototypePreset,
  areaId: string,
  entityId: string,
): HaEntity[] => {
  const all = Object.values(entities);
  switch (preset) {
    case "overview":
      return all;
    case "area":
      return all
        .filter((entity) => entity.areaId === areaId && !entity.id.startsWith("sensor.") === true)
        .concat(all.filter((entity) => entity.areaId === areaId && entity.id.startsWith("sensor.")));
    case "entity":
      return entities[entityId] ? [entities[entityId]] : [];
    case "actions":
      return all.filter((entity) => prototypeActionDomains.includes(entity.domain));
    case "sensors":
      return prototypeSensorIds.flatMap((id) => (entities[id] ? [entities[id]] : []));
  }
};

export interface HomeSummary {
  lightsOn: number;
  lightsTotal: number;
  peopleHome: HaEntity[];
  people: HaEntity[];
  openings: HaEntity[];
  unlocked: HaEntity[];
  alerts: HaEntity[];
  playing: HaEntity[];
  alarm: HaEntity | undefined;
  weather: HaEntity | undefined;
  insideTemperature: number | null;
  outsideTemperature: number | null;
  energyToday: HaEntity | undefined;
}

export const getHomeSummary = (entities: Record<string, HaEntity>): HomeSummary => {
  const all = Object.values(entities);
  const lights = all.filter((entity) => entity.domain === "light");
  const people = all.filter((entity) => entity.domain === "person");
  const temperatures = all.filter(
    (entity) =>
      entity.domain === "sensor" && entity.deviceClass === "temperature" && Number.isFinite(Number(entity.state)),
  );
  const insideTemperatures = temperatures.filter((entity) => !isOutdoor(entity)).map((entity) => Number(entity.state));
  const outside = entities["sensor.outside_temperature"] ?? temperatures.find(isOutdoor);
  return {
    lightsOn: lights.filter((entity) => entity.state === "on").length,
    lightsTotal: lights.length,
    peopleHome: people.filter((entity) => entity.state === "home"),
    people,
    openings: all.filter(
      (entity) =>
        (entity.domain === "binary_sensor" &&
          ["door", "window"].includes(entity.deviceClass ?? "") &&
          entity.state === "on") ||
        (entity.domain === "cover" && entity.deviceClass === "garage" && entity.state !== "closed"),
    ),
    unlocked: all.filter((entity) => entity.domain === "lock" && entity.state !== "locked"),
    alerts: all.filter(
      (entity) =>
        isUnavailable(entity) ||
        (entity.domain === "binary_sensor" && getStateColor(entity) === "red") ||
        (entity.attributes.batteryLevel !== undefined && entity.attributes.batteryLevel < 20) ||
        (entity.domain === "update" && entity.state === "on"),
    ),
    playing: all.filter((entity) => entity.domain === "media_player" && entity.state === "playing"),
    alarm: all.find((entity) => entity.domain === "alarm_control_panel"),
    weather: all.find((entity) => entity.domain === "weather"),
    insideTemperature: insideTemperatures.length
      ? insideTemperatures.reduce((total, value) => total + value, 0) / insideTemperatures.length
      : null,
    outsideTemperature: outside ? Number(outside.state) : null,
    energyToday: entities["sensor.energy_today"] ?? all.find(isDailyEnergy),
  };
};
