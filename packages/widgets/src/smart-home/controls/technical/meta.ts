import type { CSSProperties } from "react";

import {
  formatEntityState,
  formatRelativeTime,
  getArea,
  getStateColor,
  isEntityActive,
  isUnavailable,
} from "../semantics";
import type { HaDomain, HaEntity } from "../types";

export type Vars = CSSProperties & Record<`--${string}`, string | number>;

export const capitalize = (value: string) => value.replace(/_/g, " ").replace(/^\w/, (char) => char.toUpperCase());

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

export const isOn = (entity: HaEntity) => !isPassive(entity) && isEntityActive(entity) && !isUnavailable(entity);
