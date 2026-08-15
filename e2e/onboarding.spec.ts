import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createId } from "@paralleldrive/cuid2";
import AdmZip from "adm-zip";
import type { StartedTestContainer } from "testcontainers";
import { describe, expect, test } from "vitest";

import * as sqliteSchema from "../packages/db/schema/sqlite";
import { OnboardingActions } from "./shared/actions/onboarding-actions";
import { OnboardingAssertions } from "./shared/assertions/onboarding-assertions";
import { createHomarrContainer } from "./shared/create-homarr-container";
import { createSqliteDbFileAsync } from "./shared/e2e-db";
import { loginAsync } from "./shared/login";
import { seedAdminUserAsync } from "./shared/seed-admin-user";

const captureScreenshotAsync = async (page: Page, name: string) => {
  const directory = process.env.HOMARR_E2E_SCREENSHOT_DIR?.trim();
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `onboarding-${name}.png`), fullPage: true });
};

type SqliteTestDatabase = Awaited<ReturnType<typeof createSqliteDbFileAsync>>;

const cleanupSqliteDbAsync = async ({ db, localMountPath }: SqliteTestDatabase) => {
  if (db.$client.open) db.$client.close();
  await rm(localMountPath, { recursive: true, force: true });
};

const createRestoreArchiveAsync = async () => {
  const sqlite = await createSqliteDbFileAsync();
  const { db, localMountPath } = sqlite;
  try {
    await db.insert(sqliteSchema.onboarding).values({ id: "onboarding", step: "finish", previousStep: "setup" });
    await db.insert(sqliteSchema.boards).values({ id: "restored-board", name: "restored", isPublic: true });
    await db.insert(sqliteSchema.layouts).values({
      id: "restored-base",
      boardId: "restored-board",
      name: "Base",
      role: "base",
      columnCount: 10,
      breakpoint: 768,
    });
    await db.insert(sqliteSchema.sections).values({
      id: "restored-root",
      boardId: "restored-board",
      kind: "empty",
      xOffset: 0,
      yOffset: 0,
    });
    db.$client.close();

    const zip = new AdmZip();
    zip.addFile("db.sqlite", await readFile(path.join(localMountPath, "db", "db.sqlite")));
    zip.addFile(
      "metadata.json",
      Buffer.from(
        JSON.stringify({
          homarrVersion: "e2e",
          exportedAt: new Date().toISOString(),
          dbDialect: "sqlite",
          encryptionKey: "0".repeat(64),
        }),
      ),
    );
    return zip.toBuffer();
  } finally {
    await cleanupSqliteDbAsync(sqlite);
  }
};

