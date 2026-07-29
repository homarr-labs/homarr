import type { Page } from "@playwright/test";
import { chromium, devices, expect } from "@playwright/test";
import { createId } from "@paralleldrive/cuid2";
import { stringify } from "superjson";
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

const setAutomaticMobileLayoutAsync = async (page: Page, enabled: boolean) => {
  await page.goto(new URL("/manage/settings", page.url()).toString());
  const toggle = page.getByRole("switch", { name: "Use automatic mobile layout" });
  await expect(toggle).toBeVisible();

  if ((await toggle.isChecked()) !== enabled) {
    await toggle.setChecked(enabled);
    await toggle.locator("xpath=ancestor::form").getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Settings saved successfully")).toBeVisible();
  }
};

const seedBoardAsync = async (db: SqliteDatabase, userId: string) => {
  const boardId = createId();
  const desktopLayoutId = createId();
  const mobileLayoutId = createId();
  const sectionId = createId();
  const notebookId = createId();
  const clockId = createId();

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
  await db.insert(sqliteSchema.sections).values({
    id: sectionId,
    boardId,
    kind: "category",
    name: "Dashboard",
    xOffset: 0,
    yOffset: 0,
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
      id: clockId,
      boardId,
      kind: "clock",
      options: stringify({}),
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
      itemId: clockId,
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
      itemId: clockId,
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
};

describe("Automatic mobile board", () => {
  test("squeezes unchanged widgets into a read-only two-column grid", async () => {
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
    const loginContext = await browser.newContext();

    try {
      const loginPage = await loginContext.newPage();
      await loginPage.goto(`${baseUrl}/auth/login`);
      await loginPage.getByLabel("Username").fill(credentials.username);
      await loginPage.locator("#password").fill(credentials.password);
      await loginPage.locator("button[type='submit']").click();
      await loginPage.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 15_000 });
      await setAutomaticMobileLayoutAsync(loginPage, true);
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

      await setAutomaticMobileLayoutAsync(loginPage, false);

      const legacyContext = await browser.newContext({
        storageState: await loginContext.storageState(),
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
      await loginContext.close();
      await browser.close();
      await container.stop();
    }
  }, 180_000);
});
