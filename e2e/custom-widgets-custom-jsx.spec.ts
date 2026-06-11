import { chromium, expect } from "@playwright/test";
import { describe, test } from "vitest";

import { createHomarrContainer } from "./shared/create-homarr-container";
import { createSqliteDbFileAsync } from "./shared/e2e-db";
import { startMockApiServerAsync } from "./shared/mock-api-server";
import { seedAdminUserAsync } from "./shared/seed-admin-user";

const adminCredentials = {
  username: "admin",
  password: "Comp(exP4sswOrd",
};

const initialTemplate =
  '<Stack gap="xs"><Title order={4}>{data.title}</Title><Badge color="blue">{data.status}</Badge></Stack>';

const updatedTemplate = '<Stack gap="xs"><Text>{data.title}</Text><Badge color="green">{data.value}</Badge></Stack>';

describe("Custom JSX custom widgets", () => {
  test("creates, previews, and edits a customJsx widget", async () => {
    const mockApi = await startMockApiServerAsync({
      title: "E2E Widget",
      status: "online",
      value: 42,
    });

    const { db, localMountPath } = await createSqliteDbFileAsync();
    await seedAdminUserAsync(db, adminCredentials);

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
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(`${baseUrl}/auth/login`);
      await page.getByLabel("Username").fill(adminCredentials.username);
      await page.locator("#password").fill(adminCredentials.password);
      await page.locator("css=button[type='submit']").click();
      await page.waitForURL(baseUrl, { timeout: 15_000 });

      await page.goto(`${baseUrl}/manage/custom-widgets/new`);
      await page.waitForURL("**/manage/custom-widgets/new", { timeout: 15_000 });
      await page.getByRole("textbox", { name: "Name" }).fill("E2E Custom JSX");
      await page.getByRole("textbox", { name: "URL", exact: true }).fill(`${mockApi.url}/status`);
      await page.getByRole("combobox", { name: "Display Type" }).click();
      await page.getByRole("option", { name: "Custom JSX" }).click();
      await page.getByLabel("JSX Template").fill(initialTemplate);

      await page.getByRole("button", { name: "Test" }).first().click();
      const previewPanel = page.locator(".mantine-Card-root").filter({ hasText: "Preview" });
      await expect(previewPanel.getByRole("heading", { name: "E2E Widget" }).first()).toBeVisible({
        timeout: 15_000,
      });

      await page.getByRole("button", { name: "Create" }).first().click();
      await expect(page.getByText('Widget "E2E Custom JSX" created successfully.')).toBeVisible({ timeout: 15_000 });
      await page.waitForURL("**/manage/custom-widgets/edit/**", { timeout: 15_000 });
      await expect(page.getByLabel("JSX Template")).toHaveValue(initialTemplate);

      await page.getByLabel("JSX Template").fill(updatedTemplate);
      await expect(page.getByLabel("JSX Template")).toHaveValue(updatedTemplate);

      await page.getByRole("button", { name: "Save" }).first().click();
      await expect(page.getByText('Widget "E2E Custom JSX" updated successfully.')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByLabel("JSX Template")).toHaveValue(updatedTemplate);
    } finally {
      await browser.close();
      await homarrContainer.stop();
      await mockApi.close();
    }
  }, 120_000);
});
