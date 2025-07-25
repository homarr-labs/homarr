import type { fetch } from "undici";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { extractErrorMessage } from "@homarr/common";
import { logger } from "@homarr/log";

export const sendPingRequestAsync = async (url: string) => {
  try {
    return await fetchWithTimeoutAndCertificates(false, url).then((response) => ({ statusCode: response.status }));
  } catch (error) {
    logger.error(new Error(`Failed to send ping request to "${url}"`, { cause: error }));
    return {
      error: extractErrorMessage(error),
    };
  }
};

/**
 * Same as fetch, but with a timeout of 10 seconds.
 * Also respects certificates.
 * https://stackoverflow.com/questions/46946380/fetch-api-request-timeout
 * @param param0 fetch arguments
 * @returns fetch response
 * @param rejectUnauthorized whether untrusted certificates should be ignored
 */
export const fetchWithTimeoutAndCertificates = (
  rejectUnauthorized = false,
  ...[url, requestInit]: Parameters<typeof fetch>
) => {
  const controller = new AbortController();

  // 10 seconds timeout:
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  return fetchWithTrustedCertificatesAsync(
    url,
    { signal: controller.signal, ...requestInit },
    rejectUnauthorized,
  ).finally(() => {
    clearTimeout(timeoutId);
  });
};
