import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";

import { extractBaseUrlFromHeaders, removeTrailingSlash } from "@homarr/common";

import { env } from "~/env";

export const getMcpBaseUrl = (headers: ReadonlyHeaders) =>
  removeTrailingSlash(env.BASE_URL ?? extractBaseUrlFromHeaders(headers));
