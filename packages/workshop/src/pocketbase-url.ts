import { toASCII } from "tr46";

interface PortableSearchParams {
  keys(): string[];
}

interface ParsedAuthority {
  username: string;
  password: string;
  hostname: string;
  port: string;
}

/**
 * PocketBase's Goja runtime intentionally has no browser URL global. The
 * canonical Custom Widget schema uses the small subset implemented here.
 */
export class PocketBaseUrl {
  public readonly protocol: string;
  public readonly username: string;
  public readonly password: string;
  public readonly hostname: string;
  public readonly port: string;
  public readonly search: string;
  public readonly hash: string;
  public readonly origin: string;
  public readonly searchParams: PortableSearchParams;

  public static canParse(value: unknown): boolean {
    try {
      const parsed = new PocketBaseUrl(value);
      void parsed;
      return true;
    } catch {
      return false;
    }
  }

  public constructor(value: unknown) {
    if (typeof value !== "string" || hasForbiddenUrlCharacter(value) || value.includes("\\")) {
      throw new TypeError("Invalid URL");
    }

    const scheme = value.match(/^([A-Za-z][A-Za-z0-9+.-]*):/u);
    if (!scheme?.[1]) throw new TypeError("Invalid URL");
    this.protocol = `${scheme[1].toLowerCase()}:`;

    const afterScheme = value.slice(scheme[0].length);
    const hashIndex = afterScheme.indexOf("#");
    const withoutHash = hashIndex < 0 ? afterScheme : afterScheme.slice(0, hashIndex);
    this.hash = hashIndex < 0 ? "" : afterScheme.slice(hashIndex);
    const searchIndex = withoutHash.indexOf("?");
    const withoutSearch = searchIndex < 0 ? withoutHash : withoutHash.slice(0, searchIndex);
    this.search = searchIndex < 0 ? "" : withoutHash.slice(searchIndex);
    this.searchParams = createSearchParams(this.search);

    const requiresAuthority = this.protocol === "http:" || this.protocol === "https:" || this.protocol === "ftp:";
    if (!withoutSearch.startsWith("//")) {
      if (requiresAuthority) throw new TypeError("Invalid URL");
      this.username = "";
      this.password = "";
      this.hostname = "";
      this.port = "";
      this.origin = "null";
      return;
    }

    const authorityAndPath = withoutSearch.slice(2);
    const slashIndex = authorityAndPath.indexOf("/");
    const authority = slashIndex < 0 ? authorityAndPath : authorityAndPath.slice(0, slashIndex);
    const parsed = parseAuthority(authority);
    this.username = parsed.username;
    this.password = parsed.password;
    this.hostname = parsed.hostname;
    this.port = parsed.port;
    this.origin = `${this.protocol}//${this.hostname}${this.port ? `:${this.port}` : ""}`;
  }
}

export function installPocketBaseUrlPolyfill(): void {
  const runtime = globalThis as unknown as Record<string, unknown>;
  if (typeof runtime.URL === "undefined") runtime.URL = PocketBaseUrl;
}

function parseAuthority(authority: string): ParsedAuthority {
  if (!authority || /[。．｡]/u.test(authority)) throw new TypeError("Invalid URL");
  const atIndex = authority.lastIndexOf("@");
  const credentials = atIndex < 0 ? "" : authority.slice(0, atIndex);
  const hostAndPort = atIndex < 0 ? authority : authority.slice(atIndex + 1);
  if (!hostAndPort) throw new TypeError("Invalid URL");

  const credentialSeparator = credentials.indexOf(":");
  const username = credentialSeparator < 0 ? credentials : credentials.slice(0, credentialSeparator);
  const password = credentialSeparator < 0 ? "" : credentials.slice(credentialSeparator + 1);

  let hostname: string;
  let port = "";
  if (hostAndPort.startsWith("[")) {
    const closeIndex = hostAndPort.indexOf("]");
    if (closeIndex < 0) throw new TypeError("Invalid URL");
    const address = hostAndPort.slice(1, closeIndex);
    const normalizedAddress = normalizeIpv6(address);
    if (normalizedAddress === null) throw new TypeError("Invalid URL");
    hostname = `[${normalizedAddress}]`;
    const suffix = hostAndPort.slice(closeIndex + 1);
    if (suffix) {
      if (!suffix.startsWith(":")) throw new TypeError("Invalid URL");
      port = suffix.length === 1 ? "" : validatePort(suffix.slice(1));
    }
  } else {
    const firstColon = hostAndPort.indexOf(":");
    const lastColon = hostAndPort.lastIndexOf(":");
    if (firstColon !== lastColon) throw new TypeError("Invalid URL");
    hostname = firstColon < 0 ? hostAndPort : hostAndPort.slice(0, firstColon);
    const portValue = firstColon < 0 ? "" : hostAndPort.slice(firstColon + 1);
    port = portValue ? validatePort(portValue) : "";
    const normalizedHostname = normalizeHostname(hostname);
    if (!normalizedHostname) throw new TypeError("Invalid URL");
    hostname = normalizedHostname;
  }

  return { username, password, hostname: hostname.toLowerCase(), port };
}

