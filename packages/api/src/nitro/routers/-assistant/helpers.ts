import { ORPCError } from "@orpc/server";
import { parse, stringify } from "superjson";
import { z } from "zod/v4";

import { constructIntegrationPermissions, snapshotPolicyIdentity } from "@homarr/auth/nitro/policy";
import { isRecord } from "@homarr/common/object";
import type { Database } from "@homarr/db";
import {
  assistantProviderPresets,
  assistantProviderRequiresApiKey,
  everyoneGroup,
  getIconUrl,
  resolveAssistantModelId,
} from "@homarr/definitions";

import type { AuthenticatedBackendContext } from "../../context";
import type { AssistantConfiguration, AssistantModel, AssistantProcedureResources } from "./resources";

export const assistantConfigurationId = "default";

export function assistantSourceError(
  code: "BAD_REQUEST" | "BAD_GATEWAY" | "PRECONDITION_FAILED" | "UNAUTHORIZED" | "NOT_FOUND" | "INTERNAL_SERVER_ERROR",
  message: string,
) {
  return new ORPCError(code, { message, data: { zodError: null, error: null } });
}

export const assistantModelSchema = z.object({
  id: z.string().min(1).max(256),
  name: z.string().min(1).max(256),
  description: z.string().max(2048).nullable(),
  contextLength: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).nullable(),
  promptPrice: z.string().max(64).nullable(),
  completionPrice: z.string().max(64).nullable(),
  inputModalities: z.array(z.string().max(32)).max(16),
  toolSupport: z.enum(["confirmed", "unknown"]),
});

export const assistantCustomHeadersSchema = z
  .record(
    z
      .string()
      .trim()
      .min(1)
      .max(128)
      .regex(/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/),
    z
      .string()
      .max(2048)
      .refine((value) => !value.includes("\r") && !value.includes("\n")),
  )
  .refine((headers) => Object.keys(headers).length <= 20)
  .refine(
    (headers) =>
      !Object.keys(headers).some((name) =>
        ["connection", "content-length", "host", "transfer-encoding"].includes(name.toLowerCase()),
      ),
    "Hop-by-hop and transport headers cannot be configured.",
  );

export type AssistantContextEntity = {
  id: string;
  type: "app" | "integration" | "board" | "widget";
  label: string;
  description: string;
  iconUrl?: string;
  boardId?: string;
};

export type AssistantContextReference = Pick<AssistantContextEntity, "id" | "type">;

export function normalizeAssistantBaseUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw assistantSourceError("BAD_REQUEST", "Enter a valid provider URL.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw assistantSourceError(
      "BAD_REQUEST",
      "The provider URL must use HTTP or HTTPS without credentials, query parameters, or fragments.",
    );
  }
  return url.toString().replace(/\/$/, "");
}

export function normalizeAssistantDiscoveryPath(value: string | null) {
  if (value === null || value.trim() === "") return null;
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("?") || path.includes("#")) {
    throw assistantSourceError("BAD_REQUEST", "The model discovery path must be an absolute path such as /models.");
  }
  return path;
}

export function getGenerationIdsFromMessageContent(content: unknown) {
  if (!isRecord(content)) return [];
  const metadata = content.metadata;
  if (!isRecord(metadata)) return [];
  const custom = metadata.custom;
  if (!isRecord(custom)) return [];
  const telemetry = custom.telemetry;
  if (!isRecord(telemetry)) return [];
  const steps = telemetry.steps;
  if (!Array.isArray(steps)) return [];
  return steps
    .flatMap((step: unknown) => {
      if (!isRecord(step)) return [];
      const generationId = step.generationId;
      const accessToken = step.generationAccessToken;
      return typeof generationId === "string" &&
        /^gen-[A-Za-z0-9_-]{1,128}$/.test(generationId) &&
        typeof accessToken === "string" &&
        /^[A-Za-z0-9_-]{43}$/.test(accessToken)
        ? [{ generationId, accessToken }]
        : [];
    })
    .slice(0, 8);
}

