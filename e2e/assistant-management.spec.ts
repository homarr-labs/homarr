import { chromium, expect } from "@playwright/test";
import { describe, test } from "vitest";

import { createHomarrContainer } from "./shared/create-homarr-container";
import { createSqliteDbFileAsync } from "./shared/e2e-db";
import { seedAdminUserAsync } from "./shared/seed-admin-user";
import * as sqliteSchema from "../packages/db/schema/sqlite";

const adminCredentials = {
  username: "admin",
  password: "Comp(exP4sswOrd",
};

describe("Assistant management", () => {
  test("keeps provider actions clear and the API key replacement flow responsive", async () => {
    const { db, localMountPath } = await createSqliteDbFileAsync();
    await seedAdminUserAsync(db, adminCredentials);
    await db.insert(sqliteSchema.assistantConfigurations).values({
      id: "default",
      enabled: true,
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      modelDiscoveryPath: null,
      encryptedApiKey: "encrypted.key",
      modelId: "deepseek/deepseek-v4-flash",
    });

    const homarrContainer = await createHomarrContainer({
      environment: {
        AUTH_PROVIDERS: "credentials",
      },
      mounts: {
        "/appdata": localMountPath,
      },
    }).start();

    const baseUrl = `http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}`;
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();

    try {
      await page.goto(`${baseUrl}/auth/login`);
      await page.getByLabel("Username").fill(adminCredentials.username);
      await page.locator("#password").fill(adminCredentials.password);
      await page.getByRole("button", { name: "Login" }).click();
      await page.waitForURL(baseUrl, { timeout: 15_000 });

      await page.goto(`${baseUrl}/manage/assistant`);
      await expect(page.getByRole("heading", { name: "Assistant" })).toBeVisible();
      await expect(page.getByText("Connection ready")).toBeVisible();
      await expect(page.getByText("Key protected")).toBeVisible();
      await expect(page.getByText("Encrypted API key saved")).toBeVisible();
      await expect(page.getByRole("button", { name: "Replace key" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Remove saved API key" })).toBeVisible();

      await page.getByRole("button", { name: "Replace key" }).click();
      const newKey = page.getByLabel("New API key");
      await expect(newKey).toBeFocused();
      await newKey.fill("replacement-test-api-key");
      await page.getByRole("button", { name: "Review replacement" }).click();
      await expect(page.getByText("The current key will stop being used")).toBeVisible();
      await expect(page.getByText("https://openrouter.ai/api/v1", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Replace API key" })).toBeVisible();

      await page.getByRole("button", { name: "Edit new key" }).click();
      await page.getByRole("button", { name: "Cancel replacement" }).click();
      await page.getByRole("button", { name: "Additional request headers" }).click();
      await expect(page.getByRole("button", { name: "Add header" })).toBeVisible();

      await page.getByRole("button", { name: "Remove all credentials" }).click();
      await expect(page.getByRole("dialog", { name: "Remove all assistant credentials" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Remove credentials" })).toBeVisible();
      await page.getByRole("button", { name: "Keep credentials" }).click();
      await expect(page.getByRole("dialog", { name: "Remove all assistant credentials" })).toBeHidden();

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expect(page.getByRole("heading", { name: "Assistant" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Replace key" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Save assistant" })).toBeVisible();
      await page.getByRole("button", { name: "Replace key" }).click();
      await expect(page.getByLabel("New API key")).toBeFocused();
      await page.getByLabel("New API key").fill("replacement-test-api-key");
      await page.getByRole("button", { name: "Review replacement" }).click();
      await expect(page.getByText("The current key will stop being used")).toBeVisible();
      await expect(page.getByRole("button", { name: "Edit new key" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Replace API key" })).toBeVisible();
      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(hasHorizontalOverflow).toBe(false);
    } finally {
      await browser.close();
      await homarrContainer.stop();
    }
  }, 120_000);
});
