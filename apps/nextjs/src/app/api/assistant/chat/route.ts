import { hkdfSync } from "node:crypto";

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
import { assistantProviderRequiresApiKey } from "@homarr/definitions";

import { browserToolContracts } from "~/components/assistant/assistant-tool-contracts";

import { extractMcpTools } from "../../mcp/_extract-tools";

export const maxDuration = 60;

const logger = createLogger({ module: "assistant" });
const getToolApprovalSecret = () =>
  Buffer.from(
    hkdfSync("sha256", Buffer.from(env.SECRET_ENCRYPTION_KEY, "hex"), "", "assistant-tool-approval", 32),
  ).toString("base64url");
const safeStreamError = "The model endpoint stopped the response. Check its URL, model, and credentials.";

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
  const requiresApiKey = configuration ? assistantProviderRequiresApiKey(configuration.provider) : false;
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
  const mcpTools = extractMcpTools();

  const homarrTools = Object.fromEntries(
    mcpTools.map((mcpTool) => {
      return [
        mcpTool.name,
        tool({
          description: mcpTool.description,
          inputSchema: jsonSchema(
            (mcpTool.inputSchema ?? { type: "object", properties: {} }) as Parameters<typeof jsonSchema>[0],
          ),
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
  const toolApproval = Object.fromEntries(
    mcpTools.flatMap((mcpTool) =>
      procedureTypes.get(mcpTool.pathInRouter.join(".")) === "mutation"
        ? [[mcpTool.name, "user-approval" as const]]
        : [],
    ),
  );

  const frontendTools = Object.fromEntries(
    Object.keys(parsed.data.tools ?? {}).flatMap((name) => {
      if (!(name in browserToolContracts)) return [];
      const definition = browserToolContracts[name as keyof typeof browserToolContracts];
      return [
        [
          name,
          tool({
            description: definition.description,
            inputSchema: jsonSchema(z.toJSONSchema(definition.parameters) as Parameters<typeof jsonSchema>[0]),
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
      toolApproval,
      experimental_toolApprovalSecret: getToolApprovalSecret(),
      onError: ({ error }) => {
        logger.error("Assistant response stream failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      },
      onFinish: async () => {
        try {
          await db
            .update(assistantThreads)
            .set({ modelId: configuration.modelId, updatedAt: new Date() })
            .where(eq(assistantThreads.id, thread.id));
        } catch (error) {
          logger.error("Failed to update assistant conversation metadata", {
            threadId: thread.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
    });

    return result.toUIMessageStreamResponse({ onError: () => safeStreamError });
  } catch {
    return Response.json(
      { error: "The configured model endpoint could not start this response. Check its URL, model, and credentials." },
      { status: 502 },
    );
  }
}
