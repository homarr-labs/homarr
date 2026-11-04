export const customWidgetAuthTypes = ["none", "bearer", "basic", "apiKeyHeader", "apiKeyQuery", "headers"] as const;
export type CustomWidgetAuthType = (typeof customWidgetAuthTypes)[number];

export const customWidgetMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
export type CustomWidgetMethod = (typeof customWidgetMethods)[number];

export const customWidgetSecretKinds = ["apiKey", "username", "password"] as const;
export type CustomWidgetLegacySecretKind = (typeof customWidgetSecretKinds)[number];
export type CustomWidgetHeaderSecretKind = `header:${string}`;
export type CustomWidgetSecretKind = CustomWidgetLegacySecretKind | CustomWidgetHeaderSecretKind;

// The existing PostgreSQL kind column has 64 characters, including "header:".
export const MAX_CUSTOM_WIDGET_HEADER_SLOT_LENGTH = 57;
export const CUSTOM_WIDGET_HEADER_SECRET_KIND_PATTERN = /^header:[A-Za-z][A-Za-z0-9_-]{0,56}$/u;

export function getCustomWidgetHeaderSecretKind(slot: string): CustomWidgetHeaderSecretKind {
  return `header:${slot}`;
}

export function isCustomWidgetHeaderSecretKind(kind: string): kind is CustomWidgetHeaderSecretKind {
  return CUSTOM_WIDGET_HEADER_SECRET_KIND_PATTERN.test(kind);
}
