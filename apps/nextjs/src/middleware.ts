import type { NextRequest } from "next/server";

import { fetchApi } from "@homarr/api/client";
import { createI18nMiddleware } from "@homarr/translation/middleware";

export async function middleware(request: NextRequest) {
  const culture = await fetchApi.serverSettings.getCulture.query();

  // We don't want to fallback to accept-language header so we clear it
  request.headers.set("accept-language", "");
  const next = createI18nMiddleware(culture.defaultLocale);
  return next(request);
}

export const config = {
  matcher: ["/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt).*)"],
};
