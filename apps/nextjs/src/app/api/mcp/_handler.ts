import type { NextRequest } from "next/server";
import { userAgent } from "next/server";
import type { McpServer } from "@modelcontextprotocol/server";
import { ResourceTemplate } from "@modelcontextprotocol/server";
import { z } from "zod/v4";

import type { McpTool } from "@homarr/api/mcp";
import { createTRPCContext, mcpRouter } from "@homarr/api/mcp";
import { API_KEY_HEADER_NAME, getSessionFromApiKeyAsync } from "@homarr/auth/api-key";
import { extractBaseUrlFromHeaders } from "@homarr/common";
import { ipAddressFromHeaders } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { buildCustomWidgetMcpPrompt } from "@homarr/custom-widgets/authoring-prompt";
import {
  CUSTOM_WIDGET_SKILL_REFERENCE_NAMES,
  getCustomWidgetComponent,
  getCustomWidgetComponentCatalog,
  getCustomWidgetExample,
  getCustomWidgetSkillEntrypoint,
  getCustomWidgetSkillReference,
} from "@homarr/custom-widgets/authoring-resources";
import { customJsxExamples, getCustomWidgetJsonSchema } from "@homarr/custom-widgets/core";
import { db } from "@homarr/db";

import { getPackageVersion } from "~/versions/package-reader";
import { getSafeAssistantToolError } from "../assistant/chat/assistant-tool-error";
import { extractMcpTools } from "./_extract-tools";
import { createMcpProtocolHandler } from "./_protocol";

const logger = createLogger({ module: "mcpRoute" });

const AUTH_RATE_WINDOW_MS = 60_000;
const AUTH_MAX_FAILURES = 10;

interface RateLimitStore {
  authFailures: Map<string, { count: number; resetAt: number }>;
  cleanupTimer: ReturnType<typeof setInterval> | null;
}

declare global {
  var mcpRateLimit: RateLimitStore | undefined;
}

const rateLimitStore =
  globalThis.mcpRateLimit ??
  (globalThis.mcpRateLimit = {
    authFailures: new Map(),
    cleanupTimer: null,
  });
const authFailures = rateLimitStore.authFailures;

if (!rateLimitStore.cleanupTimer) {
  rateLimitStore.cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of authFailures) {
      if (entry.resetAt < now) authFailures.delete(key);
    }
  }, AUTH_RATE_WINDOW_MS);
  rateLimitStore.cleanupTimer.unref();
}

function checkAuthRateLimit(ip: string | null): boolean {
  const key = ip ?? "unknown";
  const now = Date.now();
  const entry = authFailures.get(key);
  if (!entry || entry.resetAt < now) return true;
  return entry.count < AUTH_MAX_FAILURES;
}

function recordAuthFailure(ip: string | null) {
  const key = ip ?? "unknown";
  const now = Date.now();
  const entry = authFailures.get(key);
  if (!entry || entry.resetAt < now) {
    authFailures.set(key, { count: 1, resetAt: now + AUTH_RATE_WINDOW_MS });
    return;
  }
  entry.count++;
}

function clearAuthFailures(ip: string | null) {
  authFailures.delete(ip ?? "unknown");
}

const getVisibleTools = (tools: McpTool[], isAdmin: boolean) => {
  if (isAdmin) return tools;
  return tools.filter((tool) => !tool.name.startsWith("customWidget_"));
};

function registerCustomWidgetAuthoring(server: McpServer) {
  server.registerPrompt(
    "homarr-custom-widget-author",
    {
      description: "Author and iterate on one or more Homarr Custom JSX v2 widgets.",
      argsSchema: z.object({
        request: z.string().optional().describe("The widget the user wants."),
        documentationUrl: z.string().optional().describe("External API documentation URL."),
      }),
    },
    ({ request, documentationUrl }) => ({
      description: "Current Homarr Custom Widget authoring workflow.",
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: buildCustomWidgetMcpPrompt(request, documentationUrl),
          },
        },
      ],
    }),
  );

  server.registerResource(
    "Custom Widget schema",
    "homarr://custom-widgets/schema",
    { mimeType: "application/schema+json" },
    (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/schema+json",
          text: JSON.stringify(getCustomWidgetJsonSchema()),
        },
      ],
    }),
  );
  server.registerResource(
    "Custom Widget components",
    "homarr://custom-widgets/components",
    { mimeType: "application/json" },
    (uri) => ({
      contents: [
        { uri: uri.href, mimeType: "application/json", text: JSON.stringify(getCustomWidgetComponentCatalog()) },
      ],
    }),
  );
  server.registerResource(
    "Custom Widget skill",
    "homarr://custom-widgets/skill",
    { mimeType: "text/markdown" },
    (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/markdown", text: getCustomWidgetSkillEntrypoint().skillMd }],
    }),
  );

  for (const name of CUSTOM_WIDGET_SKILL_REFERENCE_NAMES) {
    server.registerResource(
      `Custom Widget reference: ${name}`,
      `homarr://custom-widgets/references/${name}`,
      { mimeType: "text/markdown" },
      (uri) => ({
        contents: [{ uri: uri.href, mimeType: "text/markdown", text: getCustomWidgetSkillReference(name).content }],
      }),
    );
  }

  for (const example of customJsxExamples) {
    server.registerResource(
      `Custom Widget example: ${example.title}`,
      `homarr://custom-widgets/examples/${example.id}`,
      { mimeType: "application/json" },
      (uri) => ({
        contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(example) }],
      }),
    );
  }

  server.registerResource(
    "Custom Widget component",
    new ResourceTemplate("homarr://custom-widgets/components/{name}", { list: undefined }),
    {
      description: "Metadata for one installed Custom Widget component.",
      mimeType: "application/json",
    },
    (uri, { name }) => {
      const component = getCustomWidgetComponent(decodeURIComponent(String(name)));
      if (!component) throw new Error("Component resource not found");
      return {
        contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(component) }],
      };
    },
  );
  server.registerResource(
    "Custom Widget example",
    new ResourceTemplate("homarr://custom-widgets/examples/{name}", { list: undefined }),
    {
      description: "One canonical Custom Widget example.",
      mimeType: "application/json",
    },
    (uri, { name }) => {
      const example = getCustomWidgetExample(decodeURIComponent(String(name)));
      if (!example) throw new Error("Example resource not found");
      return {
        contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(example) }],
      };
    },
  );
}

