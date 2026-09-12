import type { ConnectionOptions } from "node:tls";

import type { CustomJsxNetworkScope, CustomWidgetMethod } from "../core";

export interface CustomWidgetAuthConfig {
  baseUrl?: string;
  type: string;
  secrets: Array<{ kind: string; value: string }>;
  headerName?: string | null;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  transformUrl?(url: URL): void;
  transformBody?(body: string | undefined): string;
  isExpired?(response: CustomWidgetHttpResponse): boolean;
  refreshAsync?(): Promise<CustomWidgetAuthConfig>;
}

export interface CustomWidgetHttpRequest {
  resolveConnectionAsync?(): Promise<
    Pick<CustomWidgetHttpRequest, "baseUrl" | "auth" | "tls" | "pathPrefix" | "redactSecrets">
  >;
  tls?: Pick<ConnectionOptions, "ca" | "checkServerIdentity">;
  pathPrefix?: string;
  redactSecrets?: CustomWidgetAuthConfig["secrets"];
  baseUrl: string;
  targetUrl?: string | URL;
  method: CustomWidgetMethod;
  body?: string;
  staticHeaders?: Record<string, string>;
  auth?: CustomWidgetAuthConfig;
  networkScope: CustomJsxNetworkScope;
  kind: "query" | "action";
  cacheKey?: string;
  cacheTtlSeconds?: number;
  logError?: (event: { origin: string; method: CustomWidgetMethod; errorName: string; reason?: "timeout" }) => void;
}

export interface CustomWidgetHttpResponse {
  ok: boolean;
  status: number;
  statusText: string;
  data: unknown;
}
