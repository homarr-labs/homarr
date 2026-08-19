import { createId } from "@paralleldrive/cuid2";
import { chromium, expect } from "@playwright/test";
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
    const itemId = createId();

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
    await db.insert(sqliteSchema.items).values({
      id: itemId,
      boardId,
      kind: "clock",
      options: stringify({ showSeconds: true }),
    });
    await db.insert(sqliteSchema.itemLayouts).values({
      itemId,
      sectionId,
      layoutId,
      xOffset: 0,
      yOffset: 0,
      width: 4,
      height: 2,
    });
    await db.update(sqliteSchema.users).set({ homeBoardId: boardId }).where(eq(sqliteSchema.users.id, userId));

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
    const context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));

    try {
      await page.goto(`${baseUrl}/auth/login`);
      await page.getByLabel("Username").fill(adminCredentials.username);
      await page.locator("#password").fill(adminCredentials.password);
      const signedIn = page.waitForURL(baseUrl, { waitUntil: "commit", timeout: 60_000 });
      await page.locator("css=button[type='submit']").click();
      await signedIn;

      await expect(page.locator("[data-homarr-dev-benchmark-board]")).toBeVisible({ timeout: 30_000 });
      const clockWidget = page.locator(
        `[data-id="${itemId}"] .clock-widget-container, [data-grid-item-id="${itemId}"] .clock-widget-container`,
      );
      await expect(clockWidget.filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 });

      await expect(page.locator("[data-homarr-dev-benchmark-spotlight-preloaded]")).toHaveCount(1, {
        timeout: 15_000,
      });
      await page.keyboard.press("Control+K");
      await expect(page.locator("[data-homarr-dev-benchmark-spotlight-feedback]")).toHaveCount(0);
      await expect(page.locator("[data-homarr-dev-benchmark-spotlight]")).toBeVisible({ timeout: 15_000 });
      await page.keyboard.press("Escape");
      await expect(page.locator("[data-homarr-dev-benchmark-spotlight]")).not.toBeVisible();

      await expect
        .poll(
          async () =>
            await page.evaluate(async () => {
              const registrations = await navigator.serviceWorker.getRegistrations();
              return registrations[0]?.scope ?? null;
            }),
          { timeout: 15_000 },
        )
        .toBe(`${baseUrl}/`);

      await page.reload();
      await expect(clockWidget.filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 });
      expect(pageErrors).toEqual([]);
    } finally {
      await browser.close();
      await homarrContainer.stop();
    }
  }, 120_000);
});
