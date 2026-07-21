import type { PreviewNamedRequest } from "./preview-request-panel";

export const redactPreviewUrl = (value: string): string => {
  try {
    const url = new URL(value);
    for (const key of url.searchParams.keys()) url.searchParams.set(key, "redacted");
    return url.toString();
  } catch {
    return value;
  }
};

export const getPreviewNamedRequests = (definition: Record<string, unknown>): PreviewNamedRequest[] => {
  if (!definition.requests || typeof definition.requests !== "object" || Array.isArray(definition.requests)) return [];
  return Object.entries(definition.requests as Record<string, unknown>).flatMap(([id, candidate]) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return [];
    const request = candidate as Record<string, unknown>;
    if (
      (request.kind !== "query" && request.kind !== "action") ||
      typeof request.method !== "string" ||
      typeof request.path !== "string"
    )
      return [];
    return [
      {
        id,
        kind: request.kind,
        method: request.method,
        path: request.path,
        minimumBoardPermission: typeof request.permission === "string" ? request.permission : undefined,
      },
    ];
  });
};

export type CustomWidgetAccessibilityIssue = "imageAlt" | "actionIconLabel" | "inputLabel";

export function analyzeCustomWidgetAccessibility(template: string): CustomWidgetAccessibilityIssue[] {
  const issues = new Set<CustomWidgetAccessibilityIssue>();
  const elements = template.matchAll(/<([A-Z][A-Za-z0-9.]*)\b([^>]*)>/gu);
  const inputComponents = new Set([
    "Autocomplete",
    "Checkbox",
    "ColorInput",
    "DateInput",
    "FileInput",
    "JsonInput",
    "MultiSelect",
    "NumberInput",
    "PasswordInput",
    "Radio",
    "Select",
    "Slider",
    "Switch",
    "TagsInput",
    "TextInput",
    "Textarea",
    "TimeInput",
  ]);
  for (const match of elements) {
    const component = match[1] ?? "";
    const props = match[2] ?? "";
    if (component === "Image" && !hasProp(props, "alt")) issues.add("imageAlt");
    if (component === "ActionIcon" && !hasAnyProp(props, ["aria-label", "title"])) issues.add("actionIconLabel");
    if (inputComponents.has(component) && !hasAnyProp(props, ["label", "aria-label", "aria-labelledby"])) {
      issues.add("inputLabel");
    }
  }
  return [...issues];
}

function hasAnyProp(props: string, names: string[]) {
  return names.some((name) => hasProp(props, name));
}

function hasProp(props: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`(?:^|\\s)${escapedName}\\s*=`, "u").test(props);
}