function validatePort(value: string): string {
  if (!/^(?:0|[1-9]\d{0,4})$/u.test(value)) throw new TypeError("Invalid URL");
  const port = Number(value);
  if (!Number.isInteger(port) || port > 65_535) throw new TypeError("Invalid URL");
  return String(port);
}

function normalizeHostname(value: string): string | null {
  const ascii = toASCII(value, {
    checkHyphens: false,
    checkBidi: true,
    checkJoiners: true,
    useSTD3ASCIIRules: false,
    transitionalProcessing: false,
    verifyDNSLength: false,
    ignoreInvalidPunycode: false,
  });
  if (!ascii || hasForbiddenUrlCharacter(ascii) || /[#%/:<>?@[\\\]^|]/u.test(ascii)) return null;
  const candidate = ascii.endsWith(".") ? ascii.slice(0, -1) : ascii;
  if (!candidate || candidate.length > 253 || !/^[A-Za-z0-9._-]+$/u.test(candidate)) return null;
  if (looksNumeric(candidate)) {
    const rawCandidate = value.endsWith(".") ? value.slice(0, -1) : value;
    return isStrictIpv4(candidate) && rawCandidate === candidate ? ascii.toLowerCase() : null;
  }
  const isValid = candidate
    .split(".")
    .every((part) => Boolean(part) && part.length <= 63 && !part.startsWith("-") && !part.endsWith("-"));
  return isValid ? ascii.toLowerCase() : null;
}

function hasForbiddenUrlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return (
      code <= 0x20 ||
      (code >= 0x7f && code <= 0xa0) ||
      code === 0x1680 ||
      (code >= 0x2000 && code <= 0x200f) ||
      (code >= 0x2028 && code <= 0x202f) ||
      (code >= 0x205f && code <= 0x206f) ||
      code === 0x3000 ||
      code === 0xfeff
    );
  });
}

function normalizeIpv6(value: string): string | null {
  if (value.includes("%")) return null;
  const address = value;
  if (!address.includes(":") || address.includes(":::") || /[^0-9A-Fa-f:.]/u.test(address)) return null;
  if (address.indexOf("::") !== address.lastIndexOf("::")) return null;
  if ((address.startsWith(":") && !address.startsWith("::")) || (address.endsWith(":") && !address.endsWith("::"))) {
    return null;
  }

  const hasCompression = address.includes("::");
  const [left = "", right = ""] = hasCompression ? address.split("::") : [address, ""];
  if (hasCompression && left.includes(".")) return null;
  const leftGroups = parseIpv6Groups(left);
  const rightGroups = parseIpv6Groups(right);
  if (leftGroups === null || rightGroups === null) return null;

  const explicitGroupCount = leftGroups.length + rightGroups.length;
  if ((!hasCompression && explicitGroupCount !== 8) || (hasCompression && explicitGroupCount >= 8)) return null;

  const groups = hasCompression
    ? [...leftGroups, ...Array.from({ length: 8 - explicitGroupCount }, () => 0), ...rightGroups]
    : leftGroups;
  let bestStart = -1;
  let bestLength = 1;
  for (let index = 0; index < groups.length;) {
    if (groups[index] !== 0) {
      index += 1;
      continue;
    }
    let end = index + 1;
    while (end < groups.length && groups[end] === 0) end += 1;
    if (end - index > bestLength) {
      bestStart = index;
      bestLength = end - index;
    }
    index = end;
  }

  const hexadecimalGroups = groups.map((group) => group.toString(16));
  if (bestStart < 0) return hexadecimalGroups.join(":");
  const before = hexadecimalGroups.slice(0, bestStart).join(":");
  const after = hexadecimalGroups.slice(bestStart + bestLength).join(":");
  return `${before}::${after}`;
}

function parseIpv6Groups(value: string): number[] | null {
  if (!value) return [];
  const groups = value.split(":");
  const parsed: number[] = [];
  for (const [index, group] of groups.entries()) {
    if (group.includes(".")) {
      if (index !== groups.length - 1 || !isStrictIpv4(group)) return null;
      const parts = group.split(".").map(Number);
      parsed.push(((parts[0] ?? 0) << 8) | (parts[1] ?? 0), ((parts[2] ?? 0) << 8) | (parts[3] ?? 0));
    } else {
      if (!/^[0-9A-Fa-f]{1,4}$/u.test(group)) return null;
      parsed.push(Number.parseInt(group, 16));
    }
  }
  return parsed;
}

function isStrictIpv4(value: string): boolean {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => /^(?:0|[1-9]\d{0,2})$/u.test(part) && Number(part) <= 255);
}

function looksNumeric(value: string): boolean {
  return value.split(".").every((part) => /^(?:\d+|0[xX][0-9A-Fa-f]+)$/u.test(part));
}

function createSearchParams(search: string): PortableSearchParams {
  const keys = search
    ? search
        .slice(1)
        .split("&")
        .map((entry) => entry.split("=", 1)[0] ?? "")
        .map(decodeQueryPart)
    : [];
  return { keys: () => [...keys] };
}

function decodeQueryPart(value: string): string {
  try {
    return decodeURIComponent(value.replaceAll("+", " "));
  } catch {
    return value;
  }
}
