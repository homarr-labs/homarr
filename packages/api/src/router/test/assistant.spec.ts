// @vitest-environment node

import { describe, expect, test, vi } from "vitest";
import { parse } from "superjson";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import {
  apps,
  assistantConfigurations,
  assistantMessages,
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

describe("assistant conversation features", () => {
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
