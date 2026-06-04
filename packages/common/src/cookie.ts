import type { SerializeOptions } from "cookie";
import { parseCookie, stringifySetCookie } from "cookie";

export function parseCookies(cookieString: string) {
  return parseCookie(cookieString);
}

export function setClientCookie(name: string, value: string, options: SerializeOptions = {}) {
  document.cookie = stringifySetCookie(name, value, options);
}
