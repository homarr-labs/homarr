/**
 * Same as fetch, but with a timeout of 10 seconds.
 * https://stackoverflow.com/questions/46946380/fetch-api-request-timeout
 * @param param0 fetch arguments
 * @returns fetch response
 */
export const fetchWithTimeout = (...[url, requestInit]: Parameters<typeof fetch>) => {
  const controller = new AbortController();

  // 10 seconds timeout:
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  return fetch(url, { signal: controller.signal, ...requestInit }).finally(() => {
    clearTimeout(timeoutId);
  });
};
