import { createServer } from "node:http";

import { chromium, expect } from "@playwright/test";
import type { Browser } from "@playwright/test";
import { stringify as stringifySuperJson } from "superjson";
import type { StartedTestContainer } from "testcontainers";
import { describe, test } from "vitest";

import { eq } from "drizzle-orm";
import {
  customWidgetDefinitions,
  customWidgetSecrets,
  legacyCustomWidgetDefinitions,
  legacyCustomWidgetSecrets,
} from "../packages/db/schema/sqlite";
import type { HomarrCustomWidgetV2Input } from "../packages/custom-widgets/src/core";

import { createHomarrContainer } from "./shared/create-homarr-container";
import { createSqliteDbFileAsync } from "./shared/e2e-db";
import type { MockApiServer } from "./shared/mock-api-server";
import { exposeHostPortToContainersAsync, startMockApiServerAsync } from "./shared/mock-api-server";
import { seedAdminUserAsync } from "./shared/seed-admin-user";

const adminCredentials = { username: "admin", password: "Comp(exP4sswOrd" };
const initialTemplate =
  "<Stack><Title order={4}>{data.status?.title}</Title><Badge>{data.status?.status}</Badge></Stack>";
const updatedTemplate = "<Stack><Text fw={700}>{data.status?.title}</Text><Text>{data.status?.value}</Text></Stack>";
const workshopWidgetName = "Workshop E2E widget";
const legacyWidgetName = "Legacy E2E Widget";
const legacyWidgetId = "legacy-e2e-widget";

interface WorkshopMockServer {
  url: string;
  close(): Promise<void>;
}

const startWorkshopMockServerAsync = async (widget: HomarrCustomWidgetV2Input): Promise<WorkshopMockServer> => {
  const submissionId = "e2eworkshop0001";
  const timestamp = "2026-07-28T10:00:00.000Z";
  const listing = {
    id: submissionId,
    collectionId: "workshop-listings",
    collectionName: "workshop_listings",
    type: "customWidget",
    title: workshopWidgetName,
    description: "Installed from the Workshop and rendered on a Homarr board.",
    widgetSchema: "homarr-custom-widget-v2",
    screenshots: [],
    author: "e2e-author",
    authorName: "E2E Workshop author",
    authorAvatar: "",
    authorAvatarUrl: "",
    authorGithubUsername: "",
    authorGithubProfileUrl: "",
    score: 1,
    upvotes: 1,
    downvotes: 0,
    commentCount: 0,
    reportCount: 0,
    revision: 1,
    changelog: "Initial E2E submission",
    outdated: false,
    created: timestamp,
    updated: timestamp,
  };
  const submission = {
    id: submissionId,
    collectionId: "submissions",
    collectionName: "submissions",
    type: listing.type,
    title: listing.title,
    description: listing.description,
    widgetSchema: listing.widgetSchema,
    content: JSON.stringify(widget),
    revision: listing.revision,
    changelog: listing.changelog,
    outdated: listing.outdated,
    screenshots: listing.screenshots,
    author: listing.author,
    created: timestamp,
    updated: timestamp,
  };

  const server = createServer((request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.setHeader("Access-Control-Allow-Private-Network", "true");
    response.setHeader("Content-Type", "application/json");

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    if (request.method === "GET" && pathname === "/api/collections/workshop_listings/records") {
      response.end(
        JSON.stringify({
          page: 1,
          perPage: 24,
          totalItems: 1,
          totalPages: 1,
          items: [listing],
        }),
      );
      return;
    }
    if (request.method === "GET" && pathname === `/api/collections/workshop_listings/records/${submissionId}`) {
      response.end(JSON.stringify(listing));
      return;
    }
    if (request.method === "GET" && pathname === `/api/collections/submissions/records/${submissionId}`) {
      response.end(JSON.stringify(submission));
      return;
    }

    response.writeHead(404);
    response.end(JSON.stringify({ code: 404, message: "Not found.", data: {} }));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "0.0.0.0", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Workshop mock server did not bind to a TCP port");

  try {
    return {
      url: await exposeHostPortToContainersAsync(address.port),
      close: () =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
          server.closeAllConnections();
        }),
    };
  } catch (error) {
    server.closeAllConnections();
    server.close();
    throw error;
  }
};

