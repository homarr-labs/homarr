import { customJsxSupportedPropsByName } from "../core";
import { isInterpreterCallback, SafeJsxError } from "./interpreter-foundation";
import {
  CUSTOM_JSX_BLOCKED_PROPERTIES,
  CUSTOM_JSX_BLOCKED_PROPS,
  CUSTOM_JSX_BLOCKED_STYLE_KEYS,
  CUSTOM_JSX_URL_PROPS,
  normalizeCustomJsxProperty,
} from "./policy";

export function normalizedProperty(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new SafeJsxError("Property names must be strings or numbers");
  }
  const property = String(value);
  if (CUSTOM_JSX_BLOCKED_PROPERTIES.has(normalizeCustomJsxProperty(property))) {
    throw new SafeJsxError(`Access to reflective property '${property}' is not allowed`);
  }
  return property;
}

function isArrayIndex(property: string): boolean {
  if (!/^(?:0|[1-9]\d*)$/.test(property)) return false;
  const index = Number(property);
  return Number.isSafeInteger(index) && index >= 0;
}

export function ownProperty(object: unknown, propertyValue: unknown): unknown {
  const property = normalizedProperty(propertyValue);
  if (object == null) return undefined;

  if (Array.isArray(object)) {
    if (property === "length") return object.length;
    if (!isArrayIndex(property)) return undefined;
    return Object.hasOwn(object, property) ? object[Number(property)] : undefined;
  }

  if (typeof object === "string") {
    if (property === "length") return object.length;
    if (!isArrayIndex(property)) return undefined;
    return object[Number(property)];
  }

  if (typeof object !== "object") return undefined;
  return Object.hasOwn(object, property) ? (object as Record<string, unknown>)[property] : undefined;
}

function isSafeUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (value.startsWith("#")) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

function sanitizeStyle(value: unknown): Record<string, string | number> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const result: Record<string, string | number> = {};
  for (const [key, styleValue] of Object.entries(value)) {
    if (CUSTOM_JSX_BLOCKED_STYLE_KEYS.has(key) || key.startsWith("--")) continue;
    if (typeof styleValue !== "string" && typeof styleValue !== "number") continue;
    if (typeof styleValue === "string" && /(?:url\s*\(|expression\s*\(|javascript:|position\s*:)/i.test(styleValue)) {
      continue;
    }
    result[key] = styleValue;
  }
  return result;
}

export function sanitizeCustomJsxProps(
  props: Readonly<Record<string, unknown>>,
  componentName?: string,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  const supportedProps = componentName ? customJsxSupportedPropsByName.get(componentName) : undefined;
  for (const [key, value] of Object.entries(props)) {
    if ((/^on/i.test(key) && !supportedProps?.has(key)) || CUSTOM_JSX_BLOCKED_PROPS.has(key)) continue;
    if (componentName && !supportedProps?.has(key)) continue;
    if (typeof value === "function" || isInterpreterCallback(value)) continue;
    if (CUSTOM_JSX_URL_PROPS.has(key)) {
      if (isSafeUrl(value)) safe[key] = value;
      continue;
    }
    if (key === "style") {
      const style = sanitizeStyle(value);
      if (style) safe.style = style;
      continue;
    }
    safe[key] = value;
  }
  return safe;
}
