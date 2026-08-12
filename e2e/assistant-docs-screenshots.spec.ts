import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium, expect } from "@playwright/test";
import { describe, test } from "vitest";

import * as sqliteSchema from "../packages/db/schema/sqlite";
import { createHomarrContainer } from "./shared/create-homarr-container";
import { createSqliteDbFileAsync } from "./shared/e2e-db";
import { seedAdminUserAsync } from "./shared/seed-admin-user";

const adminCredentials = {
  username: "admin",
  password: "Comp(exP4sswOrd",
};

// This is an opt-in documentation asset generator, not part of the normal E2E gate.
// Run it explicitly with UPDATE_DOCS_SCREENSHOTS=true when the documented UI changes.
describe.skipIf(process.env.UPDATE_DOCS_SCREENSHOTS !== "true")("Assistant documentation screenshots", () => {
  test("captures the management page and conversation panel", async () => {
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

    const outputDirectory = path.resolve("apps/docs/static/img/assistant");
    await mkdir(outputDirectory, { recursive: true });

    const homarrContainer = await createHomarrContainer({
      environment: { AUTH_PROVIDERS: "credentials" },
      mounts: { "/appdata": localMountPath },
    }).start();
    const baseUrl = `http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}`;
    const browser = await chromium.launch();
    const context = await browser.newContext({
      colorScheme: "dark",
      deviceScaleFactor: 1,
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();

    try {
      await page.goto(`${baseUrl}/auth/login`);
      await page.getByLabel("Username").fill(adminCredentials.username);
      await page.locator("#password").fill(adminCredentials.password);
      await page.getByRole("button", { name: "Login" }).click();
      await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 30_000 });

      await page.goto(`${baseUrl}/manage/assistant`);
      await expect(page.getByRole("heading", { name: "Assistant" })).toBeVisible();
      await expect(page.getByText("Connection ready")).toBeVisible();
      await page
        .getByRole("main")
        .first()
        .screenshot({
          animations: "disabled",
          path: path.join(outputDirectory, "configuration.png"),
        });

      await page.goto(baseUrl);
      await expect(page.getByRole("main").first()).toBeVisible();
      await page.locator("body").click({ position: { x: 12, y: 12 } });
      await page.keyboard.press("Shift+A");
      const assistantDialog = page.getByRole("dialog", { name: "Homarr Assistant" });
      await expect(assistantDialog).toBeVisible();
      await assistantDialog.screenshot({
        animations: "disabled",
        path: path.join(outputDirectory, "conversation.png"),
      });

      await db.update(sqliteSchema.assistantConfigurations).set({
        provider: "homarr",
        baseUrl: "https://homarr.dev/api/ai/v1",
        modelDiscoveryPath: "/models",
        encryptedApiKey: null,
        modelId: "homarr/model",
      });
      await page.goto(`${baseUrl}/manage/assistant`);
      await expect(page.getByRole("heading", { name: "Assistant" })).toBeVisible();
      await expect(page.getByText("Homarr", { exact: true }).first()).toBeVisible();
      await expect(page.getByRole("button", { name: "Refresh models" })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText("Homarr model")).toBeVisible();
    } finally {
      await browser.close();
      await homarrContainer.stop();
    }
  }, 120_000);
});
