import { chromium, expect } from "@playwright/test";
import { describe, test } from "vitest";

import { createHomarrContainer } from "./shared/create-homarr-container";
import { createSqliteDbFileAsync } from "./shared/e2e-db";
import { startMockApiContainerAsync } from "./shared/mock-api-container";
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
    const mockApi = await startMockApiContainerAsync({
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
      await page.getByRole("button", { name: /Custom JSX/u }).click();
      await page.getByRole("combobox", { name: "Network scope" }).click();
      await page.getByRole("option", { name: "Private networks" }).click();
      await page.getByLabel("JSX Template").fill(initialTemplate);

      const previewPanel = page.getByRole("complementary", { name: "Preview" });
      await previewPanel.getByRole("button", { name: "Test" }).click();
      await expect(previewPanel.getByRole("heading", { name: "E2E Widget" }).first()).toBeVisible({
        timeout: 15_000,
      });

      await page.getByRole("button", { name: "Create" }).first().click();
      await expect(page.getByText('Widget "E2E Custom JSX" created successfully.')).toBeVisible({ timeout: 15_000 });
      await page.waitForURL("**/manage/custom-widgets/edit/**", { timeout: 15_000 });
      await expect(page.getByLabel("JSX Template")).toHaveText(initialTemplate);

      await page.getByLabel("JSX Template").fill(updatedTemplate);
      await expect(page.getByLabel("JSX Template")).toHaveText(updatedTemplate);

      await page.getByRole("button", { name: "Save" }).first().click();
      await expect(page.getByText('Widget "E2E Custom JSX" updated successfully.')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByLabel("JSX Template")).toHaveText(updatedTemplate);
    } finally {
      await browser.close();
      await homarrContainer.stop();
      await mockApi.stop();
    }
  }, 120_000);

  test("newly added custom widget does not show definition not found before reload", async () => {
    const mockApi = await startMockApiContainerAsync({
      title: "Board Widget",
      status: "running",
      value: 7,
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
      await page.getByRole("textbox", { name: "Name" }).fill("Board Widget");
      await page.getByRole("textbox", { name: "URL", exact: true }).fill(`${mockApi.url}/status`);
      await page.getByRole("button", { name: /Custom JSX/u }).click();
      await page.getByRole("combobox", { name: "Network scope" }).click();
      await page.getByRole("option", { name: "Private networks" }).click();
      await page.getByLabel("JSX Template").fill(initialTemplate);
      await page.getByRole("button", { name: "Create" }).first().click();
      await expect(page.getByText(/created successfully/u)).toBeVisible({ timeout: 15_000 });

      await page.goto(baseUrl);
      await page.waitForLoadState("networkidle");

      await page.getByRole("button", { name: /edit mode|Edit mode|pencil/iu }).first().click();

      await page.getByRole("button", { name: /Add widget|Add item/iu }).first().click();
      await page.getByRole("button", { name: /Custom API|Custom Widget/iu }).first().click();

      const addDialog = page.getByRole("dialog").last();
      await addDialog.getByText("Board Widget").first().click();

      await expect(page.getByText("Widget definition not found")).not.toBeVisible({ timeout: 10_000 });

      await page.getByRole("button", { name: /edit mode|Edit mode|pencil/iu }).first().click();
      await page.waitForLoadState("networkidle");

      await expect(page.getByText("Board Widget")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText("Widget definition not found")).not.toBeVisible({ timeout: 10_000 });
    } finally {
      await browser.close();
      await homarrContainer.stop();
      await mockApi.stop();
    }
  }, 180_000);
});
