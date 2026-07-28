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

const adminCredentials = {
  username: "admin",
  password: "Comp(exP4sswOrd",
};

const boardName = "mobile-e2e";

const setAutomaticMobileLayoutAsync = async (page: Page, enabled: boolean) => {
  await page.goto(new URL("/manage/settings", page.url()).toString());
  const toggle = page.getByRole("switch", { name: "Use automatic mobile layout" });
  await expect(toggle).toBeVisible();

  if ((await toggle.isChecked()) !== enabled) {
    if (enabled) {
      await toggle.check();
    } else {
      await toggle.uncheck();
    }

    await toggle.locator("xpath=ancestor::form").getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Settings saved successfully")).toBeVisible();
  }

  await page.reload();
  if (enabled) {
    await expect(page.getByRole("switch", { name: "Use automatic mobile layout" })).toBeChecked();
  } else {
    await expect(page.getByRole("switch", { name: "Use automatic mobile layout" })).not.toBeChecked();
  }
};

const seedMobileBoardAsync = async (db: SqliteDatabase, userId: string) => {
  const boardId = createId();
  const desktopLayoutId = createId();
  const mobileLayoutId = createId();
  const firstSectionId = createId();
  const secondSectionId = createId();

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
      kind: index === 0 ? ("notebook" as const) : index === 1 ? ("rssFeed" as const) : ("clock" as const),
      options: stringify(index === 0 ? { content: "<p>Mobile notes</p>" } : {}),
      advancedOptions: stringify({}),
    };
  });
  await db.insert(sqliteSchema.items).values(itemRows);
  await db.insert(sqliteSchema.itemLayouts).values(
    itemRows.flatMap((item, index) => [
      {
        itemId: item.id,
        layoutId: desktopLayoutId,
        sectionId: index < 18 ? firstSectionId : secondSectionId,
        xOffset: (index % 6) * 2,
        yOffset: Math.floor((index % 18) / 6) * 2,
        width: 2,
        height: 2,
      },
      {
        itemId: item.id,
        layoutId: mobileLayoutId,
        sectionId: index < 18 ? firstSectionId : secondSectionId,
        xOffset: (index % 2) * 2,
        yOffset: Math.floor((index % 18) / 2) * 2,
        width: 2,
        height: 2,
      },
    ]),
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
      await setAutomaticMobileLayoutAsync(loginPage, true);
      const storageState = await loginContext.storageState();

      const iPhoneUserAgent = devices["iPhone 13"].userAgent;
      const mobileViewports: {
        name: string;
        width: number;
        height: number;
        userAgent: string;
        phone: boolean;
        checksZoomOverflow?: boolean;
        checksInteractions?: boolean;
        reducedMotion?: boolean;
      }[] = [
        {
          name: "small phone",
          width: 320,
          height: 568,
          userAgent: iPhoneUserAgent,
          phone: true,
          checksZoomOverflow: true,
        },
        {
          name: "phone",
          width: 390,
          height: 844,
          userAgent: iPhoneUserAgent,
          phone: true,
          checksInteractions: true,
          reducedMotion: true,
        },
        { name: "large phone", width: 430, height: 932, userAgent: iPhoneUserAgent, phone: true },
        {
          name: "phone landscape",
          width: 844,
          height: 390,
          userAgent: iPhoneUserAgent,
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
          reducedMotion: viewport.reducedMotion ? "reduce" : "no-preference",
        });
        const page = await context.newPage();
        await page.goto(`${baseUrl}/boards/${boardName}`);

        await expect(page.locator("[data-mobile-board]"), viewport.name).toBeVisible({ timeout: 15_000 });
        await expect(page.locator("[data-mobile-board-item]"), viewport.name).toHaveCount(36);
        await expect(page.locator(".grid-stack-item"), viewport.name).toHaveCount(0);
        await expect(page.getByRole("button", { name: /search/i }), viewport.name).toBeVisible();
        await expect(page.getByRole("button", { name: "Edit item", exact: true }), viewport.name).toHaveCount(0);

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

        if (viewport.checksZoomOverflow) {
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

        if (viewport.checksInteractions) {
          await page.getByRole("button", { name: `Current board: ${boardName}` }).click();
          await expect(page.getByRole("menuitem", { name: boardName })).toBeDisabled();
          await page.keyboard.press("Escape");

          await page.getByRole("button", { name: "More" }).click();
          const moreDrawer = page.getByRole("dialog", { name: "More" });
          await expect(moreDrawer.getByRole("button", { name: "Second section" })).toBeVisible();
          await moreDrawer.getByRole("button", { name: "Second section" }).click();
          await expect(page.getByRole("heading", { name: "Second section" })).toBeFocused();

          const notebookActions = page.getByRole("button", { name: /Actions for Notebook/i });
          await notebookActions.click();
          await page.getByRole("button", { name: "Open widget details", exact: true }).click();
          const details = page.getByRole("dialog", { name: "Notebook" });
          await expect(details).toBeVisible();
          await expect(details.getByRole("button", { name: "Edit" })).toBeVisible();
          await details.getByRole("button", { name: "Close" }).click();
          await expect(notebookActions).toBeFocused();

          const rssSummary = page.getByRole("button", { name: "Open widget details: RSS feeds" });
          await rssSummary.click();
          const rssDetails = page.getByRole("dialog", { name: "RSS feeds" });
          await expect(rssDetails).toBeVisible();
          await rssDetails.getByRole("button", { name: "Close" }).click();
          await expect(rssSummary).toBeFocused();

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

      await desktopPage.getByRole("button", { name: "Edit item", exact: true }).click();
      await desktopPage.setViewportSize({ width: 390, height: 844 });
      await expect(desktopPage.locator("[data-mobile-board]")).toBeVisible();
      await desktopPage.getByRole("button", { name: "More" }).click();
      await desktopPage.getByRole("dialog", { name: "More" }).getByRole("link", { name: "Settings" }).click();
      const unsavedChangesDialog = desktopPage.getByRole("dialog", { name: "Unsaved changes" });
      await expect(unsavedChangesDialog).toBeVisible();
      await desktopPage.keyboard.press("Escape");
      await expect(unsavedChangesDialog).toBeHidden();
      await desktopPage.goBack();
      await expect(unsavedChangesDialog).toBeVisible();
      await desktopPage.goBack();
      await expect(desktopPage.getByRole("dialog", { name: "Unsaved changes" })).toHaveCount(1);
      await desktopPage.keyboard.press("Escape");
      await expect(unsavedChangesDialog).toBeHidden();
      await desktopPage.setViewportSize({ width: 800, height: 900 });
      await desktopPage.getByRole("button", { name: "Edit item", exact: true }).click();
      await expect(desktopPage.getByText("The board was successfully saved")).toBeVisible();
      await expect
        .poll(() => desktopPage.evaluate(() => window.history.state?.["__homarrBoardEditGuard"] ?? null))
        .toBeNull();

      await setAutomaticMobileLayoutAsync(desktopPage, false);
      await desktopContext.close();

      const legacyMobileContext = await browser.newContext({
        storageState,
        viewport: { width: 390, height: 844 },
        userAgent: devices["iPhone 13"].userAgent,
        hasTouch: true,
        isMobile: true,
      });
      const legacyMobilePage = await legacyMobileContext.newPage();
      await legacyMobilePage.goto(`${baseUrl}/boards/${boardName}`);
      await expect(legacyMobilePage.locator("[data-mobile-board]")).toHaveCount(0);
      await expect(legacyMobilePage.locator(".grid-stack-item")).toHaveCount(36);
      await expect(legacyMobilePage.getByRole("button", { name: "Edit item" })).toBeVisible();
      await expect(legacyMobilePage.getByRole("button", { name: "More" })).toHaveCount(0);
      await legacyMobilePage.getByRole("button", { name: "First section" }).click();
      await legacyMobilePage.getByRole("button", { name: "Second section" }).click();
      await expect
        .poll(async () =>
          legacyMobilePage
            .locator(".grid-stack")
            .first()
            .evaluate((element) => getComputedStyle(element).getPropertyValue("--gridstack-column-count").trim()),
        )
        .toBe("4");
      await legacyMobileContext.close();
    } finally {
      await loginContext.close();
      await browser.close();
      await homarrContainer.stop();
    }
  }, 180_000);
});
