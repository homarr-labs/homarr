export const CUSTOM_WIDGET_HEADER_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/u;
export const MAX_CUSTOM_WIDGET_AUTH_HEADERS = 8;

const reservedRequestHeaders = new Set([
  "authorization",
  "connection",
  "content-length",
  "cookie",
  "expect",
  "forwarded",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "via",
]);

export function isReservedCustomWidgetRequestHeader(name: string) {
  const normalized = name.trim().toLowerCase();
  return (
    reservedRequestHeaders.has(normalized) ||
    normalized.startsWith("proxy-") ||
    normalized.startsWith("sec-") ||
    normalized.startsWith("x-forwarded-")
  );
}

export function isCustomWidgetHeaderSecretValue(value: string) {
  return value.length > 0 && value.length <= 8_192 && /^[\t\x20-\x7e\x80-\xff]+$/u.test(value);
}
