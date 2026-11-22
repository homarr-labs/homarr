import type { Response } from "undici";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

const logger = createLogger({ module: "openMeteo" });

export const fetchOpenMeteoJsonAsync = async (url: URL, signal: AbortSignal): Promise<unknown> => {
  const started = performance.now();
  let response: Response | undefined;
  try {
    response = await fetchWithTrustedCertificatesAsync(url.toString(), { signal });
    if (response.ok) return await response.json();
    void response.body?.cancel().catch(() => undefined);
  } catch {
    let stage = "response headers";
    if (response) stage = "response body";
    let outcome = "failed";
    if (signal.aborted) outcome = "timed out";
    const message = `Open-Meteo ${stage} ${outcome}`;
    logger.warn(message, { host: url.hostname, elapsedMs: Math.round(performance.now() - started) });
    throw new Error(message);
  }

  const message = `Open-Meteo returned HTTP ${response.status}`;
  logger.warn(message, { host: url.hostname, elapsedMs: Math.round(performance.now() - started) });
  throw new Error(message);
};
