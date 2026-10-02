"use client";

import { createContext, useContext } from "react";
import { Badge, Code, Image, Text, Title } from "@mantine/core";

export const SubFetchDataContext = createContext<unknown>(undefined);

const BLOCKED_KEYS = new Set(["constructor", "prototype", "__proto__"]);

export function normalizeParams(value: unknown) {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result: Record<string, string | number | boolean> = {};
  for (const [key, param] of Object.entries(value)) {
    if (BLOCKED_KEYS.has(key)) return null;
    if (typeof param !== "string" && typeof param !== "number" && typeof param !== "boolean") return null;
    result[key] = param;
  }
  return result;
}

export function getByPath(value: unknown, path?: string): unknown {
  if (!path?.trim()) return value;
  return path.split(".").reduce<unknown>((current, key) => {
    if (current == null || typeof current !== "object" || BLOCKED_KEYS.has(key)) return undefined;
    return Object.hasOwn(current, key) ? (current as Record<string, unknown>)[key] : undefined;
  }, value);
}

export function formatDisplayValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export interface SubDataProps {
  path?: string;
  as?: string;
  order?: number;
  size?: string;
  color?: string;
  variant?: string;
  fw?: number;
  c?: string;
  alt?: string;
  fit?: string;
  w?: string | number;
  h?: string | number;
  radius?: string | number;
}

export function SubData({ path, as = "Text", ...props }: SubDataProps) {
  const value = getByPath(useContext(SubFetchDataContext), path);
  if (value === undefined && path) return <Text c="dimmed">—</Text>;
  const displayValue = as === "Code" ? JSON.stringify(value, null, 2) : formatDisplayValue(value);
  if (as === "Title") {
    return <Title order={(props.order as 1 | 2 | 3 | 4 | 5 | 6) ?? 3}>{displayValue}</Title>;
  }
  if (as === "Badge") {
    return (
      <Badge color={props.color} variant={props.variant as never} size={props.size as never}>
        {displayValue}
      </Badge>
    );
  }
  if (as === "Code") return <Code block>{displayValue}</Code>;
  if (as === "Image") {
    const src = safeDisplayImageUrl(value);
    if (!src) return null;
    return (
      <Image src={src} alt={props.alt ?? ""} fit={props.fit as never} w={props.w} h={props.h} radius={props.radius} />
    );
  }
  return (
    <Text size={props.size as never} fw={props.fw} c={props.c}>
      {displayValue}
    </Text>
  );
}

function safeDisplayImageUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
