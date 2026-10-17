import { z } from "zod/v4";

import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { ServiceVersion } from "../interfaces/service-version/service-version-types";

const systemStatusSchema = z.object({ version: z.string() });

/** Reads the running version from a Servarr-style `/api/vN/system/status` endpoint. */
export const fetchServarrServiceVersionAsync = async (
  url: URL,
  headers: Record<string, string>,
): Promise<ServiceVersion> => {
  const response = await fetchWithTrustedCertificatesAsync(url, { headers });
  if (!response.ok) throw new ResponseError(response);

  const { version } = await systemStatusSchema.parseAsync(await response.json());
  return { version };
};