const loginAsAdmin = async (browser: Browser, baseUrl: string, clipboard = false) => {
  const context = await browser.newContext({
    permissions: clipboard ? ["clipboard-read", "clipboard-write"] : [],
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/auth/login`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Username").fill(adminCredentials.username);
  await page.locator("#password").fill(adminCredentials.password);
  await page.locator("button[type='submit']").click();
  await page.waitForURL(baseUrl, { timeout: 15_000 });
  return page;
};

const addCustomWidgetToBoard = async (
  page: Awaited<ReturnType<typeof loginAsAdmin>>,
  baseUrl: string,
  name: string,
) => {
  await page.goto(baseUrl);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "New item", exact: true }).click();
  await page.getByRole("menuitem", { name: "New item", exact: true }).click();
  const picker = page.getByRole("dialog").last();
  const customWidgetCard = picker.getByText(name, { exact: true }).locator("xpath=../../..");
  await customWidgetCard.hover();
  await customWidgetCard.getByRole("button", { name: "Add to board" }).click();
  const addDialog = page.getByRole("dialog", { name: `Edit item - ${name}`, exact: true });
  await expect(addDialog).toBeVisible();
  await addDialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
};

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
      const page = await loginAsAdmin(browser, baseUrl);

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

      await page.getByRole("button", { name: "Create", exact: true }).last().click();
      await expect(page.getByText('Widget "E2E Custom JSX v2" created successfully.')).toBeVisible({ timeout: 15_000 });
      await page.waitForURL("**/manage/custom-widgets/edit/**", { timeout: 15_000 });

      await page.locator("#jsx-editor").fill(updatedTemplate);
      await page.getByRole("button", { name: "Save", exact: true }).last().click();
      await expect(page.getByText('Widget "E2E Custom JSX v2" updated successfully.')).toBeVisible({ timeout: 15_000 });

      await addCustomWidgetToBoard(page, baseUrl, "E2E Custom JSX v2");
      await expect(page.getByText("E2E Widget")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText("42")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText("Widget definition not found")).not.toBeVisible();
    } finally {
      await Promise.allSettled([browser?.close(), homarrContainer?.stop(), mockApi?.close()]);
    }
  }, 180_000);

  test("installs a Workshop widget, places it on a board, and renders its query", async () => {
    let mockApi: MockApiServer | undefined;
    let workshopMock: WorkshopMockServer | undefined;
    let homarrContainer: StartedTestContainer | undefined;
    let browser: Browser | undefined;

    try {
      mockApi = await startMockApiServerAsync({ title: "Workshop query result", status: "online", value: 73 });
      const workshopWidget = {
        $schema: "homarr-custom-widget-v2",
        name: workshopWidgetName,
        description: "A Workshop installation exercised by the integrated E2E suite.",
        sources: {
          default: {
            name: "E2E API",
            baseUrl: mockApi.url,
            networkScope: "private",
            auth: "none",
          },
        },
        requests: { status: { path: "/status" } },
        options: {},
        template: updatedTemplate,
      } satisfies HomarrCustomWidgetV2Input;
      workshopMock = await startWorkshopMockServerAsync(workshopWidget);
      const { db, localMountPath } = await createSqliteDbFileAsync();
      await seedAdminUserAsync(db, adminCredentials);
      homarrContainer = await createHomarrContainer({
        environment: {
          AUTH_PROVIDERS: "credentials",
          WORKSHOP_API_URL: workshopMock.url,
        },
        mounts: { "/appdata": localMountPath },
      }).start();
      const baseUrl = `http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}`;
      browser = await chromium.launch();
      const page = await loginAsAdmin(browser, baseUrl);

      await page.goto(`${baseUrl}/manage/workshop`);
      await expect(page.getByText(workshopWidgetName, { exact: true })).toBeVisible({ timeout: 15_000 });
      await page.getByRole("button", { name: "Inspect widget" }).click();
      const workshopDialog = page.getByRole("dialog", { name: workshopWidgetName });
      await expect(
        workshopDialog.getByText("Installed from the Workshop and rendered on a Homarr board."),
      ).toBeVisible();
      await workshopDialog.getByRole("button", { name: "Install widget" }).click();

      const importDialog = page.getByRole("dialog", { name: "Review custom widget import" });
      await importDialog
        .getByRole("checkbox", {
          name: "I confirm that this server URL is correct for my Homarr installation",
        })
        .check();
      await importDialog.getByRole("button", { name: "Import widget" }).click();
      await expect(page.getByText("Widget imported successfully.")).toBeVisible({ timeout: 15_000 });
      await page.waitForURL("**/manage/custom-widgets/edit/**", { timeout: 15_000 });

      await addCustomWidgetToBoard(page, baseUrl, workshopWidgetName);
      await expect(page.getByText("Workshop query result")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText("73")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText("Widget definition not found")).not.toBeVisible();
    } finally {
      await Promise.allSettled([browser?.close(), homarrContainer?.stop(), workshopMock?.close(), mockApi?.close()]);
    }
  }, 180_000);

  test("migrates a redacted preserved v1 widget and resurfaces it when the v2 replacement is deleted", async () => {
    let homarrContainer: StartedTestContainer | undefined;
    let browser: Browser | undefined;

    const encryptedValue = "preserved.ciphertext" as `${string}.${string}`;
    const migratedWidget = {
      $schema: "homarr-custom-widget-v2",
      name: legacyWidgetName,
      description: "Validated v2 replacement for the preserved legacy widget.",
      sources: {
        default: {
          name: "Legacy API",
          baseUrl: "https://legacy-api.homarr.dev/api",
          networkScope: "public",
          auth: { type: "apiKeyHeader", name: "X-E2E-Key" },
        },
      },
      requests: { status: { path: "/status" } },
      options: {},
      template: "<Stack><Text>{data.status?.value}</Text></Stack>",
    } satisfies HomarrCustomWidgetV2Input;

    try {
      const { db, localMountPath } = await createSqliteDbFileAsync();
      const { userId } = await seedAdminUserAsync(db, adminCredentials);
      await db.insert(legacyCustomWidgetDefinitions).values({
        id: legacyWidgetId,
        name: legacyWidgetName,
        description: "Preserved v1 fixture",
        url: "https://legacy-user:super-secret@legacy-api.homarr.dev/api/status?token=token-value#fragment",
        authType: "apiKeyHeader",
        headerName: "X-E2E-Key",
        method: "POST",
        requestBody: JSON.stringify({ password: "nested-secret", filters: ["private-filter"] }),
        displayType: "singleValue",
        displayConfig: stringifySuperJson({ type: "singleValue", jsonPath: "$.value" }),
        enabled: true,
        creatorId: userId,
      });
      await db.insert(legacyCustomWidgetSecrets).values({
        definitionId: legacyWidgetId,
        kind: "apiKey",
        encryptedValue,
        updatedAt: new Date(0),
      });

      homarrContainer = await createHomarrContainer({
        environment: { AUTH_PROVIDERS: "credentials" },
        mounts: { "/appdata": localMountPath },
      }).start();
      const baseUrl = `http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}`;
      browser = await chromium.launch();
      const page = await loginAsAdmin(browser, baseUrl, true);

      await page.goto(`${baseUrl}/manage/custom-widgets`);
      const legacyCard = page
        .getByText(legacyWidgetName, { exact: true })
        .locator("xpath=ancestor::*[contains(@class, 'mantine-Card-root')]");
      await expect(legacyCard.getByText("Migration required", { exact: true })).toBeVisible();
      await legacyCard.getByRole("button", { name: "Actions" }).click();
      await page.getByRole("menuitem", { name: "Copy LLM migration prompt" }).click();
      await expect(page.getByText(/A redacted migration prompt was copied/u)).toBeVisible({ timeout: 15_000 });
      const prompt = await page.evaluate(() => navigator.clipboard.readText());
      expect(prompt).toContain("[REDACTED]");
      expect(prompt).not.toContain("legacy-user");
      expect(prompt).not.toContain("super-secret");
      expect(prompt).not.toContain("token-value");
      expect(prompt).not.toContain("nested-secret");
      expect(prompt).not.toContain("private-filter");

      await page.evaluate((widget) => navigator.clipboard.writeText(JSON.stringify(widget)), migratedWidget);
      await legacyCard.getByRole("button", { name: "Actions" }).click();
      await page.getByRole("menuitem", { name: "Paste migrated widget" }).click();
      const migrationDialog = page.getByRole("dialog", { name: "Review migrated v2 replacement" });
      await migrationDialog.getByRole("button", { name: "Confirm v2 replacement" }).click();
      await expect(
        page.getByText("Legacy widget migrated successfully. Existing board placements now use the v2 definition."),
      ).toBeVisible({ timeout: 15_000 });

      expect(
        await db.query.legacyCustomWidgetDefinitions.findFirst({
          where: eq(legacyCustomWidgetDefinitions.id, legacyWidgetId),
        }),
      ).toMatchObject({ id: legacyWidgetId, name: legacyWidgetName });
      expect(
        await db.query.legacyCustomWidgetSecrets.findFirst({
          where: eq(legacyCustomWidgetSecrets.definitionId, legacyWidgetId),
        }),
      ).toMatchObject({ definitionId: legacyWidgetId, encryptedValue });
      expect(
        await db.query.customWidgetDefinitions.findFirst({
          where: eq(customWidgetDefinitions.id, legacyWidgetId),
        }),
      ).toMatchObject({ id: legacyWidgetId, name: legacyWidgetName });
      expect(
        await db.query.customWidgetSecrets.findFirst({
          where: eq(customWidgetSecrets.definitionId, legacyWidgetId),
        }),
      ).toMatchObject({
        definitionId: legacyWidgetId,
        sourceId: "default",
        kind: "apiKey",
        encryptedValue,
      });

      await page.reload();
      const migratedCard = page
        .getByText(legacyWidgetName, { exact: true })
        .locator("xpath=ancestor::*[contains(@class, 'mantine-Card-root')]");
      await expect(migratedCard.getByText("Migration required", { exact: true })).not.toBeVisible();
      await migratedCard.getByRole("button", { name: "Actions" }).click();
      await page.getByRole("menuitem", { name: "Delete Custom Widget" }).click();
      const deleteDialog = page.getByRole("dialog", { name: "Delete Custom Widget" });
      await deleteDialog.getByRole("button", { name: "Confirm", exact: true }).click();
      await expect(page.getByText(`Widget "${legacyWidgetName}" deleted.`)).toBeVisible({ timeout: 15_000 });

      expect(
        await db.query.customWidgetDefinitions.findFirst({
          where: eq(customWidgetDefinitions.id, legacyWidgetId),
        }),
      ).toBeUndefined();
      expect(
        await db.query.legacyCustomWidgetDefinitions.findFirst({
          where: eq(legacyCustomWidgetDefinitions.id, legacyWidgetId),
        }),
      ).toMatchObject({ id: legacyWidgetId, name: legacyWidgetName });
      expect(
        await db.query.legacyCustomWidgetSecrets.findFirst({
          where: eq(legacyCustomWidgetSecrets.definitionId, legacyWidgetId),
        }),
      ).toMatchObject({ definitionId: legacyWidgetId, encryptedValue });

      await page.reload();
      const resurfacedLegacyCard = page
        .getByText(legacyWidgetName, { exact: true })
        .locator("xpath=ancestor::*[contains(@class, 'mantine-Card-root')]");
      await expect(resurfacedLegacyCard.getByText("Migration required", { exact: true })).toBeVisible();
    } finally {
      await Promise.allSettled([browser?.close(), homarrContainer?.stop()]);
    }
  }, 180_000);
});
