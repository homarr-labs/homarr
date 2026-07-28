export type CustomWidgetHttpUrlIssue = "invalid" | "protocol" | "credentials";

const forbiddenUnicodeCodePointRanges = [
  [0x0000, 0x0020],
  [0x007f, 0x00a0],
  [0x1680, 0x1680],
  [0x2000, 0x200f],
  [0x2028, 0x202f],
  [0x205f, 0x206f],
  [0x3000, 0x3000],
  [0xfeff, 0xfeff],
] as const;

/**
 * Applies the conservative URL syntax shared by Homarr and the Workshop
 * validator. WHATWG URL parsing intentionally accepts and normalizes several
 * ambiguous spellings (for example IPv4 integers, backslashes and escaped
 * hostnames). Definitions are persisted and later used for network requests,
 * so authoring accepts only an unambiguous authority spelling.
 */
export function getCustomWidgetHttpUrlIssue(value: string): CustomWidgetHttpUrlIssue | null {
  if (hasForbiddenUrlCharacter(value) || value.includes("\\")) return "invalid";
  if (!URL.canParse(value)) return "invalid";

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "invalid";
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return "protocol";

  const authority = getRawAuthority(value);
  if (authority === null) return "invalid";
  if (authority.includes("@") || url.username || url.password) return "credentials";
  if (authority.includes("%") || /[。．｡]/u.test(authority)) return "invalid";

  const hostAndPort = splitHostAndPort(authority);
  if (!hostAndPort || !hasCanonicalPort(hostAndPort.port)) return "invalid";

  const rawHostname = withoutTrailingRootDot(hostAndPort.hostname);
  const parsedHostname = withoutTrailingRootDot(url.hostname);
  if (!rawHostname || !hasCanonicalParsedHostname(parsedHostname)) return "invalid";

  if (looksNumeric(rawHostname) && !isStrictIpv4(rawHostname)) return "invalid";
  if (isStrictIpv4(parsedHostname) && rawHostname !== parsedHostname) return "invalid";

  return null;
}

function getRawAuthority(value: string): string | null {
  const match = value.match(/^[A-Za-z][A-Za-z0-9+.-]*:\/\/([^/?#]*)/u);
  return match?.[1] ?? null;
}

function splitHostAndPort(authority: string): { hostname: string; port: string } | null {
  if (authority.startsWith("[")) {
    const closingBracket = authority.indexOf("]");
    if (closingBracket < 0) return null;
    const hostname = authority.slice(0, closingBracket + 1);
    const suffix = authority.slice(closingBracket + 1);
    if (suffix && !suffix.startsWith(":")) return null;
    return { hostname, port: suffix ? suffix.slice(1) : "" };
  }

  const firstColon = authority.indexOf(":");
  if (firstColon !== authority.lastIndexOf(":")) return null;
  return {
    hostname: firstColon < 0 ? authority : authority.slice(0, firstColon),
    port: firstColon < 0 ? "" : authority.slice(firstColon + 1),
  };
}

function hasCanonicalPort(value: string): boolean {
  if (!value) return true;
  if (!/^(?:0|[1-9]\d{0,4})$/u.test(value)) return false;
  return Number(value) <= 65_535;
}

function hasCanonicalParsedHostname(value: string): boolean {
  if (value.startsWith("[") && value.endsWith("]")) return true;
  if (!value || value.length > 253 || !/^[A-Za-z0-9._-]+$/u.test(value)) return false;
  return value
    .split(".")
    .every((label) => Boolean(label) && label.length <= 63 && !label.startsWith("-") && !label.endsWith("-"));
}

function looksNumeric(value: string): boolean {
  const parts = value.split(".");
  return parts.every((part) => /^(?:\d+|0[xX][0-9A-Fa-f]+)$/u.test(part));
}

function isStrictIpv4(value: string): boolean {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => /^(?:0|[1-9]\d{0,2})$/u.test(part) && Number(part) <= 255);
}

function withoutTrailingRootDot(value: string): string {
  return value.endsWith(".") ? value.slice(0, -1) : value;
}

function hasForbiddenUrlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return forbiddenUnicodeCodePointRanges.some(([minimum, maximum]) => codePoint >= minimum && codePoint <= maximum);
  });
}
