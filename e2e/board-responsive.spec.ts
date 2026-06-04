import { chromium } from "@playwright/test";
import { createId } from "@paralleldrive/cuid2";
import SuperJSON from "superjson";
import { describe, expect, test } from "vitest";

import * as sqliteSchema from "../packages/db/schema/sqlite";
import { hashPasswordAsync } from "../packages/auth/security";
import { createHomarrContainer } from "./shared/create-homarr-container";
import { createSqliteDbFileAsync } from "./shared/e2e-db";
import type { SqliteDatabase } from "./shared/e2e-db";

const boardName = "responsive-board";
const credentials = {
  username: "responsive-admin",
  password: "Comp(exP4sswOrd",
};
const viewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];

describe("Board responsive layout", () => {
  test("renders static board layouts across common viewports and loads edit mode", async () => {
    const { db, localMountPath } = await createSqliteDbFileAsync();
    const { categorySectionId } = await seedResponsiveBoardAsync(db);
    const homarrContainer = await createHomarrContainer({
      mounts: {
        "/appdata": localMountPath,
      },
    }).start();
    const browser = await chromium.launch();
    const baseUrl = `http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}`;

    try {
      for (const viewport of viewports) {
        const context = await browser.newContext({ viewport });
        await context.addInitScript(() => {
          window.__homarrLayoutShiftScore = 0;
          new PerformanceObserver((entries) => {
            for (const entry of entries.getEntries()) {
              const layoutShift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
              if (!layoutShift.hadRecentInput) {
                window.__homarrLayoutShiftScore += layoutShift.value;
              }
            }
          }).observe({ type: "layout-shift", buffered: true });
        });
        await context.addInitScript(
          ({ sectionId }) => {
            localStorage.setItem(`homarr-section-collapsed-${sectionId}`, "true");
          },
          { sectionId: categorySectionId },
        );
        const page = await context.newPage();

        await page.goto(`${baseUrl}/boards/${boardName}`);
        await page.waitForSelector(".static-grid-item-content", { state: "visible" });
        await page.waitForTimeout(500);

        const result = await page.evaluate(() => {
          const visibleLayout = Array.from(document.querySelectorAll<HTMLElement>(".static-board-layout")).find(
            (element) => getComputedStyle(element).display !== "none",
          );
          const grids = Array.from(visibleLayout?.querySelectorAll<HTMLElement>(".static-grid") ?? []);
          const hasOverlappingItems = grids.some((grid) => {
            const rects = Array.from(grid.children)
              .map((element) => element.getBoundingClientRect())
              .filter((rect) => rect.width > 0 && rect.height > 0);

            return rects.some((rect, index) =>
              rects.slice(index + 1).some((otherRect) => {
                const horizontalOverlap = Math.min(rect.right, otherRect.right) - Math.max(rect.left, otherRect.left);
                const verticalOverlap = Math.min(rect.bottom, otherRect.bottom) - Math.max(rect.top, otherRect.top);
                return horizontalOverlap > 1 && verticalOverlap > 1;
              }),
            );
          });
          const visibleItems = Array.from(
            visibleLayout?.querySelectorAll<HTMLElement>(".static-grid-item-content") ?? [],
          ).filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });

          return {
            hasVisibleLayout: Boolean(visibleLayout),
            visibleItemCount: visibleItems.length,
            hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
            hasOverlappingItems,
            layoutShiftScore: window.__homarrLayoutShiftScore,
          };
        });

        expect(result.hasVisibleLayout).toBe(true);
        expect(result.visibleItemCount).toBe(4);
        expect(result.hasHorizontalOverflow).toBe(false);
        expect(result.hasOverlappingItems).toBe(false);
        expect(result.layoutShiftScore).toBeLessThanOrEqual(0.01);

        await context.close();
      }

      const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/auth/login`);
      await page.getByLabel("Username").fill(credentials.username);
      await page.getByLabel("Password").fill(credentials.password);
      await page.locator("css=button[type='submit']").click();
      await page.waitForURL(baseUrl);
      await page.goto(`${baseUrl}/boards/${boardName}`);
      await page.waitForSelector(".static-grid-item-content", { state: "visible" });

      await page.keyboard.press("ControlOrMeta+E");

      await page.waitForSelector(".grid-stack", { state: "visible" });
      await expect.poll(() => page.locator(".grid-stack-item").count()).toBeGreaterThan(0);
      await context.close();
    } finally {
      await browser.close();
      await homarrContainer.stop();
    }
  }, 120_000);
});

const seedResponsiveBoardAsync = async (db: SqliteDatabase) => {
  const userId = createId();
  const boardId = createId();
  const mobileLayoutId = createId();
  const tabletLayoutId = createId();
  const desktopLayoutId = createId();
  const rootSectionId = createId();
  const categorySectionId = createId();
  const dynamicSectionId = createId();

  await db.update(sqliteSchema.onboarding).set({ step: "finish" });
  await db.insert(sqliteSchema.users).values({
    id: userId,
    name: credentials.username,
    password: await hashPasswordAsync(credentials.password),
  });
  await db.insert(sqliteSchema.boards).values({
    id: boardId,
    name: boardName,
    isPublic: true,
    creatorId: userId,
  });
  await db.insert(sqliteSchema.layouts).values([
    { id: mobileLayoutId, name: "Mobile", boardId, columnCount: 4, breakpoint: 0 },
    { id: tabletLayoutId, name: "Tablet", boardId, columnCount: 8, breakpoint: 768 },
    { id: desktopLayoutId, name: "Desktop", boardId, columnCount: 12, breakpoint: 1024 },
  ]);
  await db.insert(sqliteSchema.sections).values([
    { id: rootSectionId, boardId, kind: "empty", xOffset: 0, yOffset: 0 },
    { id: categorySectionId, boardId, kind: "category", xOffset: 0, yOffset: 1, name: "Systems" },
    {
      id: dynamicSectionId,
      boardId,
      kind: "dynamic",
      options: SuperJSON.stringify({ title: "Nested", borderColor: "", customCssClasses: [] }),
    },
  ]);
  await db.insert(sqliteSchema.sectionLayouts).values([
    {
      sectionId: dynamicSectionId,
      layoutId: mobileLayoutId,
      parentSectionId: categorySectionId,
      xOffset: 0,
      yOffset: 0,
      width: 4,
      height: 2,
    },
    {
      sectionId: dynamicSectionId,
      layoutId: tabletLayoutId,
      parentSectionId: categorySectionId,
      xOffset: 0,
      yOffset: 0,
      width: 4,
      height: 2,
    },
    {
      sectionId: dynamicSectionId,
      layoutId: desktopLayoutId,
      parentSectionId: categorySectionId,
      xOffset: 0,
      yOffset: 0,
      width: 6,
      height: 2,
    },
  ]);

  const rootItemId = await insertClockItemAsync(db, boardId);
  const categoryItemId = await insertClockItemAsync(db, boardId);
  const dynamicItemId = await insertClockItemAsync(db, boardId);
  await db.insert(sqliteSchema.itemLayouts).values([
    {
      itemId: rootItemId,
      sectionId: rootSectionId,
      layoutId: mobileLayoutId,
      xOffset: 0,
      yOffset: 0,
      width: 2,
      height: 1,
    },
    {
      itemId: rootItemId,
      sectionId: rootSectionId,
      layoutId: tabletLayoutId,
      xOffset: 0,
      yOffset: 0,
      width: 3,
      height: 1,
    },
    {
      itemId: rootItemId,
      sectionId: rootSectionId,
      layoutId: desktopLayoutId,
      xOffset: 0,
      yOffset: 0,
      width: 4,
      height: 1,
    },
    {
      itemId: categoryItemId,
      sectionId: categorySectionId,
      layoutId: mobileLayoutId,
      xOffset: 0,
      yOffset: 2,
      width: 4,
      height: 1,
    },
    {
      itemId: categoryItemId,
      sectionId: categorySectionId,
      layoutId: tabletLayoutId,
      xOffset: 4,
      yOffset: 0,
      width: 4,
      height: 2,
    },
    {
      itemId: categoryItemId,
      sectionId: categorySectionId,
      layoutId: desktopLayoutId,
      xOffset: 6,
      yOffset: 0,
      width: 6,
      height: 2,
    },
    {
      itemId: dynamicItemId,
      sectionId: dynamicSectionId,
      layoutId: mobileLayoutId,
      xOffset: 0,
      yOffset: 0,
      width: 2,
      height: 1,
    },
    {
      itemId: dynamicItemId,
      sectionId: dynamicSectionId,
      layoutId: tabletLayoutId,
      xOffset: 0,
      yOffset: 0,
      width: 2,
      height: 1,
    },
    {
      itemId: dynamicItemId,
      sectionId: dynamicSectionId,
      layoutId: desktopLayoutId,
      xOffset: 0,
      yOffset: 0,
      width: 3,
      height: 1,
    },
  ]);

  return {
    categorySectionId,
  };
};

const insertClockItemAsync = async (db: SqliteDatabase, boardId: string) => {
  const itemId = createId();
  await db.insert(sqliteSchema.items).values({
    id: itemId,
    boardId,
    kind: "clock",
    options: SuperJSON.stringify({ is24HourFormat: true }),
    advancedOptions: SuperJSON.stringify({ title: null, customCssClasses: [], borderColor: "" }),
  });
  return itemId;
};

declare global {
  interface Window {
    __homarrLayoutShiftScore: number;
  }
}
