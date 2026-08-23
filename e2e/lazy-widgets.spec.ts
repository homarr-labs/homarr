import { createId } from "@paralleldrive/cuid2";
import { chromium, expect } from "@playwright/test";
import type { Route } from "@playwright/test";
import { eq } from "drizzle-orm";
import { stringify } from "superjson";
import { describe, test } from "vitest";

import * as sqliteSchema from "../packages/db/schema/sqlite";
import { createHomarrContainer } from "./shared/create-homarr-container";
import { createSqliteDbFileAsync } from "./shared/e2e-db";
import { seedAdminUserAsync } from "./shared/seed-admin-user";

const adminCredentials = {
  username: "admin",
  password: "Comp(exP4sswOrd",
};

describe("lazy widget application graph", () => {
  test("renders an authenticated board and preserves first-use UI behavior after reload", async () => {
    const { db, localMountPath } = await createSqliteDbFileAsync();
    const { userId } = await seedAdminUserAsync(db, adminCredentials);
    const boardId = createId();
    const layoutId = createId();
    const sectionId = createId();
    const clockItemId = createId();
    const downloadsItemId = createId();
    const mockIntegrationId = createId();

    await db.insert(sqliteSchema.boards).values({
      id: boardId,
      name: "lazy-widget-board",
      creatorId: userId,
    });
    await db.insert(sqliteSchema.layouts).values({
      id: layoutId,
      name: "Base",
      boardId,
      columnCount: 12,
    });
    await db.insert(sqliteSchema.sections).values({
      id: sectionId,
      boardId,
      kind: "empty",
      xOffset: 0,
      yOffset: 0,
    });
    await db.insert(sqliteSchema.integrations).values({
      id: mockIntegrationId,
      name: "Mock downloads",
      url: "http://mock.local",
      kind: "mock",
    });
    await db.insert(sqliteSchema.items).values([
      {
        id: clockItemId,
        boardId,
        kind: "clock",
        options: stringify({ showSeconds: true }),
      },
      {
        id: downloadsItemId,
        boardId,
        kind: "downloads",
        options: stringify({}),
      },
    ]);
    await db.insert(sqliteSchema.itemLayouts).values([
      {
        itemId: clockItemId,
        sectionId,
        layoutId,
        xOffset: 0,
        yOffset: 0,
        width: 4,
        height: 2,
      },
      {
        itemId: downloadsItemId,
        sectionId,
        layoutId,
        xOffset: 0,
        yOffset: 2,
        width: 8,
        height: 5,
      },
    ]);
    await db.insert(sqliteSchema.integrationItems).values({
      itemId: downloadsItemId,
      integrationId: mockIntegrationId,
    });
    await db.update(sqliteSchema.users).set({ homeBoardId: boardId }).where(eq(sqliteSchema.users.id, userId));

    const homarrContainer = await createHomarrContainer({
      environment: {
        AUTH_PROVIDERS: "credentials",
        UNSAFE_ENABLE_MOCK_INTEGRATION: "true",
      },
      mounts: {
        "/appdata": localMountPath,
      },
    }).start();

    const baseUrl = `http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}`;
    const browser = await chromium.launch();
    const context = await browser.newContext({ serviceWorkers: "block" });
    const page = await context.newPage();
    const pageErrors: Error[] = [];
    const hydrationErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));
    const hydrationErrorPattern = /hydrat|did not match|react\.dev\/errors\/4(18|2[1235])|react error #4(18|2[1235])/i;
    page.on("console", (message) => {
      if (message.type() === "error" && hydrationErrorPattern.test(message.text())) {
        hydrationErrors.push(message.text());
      }
    });
    let releaseRefresh: (() => void) | undefined;

    try {
      await page.goto(`${baseUrl}/auth/login`);
      await page.getByLabel("Username").fill(adminCredentials.username);
      await page.locator("#password").fill(adminCredentials.password);
      const signedIn = page.waitForURL((url) => url.origin === baseUrl && url.pathname === "/", {
        waitUntil: "commit",
        timeout: 60_000,
      });
      await page.locator("css=button[type='submit']").click();
      await signedIn;

      const visibleBoard = page.locator("[data-homarr-dev-benchmark-board]").filter({ visible: true }).first();
      await expect(visibleBoard).toBeVisible({ timeout: 30_000 });
      const clockWidget = page.locator(
        `[data-id="${clockItemId}"] .clock-widget-container, [data-grid-item-id="${clockItemId}"] .clock-widget-container`,
      );
      await expect(clockWidget.filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 });
      await expect(clockWidget.locator("time").filter({ visible: true }).first()).not.toHaveText("--:--", {
        timeout: 30_000,
      });
      const downloadsWidget = page
        .locator(`[data-id="${downloadsItemId}"], [data-grid-item-id="${downloadsItemId}"]`)
        .filter({ visible: true })
        .first();
      const cachedDownload = downloadsWidget.getByText("Big.Buck.Bunny.2008.1080p.BluRay.x264");
      await expect(cachedDownload).toBeVisible({ timeout: 30_000 });

      await expect(page.locator("[data-homarr-dev-benchmark-spotlight-preloaded]")).toHaveCount(1, {
        timeout: 15_000,
      });
      await page.keyboard.press("Control+K");
      await expect(page.locator("[data-homarr-dev-benchmark-spotlight-feedback]")).toHaveCount(0);
      await expect(page.locator("[data-homarr-dev-benchmark-spotlight]")).toBeVisible({ timeout: 15_000 });
      await page.keyboard.press("Escape");
      await expect(page.locator("[data-homarr-dev-benchmark-spotlight]")).not.toBeVisible();

      let refreshRequestStarted = false;
      const refreshGate = new Promise<void>((resolve) => {
        releaseRefresh = resolve;
      });
      const downloadsRequestPattern = "**/*widget.downloads.getJobsAndStatuses*";
      const delayDownloadsRefresh = async (route: Route) => {
        refreshRequestStarted = true;
        await refreshGate;
        await route.continue();
      };
      await page.route(downloadsRequestPattern, delayDownloadsRefresh);

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(clockWidget.filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 });
      await expect(clockWidget.locator("time").filter({ visible: true }).first()).not.toHaveText("--:--", {
        timeout: 30_000,
      });
      await expect.poll(() => refreshRequestStarted, { timeout: 10_000 }).toBe(true);
      await expect(cachedDownload).toBeVisible({ timeout: 5_000 });
      await expect(downloadsWidget.locator("[data-widget-refreshing]")).toBeVisible();

      const refreshedDownloadsResponse = page.waitForResponse(
        (response) => response.url().includes("widget.downloads.getJobsAndStatuses") && response.ok(),
      );
      releaseRefresh();
      releaseRefresh = undefined;
      await refreshedDownloadsResponse;
      await expect(downloadsWidget.locator("[data-widget-refreshing]")).toHaveCount(0);
      await page.unroute(downloadsRequestPattern, delayDownloadsRefresh);
      expect(pageErrors).toEqual([]);
      expect(hydrationErrors).toEqual([]);

      const serviceWorkerContext = await browser.newContext();
      const serviceWorkerPage = await serviceWorkerContext.newPage();
      try {
        await serviceWorkerPage.goto(`${baseUrl}/auth/login`);
        await expect
          .poll(
            async () =>
              await serviceWorkerPage.evaluate(async () => {
                const registrations = await navigator.serviceWorker.getRegistrations();
                return registrations[0]?.scope ?? null;
              }),
            { timeout: 15_000 },
          )
          .toBe(`${baseUrl}/`);
      } finally {
        await serviceWorkerContext.close();
      }
    } finally {
      releaseRefresh?.();
      await browser.close();
      await homarrContainer.stop();
    }
  }, 180_000);
});
