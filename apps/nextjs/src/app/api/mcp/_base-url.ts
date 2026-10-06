import { extractBaseUrlFromHeaders, removeTrailingSlash } from "@homarr/common";

import { env } from "~/env";

type RequestHeaders = Parameters<typeof extractBaseUrlFromHeaders>[0];

export const getMcpBaseUrl = (headers: RequestHeaders) =>
  removeTrailingSlash(env.BASE_URL ?? extractBaseUrlFromHeaders(headers));
