// @vitest-environment node

import { describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import { assistantConfigurations } from "@homarr/db/schema";
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
