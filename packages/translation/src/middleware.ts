import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type { SupportedLanguage } from ".";
import { supportedLanguages } from "./languages";
import { createRouting } from "./routing";

// next-intl carries request headers through its rewrite. Keep the random value
// module-private so a client-supplied locale header cannot impersonate that handoff.
const localeHandoffHeader = "x-homarr-locale-handoff";
const localeHandoffMarker = crypto.randomUUID();

export const createI18nMiddleware = (defaultLocale: SupportedLanguage) => {
  const middleware = createMiddleware(createRouting(defaultLocale));

  return (request: NextRequest) => {
    const requestLocale = request.headers.get("x-next-intl-locale");
    const pathLocale = request.nextUrl.pathname.split("/")[1];
    const isSupportedLocale = supportedLanguages.includes(requestLocale as SupportedLanguage);
    const isInternalHandoff = request.headers.get(localeHandoffHeader) === localeHandoffMarker;

    if (isInternalHandoff && isSupportedLocale && requestLocale === pathLocale) {
      const headers = new Headers(request.headers);
      headers.delete(localeHandoffHeader);
      return NextResponse.next({ request: { headers } });
    }

    request.headers.set(localeHandoffHeader, localeHandoffMarker);
    return middleware(request);
  };
};

export const config = {
  // Match only internationalized pathnames
  matcher: ["/", `/(${supportedLanguages.join("|")})/:path*`],
};
