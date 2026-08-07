import { describe, expect, test } from "vitest";

import type { Database } from "@homarr/db";
import { assistantConfigurations } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { getFeatureFlagsAsync } from "../features";

const seedConfigurationAsync = async (db: Database, values: Partial<typeof assistantConfigurations.$inferInsert>) => {
  await db.insert(assistantConfigurations).values({ id: "default", ...values });
};

describe("getFeatureFlagsAsync", () => {
  test("reports the assistant as off when it was never configured", async () => {
    const db = createDb() as unknown as Database;

    await expect(getFeatureFlagsAsync(db)).resolves.toEqual({ assistant: false });
  });

  test("reports the assistant as off while it is configured but not switched on", async () => {
    const db = createDb() as unknown as Database;
    await seedConfigurationAsync(db, {
      enabled: false,
      provider: "openrouter",
      modelId: "some/model",
      encryptedApiKey: "a.b",
    });

    await expect(getFeatureFlagsAsync(db)).resolves.toEqual({ assistant: false });
  });

  test("reports the assistant as off when a required api key is missing", async () => {
    const db = createDb() as unknown as Database;
    await seedConfigurationAsync(db, { enabled: true, provider: "openrouter", modelId: "some/model" });

    await expect(getFeatureFlagsAsync(db)).resolves.toEqual({ assistant: false });
  });

  test("reports the assistant as off when no model was picked", async () => {
    const db = createDb() as unknown as Database;
    await seedConfigurationAsync(db, { enabled: true, provider: "openrouter", encryptedApiKey: "a.b" });

    await expect(getFeatureFlagsAsync(db)).resolves.toEqual({ assistant: false });
  });

  test("reports the assistant as on once it is fully configured", async () => {
    const db = createDb() as unknown as Database;
    await seedConfigurationAsync(db, {
      enabled: true,
      provider: "openrouter",
      modelId: "some/model",
      encryptedApiKey: "a.b",
    });

    await expect(getFeatureFlagsAsync(db)).resolves.toEqual({ assistant: true });
  });

  test("does not require an api key for providers that run without one", async () => {
    const db = createDb() as unknown as Database;
    await seedConfigurationAsync(db, { enabled: true, provider: "ollama", modelId: "llama3" });

    await expect(getFeatureFlagsAsync(db)).resolves.toEqual({ assistant: true });
  });
});
