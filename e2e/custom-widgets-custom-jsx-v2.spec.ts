import { chromium, expect } from "@playwright/test";
import type { Browser } from "@playwright/test";
import type { StartedTestContainer } from "testcontainers";
import { describe, test } from "vitest";

import { createHomarrContainer } from "./shared/create-homarr-container";
import { createSqliteDbFileAsync } from "./shared/e2e-db";
import type { MockApiServer } from "./shared/mock-api-server";
import { startMockApiServerAsync } from "./shared/mock-api-server";
import { seedAdminUserAsync } from "./shared/seed-admin-user";

const adminCredentials = { username: "admin", password: "Comp(exP4sswOrd" };
const initialTemplate =
  "<Stack><Title order={4}>{data.status?.title}</Title><Badge>{data.status?.status}</Badge></Stack>";
const updatedTemplate = "<Stack><Text fw={700}>{data.status?.title}</Text><Text>{data.status?.value}</Text></Stack>";

describe("Custom JSX v2 workbench", () => {
  test("creates, previews, edits, and immediately adds a widget to a board", async () => {
    let mockApi: MockApiServer | undefined;
    let homarrContainer: StartedTestContainer | undefined;
    let browser: Browser | undefined;

    try {
      mockApi = await startMockApiServerAsync({ title: "E2E Widget", status: "online", value: 42 });
      const { db, localMountPath } = await createSqliteDbFileAsync();
      await seedAdminUserAsync(db, adminCredentials);
      homarrContainer = await createHomarrContainer({
        environment: { AUTH_PROVIDERS: "credentials" },
        mounts: { "/appdata": localMountPath },
      }).start();
      const baseUrl = `http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}`;
      browser = await chromium.launch();
      const page = await browser.newPage();

      await page.goto(`${baseUrl}/auth/login`);
      await page.waitForLoadState("networkidle");
      await page.getByLabel("Username").fill(adminCredentials.username);
      await page.locator("#password").fill(adminCredentials.password);
      const signedIn = page.waitForURL((url) => url.origin === baseUrl && url.pathname !== "/auth/login", {
        waitUntil: "commit",
        timeout: 60_000,
      });
      await page.locator("button[type='submit']").click();
      await signedIn;

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
      await expect(page.locator("#requests-editor")).toContainText('"$option": "label"');
      await page.locator("#jsx-editor").fill(initialTemplate);

      await page.getByRole("button", { name: "Test and preview" }).last().click();
      await expect(page.getByRole("complementary", { name: "Widget preview" }).getByText("E2E Widget")).toBeVisible({
        timeout: 15_000,
      });

      const editPage = page.waitForURL("**/manage/custom-widgets/edit/**", { timeout: 15_000, waitUntil: "commit" });
      await page.getByRole("button", { name: "Create", exact: true }).last().click();
      await editPage;

      await page.locator("#jsx-editor").fill(updatedTemplate);
      await page.getByRole("button", { name: "Save", exact: true }).last().click();
      await expect(page.getByText('Widget "E2E Custom JSX v2" updated successfully.')).toBeVisible({ timeout: 15_000 });

      await page.goto(baseUrl);
      const tourOverlay = page.locator('[data-onboarding-tour-overlay="true"]');
      const skipTour = page.getByRole("button", { name: "Skip tour", exact: true });
      try {
        await skipTour.waitFor({ state: "visible", timeout: 5_000 });
        await skipTour.click();
        await expect(tourOverlay).toHaveCount(0);
      } catch (error) {
        if ((await tourOverlay.count()) > 0) throw error;
      }
      const editToggle = page.getByTestId("board-edit-mode-toggle");
      await editToggle.click();
      await expect(editToggle).toHaveAttribute("aria-pressed", "true", { timeout: 15_000 });
      await page.getByRole("button", { name: "Add board content", exact: true }).click();
      await page
        .getByRole("dialog", { name: "Create" })
        .getByRole("button", { name: /^Add widget / })
        .click();
      const picker = page.getByRole("dialog").last();
      await picker.getByRole("button", { name: /^E2E Custom JSX v2,/ }).click();
      const addDialog = page.getByRole("dialog").last();
      await expect(addDialog.getByText("E2E Custom JSX v2")).toBeVisible();
      await addDialog.getByRole("button", { name: "Save changes", exact: true }).click();

      await expect(page.getByText("Widget definition not found")).not.toBeVisible();
      await editToggle.click();
      await expect(editToggle).toHaveAttribute("aria-pressed", "false", { timeout: 15_000 });
      await expect(page.getByText("E2E Widget")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText("42")).toBeVisible({ timeout: 15_000 });
    } finally {
      await Promise.allSettled([browser?.close(), homarrContainer?.stop(), mockApi?.close()]);
    }
  }, 180_000);
});
