import { vi } from "vitest";
import { Headers, Response } from "undici";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { getLatestMatchingReleaseAsync } from "../../release-providers";
import type { ReleasesRepositoryRequest } from "../../release-providers";

export interface ProviderRequest {
  method: string;
  url: URL;
  headers: Record<string, string>;
}

export interface ProviderReply {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

type RequestInput = Parameters<typeof fetchWithTrustedCertificatesAsync>[0];
type RequestOptions = Parameters<typeof fetchWithTrustedCertificatesAsync>[1];

type LookupRequest = Pick<
  ReleasesRepositoryRequest,
  "provider" | "identifier" | "versionRegex" | "providerUrl" | "token"
>;

const readUrl = (input: RequestInput) => {
  if (typeof input === "string") return input;
  if ("url" in input) return input.url;
  return input.toString();
};

export const mockedFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

export const serveProvider = (handle: (request: ProviderRequest) => ProviderReply | undefined) => {
  const requests: ProviderRequest[] = [];
  mockedFetch.mockImplementation(async (input: RequestInput, options?: RequestOptions) => {
    const request = {
      method: options?.method ?? "GET",
      url: new URL(readUrl(input)),
      headers: Object.fromEntries(new Headers(options?.headers).entries()),
    };
    requests.push(request);
    const reply = handle(request) ?? { status: 404, body: { message: "Not Found" } };
    return new Response(JSON.stringify(reply.body ?? {}), {
      status: reply.status ?? 200,
      headers: { "content-type": "application/json", ...reply.headers },
    });
  });
  return requests;
};

export const isRequest = (request: ProviderRequest, method: string, url: string) =>
  request.method === method && `${request.url.origin}${request.url.pathname}` === url;

export const lookupRelease = (request: LookupRequest) => getLatestMatchingReleaseAsync({ id: "fixture", ...request });

export const expectFailure = async (request: LookupRequest) => {
  const result = await lookupRelease(request);
  if (result.success) throw new Error(`Expected a failure, got ${result.data.latestRelease}`);
  return result.error;
};

export const expectRelease = async (request: LookupRequest) => {
  const result = await lookupRelease(request);
  if (!result.success) throw new Error(`Expected a release, got ${result.error.code}: ${result.error.message}`);
  return result.data;
};
