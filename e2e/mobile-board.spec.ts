import { chromium, devices, expect } from "@playwright/test";
import { createId } from "@paralleldrive/cuid2";
import { parse, stringify } from "superjson";
import { describe, test } from "vitest";

import { eq } from "drizzle-orm";
import * as sqliteSchema from "../packages/db/schema/sqlite";

import { createHomarrContainer } from "./shared/create-homarr-container";
import { createSqliteDbFileAsync } from "./shared/e2e-db";
import type { SqliteDatabase } from "./shared/e2e-db";
import { seedAdminUserAsync } from "./shared/seed-admin-user";

const credentials = {
  username: "admin",
  password: "Comp(exP4sswOrd",
};

const boardName = "mobile-e2e";

const seedBoardAsync = async (db: SqliteDatabase, userId: string) => {
  const boardId = createId();
  const desktopLayoutId = createId();
  const mobileLayoutId = createId();
  const sectionId = createId();
  const emptySectionId = createId();
  const notebookId = createId();
  const appItemId = createId();
  const appId = createId();

  await db.insert(sqliteSchema.boards).values({
    id: boardId,
    name: boardName,
    creatorId: userId,
  });
  await db.insert(sqliteSchema.layouts).values([
    {
      id: desktopLayoutId,
      name: "Desktop",
      boardId,
      columnCount: 12,
      breakpoint: 1200,
    },
    {
      id: mobileLayoutId,
      name: "Mobile",
      boardId,
      columnCount: 4,
      breakpoint: 0,
    },
  ]);
  await db.insert(sqliteSchema.sections).values([
    {
      id: sectionId,
      boardId,
      kind: "category",
      name: "Dashboard",
      xOffset: 0,
      yOffset: 0,
    },
    {
      id: emptySectionId,
      boardId,
      kind: "empty",
      xOffset: 0,
      yOffset: 1,
    },
  ]);
  await db.insert(sqliteSchema.apps).values({
    id: appId,
    name: "Media Server",
    iconUrl: "/favicon.ico",
  });
  await db.insert(sqliteSchema.items).values([
    {
      id: notebookId,
      boardId,
      kind: "notebook",
      options: stringify({ content: "<p>Normal notebook content</p>" }),
      advancedOptions: stringify({}),
    },
    {
      id: appItemId,
      boardId,
      kind: "app",
      options: stringify({ appId }),
      advancedOptions: stringify({}),
    },
  ]);
  await db.insert(sqliteSchema.itemLayouts).values([
    {
      itemId: notebookId,
      layoutId: desktopLayoutId,
      sectionId,
      xOffset: 0,
      yOffset: 0,
      width: 2,
      height: 2,
    },
    {
      itemId: appItemId,
      layoutId: desktopLayoutId,
      sectionId,
      xOffset: 2,
      yOffset: 0,
      width: 1,
      height: 1,
    },
    {
      itemId: notebookId,
      layoutId: mobileLayoutId,
      sectionId,
      xOffset: 0,
      yOffset: 0,
      width: 4,
      height: 4,
    },
    {
      itemId: appItemId,
      layoutId: mobileLayoutId,
      sectionId,
      xOffset: 0,
      yOffset: 4,
      width: 2,
      height: 2,
    },
  ]);
  await db
    .update(sqliteSchema.users)
    .set({
      homeBoardId: boardId,
      mobileHomeBoardId: boardId,
      completedBoardTour: true,
    })
    .where(eq(sqliteSchema.users.id, userId));

  return { appId };
};

