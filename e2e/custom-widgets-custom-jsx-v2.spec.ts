import { chromium, expect } from "@playwright/test";
import { describe, test } from "vitest";

import { createHomarrContainer } from "./shared/create-homarr-container";
import { createSqliteDbFileAsync } from "./shared/e2e-db";
import { startMockApiContainerAsync } from "./shared/mock-api-container";
import { seedAdminUserAsync } from "./shared/seed-admin-user";

const adminCredentials = { username: "admin", password: "Comp(exP4sswOrd" };
const initialTemplate =
  "<Stack><Title order={4}>{data.status?.title}</Title><Badge>{data.status?.status}</Badge></Stack>";
const updatedTemplate = "<Stack><Text fw={700}>{data.status?.title}</Text><Text>{data.status?.value}</Text></Stack>";

describe("Custom JSX v2 workbench", () => {
  test("creates, previews, edits, and immediately adds a widget to a board", async () => {
    const mockApi = await startMockApiContainerAsync({ title: "E2E Widget", status: "online", value: 42 });
    const { db, localMountPath } = await createSqliteDbFileAsync();
    await seedAdminUserAsync(db, adminCredentials);
    const homarrContainer = await createHomarrContainer({
      environment: { AUTH_PROVIDERS: "credentials" },
      mounts: { "/appdata": localMountPath },
    }).start();
    const baseUrl = `http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}`;
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
      await page.goto(`${baseUrl}/auth/login`);
      await page.waitForLoadState("networkidle");
      await page.getByLabel("Username").fill(adminCredentials.username);
      await page.locator("#password").fill(adminCredentials.password);
      await page.locator("button[type='submit']").click();
      await page.waitForURL(baseUrl, { timeout: 15_000 });

      await page.goto(`${baseUrl}/manage/custom-widgets/new`);
      await page.locator('input[data-path="name"]:visible').fill("E2E Custom JSX v2");
      await page.getByRole("textbox", { name: "Base URL" }).fill(mockApi.url);
      await page.getByRole("combobox", { name: "Network access" }).click();
      await page.getByRole("option", { name: "private" }).click();
      await page.getByRole("group", { name: "status" }).getByRole("textbox", { name: "Path" }).fill("/status");
      await page.getByRole("button", { name: "Add option" }).click();
      const option = page.getByRole("group", { name: "Option 1" });
      await option.getByRole("textbox", { name: "Option name" }).fill("label");
      await option.getByRole("textbox", { name: "Default" }).fill("E2E");
      const request = page.getByRole("group", { name: "status" });
      await request.getByRole("button", { name: "Query, body and behavior" }).click();
      await request.getByRole("button", { name: "Add query value" }).click();
      await request.getByRole("textbox", { name: "Query key" }).fill("label");
      await request.getByRole("combobox", { name: "Value source" }).click();
      await page.getByRole("option", { name: "Widget option" }).click();
      await request.getByRole("combobox", { name: "Option" }).first().click();
      await page.getByRole("option", { name: "label" }).click();
      await page.getByRole("button", { name: "Advanced manifest JSON" }).first().click();
      await expect(page.locator("#requests-editor-root")).toContainText('"$option": "label"');
      await page.locator("#jsx-editor-root").fill(initialTemplate);

      await page.getByRole("button", { name: "Test and preview" }).last().click();
      await expect(page.getByRole("complementary", { name: "Widget preview" }).getByText("E2E Widget")).toBeVisible({
        timeout: 15_000,
      });

      await page.getByRole("button", { name: "Create", exact: true }).last().click();
      await expect(page.getByText('Widget "E2E Custom JSX v2" created successfully.')).toBeVisible({ timeout: 15_000 });
      await page.waitForURL("**/manage/custom-widgets/edit/**", { timeout: 15_000 });

      await page.locator("#jsx-editor-root").fill(updatedTemplate);
      await page.getByRole("button", { name: "Save", exact: true }).last().click();
      await expect(page.getByText('Widget "E2E Custom JSX v2" updated successfully.')).toBeVisible({ timeout: 15_000 });

      await page.goto(baseUrl);
      await page.getByRole("button", { name: "Edit", exact: true }).click();
      await page.getByRole("button", { name: "New item", exact: true }).click();
      await page.getByRole("menuitem", { name: "New item", exact: true }).click();
      const picker = page.getByRole("dialog").last();
      const customWidgetCard = picker.getByText("E2E Custom JSX v2", { exact: true }).locator("xpath=../../..");
      await customWidgetCard.hover();
      await customWidgetCard.getByRole("button", { name: "Add to board" }).click();
      const addDialog = page.getByRole("dialog").last();
      await expect(addDialog.getByText("E2E Custom JSX v2")).toBeVisible();
      await addDialog.getByRole("button", { name: "Save changes", exact: true }).click();

      await expect(page.getByText("Widget definition not found")).not.toBeVisible();
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await expect(page.getByText("E2E Widget")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText("42")).toBeVisible({ timeout: 15_000 });
    } finally {
      await browser.close();
      await homarrContainer.stop();
      await mockApi.stop();
    }
  }, 180_000);
});
