// @vitest-environment node

import { describe, expect, test, vi } from "vitest";
import { parse } from "superjson";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import { eq } from "@homarr/db";
import {
  apps,
  assistantConfigurations,
  assistantMessages,
  assistantThreads,
  boards,
  integrations,
  integrationUserPermissions,
  items,
  users,
} from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { assistantRouter } from "../assistant";

vi.mock("@homarr/auth", () => ({}));
vi.mock("@homarr/common/server", () => ({
  decryptSecret: vi.fn(),
  encryptSecret: vi.fn(),
}));
vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({
    error: vi.fn(),
  }),
}));
vi.mock("@homarr/core/infrastructure/db/env", () => ({
  dbEnv: { DRIVER: "better-sqlite3" },
}));

const adminSession = {
  user: {
    id: createId(),
    permissions: ["admin"],
    colorScheme: "light",
  },
  expires: new Date().toISOString(),
} satisfies Session;

const createConfiguredAssistantAsync = async () => {
  const db = createDb();
  await db.insert(assistantConfigurations).values({
    id: "default",
    enabled: true,
    provider: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    modelDiscoveryPath: "/models",
    encryptedApiKey: "encrypted.key",
    encryptedHeaders: "encrypted.headers",
    modelId: "example/model",
  });
  return db;
};

describe("assistantRouter.updateConnection", () => {
  test("clears the persisted model when the discovery path changes without clearing credentials", async () => {
    const db = await createConfiguredAssistantAsync();
    const caller = assistantRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    await caller.updateConnection({
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      modelDiscoveryPath: "/catalog",
      clearApiKey: false,
      clearCustomHeaders: false,
    });

    const [configuration] = await db.select().from(assistantConfigurations);
    expect(configuration).toMatchObject({
      enabled: false,
      modelDiscoveryPath: "/catalog",
      modelId: null,
      encryptedApiKey: "encrypted.key",
      encryptedHeaders: "encrypted.headers",
    });
  });

  test("preserves the persisted model when the saved connection is unchanged", async () => {
    const db = await createConfiguredAssistantAsync();
    const caller = assistantRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    await caller.updateConnection({
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      modelDiscoveryPath: "/models",
      clearApiKey: false,
      clearCustomHeaders: false,
    });

    const [configuration] = await db.select().from(assistantConfigurations);
    expect(configuration).toMatchObject({
      enabled: true,
      modelDiscoveryPath: "/models",
      modelId: "example/model",
    });
  });
});

describe("assistantRouter.updateConfiguration", () => {
  test("normalizes legacy model labels to the discovered provider ID", async () => {
    const db = await createConfiguredAssistantAsync();
    await db
      .update(assistantConfigurations)
      .set({ encryptedHeaders: null })
      .where(eq(assistantConfigurations.id, "default"));
    const caller = assistantRouter.createCaller({ db, deviceType: undefined, session: adminSession });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          data: [
            {
              id: "deepseek/deepseek-v4-pro",
              name: "DeepSeek: DeepSeek V4 Pro",
              supported_parameters: ["tools"],
              architecture: { output_modalities: ["text"] },
            },
          ],
        }),
      ),
    );

    try {
      await caller.updateConfiguration({
        enabled: true,
        modelId: "DeepSeek: DeepSeek V4 Pro (deepseek/deepseek-v4-pro)",
      });
    } finally {
      vi.unstubAllGlobals();
    }

    const [configuration] = await db.select().from(assistantConfigurations);
    expect(configuration?.modelId).toBe("deepseek/deepseek-v4-pro");
  });
});

