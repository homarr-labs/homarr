import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";
import type { Page } from "@playwright/test";
import { stringify as stringifySuperJSON } from "superjson";
import { describe, expect, test } from "vitest";

import * as sqliteSchema from "../packages/db/schema/sqlite";
import { createHomarrContainer } from "./shared/create-homarr-container";
import { createSqliteDbFileAsync } from "./shared/e2e-db";
import { loginAsync } from "./shared/login";
import { seedAdminUserAsync } from "./shared/seed-admin-user";

const credentials = { username: "admin", password: "Comp(exP4sswOrd" };

const captureScreenshotAsync = async (page: Page, name: string) => {
  const directory = process.env.HOMARR_E2E_SCREENSHOT_DIR?.trim();
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `manage-${name}.png`), fullPage: true });
};

describe("Management collections", () => {
  test("renders unified collections and a compact board preview on desktop and mobile", async () => {
    const { db, localMountPath } = await createSqliteDbFileAsync();
    const { userId } = await seedAdminUserAsync(db, credentials);
    const boardId = "manage-board";
    const layoutId = "manage-layout";
    const sectionId = "manage-section";
    const appId = "manage-app";

    await db.insert(sqliteSchema.apps).values({
      id: appId,
      name: "Very long service name used to verify responsive management rows",
      description: "A useful service with enough detail to exercise the shared collection description slot.",
      iconUrl: "/favicon.ico",
      href: "https://service.example.internal/a/very/long/reverse/proxy/path/that/must/not/overflow",
      pingUrl: "https://service.example.internal/health",
    });
    await db.insert(sqliteSchema.integrations).values({
      id: "manage-integration",
      name: "Living room Sonarr",
      url: "https://sonarr.example.internal/a/long/reverse/proxy/path",
      kind: "sonarr",
      appId,
    });
    await db.insert(sqliteSchema.searchEngines).values({
      id: "manage-search-engine",
      iconUrl: "/favicon.ico",
      name: "Internal documentation",
      short: "docs",
      description: "Search private documentation from Spotlight.",
      urlTemplate: "https://docs.example.internal/search?q=%s",
      type: "generic",
    });
    await db.insert(sqliteSchema.boards).values({
      id: boardId,
      name: "management-preview",
      creatorId: userId,
      isPublic: false,
    });
    await db.insert(sqliteSchema.layouts).values({
      id: layoutId,
      name: "Base",
      boardId,
      columnCount: 10,
      breakpoint: 768,
      role: "base",
    });
    await db.insert(sqliteSchema.sections).values({
      id: sectionId,
      boardId,
      kind: "empty",
      xOffset: 0,
      yOffset: 0,
    });
    await db.insert(sqliteSchema.items).values([
      {
        id: "manage-clock",
        boardId,
        kind: "clock",
        options: stringifySuperJSON({ is24HourFormat: true }),
      },
      {
        id: "manage-app-item",
        boardId,
        kind: "app",
        options: stringifySuperJSON({ appId, openInNewTab: true, showTitle: true }),
      },
    ]);
    await db.insert(sqliteSchema.itemLayouts).values([
      { itemId: "manage-clock", sectionId, layoutId, xOffset: 0, yOffset: 0, width: 2, height: 2 },
      { itemId: "manage-app-item", sectionId, layoutId, xOffset: 2, yOffset: 0, width: 1, height: 1 },
    ]);

    const homarrContainer = await createHomarrContainer({
      environment: { AUTH_PROVIDERS: "credentials" },
      mounts: { "/appdata": localMountPath },
    }).start();
    const baseUrl = `http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}`;
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();

    try {
      await loginAsync({ page, baseUrl, credentials, destination: "/manage/apps" });
      await page.getByRole("heading", { name: "Apps", exact: true }).waitFor();
      expect(await page.getByRole("list", { name: "Configured apps" }).getByRole("listitem").count()).toBe(1);
      const editApp = page.getByRole("link", { name: /Edit Very long service name/ });
      await editApp.focus();
      expect(await editApp.evaluate((element) => element === document.activeElement)).toBe(true);
      expect((await editApp.boundingBox())?.height).toBeGreaterThanOrEqual(44);

      await page.goto(`${baseUrl}/manage/integrations`);
      await page.getByRole("heading", { name: "Integrations", exact: true }).waitFor();
      expect(await page.getByRole("list", { name: "Configured integrations" }).getByRole("listitem").count()).toBe(1);
      expect(await page.getByText("Sonarr", { exact: true }).isVisible()).toBe(true);

      await page.goto(`${baseUrl}/manage/search-engines`);
      await page.getByRole("heading", { name: "Search engines", exact: true }).waitFor();
      expect(await page.getByRole("list", { name: "Configured search engines" }).getByRole("listitem").count()).toBe(1);

      await page.goto(`${baseUrl}/manage/boards`);
      await page.getByRole("heading", { name: "Your boards", exact: true }).waitFor();
      const preview = page.getByRole("img", { name: "Layout preview for management-preview, with 2 items" });
      await preview.waitFor();
      expect(await preview.locator('[data-lane="main"]').count()).toBe(1);
      await captureScreenshotAsync(page, "desktop-boards");

      await page.setViewportSize({ width: 375, height: 812 });
      for (const route of ["apps", "integrations", "search-engines", "boards"]) {
        await page.goto(`${baseUrl}/manage/${route}`);
        await page.locator("h1").waitFor();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      }
      await captureScreenshotAsync(page, "mobile-boards");
    } finally {
      await Promise.all([browser.close(), homarrContainer.stop()]);
    }
  }, 90_000);
});
