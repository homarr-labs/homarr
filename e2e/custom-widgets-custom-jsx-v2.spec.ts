import { chromium, expect } from "@playwright/test";
import { describe, test } from "vitest";

import { createHomarrContainer } from "./shared/create-homarr-container";
import { createSqliteDbFileAsync } from "./shared/e2e-db";
import { startMockApiContainerAsync } from "./shared/mock-api-container";
import { seedAdminUserAsync } from "./shared/seed-admin-user";

const adminCredentials = { username: "admin", password: "Comp(exP4sswOrd" };
const requests = JSON.stringify(
  [
    {
      id: "status",
      sourceId: "default",
      kind: "query",
      method: "GET",
      pathTemplate: "/status",
      parameters: {},
      auth: "inherit",
      minimumBoardPermission: "view",
      trigger: "load",
    },
  ],
  null,
  2,
);
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
      await page.getByLabel("Username").fill(adminCredentials.username);
      await page.locator("#password").fill(adminCredentials.password);
      await page.locator("button[type='submit']").click();
      await page.waitForURL(baseUrl, { timeout: 15_000 });

      await page.goto(`${baseUrl}/manage/custom-widgets/new`);
      await page.getByRole("textbox", { name: "Name" }).fill("E2E Custom JSX v2");
      await page.getByRole("textbox", { name: "Base URL" }).fill(mockApi.url);
      await page.getByRole("combobox", { name: "Network scope" }).click();
      await page.getByRole("option", { name: "private" }).click();
      await page.locator("#requests-editor-root").fill(requests);
      await page.locator("#jsx-editor-root").fill(initialTemplate);

      await page.getByRole("button", { name: "Test and preview" }).last().click();
      await expect(page.getByRole("complementary", { name: "Widget preview" }).getByText("E2E Widget")).toBeVisible({
        timeout: 15_000,
      });

      await page.getByRole("button", { name: "Create widget" }).last().click();
      await expect(page.getByText('Widget "E2E Custom JSX v2" created successfully.')).toBeVisible({ timeout: 15_000 });
      await page.waitForURL("**/manage/custom-widgets/edit/**", { timeout: 15_000 });

      await page.locator("#jsx-editor-root").fill(updatedTemplate);
      await page.getByRole("button", { name: "Save changes" }).last().click();
      await expect(page.getByText('Widget "E2E Custom JSX v2" updated successfully.')).toBeVisible({ timeout: 15_000 });

      await page.goto(baseUrl);
      await page
        .getByRole("button", { name: /edit mode|pencil/iu })
        .first()
        .click();
      await page
        .getByRole("button", { name: /Add widget|Add item/iu })
        .first()
        .click();
      await page
        .getByRole("button", { name: /Custom API|Custom Widget/iu })
        .first()
        .click();
      const addDialog = page.getByRole("dialog").last();
      await addDialog.getByText("E2E Custom JSX v2").first().click();

      await expect(page.getByText("Widget definition not found")).not.toBeVisible();
      await page
        .getByRole("button", { name: /edit mode|pencil/iu })
        .first()
        .click();
      await expect(page.getByText("E2E Widget")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText("42")).toBeVisible({ timeout: 15_000 });
    } finally {
      await browser.close();
      await homarrContainer.stop();
      await mockApi.stop();
    }
  }, 180_000);
});