export function addFeedbackToMessageContent(serializedContent: string, type: "positive" | "negative") {
  let content: unknown;
  try {
    content = parse(serializedContent);
  } catch {
    throw assistantSourceError("INTERNAL_SERVER_ERROR", "The stored message is invalid.");
  }
  if (!isRecord(content)) {
    throw assistantSourceError("INTERNAL_SERVER_ERROR", "The stored message is invalid.");
  }
  const metadata = isRecord(content.metadata) ? content.metadata : {};
  return stringify({ ...content, metadata: { ...metadata, submittedFeedback: { type } } });
}

function discoveryModels(body: unknown): unknown[] {
  if (Array.isArray(body)) return body.slice(0, 1_000);
  if (body === null || body === undefined) throw new TypeError("Invalid model discovery response.");
  const models = isRecord(body) ? (body.data ?? body.models ?? []) : [];
  if (!Array.isArray(models)) throw new TypeError("Invalid model discovery response.");
  return models.slice(0, 1_000);
}

function compatibleModel(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) throw new TypeError("Invalid model discovery entry.");
  return isRecord(value) ? value : {};
}

export function createAssistantHelpers(resources: AssistantProcedureResources) {
  const {
    apps,
    assistantConfigurations,
    assistantThreads,
    boards,
    boardGroupPermissions,
    boardUserPermissions,
    groupMembers,
    groups,
    integrationGroupPermissions,
    integrations,
    integrationUserPermissions,
    items,
    users,
  } = resources.tables;
  const { and, asc, eq, inArray, isNull, not, or } = resources.operators;

  function getHomarrProviderBaseUrl() {
    const baseUrl = resources.runtime.workshopApiUrl ?? resources.runtime.homarrWebsiteUrl;
    return baseUrl ? `${baseUrl.replace(/\/+$/u, "")}/api/ai/v1` : assistantProviderPresets.homarr.baseUrl;
  }

  async function getConfigurationAsync(db: Database) {
    return await db.query.assistantConfigurations.findFirst({
      where: eq(assistantConfigurations.id, assistantConfigurationId),
    });
  }

  async function getAssistantAvailabilityAsync(context: AuthenticatedBackendContext) {
    if (context.demo.enabled) return true;
    const configuration = await context.db.query.assistantConfigurations.findFirst({
      where: eq(assistantConfigurations.id, assistantConfigurationId),
      columns: { enabled: true, modelId: true, provider: true, encryptedApiKey: true },
    });
    return Boolean(
      configuration?.enabled &&
      configuration.modelId &&
      (!assistantProviderRequiresApiKey(configuration.provider) || configuration.encryptedApiKey),
    );
  }

  function decryptCustomHeaders(encryptedHeaders: `${string}.${string}` | null) {
    if (!encryptedHeaders) return {};
    try {
      const value: unknown = JSON.parse(resources.crypto.decryptSecret(encryptedHeaders));
      return assistantCustomHeadersSchema.parse(value);
    } catch {
      throw assistantSourceError("INTERNAL_SERVER_ERROR", "The stored provider headers could not be decrypted.");
    }
  }

  function getProviderHeaders(configuration: AssistantConfiguration) {
    const headers: Record<string, string> = {};
    if (configuration.encryptedApiKey) {
      const apiKey = resources.crypto.decryptSecret(configuration.encryptedApiKey);
      if (assistantProviderPresets[configuration.provider].discoveryAuthentication === "anthropic") {
        headers["X-Api-Key"] = apiKey;
        headers["anthropic-version"] = "2023-06-01";
      } else {
        headers.Authorization = `Bearer ${apiKey}`;
      }
    }
    if (configuration.provider === "openrouter") {
      headers["HTTP-Referer"] ??= "https://homarr.dev";
      headers["X-OpenRouter-Title"] ??= "Homarr AI Assistant";
    }
    return { ...headers, ...decryptCustomHeaders(configuration.encryptedHeaders) };
  }

  async function fetchModelsAsync(configuration: AssistantConfiguration): Promise<AssistantModel[]> {
    if (!configuration.modelDiscoveryPath) {
      throw assistantSourceError(
        "PRECONDITION_FAILED",
        "Model discovery is disabled for this provider. Enter a model ID manually.",
      );
    }
    const endpoint = `${configuration.baseUrl}${configuration.modelDiscoveryPath}`;
    let response: Response;
    try {
      response = await resources.transport.fetch(endpoint, {
        headers: getProviderHeaders(configuration),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw assistantSourceError("BAD_GATEWAY", "The model endpoint could not be reached from the Homarr server.");
    }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw assistantSourceError("UNAUTHORIZED", "The provider rejected the configured credentials.");
      }
      throw assistantSourceError("BAD_GATEWAY", `Model discovery failed with status ${response.status}.`);
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw assistantSourceError("BAD_GATEWAY", "The model endpoint returned invalid JSON.");
    }
    return discoveryModels(body)
      .map(compatibleModel)
      .filter((model) => {
        if (configuration.provider !== "openrouter" && configuration.provider !== "homarr") return true;
        const parameters: unknown[] = Array.isArray(model.supported_parameters) ? model.supported_parameters : [];
        const architecture = isRecord(model.architecture) ? model.architecture : null;
        const outputModalities: unknown[] = Array.isArray(architecture?.output_modalities)
          ? architecture.output_modalities
          : [];
        return parameters.includes("tools") && (outputModalities.length === 0 || outputModalities.includes("text"));
      })
      .flatMap((model): AssistantModel[] => {
        const id = typeof model.id === "string" ? model.id : typeof model.model === "string" ? model.model : null;
        if (!id || id.length > 256) return [];
        const rawName =
          typeof model.name === "string"
            ? model.name
            : typeof model.display_name === "string"
              ? model.display_name
              : id;
        const name = rawName.trim() || id;
        const contextLength =
          typeof model.context_length === "number" &&
          Number.isSafeInteger(model.context_length) &&
          model.context_length > 0
            ? model.context_length
            : typeof model.max_context_length === "number" &&
                Number.isSafeInteger(model.max_context_length) &&
                model.max_context_length > 0
              ? model.max_context_length
              : typeof model.max_input_tokens === "number" &&
                  Number.isSafeInteger(model.max_input_tokens) &&
                  model.max_input_tokens > 0
                ? model.max_input_tokens
                : null;
        const capabilities = isRecord(model.capabilities) ? model.capabilities : null;
        const toolSupport =
          configuration.provider === "openrouter" ||
          configuration.provider === "homarr" ||
          capabilities?.function_calling === true ||
          configuration.provider === "anthropic"
            ? "confirmed"
            : "unknown";
        const architecture = isRecord(model.architecture) ? model.architecture : null;
        const pricing = isRecord(model.pricing) ? model.pricing : null;
        const rawInputModalities: unknown[] = Array.isArray(architecture?.input_modalities)
          ? architecture.input_modalities
          : Array.isArray(model.input_modalities)
            ? model.input_modalities
            : [];
        const inputModalities = rawInputModalities
          .filter((modality): modality is string => typeof modality === "string" && modality.length <= 32)
          .slice(0, 16);
        return [
          {
            id,
            name: name.slice(0, 256),
            description: typeof model.description === "string" ? model.description.slice(0, 2048) : null,
            contextLength,
            promptPrice: typeof pricing?.prompt === "string" ? pricing.prompt.slice(0, 64) : null,
            completionPrice: typeof pricing?.completion === "string" ? pricing.completion.slice(0, 64) : null,
            inputModalities,
            toolSupport,
          },
        ];
      })
      .toSorted((left, right) => left.name.localeCompare(right.name));
  }

  async function getAssistantModelsAsync(configuration: AssistantConfiguration, refresh = false) {
    if (!configuration.modelDiscoveryPath) return [];
    const cacheKey = [
      configuration.provider,
      configuration.baseUrl,
      configuration.modelDiscoveryPath,
      configuration.updatedAt.getTime(),
    ].join(":");
    const cached = resources.modelListCache.get(cacheKey);
    if (!refresh && cached && cached.expiresAt > Date.now()) return cached.value;
    const value = await fetchModelsAsync(configuration);
    resources.modelListCache.clear();
    resources.modelListCache.set(cacheKey, { expiresAt: Date.now() + 10 * 60_000, value });
    return value;
  }

  async function getSelectedModelDetailsAsync(
    configuration: AssistantConfiguration,
    requestedModelId = configuration.modelId,
  ) {
    if (!requestedModelId || !configuration.modelDiscoveryPath) return null;
    const models = await getAssistantModelsAsync(configuration);
    const resolvedModelId = resolveAssistantModelId(models, requestedModelId);
    return models.find((model) => model.id === resolvedModelId) ?? null;
  }

  async function getAllBoardsAsync(context: AuthenticatedBackendContext) {
    const userId = context.principal.user.id;
    const [userPermissions, groupMemberships, currentUser] = await Promise.all([
      context.db.query.boardUserPermissions.findMany({ where: eq(boardUserPermissions.userId, userId) }),
      context.db.query.groupMembers.findMany({
        where: eq(groupMembers.userId, userId),
        with: { group: { with: { boardPermissions: {}, permissions: {} } } },
      }),
      context.db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { homeBoardId: true, mobileHomeBoardId: true },
      }),
    ]);
    const boardIds = userPermissions
      .map((permission) => permission.boardId)
      .concat(
        groupMemberships.flatMap((membership) =>
          membership.group.boardPermissions.map((permission) => permission.boardId),
        ),
      );
    const dbBoards = await context.db.query.boards.findMany({
      columns: { id: true, name: true, logoImageUrl: true, isPublic: true },
      with: {
        creator: { columns: { id: true, name: true, image: true, email: true } },
        userPermissions: { where: eq(boardUserPermissions.userId, userId) },
        groupPermissions: {
          where:
            groupMemberships.length > 0
              ? inArray(
                  boardGroupPermissions.groupId,
                  groupMemberships.map((membership) => membership.groupId),
                )
              : eq(boardGroupPermissions.groupId, ""),
        },
      },
      where: context.principal.user.permissions.includes("board-view-all")
        ? undefined
        : or(
            eq(boards.isPublic, true),
            eq(boards.creatorId, userId),
            boardIds.length > 0 ? inArray(boards.id, boardIds) : undefined,
          ),
    });
    return dbBoards.map((board) => ({
      ...board,
      isHome: currentUser?.homeBoardId === board.id,
      isMobileHome: currentUser?.mobileHomeBoardId === board.id,
    }));
  }

  async function getHomeIdBoardAsync(context: AuthenticatedBackendContext, user: typeof users.$inferSelect | null) {
    const settingKey = context.deviceType === "mobile" ? "mobileHomeBoardId" : "homeBoardId";
    if (!user) {
      const boardSettings = await resources.getServerSettingByKeyAsync(context.db, "board");
      return boardSettings[settingKey] ?? boardSettings.homeBoardId;
    }
    if (user[settingKey]) return user[settingKey];
    if (user.homeBoardId) return user.homeBoardId;
    const lowestGroupExceptEveryone = await context.db
      .select({ homeBoardId: groups.homeBoardId, mobileHomeBoardId: groups.mobileHomeBoardId })
      .from(groups)
      .leftJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(
        and(
          eq(groupMembers.userId, user.id),
          not(eq(groups.name, everyoneGroup)),
          not(isNull(groups[settingKey])),
          not(isNull(groups.homeBoardId)),
        ),
      )
      .orderBy(asc(groups.position))
      .limit(1)
      .then((result) => result[0]);
    if (lowestGroupExceptEveryone?.[settingKey]) return lowestGroupExceptEveryone[settingKey];
    if (lowestGroupExceptEveryone?.homeBoardId) return lowestGroupExceptEveryone.homeBoardId;
    const dbEveryoneGroup = await context.db.query.groups.findFirst({ where: eq(groups.name, everyoneGroup) });
    if (dbEveryoneGroup?.[settingKey]) return dbEveryoneGroup[settingKey];
    if (dbEveryoneGroup?.homeBoardId) return dbEveryoneGroup.homeBoardId;
    const boardSettings = await resources.getServerSettingByKeyAsync(context.db, "board");
    return boardSettings[settingKey] ?? boardSettings.homeBoardId;
  }

  async function getAssistantContextEntitiesAsync(
    context: AuthenticatedBackendContext,
  ): Promise<AssistantContextEntity[]> {
    const groupsOfCurrentUser = await context.db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, context.principal.user.id),
    });
    const [availableBoards, availableIntegrations, availableApps, currentUser] = await Promise.all([
      getAllBoardsAsync(context),
      context.db.query.integrations.findMany({
        columns: { id: true, name: true, kind: true },
        with: {
          userPermissions: { where: eq(integrationUserPermissions.userId, context.principal.user.id) },
          groupPermissions: {
            where: inArray(
              integrationGroupPermissions.groupId,
              groupsOfCurrentUser.map((group) => group.groupId).concat(""),
            ),
          },
        },
        orderBy: asc(integrations.name),
        limit: 250,
      }),
      context.db.query.apps.findMany({
        columns: { id: true, name: true, description: true, iconUrl: true },
        orderBy: asc(apps.name),
        limit: 250,
      }),
      context.db.query.users.findFirst({ where: eq(users.id, context.principal.user.id) }),
    ]);
    const homeBoardId = await getHomeIdBoardAsync(context, currentUser ?? null);
    const boardsById = new Map(availableBoards.map((board) => [board.id, board]));
    const availableItems =
      availableBoards.length === 0
        ? []
        : await context.db.query.items.findMany({
            columns: { id: true, boardId: true, kind: true },
            where: inArray(
              items.boardId,
              availableBoards.map((board) => board.id),
            ),
            orderBy: asc(items.kind),
            limit: 500,
          });
    const identity = snapshotPolicyIdentity({
      type: "authenticated",
      userId: context.principal.user.id,
      permissions: context.principal.user.permissions,
      groupIds: groupsOfCurrentUser.map((group) => group.groupId).concat(""),
    });
    return [
      ...availableApps.map((app): AssistantContextEntity => ({
        id: app.id,
        type: "app",
        label: app.name,
        description: app.description ?? "Homarr app",
        iconUrl: app.iconUrl,
      })),
      ...availableIntegrations
        .filter((integration) => constructIntegrationPermissions(integration, identity).hasUseAccess)
        .map((integration): AssistantContextEntity => ({
          id: integration.id,
          type: "integration",
          label: integration.name,
          description: `${integration.kind} integration`,
          iconUrl: getIconUrl(integration.kind),
        })),
      ...availableBoards.map((board): AssistantContextEntity => ({
        id: board.id,
        type: "board",
        label: board.name,
        description:
          board.id === homeBoardId ? "Home board" : board.isMobileHome ? "Mobile home board" : "Homarr board",
      })),
      ...availableItems.flatMap((item): AssistantContextEntity[] => {
        const board = boardsById.get(item.boardId);
        return board
          ? [
              {
                id: item.id,
                type: "widget",
                label: `${item.kind} · ${board.name}`,
                description: `${item.kind} widget on ${board.name}`,
                boardId: board.id,
              },
            ]
          : [];
      }),
    ];
  }

  async function ownedThreadAsync(db: Database, threadId: string, userId: string) {
    const thread = await db.query.assistantThreads.findFirst({
      where: and(eq(assistantThreads.id, threadId), eq(assistantThreads.userId, userId)),
    });
    if (!thread) throw assistantSourceError("NOT_FOUND", "Conversation not found.");
    return thread;
  }

  return {
    getHomarrProviderBaseUrl,
    getConfigurationAsync,
    getAssistantAvailabilityAsync,
    getProviderHeaders,
    fetchModelsAsync,
    getAssistantModelsAsync,
    getSelectedModelDetailsAsync,
    getAssistantContextEntitiesAsync,
    ownedThreadAsync,
  };
}
