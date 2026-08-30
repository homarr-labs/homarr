export function isSafeCustomJsxUrl(value: unknown) {
  if (typeof value !== "string") return false;
  if (value.startsWith("#")) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function getScopedCustomJsxControlName(scopeId: string, name: string) {
  const safeScope = scopeId.replaceAll(/[^A-Za-z0-9_-]/gu, "_");
  const safeName = encodeURIComponent(name).replaceAll("%", "_");
  return `custom-widget-${safeScope}-${safeName}`;
}

export function getInvalidCustomJsxPropValueReason(componentName: string, propName: string, value: unknown) {
  if (propName === "resetKey" && value !== null) {
    const scalar =
      typeof value === "string" ||
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value));
    if (!scalar) return "resetKey supports only a finite number, string, boolean, or null";
  }
  if (
    ["DateTimePicker", "InlineDateTimePicker"].includes(componentName) &&
    propName === "type" &&
    ![undefined, "default", "range"].includes(value as undefined | string)
  ) {
    return `${componentName}.type supports only 'default' or 'range'`;
  }
  return null;
}
