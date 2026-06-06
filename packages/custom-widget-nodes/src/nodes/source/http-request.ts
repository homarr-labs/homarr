import { z } from "zod/v4";

import type { NodeTypeDefinition } from "../../types";
import { registerNodeType } from "../../registry";

const FETCH_TIMEOUT_MS = 10_000;

const schema = z.object({
  url: z.string().min(1),
  method: z.enum(["GET", "POST"]),
  headers: z.record(z.string(), z.string()).default({}),
  body: z.string().optional(),
  authType: z.enum(["none", "bearer", "basic", "apiKeyHeader", "apiKeyQuery"]).default("none"),
  headerName: z.string().optional(),
});

type HttpRequestData = z.infer<typeof schema>;

const authAppliers: Record<
  string,
  (headers: Record<string, string>, url: URL, secrets: Record<string, string>, headerName?: string) => void
> = {
  bearer: (headers, _url, secrets) => {
    if (secrets.apiKey) headers["Authorization"] = `Bearer ${secrets.apiKey}`;
  },
  basic: (headers, _url, secrets) => {
    if (secrets.username && secrets.password) {
      headers["Authorization"] = `Basic ${Buffer.from(`${secrets.username}:${secrets.password}`).toString("base64")}`;
    }
  },
  apiKeyHeader: (headers, _url, secrets, headerName) => {
    if (secrets.apiKey) headers[headerName ?? "X-API-Key"] = secrets.apiKey;
  },
  apiKeyQuery: (_headers, url, secrets, headerName) => {
    if (secrets.apiKey) url.searchParams.set(headerName ?? "api_key", secrets.apiKey);
  },
};

const definition: NodeTypeDefinition<HttpRequestData> = {
  type: "httpRequest",
  category: "source",
  label: "HTTP Request",
  schema,
  inputs: [],
  outputs: [{ id: "response", label: "Response" }],
  async execute(data, inputs) {
    const secrets = (inputs._secrets as Record<string, string>) ?? {};
    const url = new URL(data.url);
    const headers: Record<string, string> = { Accept: "application/json", ...data.headers };

    if (data.method !== "GET" && data.body) {
      headers["Content-Type"] = "application/json";
    }

    const applyAuth = authAppliers[data.authType];
    if (applyAuth) {
      applyAuth(headers, url, secrets, data.headerName);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        method: data.method,
        headers,
        body: data.method !== "GET" ? data.body : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  },
};

registerNodeType(definition);

export default definition;
