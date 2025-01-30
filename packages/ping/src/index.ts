import { formatError } from "pretty-print-error";
import type { fetch } from "undici";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { logger } from "@homarr/log";

export const sendPingRequestAsync = async (url: string) => {
  try {
    return await fetchWithTimeoutAndCertificates(url).then((response) => ({ statusCode: response.status }));
  } catch (error) {
    logger.error("packages/ping/src/index.ts:", formatError(error));
    return {
      error: formatError(error),
    };
  }
};

/**
 * Same as fetch, but with a timeout of 10 seconds.
 * Also respects certificates.
 * https://stackoverflow.com/questions/46946380/fetch-api-request-timeout
 * @param param0 fetch arguments
 * @returns fetch response
 */
export const fetchWithTimeoutAndCertificates = (...[url, requestInit]: Parameters<typeof fetch>) => {
  const controller = new AbortController();

  // 10 seconds timeout:
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  return fetchWithTrustedCertificatesAsync(url, { signal: controller.signal, ...requestInit }).finally(() => {
    clearTimeout(timeoutId);
  });
};
