import { I18nMiddleware } from "@homarr/translation/middleware";

import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  console.log(`${request.method} - ${request.nextUrl.pathname}`);
  return I18nMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt).*)"],
};
