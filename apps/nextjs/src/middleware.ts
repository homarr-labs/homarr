import type { NextRequest } from "next/server";

import { I18nMiddleware } from "@alparr/translation/middleware";

export function middleware(request: NextRequest) {
  return I18nMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt).*)"],
};
