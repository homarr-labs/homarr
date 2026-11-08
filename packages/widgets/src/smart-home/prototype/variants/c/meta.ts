import type { CSSProperties } from "react";

import {
  formatEntityState,
  formatRelativeTime,
  getArea,
  getStateColor,
  isEntityActive,
  isUnavailable,
} from "../../semantics";
import type { HaDomain, HaEntity } from "../../types";

export type Vars = CSSProperties & Record<`--${string}`, string | number>;

export const capitalize = (value: string) => value.replace(/_/g, " ").replace(/^\w/, (char) => char.toUpperCase());

export const domainTitles: Record<HaDomain, string> = {
  light: "Lights",
  climate: "Climate",
  media_player: "Media",
  cover: "Covers",
  fan: "Fans",
  humidifier: "Humidifiers",
  switch: "Switches",
  input_boolean: "Helpers",
  input_select: "Helpers",
  valve: "Valves",
  lock: "Locks",
  alarm_control_panel: "Security",
  camera: "Cameras",
  vacuum: "Vacuums",
  scene: "Scenes",
  script: "Scripts",
  automation: "Automations",
  button: "Buttons",
  binary_sensor: "Sensors",
  sensor: "Readings",
  person: "People",
  weather: "Weather",
  sun: "Sun",
  update: "Updates",
};

export const domainOrder: HaDomain[] = [
  "person",
  "alarm_control_panel",
  "lock",
  "light",
  "climate",
  "media_player",
  "cover",
  "fan",
  "humidifier",
  "switch",
  "valve",
  "vacuum",
  "camera",
  "scene",
  "script",
  "automation",
  "button",
  "input_boolean",
  "input_select",
  "binary_sensor",
  "sensor",
  "weather",
  "sun",
  "update",
];

const passiveDomains: HaDomain[] = ["sensor", "binary_sensor", "person", "weather", "sun", "update"];

export const isPassive = (entity: HaEntity) => passiveDomains.includes(entity.domain);
export const isSensorLike = (entity: HaEntity) => entity.domain === "sensor" || entity.domain === "binary_sensor";

export const getToneVars = (color: string): Vars => {
  if (color === "gray") {
    const value = "light-dark(var(--mantine-color-gray-6), var(--mantine-color-gray-5))";
    return {
      "--c": value,
      "--c-text": "light-dark(var(--mantine-color-gray-7), var(--mantine-color-gray-5))",
    };
  }
  let lightText = `var(--mantine-color-${color}-9)`;
  if (["green", "orange", "teal", "red", "cyan", "lime"].includes(color)) {
    lightText = `color-mix(in srgb, ${lightText} 80%, #000)`;
  }
  if (color === "yellow") {
    lightText = `color-mix(in srgb, ${lightText} 70%, #000)`;
  }
  return {
    "--c": `var(--mantine-color-${color}-filled)`,
    "--c-text": `light-dark(${lightText}, var(--mantine-color-${color}-3))`,
  };
};

export const getColorVars = (entity: HaEntity): Vars => {
  const rgb = entity.domain === "light" && entity.state === "on" ? entity.attributes.rgbColor : undefined;
  if (rgb) {
    const value = `rgb(${rgb.join(",")})`;
    return { "--c": value, "--c-text": value };
  }
  return getToneVars(getStateColor(entity));
};

const selfDescribing: HaDomain[] = ["scene", "script", "button", "automation"];

export const getSecondary = (entity: HaEntity, showArea: boolean) => {
  const parts: string[] = [];
  const area = showArea ? getArea(entity.areaId)?.name : undefined;
  if (area) parts.push(area);
  if (entity.domain === "media_player" && entity.attributes.mediaTitle && entity.state !== "idle") {
    const artist = entity.attributes.mediaArtist;
    parts.push(artist ? `${entity.attributes.mediaTitle} · ${artist}` : entity.attributes.mediaTitle);
    return parts.join(" · ");
  }
  if (isUnavailable(entity)) {
    parts.push(`Unavailable ${formatRelativeTime(entity.lastChanged)}`);
    return parts.join(" · ");
  }
  if (entity.domain === "sensor") {
    parts.push(formatRelativeTime(entity.lastChanged));
    return parts.join(" · ");
  }
  if (entity.domain === "binary_sensor" || entity.domain === "person") {
    parts.push(formatRelativeTime(entity.lastChanged));
    return parts.join(" · ");
  }
  parts.push(formatEntityState(entity));
  if (!selfDescribing.includes(entity.domain)) parts.push(formatRelativeTime(entity.lastChanged));
  return parts.join(" · ");
};

export interface Section {
  key: string;
  title: string;
  entities: HaEntity[];
}

export const groupByDomain = (entities: HaEntity[]): Section[] => {
  const sections: Section[] = [];
  for (const domain of domainOrder) {
    const title = domainTitles[domain];
    const matching = entities.filter((entity) => entity.domain === domain);
    if (matching.length === 0) continue;
    const existing = sections.find((section) => section.title === title);
    if (existing) {
      existing.entities.push(...matching);
      continue;
    }
    sections.push({ key: domain, title, entities: matching });
  }
  return sections;
};

export const isOn = (entity: HaEntity) => !isPassive(entity) && isEntityActive(entity) && !isUnavailable(entity);

export const getAttributeRows = (entity: HaEntity): [string, string][] => {
  const a = entity.attributes;
  const rows: [string, string | undefined][] = [
    ["State", formatEntityState(entity)],
    ["Area", getArea(entity.areaId)?.name],
    ["Changed", formatRelativeTime(entity.lastChanged)],
    ["Brightness", a.brightness !== undefined ? `${a.brightness}%` : undefined],
    ["Color temp", a.colorTempKelvin !== undefined ? `${a.colorTempKelvin} K` : undefined],
    ["Current", a.currentTemperature !== undefined ? `${a.currentTemperature}°` : undefined],
    ["Target", a.targetTemperature !== undefined ? `${a.targetTemperature}°` : undefined],
    ["Action", a.hvacAction ? capitalize(a.hvacAction) : undefined],
    ["Preset", a.presetMode ? capitalize(a.presetMode) : undefined],
    [
      "Humidity",
      a.currentHumidity !== undefined
        ? `${a.currentHumidity}%`
        : a.humidity !== undefined
          ? `${a.humidity}%`
          : undefined,
    ],
    ["Position", a.position !== undefined ? `${a.position}%` : undefined],
    ["Speed", a.percentage !== undefined ? `${a.percentage}%` : undefined],
    ["Source", a.mediaSource],
    ["Album", a.mediaAlbum],
    ["Volume", a.volume !== undefined ? `${Math.round(a.volume * 100)}%` : undefined],
    ["Wind", a.windSpeed !== undefined ? `${a.windSpeed} ${a.windSpeedUnit ?? ""}`.trim() : undefined],
    ["Battery", a.batteryLevel !== undefined ? `${a.batteryLevel}%` : undefined],
    ["Installed", a.installedVersion],
    ["Latest", a.latestVersion],
    ["Last ran", a.lastTriggered ? formatRelativeTime(a.lastTriggered) : undefined],
    ["Zone", a.zone],
    ["Entity", entity.id],
  ];
  return rows.flatMap(([label, value]) => (value ? [[label, value] as [string, string]] : []));
};
