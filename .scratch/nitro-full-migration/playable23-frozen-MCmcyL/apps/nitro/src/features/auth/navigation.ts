import { sanitizeRedirectionUrl } from "@homarr/validation/redirection-url";

import type { AuthFrontendNavigation } from "./contracts";

export function authReturnPath(path?: string): string {
  const candidate = sanitizeRedirectionUrl(path);
  if (/[\\\u0000-\u0020\u007f]/.test(candidate)) return "/";
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
  if (!value || /[\\\u0000-\u0020\u007f]/.test(value)) return false;
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
