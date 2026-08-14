import path from "node:path";
import type { Browser } from "@playwright/test";
import { chromium, expect } from "@playwright/test";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { stringify } from "superjson";
import { afterAll, beforeAll, describe, test } from "vitest";

import {
  boards,
  integrationItems,
  integrations,
  itemLayouts,
  items,
  layouts,
  sections,
  users,
} from "../packages/db/schema/sqlite";
import { createHomarrContainer } from "./shared/create-homarr-container";
import { createSqliteDbFileAsync } from "./shared/e2e-db";
import { loginAsync } from "./shared/login";
import { seedAdminUserAsync } from "./shared/seed-admin-user";

const credentials = { username: "owner", password: "Comp(exP4sswOrd" };
const boardName = "media-server-layout-e2e";

describe("Media server widget layout", () => {
  let browser: Browser;
  let baseUrl: string;
  let stopContainerAsync: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const { db, localMountPath } = await createSqliteDbFileAsync();
    const { userId } = await seedAdminUserAsync(db, credentials);
    const boardId = createId();
    const layoutId = createId();
    const sectionId = createId();
    const mediaItemId = createId();
    const clockItemId = createId();
    const integrationId = createId();

    await db.insert(boards).values({ id: boardId, name: boardName, creatorId: userId, isPublic: false });
    await db.insert(layouts).values({ id: layoutId, name: "Base", columnCount: 12, breakpoint: 0, boardId });
    await db.insert(sections).values({ id: sectionId, kind: "empty", xOffset: 0, yOffset: 0, boardId });
    await db.insert(integrations).values({
      id: integrationId,
      name: "Demo Integration",
      url: "https://demo.homarr.dev",
      kind: "mock",
      appId: null,
    });
    await db.insert(items).values([
      {
        id: mediaItemId,
        kind: "mediaServer",
        boardId,
        options: stringify({ showOnlyPlaying: true, showBitrate: true, showLocation: true }),
        advancedOptions: stringify({ title: null, customCssClasses: [], borderColor: "" }),
      },
      {
        id: clockItemId,
        kind: "clock",
        boardId,
        options: stringify({ is24HourFormat: true, showSeconds: false, showDate: true }),
        advancedOptions: stringify({ title: null, customCssClasses: [], borderColor: "" }),
      },
    ]);
    await db.insert(integrationItems).values({ itemId: mediaItemId, integrationId });
    await db.insert(itemLayouts).values([
      { itemId: mediaItemId, sectionId, layoutId, xOffset: 0, yOffset: 0, width: 8, height: 2 },
      { itemId: clockItemId, sectionId, layoutId, xOffset: 0, yOffset: 2, width: 8, height: 2 },
    ]);
    await db
      .update(users)
      .set({ homeBoardId: boardId, completedBoardTour: true, completedManageTour: true })
      .where(eq(users.id, userId));

    const container = await createHomarrContainer({
      environment: { AUTH_PROVIDERS: "credentials" },
      mounts: { "/appdata": localMountPath },
    }).start();
    stopContainerAsync = async () => {
      await container.stop();
    };
    baseUrl = `http://${container.getHost()}:${container.getMappedPort(7575)}`;
    browser = await chromium.launch();
  }, 120_000);

  afterAll(async () => {
    await browser?.close();
    await stopContainerAsync?.();
  });

  test("clips overflowing sessions to the grid cell", async () => {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    try {
      await loginAsync({ page, baseUrl, credentials, destination: `/boards/${boardName}` });
      const entry = page.locator("[data-grid-item-id][data-kind='mediaServer']").first();
      const streamViewport = entry.locator("[data-media-server-streams]");
      await expect(streamViewport.getByText("Interstellar")).toBeVisible({ timeout: 15_000 });

      const geometry = await entry.evaluate((element) => {
        const card = element.querySelector<HTMLElement>("[data-grid-item-content]");
        const viewport = element.querySelector<HTMLElement>("[data-media-server-streams]");
        if (!card || !viewport) throw new Error("Media stream viewport did not render");

        const entryBounds = element.getBoundingClientRect();
        const cardBounds = card.getBoundingClientRect();
        const viewportBounds = viewport.getBoundingClientRect();
        const elementBelow = document.elementFromPoint(entryBounds.left + 8, entryBounds.bottom + 8);

        return {
          entryBottom: entryBounds.bottom,
          cardBottom: cardBounds.bottom,
          viewportBottom: viewportBounds.bottom,
          viewportClientHeight: viewport.clientHeight,
          viewportScrollHeight: viewport.scrollHeight,
          leaksBelow: Boolean(elementBelow?.closest("[data-media-server-streams]")),
        };
      });

      expect(geometry.cardBottom).toBeLessThanOrEqual(geometry.entryBottom + 1);
      expect(geometry.viewportBottom).toBeLessThanOrEqual(geometry.entryBottom + 1);
      expect(geometry.viewportScrollHeight).toBeGreaterThan(geometry.viewportClientHeight);
      expect(geometry.leaksBelow).toBe(false);

      const screenshotDirectory = process.env.HOMARR_E2E_SCREENSHOT_DIR?.trim();
      if (screenshotDirectory) {
        await page.screenshot({ path: path.join(screenshotDirectory, "media-server-layout.png"), fullPage: true });
      }

      const advancedTrigger = entry.getByRole("button", { name: "Open advanced view" });
      await advancedTrigger.focus();
      await page.keyboard.press("Shift+Enter");
      const advancedDialog = page.getByRole("dialog", { name: "Current media server streams advanced view" });
      await expect(advancedDialog).toBeVisible();
      await expect(advancedDialog.getByRole("textbox", { name: "Search for anything" })).toBeVisible();

      const advancedGeometry = await advancedDialog.evaluate((element) => {
        const viewport = element.querySelector<HTMLElement>("[data-media-server-streams]");
        if (!viewport) throw new Error("Advanced media stream viewport did not render");

        const dialogBounds = element.getBoundingClientRect();
        const viewportBounds = viewport.getBoundingClientRect();
        return {
          dialog: {
            top: dialogBounds.top,
            right: dialogBounds.right,
            bottom: dialogBounds.bottom,
            left: dialogBounds.left,
          },
          viewport: {
            top: viewportBounds.top,
            right: viewportBounds.right,
            bottom: viewportBounds.bottom,
            left: viewportBounds.left,
          },
        };
      });

      expect(advancedGeometry.viewport.top).toBeGreaterThanOrEqual(advancedGeometry.dialog.top - 1);
      expect(advancedGeometry.viewport.right).toBeLessThanOrEqual(advancedGeometry.dialog.right + 1);
      expect(advancedGeometry.viewport.bottom).toBeLessThanOrEqual(advancedGeometry.dialog.bottom + 1);
      expect(advancedGeometry.viewport.left).toBeGreaterThanOrEqual(advancedGeometry.dialog.left - 1);

      if (screenshotDirectory) {
        await page.screenshot({
          path: path.join(screenshotDirectory, "media-server-advanced-layout.png"),
          fullPage: true,
        });
      }
    } finally {
      await context.close();
    }
  }, 60_000);
});
