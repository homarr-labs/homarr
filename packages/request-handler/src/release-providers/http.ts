import type { z } from "zod/v4";

import { extractErrorMessage } from "@homarr/common";
import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

import { createRequestHandler } from "../lib/request-handler";
import type { ProjectDetails, ReleaseLookup } from "./types";

const logger = createLogger({ module: "releaseProviders" });

const PROVIDER_TIMEOUT_MS = 10_000;
const PROJECT_DETAILS_TTL_MS = 24 * 60 * 60 * 1000;

export interface ProviderRequestInit {
  method?: "GET" | "HEAD";
  headers?: Record<string, string>;
}

export const providerUrl = (baseUrl: string, path: `/${string}`) => new URL(`${baseUrl}${path}`).toString();

export const fetchWithTimeoutAsync: typeof fetchWithTrustedCertificatesAsync = (url, options) =>
  fetchWithTrustedCertificatesAsync(url, { timeout: PROVIDER_TIMEOUT_MS, ...options });

export const fetchProviderAsync = async (url: string, init: ProviderRequestInit = {}) => {
  const response = await fetchWithTimeoutAsync(url, init);
  if (!response.ok) throw new ResponseError({ status: response.status, url });
  return response;
};

export const fetchJsonAsync = async <TSchema extends z.ZodType>(
  url: string,
  schema: TSchema,
  init?: ProviderRequestInit,
): Promise<z.infer<TSchema>> => {
  const response = await fetchProviderAsync(url, init);
  return schema.parse(await response.json());
};

export const tokenHeaders = (
  token: string | undefined,
  toHeaders: (token: string) => Record<string, string>,
): Record<string, string> => {
  if (!token) return {};
  return toHeaders(token);
};

interface ProjectDetailsRequest extends Record<string, unknown> {
  cacheKey: string;
  loadAsync: () => Promise<ProjectDetails>;
}

const projectDetailsRequestHandler = createRequestHandler<ProjectDetails, ProjectDetailsRequest>({
  requestAsync: ({ loadAsync }) => loadAsync(),
  getCacheKey: ({ cacheKey }) => cacheKey,
  cacheTtlMs: PROJECT_DETAILS_TTL_MS,
  requestTimeoutMs: PROVIDER_TIMEOUT_MS,
});

export const invalidateProjectDetailsCache = () => projectDetailsRequestHandler.invalidateCache();

export const loadOptionalDetailsAsync = async (
  { baseUrl, identifier, token }: Pick<ReleaseLookup, "baseUrl" | "identifier" | "token">,
  loadAsync: () => Promise<ProjectDetails>,
): Promise<ProjectDetails> => {
  try {
    const cacheKey = JSON.stringify([baseUrl, identifier, token]);
    const { data } = await projectDetailsRequestHandler.handler({ cacheKey, loadAsync }).getDataAsync();
    return data;
  } catch (error) {
    logger.warn("Project details unavailable", { error: extractErrorMessage(error) });
    return {};
  }
};