describe("assistant conversation features", () => {
  test("returns safe runtime model options to signed-in users", async () => {
    const db = await createConfiguredAssistantAsync();
    await db
      .update(assistantConfigurations)
      .set({
        baseUrl: "https://models.example/v1",
        encryptedHeaders: null,
        updatedAt: new Date("2026-07-30T14:00:00.000Z"),
      })
      .where(eq(assistantConfigurations.id, "default"));
    const caller = assistantRouter.createCaller({ db, deviceType: undefined, session: adminSession });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          data: [
            {
              id: "example/model",
              name: "Example Model",
              supported_parameters: ["tools"],
              architecture: { input_modalities: ["text", "image"], output_modalities: ["text"] },
            },
            {
              id: "example/no-tools",
              name: "No tools",
              supported_parameters: [],
              architecture: { output_modalities: ["text"] },
            },
          ],
        }),
      ),
    );

    try {
      const options = await caller.getRuntimeOptions();

      expect(options).toEqual({
        provider: "openrouter",
        defaultModelId: "example/model",
        models: [
          expect.objectContaining({
            id: "example/model",
            name: "Example Model",
            inputModalities: ["text", "image"],
          }),
        ],
      });
      expect(JSON.stringify(options)).not.toContain("encrypted");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("returns permission-checked entities for composer mentions", async () => {
    const db = await createConfiguredAssistantAsync();
    await db.insert(users).values({ id: adminSession.user.id });
    await db.insert(apps).values({ id: "app-1", name: "Plex", iconUrl: "https://example.com/plex.svg" });
    await db.insert(boards).values({ id: "board-1", name: "Home", isPublic: true });
    await db.insert(items).values({ id: "widget-1", boardId: "board-1", kind: "clock" });
    await db.insert(integrations).values({
      id: "integration-1",
      name: "Media server",
      kind: "plex",
      url: "https://example.com",
    });
    await db.insert(integrationUserPermissions).values({
      integrationId: "integration-1",
      userId: adminSession.user.id,
      permission: "use",
    });
    const caller = assistantRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const entities = await caller.getContextEntities();

    expect(entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "app-1", type: "app", label: "Plex" }),
        expect.objectContaining({ id: "board-1", type: "board", label: "Home" }),
        expect.objectContaining({ id: "widget-1", type: "widget", boardId: "board-1" }),
        expect.objectContaining({ id: "integration-1", type: "integration", label: "Media server" }),
      ]),
    );
  });

  test("persists a discovered model choice on the owned conversation", async () => {
    const db = await createConfiguredAssistantAsync();
    await db.insert(users).values({ id: adminSession.user.id });
    await db
      .update(assistantConfigurations)
      .set({
        baseUrl: "https://thread-models.example/v1",
        encryptedHeaders: null,
        updatedAt: new Date("2026-07-30T15:00:00.000Z"),
      })
      .where(eq(assistantConfigurations.id, "default"));
    const caller = assistantRouter.createCaller({ db, deviceType: undefined, session: adminSession });
    const thread = await caller.createThread();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          data: [
            {
              id: "example/model",
              name: "Default",
              supported_parameters: ["tools"],
              architecture: { output_modalities: ["text"] },
            },
            {
              id: "example/reasoning",
              name: "Reasoning",
              supported_parameters: ["tools"],
              architecture: { output_modalities: ["text"] },
            },
          ],
        }),
      ),
    );

    try {
      await caller.updateThreadModel({ threadId: thread.id, modelId: "example/reasoning" });
    } finally {
      vi.unstubAllGlobals();
    }

    const storedThread = await db.query.assistantThreads.findFirst({
      where: eq(assistantThreads.id, thread.id),
    });
    expect(storedThread?.modelId).toBe("example/reasoning");
  });

  test("persists feedback on an owned assistant message", async () => {
    const db = await createConfiguredAssistantAsync();
    await db.insert(users).values({ id: adminSession.user.id });
    const caller = assistantRouter.createCaller({ db, deviceType: undefined, session: adminSession });
    const thread = await caller.createThread();
    await caller.appendMessage({
      threadId: thread.id,
      id: "message-1",
      parentId: null,
      format: "ai-sdk/v6",
      content: { role: "assistant", parts: [{ type: "text", text: "Hello" }], metadata: { custom: {} } },
    });

    await caller.submitFeedback({ threadId: thread.id, messageId: "message-1", type: "positive" });

    const [message] = await db.select().from(assistantMessages);
    expect(message).toBeDefined();
    expect(parse(message?.content ?? "")).toMatchObject({
      metadata: { submittedFeedback: { type: "positive" } },
    });
  });
});
