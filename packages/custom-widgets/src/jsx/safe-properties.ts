import { isInterpreterCallback, SafeJsxError } from "./interpreter-foundation";
import {
  CUSTOM_JSX_BLOCKED_PROPERTIES,
  CUSTOM_JSX_BLOCKED_STYLE_KEYS,
  CUSTOM_JSX_URL_PROPS,
  isBlockedCustomJsxProp,
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
    if (CUSTOM_JSX_BLOCKED_STYLE_KEYS.has(key)) continue;
    if (typeof styleValue !== "string" && typeof styleValue !== "number") continue;
    if (typeof styleValue === "string" && /(?:url\s*\(|expression\s*\(|javascript:|position\s*:)/i.test(styleValue)) {
      continue;
    }
    result[key] = styleValue;
  }
  return result;
}

function sanitizeStyles(value: unknown): Record<string, Record<string, string | number>> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const result: Record<string, Record<string, string | number>> = {};
  for (const [selector, styles] of Object.entries(value)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(selector)) continue;
    const sanitized = sanitizeStyle(styles);
    if (sanitized) result[selector] = sanitized;
  }
  return result;
}

export function sanitizeCustomJsxProps(
  props: Readonly<Record<string, unknown>>,
  _componentName?: string,
): Record<string, unknown> {
  return sanitizeObject(props);
}

function sanitizeObject(value: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const safe: Record<string, unknown> = Object.create(null);
  for (const [key, child] of Object.entries(value)) {
    if (isBlockedCustomJsxProp(key)) continue;
    if (typeof child === "function" || isInterpreterCallback(child)) continue;
    if (CUSTOM_JSX_URL_PROPS.has(key)) {
      if (isSafeUrl(child)) safe[key] = child;
      continue;
    }
    if (key === "style") {
      const style = sanitizeStyle(child);
      if (style) safe.style = style;
      continue;
    }
    if (key === "styles") {
      const styles = sanitizeStyles(child);
      if (styles) safe.styles = styles;
      continue;
    }
    safe[key] = key === "data" || key === "series" ? sanitizeSerializableData(child) : sanitizeNestedValue(child);
  }
  return safe;
}

function sanitizeSerializableData(value: unknown): unknown {
  if (typeof value === "function" || isInterpreterCallback(value)) return undefined;
  if (Array.isArray(value)) return value.map(sanitizeSerializableData);
  if (value !== null && typeof value === "object") {
    const safe: Record<string, unknown> = Object.create(null);
    for (const [key, child] of Object.entries(value)) {
      if (CUSTOM_JSX_BLOCKED_PROPERTIES.has(normalizeCustomJsxProperty(key))) continue;
      safe[key] = sanitizeSerializableData(child);
    }
    return safe;
  }
  return value;
}

function sanitizeNestedValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeNestedValue);
  if (value !== null && typeof value === "object") return sanitizeObject(value as Record<string, unknown>);
  return value;
}

export function diagnoseCustomJsxProps(props: Readonly<Record<string, unknown>>, componentName: string): string[] {
  const diagnostics: string[] = [];
  diagnoseObject(props, componentName, diagnostics);
  return diagnostics;
}

function diagnoseObject(value: Readonly<Record<string, unknown>>, path: string, diagnostics: string[]) {
  for (const [key, child] of Object.entries(value)) {
    const propertyPath = `${path}.${key}`;
    if (isBlockedCustomJsxProp(key) || typeof child === "function" || isInterpreterCallback(child)) {
      diagnostics.push(`BLOCKED_CAPABILITY: Prop '${propertyPath}' is not allowed`);
      continue;
    }
    if (CUSTOM_JSX_URL_PROPS.has(key) && !isSafeUrl(child)) {
      diagnostics.push(`INVALID_PROP_VALUE: '${propertyPath}' contains an unsafe URL`);
      continue;
    }
    if (key === "data" || key === "series") continue;
    if (Array.isArray(child)) {
      child.forEach((entry, index) => {
        if (isInterpreterCallback(entry) || typeof entry === "function") {
          diagnostics.push(`BLOCKED_CAPABILITY: Prop '${propertyPath}[${index}]' is not allowed`);
        } else if (entry !== null && typeof entry === "object") {
          diagnoseObject(entry as Record<string, unknown>, `${propertyPath}[${index}]`, diagnostics);
        }
      });
    } else if (child !== null && typeof child === "object" && key !== "style" && key !== "styles") {
      diagnoseObject(child as Record<string, unknown>, propertyPath, diagnostics);
    }
  }
}