describe("Onboarding", () => {
  test.each([
    { name: "mobile", width: 320, height: 740 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1440, height: 900 },
  ])(
    "Onboarding is usable at the $name viewport",
    async ({ name, width, height }) => {
      const sqlite = await createSqliteDbFileAsync();
      const { localMountPath } = sqlite;
      const homarrContainer = await createHomarrContainer({ mounts: { "/appdata": localMountPath } }).start();
      const browser = await chromium.launch();
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
      const page = await context.newPage();

      try {
        await page.goto(`http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}/init`);
        await page.getByRole("heading", { name: "Make home feel organized." }).waitFor();
        const start = page.getByRole("button", { name: "Get started" });
        await start.focus();
        await start.press("Enter");
        await page.getByRole("heading", { name: "Create your administrator" }).waitFor();

        await page.getByLabel("Administrator username").fill("admin");
        await page.getByLabel("Password", { exact: true }).fill("Comp(exP4sswOrd");
        await page.getByLabel("Confirm password").fill("Comp(exP4sswOrd");
        await page.locator("css=button[type='submit']").click();
        await page.getByRole("heading", { name: "Start with familiar defaults" }).waitFor({ timeout: 30_000 });

        const serverOrigin = page.getByRole("textbox", { name: "Usual server address" });
        await serverOrigin.fill("https://home.example/homarr");
        await page.getByLabel("Default language").click();
        await page.getByRole("option", { name: /Français/ }).click();
        expect(await serverOrigin.inputValue()).toBe("https://home.example/homarr");
        expect(await page.getByRole("heading", { name: "Start with familiar defaults" }).isVisible()).toBe(true);

        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
        await captureScreenshotAsync(page, `${name}-studio`);

        const activeSection = page.locator('[aria-current="step"]');
        await activeSection.focus();
        await activeSection.press("ArrowLeft");
        await page.getByRole("heading", { name: "One board, built around your services" }).waitFor();
        expect(await activeSection.evaluate((element) => element === document.activeElement)).toBe(true);
        await activeSection.press("ArrowRight");
        await page.getByRole("heading", { name: "Start with familiar defaults" }).waitFor();
        expect(await activeSection.evaluate((element) => element === document.activeElement)).toBe(true);
        await activeSection.press("End");
        await page.getByRole("heading", { name: "One board, built around your services" }).waitFor();
        await activeSection.press("Home");
        await page.getByRole("heading", { name: "Start with familiar defaults" }).waitFor();
        expect(await activeSection.evaluate((element) => element === document.activeElement)).toBe(true);

        const sections = [
          ["Discover", "See what this installation can actually reach"],
          ["Connect", "Connect what makes the board useful"],
          ["Board", "Shape the board before it is built"],
          ["Extend", "Advanced features"],
        ] as const;
        for (const [section, heading] of sections) {
          await page.getByRole("button", { name: new RegExp(`^${section}`) }).click();
          await page.getByRole("heading", { name: heading }).waitFor();
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
        }

        await page.getByRole("button", { name: /^Board/ }).click();
        const boardPreview = page.locator('figure[aria-label="Live preview of the first board layout"]');
        expect(await boardPreview.getAttribute("data-layout-role")).toBe("base");
        expect(await boardPreview.getAttribute("data-layout-columns")).toBe("10");
        const columnSlider = page.getByRole("slider", { name: "Board columns" });
        await columnSlider.press("ArrowRight");
        await columnSlider.press("ArrowRight");
        expect(await boardPreview.getAttribute("data-layout-columns")).toBe("12");

        await page.getByRole("button", { name: /^Connect/ }).click();
        const sonarr = page.locator('button[aria-label="Sonarr"]');
        await sonarr.click();
        await page.getByLabel("Service URL").waitFor();
        await captureScreenshotAsync(page, `${name}-integration-details`);
        await sonarr.click();
        await page.getByLabel("Service URL").waitFor({ state: "detached" });

        await activeSection.focus();
        await activeSection.press("End");
        await page.getByRole("heading", { name: "One board, built around your services" }).waitFor();
        await captureScreenshotAsync(page, `${name}-review`);

        await page.getByRole("button", { name: "Build my board" }).click();
        await page.getByRole("heading", { name: "Your first board is ready." }).waitFor({ timeout: 30_000 });
        await captureScreenshotAsync(page, `${name}-finish`);

        await page.getByRole("link", { name: "Open my board" }).click();
        await page.waitForURL(/\/boards\/dashboard(?:[/?#]|$)/);
        const boardCanvas = page.locator('[data-testid="board-canvas"][data-board-hydrated="true"]');
        await boardCanvas.waitFor({ timeout: 30_000 });
        expect(await boardCanvas.locator("[data-grid-item-id]").count()).toBeGreaterThanOrEqual(3);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      } finally {
        try {
          await Promise.all([browser.close(), homarrContainer.stop()]);
        } finally {
          await cleanupSqliteDbAsync(sqlite);
        }
      }
    },
    90_000,
  );

  test.skip("SQLite onboarding restores a validated backup and survives the restart", async () => {
    const restoreArchive = await createRestoreArchiveAsync();
    const invalidArchive = new AdmZip();
    invalidArchive.addFile("db.sqlite", Buffer.from("not-a-database"));
    const sqlite = await createSqliteDbFileAsync();
    const { localMountPath } = sqlite;
    const initialContainer = await createHomarrContainer({ mounts: { "/appdata": localMountPath } }).start();
    let initialContainerStopped = false;
    let restoredContainer: StartedTestContainer | undefined;
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const initialBaseUrl = `http://${initialContainer.getHost()}:${initialContainer.getMappedPort(7575)}`;
      await page.goto(`${initialBaseUrl}/init`);
      await page.getByRole("button", { name: "Restore backup" }).click();
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: "missing-metadata.zip",
        mimeType: "application/zip",
        buffer: invalidArchive.toBuffer(),
      });
      await page.getByText("Invalid backup: missing metadata.json").waitFor();
      await page.getByRole("button", { name: "Change file" }).click();

      await fileInput.setInputFiles({ name: "homarr-backup.zip", mimeType: "application/zip", buffer: restoreArchive });
      await page.getByRole("heading", { name: "Backup Contents" }).waitFor({ timeout: 30_000 });
      expect(await page.getByText("restored", { exact: true }).isVisible()).toBe(true);
      await page.getByRole("button", { name: "Continue to restore" }).click();
      await page.getByPlaceholder("I understand").fill("I understand");
      const restoreResponse = page.waitForResponse(
        (response) => response.url().endsWith("/api/backup/import") && response.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Restore Database" }).click();
      expect((await restoreResponse).status()).toBe(200);

      await initialContainer.stop();
      initialContainerStopped = true;
      restoredContainer = await createHomarrContainer({ mounts: { "/appdata": localMountPath } }).start();
      const restoredBaseUrl = `http://${restoredContainer.getHost()}:${restoredContainer.getMappedPort(7575)}`;
      await page.goto(`${restoredBaseUrl}/boards/restored`);
      await page.locator('[data-testid="board-canvas"][data-board-hydrated="true"]').waitFor({ timeout: 30_000 });
      expect(page.url()).toMatch(/\/boards\/restored(?:[/?#]|$)/);
    } finally {
      try {
        await browser.close();
        if (!initialContainerStopped) await initialContainer.stop();
        if (restoredContainer) await restoredContainer.stop();
      } finally {
        await cleanupSqliteDbAsync(sqlite);
      }
    }
  }, 120_000);

  test("Credentials onboarding recovers when automatic sign-in fails after account creation", async () => {
    const sqlite = await createSqliteDbFileAsync();
    const { db, localMountPath } = sqlite;
    const homarrContainer = await createHomarrContainer({ mounts: { "/appdata": localMountPath } }).start();
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const baseUrl = `http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}`;
      await page.goto(`${baseUrl}/init`);
      await page.getByRole("button", { name: "Get started" }).click();
      await page.getByRole("heading", { name: "Create your administrator" }).waitFor();
      await page.route(/\/api\/auth\/callback\/credentials(?:\?.*)?$/, (route) => route.abort("failed"));
      await page.getByLabel("Administrator username").fill("admin");
      await page.getByLabel("Password", { exact: true }).fill("Comp(exP4sswOrd");
      await page.getByLabel("Confirm password").fill("Comp(exP4sswOrd");
      await page.locator("button[type='submit']").click();

      await page.getByRole("heading", { name: "Administrator account created" }).waitFor();
      const recovery = page.getByRole("link", { name: "Sign in and continue" });
      expect(await recovery.getAttribute("href")).toBe("/auth/login?callbackUrl=/init");
      expect(await recovery.evaluate((element) => element === document.activeElement)).toBe(true);
      expect((await db.query.users.findMany()).length).toBe(1);
      expect((await db.query.onboarding.findFirst())?.step).toBe("setup");
    } finally {
      try {
        await Promise.all([browser.close(), homarrContainer.stop()]);
      } finally {
        await cleanupSqliteDbAsync(sqlite);
      }
    }
  }, 60_000);

  test("External provider onboarding requires sign-in before privileged setup", async () => {
    // Arrange
    const sqlite = await createSqliteDbFileAsync();
    const { db, localMountPath } = sqlite;
    const homarrContainer = await createHomarrContainer({
      environment: {
        AUTH_PROVIDERS: "ldap",
        AUTH_LDAP_URI: "ldap://host.docker.internal:3890",
        AUTH_LDAP_BASE: "not-used",
        AUTH_LDAP_BIND_DN: "not-used",
        AUTH_LDAP_BIND_PASSWORD: "not-used",
      },
      mounts: {
        "/appdata": localMountPath,
      },
    }).start();
    const externalGroupName = "oidc-admins";

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    const actions = new OnboardingActions(page, db);
    const assertions = new OnboardingAssertions(page, db);

    try {
      // Act
      await page.goto(`http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}`);
      await actions.startOnboardingAsync();
      await actions.processExternalGroupStepAsync({
        name: externalGroupName,
      });

      // Assert
      await page.getByRole("heading", { name: "Administrator sign-in required" }).waitFor();
      expect(await page.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe(
        "/auth/login?callbackUrl=%2Finit",
      );
      await assertions.assertExternalGroupInsertedAsync(externalGroupName);
      await assertions.assertDbOnboardingStepAsync("setup");
    } finally {
      try {
        await Promise.all([browser.close(), homarrContainer.stop()]);
      } finally {
        await cleanupSqliteDbAsync(sqlite);
      }
    }
  }, 60_000);

  test("Legacy setup requires sign-in without exposing private board metadata", async () => {
    const credentials = { username: "admin", password: "Comp(exP4sswOrd" };
    const sqlite = await createSqliteDbFileAsync();
    const { db, localMountPath } = sqlite;
    await seedAdminUserAsync(db, credentials);
    await db.update(sqliteSchema.onboarding).set({ step: "import" as never });
    const privateBoardName = "private-board-must-not-leak";
    await db.insert(sqliteSchema.boards).values({ id: createId(), name: privateBoardName, isPublic: false });

    const privateWorkshopApiUrl = "http://internal-workshop-api.invalid";
    const privateWorkshopWebUrl = "http://internal-workshop-web.invalid";
    const homarrContainer = await createHomarrContainer({
      environment: {
        WORKSHOP_API_URL: privateWorkshopApiUrl,
        WORKSHOP_WEB_URL: privateWorkshopWebUrl,
      },
      mounts: { "/appdata": localMountPath },
    }).start();
    const baseUrl = `http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}`;
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const response = await context.request.get(`${baseUrl}/init`);
      expect(response.ok()).toBe(true);
      expect(response.url()).toBe(`${baseUrl}/init`);
      const responseBody = await response.text();
      expect(responseBody).not.toContain(privateBoardName);
      expect(responseBody).not.toContain(privateWorkshopApiUrl);
      expect(responseBody).not.toContain(privateWorkshopWebUrl);

      await page.goto(`${baseUrl}/init`);
      await page.getByRole("heading", { name: "Administrator sign-in required" }).waitFor();
      expect(await page.getByRole("link", { name: "Sign in and resume" }).getAttribute("href")).toBe(
        "/auth/login?callbackUrl=%2Finit",
      );

      await loginAsync({ page, baseUrl, credentials, destination: "/init" });
      await page.getByRole("heading", { name: "Make home feel organized." }).waitFor();
      await page.getByRole("button", { name: "Get started" }).click();
      await page.getByRole("heading", { name: "Start with familiar defaults" }).waitFor();
      expect(await page.getByRole("heading", { name: "Create your administrator" }).count()).toBe(0);
    } finally {
      try {
        await Promise.all([browser.close(), homarrContainer.stop()]);
      } finally {
        await cleanupSqliteDbAsync(sqlite);
      }
    }
  }, 90_000);

  test("Assistant setup restores saved configuration and accepts a manual model", async () => {
    const credentials = { username: "admin", password: "Comp(exP4sswOrd" };
    const sqlite = await createSqliteDbFileAsync();
    const { db, localMountPath } = sqlite;
    await seedAdminUserAsync(db, credentials);
    await db.update(sqliteSchema.onboarding).set({ step: "setup", previousStep: "group" });
    await db.insert(sqliteSchema.assistantConfigurations).values({
      id: "default",
      enabled: true,
      provider: "custom",
      baseUrl: "http://assistant.local/v1",
      modelDiscoveryPath: null,
      modelId: "local-model",
    });

    const configuredWorkshopApiUrl = "http://authenticated-workshop-api.invalid";
    const homarrContainer = await createHomarrContainer({
      environment: { WORKSHOP_API_URL: configuredWorkshopApiUrl },
      mounts: { "/appdata": localMountPath },
    }).start();
    const baseUrl = `http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}`;
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    try {
      await loginAsync({ page, baseUrl, credentials, destination: "/init" });
      expect(await page.locator('meta[name="homarr-workshop-api-url"]').getAttribute("content")).toBe(
        configuredWorkshopApiUrl,
      );
      await page.getByRole("button", { name: "Extend (5/6)" }).click();
      await page.getByRole("heading", { name: "Advanced features" }).waitFor();
      await page.getByRole("tab", { name: "Assistant" }).click();
      await page.getByLabel("API base URL").waitFor();

      const provider = page.getByRole("combobox", { name: "Provider", exact: true });
      await expect.poll(() => provider.inputValue(), { timeout: 10_000 }).toBe("Custom endpoint");
      expect(await page.getByLabel("API base URL").inputValue()).toBe("http://assistant.local/v1");
      expect(await page.locator('input[value="local-model"]').inputValue()).toBe("local-model");
      expect(await page.getByText("Discovery is unavailable. You can still enter a model ID manually.").count()).toBe(
        1,
      );
    } finally {
      try {
        await Promise.all([browser.close(), homarrContainer.stop()]);
      } finally {
        await cleanupSqliteDbAsync(sqlite);
      }
    }
  }, 90_000);
});
