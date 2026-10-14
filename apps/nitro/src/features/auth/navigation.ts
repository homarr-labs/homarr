import { sanitizeRedirectionUrl } from "@homarr/validation/redirection-url";

import type { AuthFrontendNavigation } from "./contracts";

function hasUnsafeNavigationCharacter(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && (codePoint === 0x5c || codePoint <= 0x20 || codePoint === 0x7f)) return true;
  }
  return false;
}

export function authReturnPath(path?: string): string {
  const candidate = sanitizeRedirectionUrl(path);
  if (hasUnsafeNavigationCharacter(candidate)) return "/";
  const base = new URL("https://homarr.invalid");
  try {
    const target = new URL(candidate, base);
    if (target.origin !== base.origin || target.pathname.startsWith("//")) return "/";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/";
  }
}

export function acceptsAuthProviderUrl(
  navigation: AuthFrontendNavigation,
  value: string,
  purpose: "sign-in" | "sign-out",
): boolean {
  if (!value || hasUnsafeNavigationCharacter(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//")) {
    return navigation.acceptsProviderUrl(value, purpose);
  }
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password &&
      navigation.acceptsProviderUrl(value, purpose)
    );
  } catch {
    return false;
  }
}