const SAFE_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "You do not have permission to perform this action",
  FORBIDDEN: "Access denied",
  NOT_FOUND: "The requested resource was not found",
  BAD_REQUEST: "Invalid request parameters",
  INTERNAL_SERVER_ERROR: "An internal error occurred",
  TIMEOUT: "The operation timed out",
  TOO_MANY_REQUESTS: "Rate limit exceeded, try again later",
  CONFLICT: "A conflict occurred with the current state",
  PRECONDITION_FAILED: "A precondition for this operation was not met",
};

function sanitizeErrorMessage(error: unknown, toolName: string): string {
  if (toolName.startsWith("customWidget_")) return getSafeAssistantToolError(error, { toolName });
  if (error instanceof Error && "code" in error) {
    const trpcCode = (error as Error & { code: string }).code;
    const safeMessage = SAFE_ERROR_MESSAGES[trpcCode];
    if (safeMessage) return safeMessage;
  }
  if (error instanceof Error && error.message.length < 200 && !error.message.includes("/")) {
    return error.message;
  }
  return "Tool execution failed";
}

const SERVER_INSTRUCTIONS = `You are connected to Homarr, a self-hosted homelab dashboard. Use the listed tools and their descriptions for live data and actions; never invent resources, IDs, state, or results.

Integrations connect Homarr to services, boards contain widgets, and apps are visual links. Discover an integration before passing its integrationId to another tool. Returned permissions are authoritative: use access permits reads, interact access permits service actions, and full access permits configuration changes. Explain denied or unavailable access without suggesting a bypass.

Read current state when it matters, reuse results across a batch, and complete the requested work before summarizing. Load optional resources only when the task needs them. For Custom JSX authoring, start with the compact Custom Widget skill resource or prompt, then fetch only the live schema and named references or component documentation required by the design.`;

function extractApiKeyValue(req: NextRequest): string | null {
  const apiKeyHeader = req.headers.get(API_KEY_HEADER_NAME);
  if (apiKeyHeader) return apiKeyHeader;

  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);

  return null;
}

function jsonErrorResponse(status: number, body: Record<string, string>, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

export const handleMcpRequest = async (req: NextRequest) => {
  const pathname = new URL(req.url).pathname;
  if (pathname.endsWith("/sse") || pathname.endsWith("/message")) {
    return jsonErrorResponse(410, {
      error: "transport_removed",
      hint: "Legacy HTTP+SSE was removed. Connect to the stateless Streamable HTTP endpoint at /api/mcp.",
    });
  }

  const apiKeyValue = extractApiKeyValue(req);
  const ipAddress = ipAddressFromHeaders(req.headers);
  const { ua } = userAgent(req);

  if (!checkAuthRateLimit(ipAddress)) {
    return jsonErrorResponse(
      429,
      { error: "rate_limited", hint: "Too many failed authentication attempts. Try again later." },
      { "Retry-After": "60" },
    );
  }

  if (!apiKeyValue) {
    recordAuthFailure(ipAddress);
    const baseUrl = extractBaseUrlFromHeaders(req.headers);
    return jsonErrorResponse(
      401,
      {
        error: "unauthorized",
        hint: "Authenticate with an ApiKey header or via OAuth at /.well-known/oauth-authorization-server",
      },
      { "WWW-Authenticate": `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"` },
    );
  }

  if (!apiKeyValue.includes(".")) {
    recordAuthFailure(ipAddress);
    return jsonErrorResponse(401, { error: "invalid_token", hint: "The token must be in the format '<id>.<token>'." });
  }

  const session = await getSessionFromApiKeyAsync(db, apiKeyValue, ipAddress, ua);

  if (!session) {
    recordAuthFailure(ipAddress);
    return jsonErrorResponse(401, {
      error: "invalid_token",
      hint: "The API key was not found or the token is incorrect.",
    });
  }

  clearAuthFailures(ipAddress);
  logger.info("MCP request authenticated", { userId: session.user.id });

  const ctx = createTRPCContext({ session, headers: req.headers });
  const caller = mcpRouter.createCaller(ctx);
  const isAdmin = session.user.permissions.includes("admin");
  const protocolHandler = createMcpProtocolHandler({
    caller,
    tools: getVisibleTools(extractMcpTools(), isAdmin),
    version: getPackageVersion(),
    instructions: SERVER_INSTRUCTIONS,
    configureServer: isAdmin ? registerCustomWidgetAuthoring : undefined,
    formatToolError: sanitizeErrorMessage,
    onToolError: (tool, error) => {
      logger.warn("MCP tool execution failed", {
        tool,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorCode: error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : undefined,
      });
    },
    onProtocolError: (error) => {
      logger.warn("MCP protocol request failed", { error: error.message });
    },
  });

  return protocolHandler.fetch(req, {
    authInfo: {
      token: apiKeyValue,
      clientId: session.user.id,
      scopes: ["mcp:tools"],
    },
  });
};
