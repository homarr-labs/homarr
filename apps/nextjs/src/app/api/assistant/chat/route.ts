import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ToolSet, UIMessage } from "ai";
import { convertToModelMessages, jsonSchema, stepCountIs, streamText, tool } from "ai";
import { parse, stringify } from "superjson";
import { z } from "zod/v4";

import { createTRPCContext, mcpRouter } from "@homarr/api/mcp";
import { auth } from "@homarr/auth/next";
import { env } from "@homarr/common/env";
import { decryptSecret } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { and, eq } from "@homarr/db";
import { db } from "@homarr/db";
import { assistantConfigurations, assistantThreads } from "@homarr/db/schema";

import { extractMcpTools } from "../../mcp/_extract-tools";

export const maxDuration = 60;

const logger = createLogger({ module: "assistant" });

const requestSchema = z.object({
  id: z.string().min(1).max(64),
  messages: z
    .array(
      z
        .object({
          id: z.string().min(1).max(128),
          role: z.enum(["user", "assistant"]),
          parts: z.array(z.unknown()).max(200),
        })
        .passthrough(),
    )
    .max(200),
  tools: z
    .record(
      z.string(),
      z.object({
        description: z.string().optional(),
        parameters: z.record(z.string(), z.unknown()),
        providerOptions: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .refine((tools) => tools === undefined || Object.keys(tools).length <= 16)
    .optional(),
});

const browserToolDefinitions = {
  navigate_to_route: {
    description: "Navigate the current Homarr tab to a safe internal route.",
    parameters: {
      type: "object",
      properties: { path: { type: "string", description: "An internal Homarr path beginning with /" } },
      required: ["path"],
      additionalProperties: false,
    },
  },
  open_command_menu: {
    description: "Open Homarr's command and search menu.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  open_media_request_search: {
    description: "Open Homarr's media request search interface.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
} as const;

const assistantInstructions = `You are Homarr Assistant, embedded in the user's self-hosted Homarr dashboard.

Use the available Homarr tools whenever live instance data is needed. Never invent integrations, boards, apps, users, media, system status, or action results.

Homarr concepts:
- Integrations connect Homarr to services such as Sonarr, Radarr, Plex, Jellyfin, Home Assistant, download clients, DNS filters, and monitoring systems.
- Boards are customizable dashboards. Apps are visual links on boards. Widgets show live integration data.
- Tool inputs that require an integrationId must use an id returned by an integration discovery tool.
- Existing Homarr permissions are authoritative. If a tool denies access, explain that the current user lacks permission without suggesting a bypass.

Action rules:
- Prefer read-only tools before actions.
- Mutating Homarr tools require user approval. Present the exact intended change and wait for the approval flow.
- Do not retry a denied action.
- Browser tools can navigate within Homarr or open existing Homarr UI. Never navigate to an arbitrary external URL.
- Keep responses concise and lead with the result. Summarize tool output instead of dumping JSON.
- If configuration or a service is unavailable, say what the user or administrator can do next.`;

const safeToolError = (error: unknown) => {
  if (error instanceof Error && "code" in error) {
    switch ((error as Error & { code: string }).code) {
      case "UNAUTHORIZED":
      case "FORBIDDEN":
        return "You do not have permission to perform this action.";
      case "NOT_FOUND":
        return "The requested resource was not found.";
      case "BAD_REQUEST":
        return "The tool input was not valid.";
      case "TOO_MANY_REQUESTS":
        return "The operation is rate limited. Try again later.";
    }
  }
  return "The Homarr tool could not complete this request.";
};

const getProcedureTypeMap = () => {
  const procedures = (
    mcpRouter as unknown as {
      ["_def"]: { procedures: Record<string, { ["_def"]?: { type?: string } }> };
    }
  )["_def"].procedures;
  return new Map(
    Object.entries(procedures).flatMap(([path, procedure]) => {
      const type = procedure["_def"]?.type;
      return type === "query" || type === "mutation" ? [[path, type] as const] : [];
    }),
  );
};

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 2_000_000) {
    return Response.json({ error: "The assistant request is too large." }, { status: 413 });
  }

  const session = await auth();
  if (!session) {
    return Response.json({ error: "Sign in to use Homarr Assistant." }, { status: 401 });
  }

  const requestBody = await request.text();
  if (requestBody.length > 2_000_000) {
    return Response.json({ error: "The assistant request is too large." }, { status: 413 });
  }
  const parsed = requestSchema.safeParse(
    (() => {
      try {
        return JSON.parse(requestBody) as unknown;
      } catch {
        return null;
      }
    })(),
  );
  if (!parsed.success) {
    return Response.json({ error: "The assistant request was invalid." }, { status: 400 });
  }

  const configuration = await db.query.assistantConfigurations.findFirst({
    where: eq(assistantConfigurations.id, "default"),
  });
  const requiresApiKey = configuration?.provider === "openrouter" || configuration?.provider === "openai";
  if (!configuration?.enabled || !configuration.modelId || (requiresApiKey && !configuration.encryptedApiKey)) {
    return Response.json({ error: "Homarr Assistant is not configured." }, { status: 503 });
  }

  const thread = await db.query.assistantThreads.findFirst({
    where: and(
      eq(assistantThreads.id, parsed.data.id),
      eq(assistantThreads.userId, session.user.id),
      eq(assistantThreads.status, "regular"),
    ),
  });
  if (!thread) {
    return Response.json({ error: "Conversation not found." }, { status: 404 });
  }

  const context = createTRPCContext({ headers: request.headers, session });
  const caller = mcpRouter.createCaller(context);
  const procedureTypes = getProcedureTypeMap();

  const homarrTools = Object.fromEntries(
    extractMcpTools().map((mcpTool) => {
      const procedurePath = mcpTool.pathInRouter.join(".");
      const isMutation = procedureTypes.get(procedurePath) === "mutation";
      return [
        mcpTool.name,
        tool({
          description: mcpTool.description,
          inputSchema: jsonSchema(
            (mcpTool.inputSchema ?? { type: "object", properties: {} }) as Parameters<typeof jsonSchema>[0],
          ),
          needsApproval: isMutation,
          execute: async (input) => {
            try {
              const procedure = mcpTool.pathInRouter.reduce<unknown>(
                (current, segment) =>
                  (typeof current === "object" || typeof current === "function") && current !== null
                    ? (current as Record<string, unknown>)[segment]
                    : undefined,
                caller,
              );
              if (typeof procedure !== "function") {
                throw new Error("Procedure not callable");
              }
              const result = await (procedure as (value: unknown) => Promise<unknown>)(
                input && Object.keys(input as object).length > 0 ? input : undefined,
              );
              return parse(stringify(result));
            } catch (error) {
              logger.error("Assistant tool call failed", {
                toolName: mcpTool.name,
                error: error instanceof Error ? error.message : String(error),
              });
              return { error: safeToolError(error) };
            }
          },
        }),
      ];
    }),
  ) satisfies ToolSet;

  const frontendTools = Object.fromEntries(
    Object.keys(parsed.data.tools ?? {}).flatMap((name) => {
      if (!(name in browserToolDefinitions)) return [];
      const definition = browserToolDefinitions[name as keyof typeof browserToolDefinitions];
      return [
        [
          name,
          tool({
            description: definition.description,
            inputSchema: jsonSchema(definition.parameters as Parameters<typeof jsonSchema>[0]),
          }),
        ] as const,
      ];
    }),
  ) satisfies ToolSet;

  try {
    const customHeaders = configuration.encryptedHeaders
      ? z.record(z.string(), z.string()).parse(JSON.parse(decryptSecret(configuration.encryptedHeaders)))
      : {};
    const providerHeaders = {
      ...(configuration.provider === "openrouter"
        ? { "HTTP-Referer": "https://homarr.dev", "X-Title": "Homarr Assistant" }
        : {}),
      ...customHeaders,
    };
    const provider = createOpenAICompatible({
      name: `homarr-${configuration.provider}`,
      baseURL: configuration.baseUrl,
      apiKey: configuration.encryptedApiKey ? decryptSecret(configuration.encryptedApiKey) : undefined,
      headers: providerHeaders,
      includeUsage: true,
    });

    const result = streamText({
      model: provider(configuration.modelId),
      instructions: assistantInstructions,
      messages: await convertToModelMessages(parsed.data.messages as UIMessage[]),
      tools: { ...homarrTools, ...frontendTools },
      stopWhen: stepCountIs(8),
      abortSignal: request.signal,
      timeout: { totalMs: 55_000, stepMs: 30_000, toolMs: 30_000 },
      maxRetries: 2,
      experimental_toolApprovalSecret: env.SECRET_ENCRYPTION_KEY,
      onFinish: async () => {
        await db
          .update(assistantThreads)
          .set({ modelId: configuration.modelId, updatedAt: new Date() })
          .where(eq(assistantThreads.id, thread.id));
      },
    });

    return result.toUIMessageStreamResponse();
  } catch {
    return Response.json(
      { error: "The configured model endpoint could not start this response. Check its URL, model, and credentials." },
      { status: 502 },
    );
  }
}
