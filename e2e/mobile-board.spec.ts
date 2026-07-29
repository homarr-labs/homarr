import { chromium, devices, expect } from "@playwright/test";
import { createId } from "@paralleldrive/cuid2";
import SuperJSON from "superjson";
import { describe, test } from "vitest";

import { eq } from "@homarr/db";
import * as sqliteSchema from "@homarr/db/schema/sqlite";

import { createHomarrContainer } from "./shared/create-homarr-container";
import { createSqliteDbFileAsync } from "./shared/e2e-db";
import type { SqliteDatabase } from "./shared/e2e-db";
import { seedAdminUserAsync } from "./shared/seed-admin-user";

const adminCredentials = {
  username: "admin",
  password: "Comp(exP4sswOrd",
};

const boardName = "mobile-e2e";

const seedMobileBoardAsync = async (db: SqliteDatabase, userId: string) => {
  const boardId = createId();
  const layoutId = createId();
  const firstSectionId = createId();
  const secondSectionId = createId();

  await db.insert(sqliteSchema.boards).values({
    id: boardId,
    name: boardName,
    creatorId: userId,
  });
  await db.insert(sqliteSchema.layouts).values({
    id: layoutId,
    name: "Desktop",
    boardId,
    columnCount: 12,
    breakpoint: 0,
  });
  await db.insert(sqliteSchema.sections).values([
    {
      id: firstSectionId,
      boardId,
      kind: "category",
      name: "First section",
      xOffset: 0,
      yOffset: 0,
    },
    {
      id: secondSectionId,
      boardId,
      kind: "category",
      name: "Second section",
      xOffset: 0,
      yOffset: 20,
    },
  ]);

  const itemRows = Array.from({ length: 36 }, (_, index) => {
    const id = createId();
    return {
      id,
      boardId,
      kind: index === 0 ? ("notebook" as const) : ("clock" as const),
      options: SuperJSON.stringify(index === 0 ? { content: "<p>Mobile notes</p>" } : {}),
      advancedOptions: SuperJSON.stringify({}),
    };
  });
  await db.insert(sqliteSchema.items).values(itemRows);
  await db.insert(sqliteSchema.itemLayouts).values(
    itemRows.map((item, index) => ({
      itemId: item.id,
      layoutId,
      sectionId: index < 18 ? firstSectionId : secondSectionId,
      xOffset: (index % 6) * 2,
      yOffset: Math.floor((index % 18) / 6) * 2,
      width: 2,
      height: 2,
    })),
  );
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
  test("keeps phones and narrow tablets read-only, two-column, accessible, and overflow-free", async () => {
    const { db, localMountPath } = await createSqliteDbFileAsync();
    const { userId } = await seedAdminUserAsync(db, adminCredentials);
    await seedMobileBoardAsync(db, userId);

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
    const loginContext = await browser.newContext();

    try {
      const loginPage = await loginContext.newPage();
      await loginPage.goto(`${baseUrl}/auth/login`);
      await loginPage.getByLabel("Username").fill(adminCredentials.username);
      await loginPage.locator("#password").fill(adminCredentials.password);
      await loginPage.locator("button[type='submit']").click();
      await loginPage.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 15_000 });
      const storageState = await loginContext.storageState();

      const mobileViewports = [
        { name: "small phone", width: 320, height: 568, userAgent: devices["iPhone 13"].userAgent, phone: true },
        { name: "phone", width: 390, height: 844, userAgent: devices["iPhone 13"].userAgent, phone: true },
        { name: "large phone", width: 430, height: 932, userAgent: devices["iPhone 13"].userAgent, phone: true },
        {
          name: "phone landscape",
          width: 844,
          height: 390,
          userAgent: devices["iPhone 13"].userAgent,
          phone: true,
        },
        {
          name: "narrow tablet",
          width: 768,
          height: 1024,
          userAgent: devices["iPad (gen 7)"].userAgent,
          phone: false,
        },
      ];

      for (const viewport of mobileViewports) {
        const context = await browser.newContext({
          storageState,
          viewport: { width: viewport.width, height: viewport.height },
          userAgent: viewport.userAgent,
          hasTouch: true,
          isMobile: viewport.phone,
          reducedMotion: viewport.width === 390 ? "reduce" : "no-preference",
        });
        const page = await context.newPage();
        await page.goto(`${baseUrl}/boards/${boardName}`);

        await expect(page.locator("[data-mobile-board]"), viewport.name).toBeVisible({ timeout: 15_000 });
        await expect(page.locator("[data-mobile-board-item]"), viewport.name).toHaveCount(36);
        await expect(page.locator(".grid-stack-item"), viewport.name).toHaveCount(0);
        await expect(page.getByRole("button", { name: /search/i }), viewport.name).toBeVisible();

        const layoutMetrics = await page.evaluate(() => {
          const grids = Array.from(document.querySelectorAll<HTMLElement>("[data-mobile-board] > div"));
          const twoColumnGrids = grids.filter((grid) => getComputedStyle(grid).display === "grid");
          const items = Array.from(document.querySelectorAll<HTMLElement>("[data-mobile-board-item]"));
          const focusable = Array.from(
            document.querySelectorAll<HTMLElement>(
              '[data-mobile-board] a[href], [data-mobile-board] button, [data-mobile-board] input, [data-mobile-board] select, [data-mobile-board] textarea, [data-mobile-board] [tabindex]:not([tabindex="-1"])',
            ),
          );

          return {
            columns: twoColumnGrids.map(
              (grid) => getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length,
            ),
            documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            overflowingItems: items.filter((item) => item.scrollWidth > item.clientWidth + 1).length,
            outOfBoundsControls: focusable.filter((element) => {
              const rect = element.getBoundingClientRect();
              return rect.left < -1 || rect.right > window.innerWidth + 1;
            }).length,
            layoutControls: document.querySelectorAll(
              '[data-testid*="layout"], button[aria-label*="resize" i], button[aria-label*="move" i]',
            ).length,
          };
        });

        expect(
          layoutMetrics.columns.length > 0 && layoutMetrics.columns.every((count) => count === 2),
          viewport.name,
        ).toBe(true);
        expect(layoutMetrics.documentOverflow, viewport.name).toBeLessThanOrEqual(0);
        expect(layoutMetrics.overflowingItems, viewport.name).toBe(0);
        expect(layoutMetrics.outOfBoundsControls, viewport.name).toBe(0);
        expect(layoutMetrics.layoutControls, viewport.name).toBe(0);

        if (viewport.width === 320) {
          await page.evaluate(() => {
            document.documentElement.style.fontSize = "200%";
          });
          const zoomOverflow = await page.evaluate(() => ({
            document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            items: Array.from(document.querySelectorAll<HTMLElement>("[data-mobile-board-item]")).filter(
              (item) => item.scrollWidth > item.clientWidth + 1,
            ).length,
          }));
          expect(zoomOverflow.document).toBeLessThanOrEqual(0);
          expect(zoomOverflow.items).toBe(0);
        }

        if (viewport.width === 390) {
          await page.getByRole("button", { name: "More" }).click();
          const moreDrawer = page.getByRole("dialog", { name: "More" });
          await expect(moreDrawer.getByRole("button", { name: "Second section" })).toBeVisible();
          await moreDrawer.getByRole("button", { name: "Second section" }).click();
          await expect(page.getByRole("heading", { name: "Second section" })).toBeFocused();

          const notebookActions = page.getByRole("button", { name: /Actions for Notebook/i });
          await notebookActions.click();
          await page.getByRole("button", { name: "Open widget details" }).click();
          const details = page.getByRole("dialog", { name: "Notebook" });
          await expect(details).toBeVisible();
          await details.getByRole("button", { name: "Close" }).click();
          await expect(notebookActions).toBeFocused();

          const rtlOverflow = await page.evaluate(() => {
            document.documentElement.dir = "rtl";
            return document.documentElement.scrollWidth - document.documentElement.clientWidth;
          });
          expect(rtlOverflow).toBeLessThanOrEqual(0);
        }

        await context.close();
      }

      const desktopContext = await browser.newContext({
        storageState,
        viewport: { width: 800, height: 900 },
      });
      const desktopPage = await desktopContext.newPage();
      await desktopPage.goto(`${baseUrl}/boards/${boardName}`);
      await expect(desktopPage.locator("[data-mobile-board]")).toHaveCount(0);
      await expect(desktopPage.locator(".grid-stack-item")).toHaveCount(36);
      await desktopContext.close();
    } finally {
      await loginContext.close();
      await browser.close();
      await homarrContainer.stop();
    }
  }, 180_000);
});
