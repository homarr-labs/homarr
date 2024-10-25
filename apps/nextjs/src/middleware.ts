import type { NextRequest } from "next/server";

import { fetchApi } from "@homarr/api/client";
import { createI18nMiddleware } from "@homarr/translation/middleware";

export async function middleware(request: NextRequest) {
  const culture = await fetchApi.serverSettings.getCulture.query();
  const next = createI18nMiddleware(culture.defaultLocale);
  return next(request);
}

export const config = {
  matcher: ["/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt).*)"],
};
