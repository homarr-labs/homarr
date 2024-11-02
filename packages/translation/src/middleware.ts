import createMiddleware from "next-intl/middleware";

import { routing } from "./routing";

export const I18nMiddleware = createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames
  matcher: ["/", "/(de|en)/:path*"],
};
