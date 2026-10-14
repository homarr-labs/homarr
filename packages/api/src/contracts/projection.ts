import type { ZodObject } from "zod/v4";

export type SourceOpenApiMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type SourceOpenApiContentType = "application/json" | "application/x-www-form-urlencoded" | (string & {});

export type SourceOpenApiMeta<TMeta = Record<string, unknown>> = TMeta & {
  openapi?: {
    enabled?: boolean;
    method: SourceOpenApiMethod;
    path: `/${string}`;
    operationId?: string;
    summary?: string;
    description?: string;
    protect?: boolean;
    tags?: string[];
    contentTypes?: SourceOpenApiContentType[];
    deprecated?: boolean;
    requestHeaders?: ZodObject;
    responseHeaders?: ZodObject;
    successDescription?: string;
    errorResponses?: number[] | Record<number, string>;
  };
};

export interface SourceMcpMeta {
  mcp?: {
    enabled: boolean;
    name?: string;
    description?: string;
  };
}

export type SourceProjectionMetadata = SourceOpenApiMeta & SourceMcpMeta;