describe("Automatic mobile board", () => {
  test("enables automatic mobile layout for a fresh database", async () => {
    const { db, localMountPath } = await createSqliteDbFileAsync();
    const container = await createHomarrContainer({
      mounts: {
        "/appdata": localMountPath,
      },
    }).start();

    try {
      const boardSettings = await db.query.serverSettings.findFirst({
        where: eq(sqliteSchema.serverSettings.settingKey, "board"),
      });
      if (!boardSettings) throw new Error("Expected board server settings to be seeded");

      expect(parse<{ enableAutomaticMobileLayout: boolean }>(boardSettings.value).enableAutomaticMobileLayout).toBe(
        true,
      );
    } finally {
      await container.stop();
    }
  }, 90_000);

  test("squeezes unchanged widgets into a read-only two-column grid", async () => {
    const { db, localMountPath } = await createSqliteDbFileAsync();
    const { userId } = await seedAdminUserAsync(db, credentials);
    const { appId } = await seedBoardAsync(db, userId);
    await db.insert(sqliteSchema.serverSettings).values({
      settingKey: "board",
      value: stringify({
        homeBoardId: null,
        mobileHomeBoardId: null,
        enableAutomaticMobileLayout: true,
        enableStatusByDefault: true,
        forceDisableStatus: false,
      }),
    });

    const container = await createHomarrContainer({
      environment: {
        AUTH_PROVIDERS: "credentials",
      },
      mounts: {
        "/appdata": localMountPath,
      },
    }).start();
    const baseUrl = `http://${container.getHost()}:${container.getMappedPort(7575)}`;
    const browser = await chromium.launch();
    const loginContext = await browser.newContext();

    try {
      const loginPage = await loginContext.newPage();
      await loginPage.goto(`${baseUrl}/auth/login`);
      await loginPage.getByLabel("Username").fill(credentials.username);
      await loginPage.locator("#password").fill(credentials.password);
      await loginPage.locator("button[type='submit']").click();
      await loginPage.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 15_000 });
      await loginPage.goto(`${baseUrl}/boards/${boardName}`);
      await expect(loginPage.locator("[data-mobile-board-preview-toggle]")).toHaveCount(0);
      await loginPage.getByRole("button", { name: "Toggle board edit mode", exact: true }).click();
      const previewToggle = loginPage.getByRole("button", { name: "Mobile preview", exact: true });
      await expect(previewToggle).toBeVisible();
      expect(await previewToggle.evaluate((element) => element.getBoundingClientRect().left)).toBeLessThan(32);
      await previewToggle.click();
      await expect(loginPage.locator("[data-mobile-board-preview]")).toBeVisible();
      await expect(loginPage.locator("[data-mobile-board-preview-item]")).toHaveCount(2);
      await expect(loginPage.getByText("Media Server", { exact: true })).toBeVisible();
      await expect(loginPage.locator(`[data-mobile-board-preview-app-icon="${appId}"] img`)).toHaveAttribute(
        "src",
        "/favicon.ico",
      );
      await loginPage
        .locator("header button")
        .filter({ has: loginPage.locator("svg.tabler-icon-plus") })
        .click();
      await loginPage.getByRole("menuitem", { name: "New item", exact: true }).click();
      await loginPage.getByPlaceholder("Filter items...").fill("Weather");
      await loginPage.getByPlaceholder("Filter items...").press("Enter");
      await expect(loginPage.locator("[data-mobile-board-preview-item]")).toHaveCount(3);
      await loginPage.getByRole("button", { name: "Cancel", exact: true }).click();
      await loginPage.getByRole("button", { name: "Collapse mobile preview", exact: true }).click();
      await expect(loginPage.locator("[data-mobile-board-preview]")).toHaveCount(0);
      await expect(previewToggle).toBeVisible();
      const storageState = await loginContext.storageState();

      const mobileContext = await browser.newContext({
        storageState,
        viewport: { width: 390, height: 844 },
        userAgent: devices["iPhone 13"].userAgent,
        hasTouch: true,
        isMobile: true,
      });
      const mobilePage = await mobileContext.newPage();
      await mobilePage.goto(`${baseUrl}/boards/${boardName}`);

      const mobileBoard = mobilePage.locator("[data-mobile-board]");
      const items = mobilePage.locator("[data-mobile-board-item]");
      await expect(mobileBoard).toBeVisible({ timeout: 15_000 });
      await expect(mobilePage.locator("[data-mobile-board-preview-toggle]")).toHaveCount(0);
      await expect(items).toHaveCount(2);
      await expect(mobilePage.locator(".grid-stack-item")).toHaveCount(0);
      await expect(mobilePage.getByText("Normal notebook content")).toBeVisible();
      await expect(mobilePage.getByRole("button", { name: "Toggle board edit mode", exact: true })).toHaveCount(0);
      await expect(mobilePage.getByRole("button", { name: /open widget details/i })).toHaveCount(0);
      await expect(mobilePage.getByRole("button", { name: /actions for/i })).toHaveCount(0);
      await expect(mobilePage.locator("[data-mobile-generic-summary], [data-mobile-display-mode]")).toHaveCount(0);

      const metrics = await mobilePage.evaluate(() => {
        const grid = document.querySelector<HTMLElement>("[data-mobile-board]");
        const itemElements = Array.from(document.querySelectorAll<HTMLElement>("[data-mobile-board-item]"));
        if (!grid || itemElements.length !== 2) throw new Error("Expected mobile grid and two items");

        const gridStyle = getComputedStyle(grid);
        const first = itemElements[0]?.getBoundingClientRect();
        const second = itemElements[1]?.getBoundingClientRect();
        if (!first || !second) throw new Error("Expected item bounds");

        return {
          columnCount: gridStyle.gridTemplateColumns.split(" ").filter(Boolean).length,
          firstToSecondWidthRatio: first.width / second.width,
          firstToSecondHeightRatio: first.height / second.height,
          horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });

      expect(metrics.columnCount).toBe(2);
      expect(metrics.firstToSecondWidthRatio).toBeGreaterThan(1.8);
      expect(metrics.firstToSecondHeightRatio).toBeGreaterThan(1.8);
      expect(metrics.horizontalOverflow).toBeLessThanOrEqual(0);
      await mobileContext.close();

      const tabletContext = await browser.newContext({
        storageState,
        viewport: { width: 768, height: 1024 },
        userAgent: devices["iPad (gen 7)"].userAgent,
        hasTouch: true,
        isMobile: true,
      });
      const tabletPage = await tabletContext.newPage();
      await tabletPage.goto(`${baseUrl}/boards/${boardName}`);
      await expect(tabletPage.locator("[data-mobile-board]")).toBeVisible({ timeout: 15_000 });
      await expect(tabletPage.locator("[data-mobile-board-item]")).toHaveCount(2);
      await expect(tabletPage.locator("[data-mobile-board-preview-toggle]")).toHaveCount(0);
      await expect(tabletPage.getByRole("button", { name: "Toggle board edit mode", exact: true })).toHaveCount(0);
      await tabletContext.close();
    } finally {
      await loginContext.close();
      await browser.close();
      await container.stop();
    }
  }, 180_000);

  test("keeps preview and generated mobile grid disabled in legacy mode", async () => {
    const { db, localMountPath } = await createSqliteDbFileAsync();
    const { userId } = await seedAdminUserAsync(db, credentials);
    await seedBoardAsync(db, userId);

    const container = await createHomarrContainer({
      environment: {
        AUTH_PROVIDERS: "credentials",
      },
      mounts: {
        "/appdata": localMountPath,
      },
    }).start();
    const baseUrl = `http://${container.getHost()}:${container.getMappedPort(7575)}`;
    const browser = await chromium.launch();
    const desktopContext = await browser.newContext();

    try {
      const desktopPage = await desktopContext.newPage();
      await desktopPage.goto(`${baseUrl}/auth/login`);
      await desktopPage.getByLabel("Username").fill(credentials.username);
      await desktopPage.locator("#password").fill(credentials.password);
      await desktopPage.locator("button[type='submit']").click();
      await desktopPage.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 15_000 });
      await desktopPage.goto(`${baseUrl}/boards/${boardName}`);
      await desktopPage.getByRole("button", { name: "Toggle board edit mode", exact: true }).click();
      await expect(desktopPage.locator("[data-mobile-board-preview-toggle]")).toHaveCount(0);

      const legacyContext = await browser.newContext({
        storageState: await desktopContext.storageState(),
        viewport: { width: 390, height: 844 },
        userAgent: devices["iPhone 13"].userAgent,
        hasTouch: true,
        isMobile: true,
      });
      const legacyPage = await legacyContext.newPage();
      await legacyPage.goto(`${baseUrl}/boards/${boardName}`);
      await expect(legacyPage.locator("[data-mobile-board]")).toHaveCount(0);
      await expect(legacyPage.locator(".grid-stack-item")).toHaveCount(2);
      await expect(legacyPage.getByRole("button", { name: "Toggle board edit mode", exact: true })).toBeVisible();
      await legacyContext.close();
    } finally {
      await desktopContext.close();
      await browser.close();
      await container.stop();
    }
  }, 180_000);
});
