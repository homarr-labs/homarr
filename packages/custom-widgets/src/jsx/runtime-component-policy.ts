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
  if (
    ["DateTimePicker", "InlineDateTimePicker"].includes(componentName) &&
    propName === "type" &&
    ![undefined, "default", "range"].includes(value as undefined | string)
  ) {
    return `${componentName}.type supports only 'default' or 'range'`;
  }
  return null;
}
