import type { Browser, BrowserContext, Locator, Page } from "@playwright/test";
import { chromium, expect } from "@playwright/test";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { stringify } from "superjson";
import { afterAll, beforeAll, describe, test } from "vitest";

import { hashPasswordAsync } from "../packages/auth/security";
import {
  apps,
  boardUserPermissions,
  boards,
  itemLayouts,
  items,
  layouts,
  sections,
  users,
} from "../packages/db/schema/sqlite";
import type { SqliteDatabase } from "./shared/e2e-db";
import { createSqliteDbFileAsync } from "./shared/e2e-db";
import { createHomarrContainer } from "./shared/create-homarr-container";
import { seedAdminUserAsync } from "./shared/seed-admin-user";

const ownerCredentials = { username: "owner", password: "Comp(exP4sswOrd" };
const disabledModifierCredentials = { username: "modifier", password: "Comp(exP4sswOrd" };
const viewerCredentials = { username: "viewer", password: "Comp(exP4sswOrd" };
const boardName = "advanced-interactions-e2e";
const emptyCellCenterXRatio = 7.5 / 12;

describe("Board advanced interactions", () => {
  let browser: Browser;
  let baseUrl: string;
  let stopContainerAsync: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const { db, localMountPath } = await createSqliteDbFileAsync();
    const { userId: ownerId } = await seedAdminUserAsync(db, ownerCredentials);
    await seedInteractionBoardAsync(db, ownerId);
    await seedCredentialsUserAsync(db, {
      ...disabledModifierCredentials,
      enableRightClickOnWidgets: false,
      boardPermission: "modify",
    });
    await seedCredentialsUserAsync(db, {
      ...viewerCredentials,
      enableRightClickOnWidgets: true,
      boardPermission: "view",
    });

    const homarrContainer = await createHomarrContainer({
      environment: { AUTH_PROVIDERS: "credentials" },
      mounts: { "/appdata": localMountPath },
    }).start();
    stopContainerAsync = async () => {
      await homarrContainer.stop();
    };
    baseUrl = `http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}`;
    browser = await chromium.launch();
  }, 120_000);

  afterAll(async () => {
    await browser?.close();
    await stopContainerAsync?.();
  });

  test("opens advanced view from Shift-hover, keyboard, and the widget context menu", async () => {
    const { context, page } = await openBoardAsync(browser, baseUrl, ownerCredentials);

    try {
      const widget = page.locator(".grid-stack-item[data-kind='clock'] > .grid-stack-item-content").first();
      const compactSurface = widget.locator(".clock-wrapper");
      const advancedSurface = page.getByRole("region", { name: "Date and time advanced view" });
      const iframeAdvancedSurface = page.getByRole("region", { name: "iFrame advanced view" });
      const dimmingOverlay = page.locator("[data-advanced-focus-overlay]");
      const otherWidget = page.locator(".grid-stack-item[data-kind='iframe'] > .grid-stack-item-content").first();

      await compactSurface.evaluate((element) => {
        element.setAttribute("data-lifecycle-probe", "same-instance");
      });
      await widget.focus();
      await page.keyboard.down("Shift");
      await widget.hover();
      await expect(advancedSurface).toBeVisible({ timeout: 2_000 });
      await expect(advancedSurface).toHaveCSS("animation-name", "none");
      const compactBounds = await widget.boundingBox();
      const advancedBounds = await advancedSurface.boundingBox();
      expect(advancedBounds?.width).toBeGreaterThan(compactBounds?.width ?? 0);
      await expect(advancedSurface).toHaveAttribute("data-lifecycle-probe", "same-instance");
      await expect(dimmingOverlay).toBeVisible();
      await expect(dimmingOverlay).toHaveCSS("pointer-events", "none");
      await expect(otherWidget).toBeVisible();
      await expect(widget).toBeFocused();

      await advancedSurface.click({ button: "right", position: { x: 80, y: 80 } });
      const portalledMenuItem = page.getByRole("menuitem", { name: "Open advanced view" });
      await expect(portalledMenuItem).toBeVisible();
      await portalledMenuItem.hover();
      await expect(advancedSurface).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(portalledMenuItem).toBeHidden();
      await expect(advancedSurface).toBeVisible();

      await otherWidget.hover();
      await expect(advancedSurface).toBeHidden();
      await expect(iframeAdvancedSurface).toBeVisible({ timeout: 2_000 });
      await page.keyboard.up("Shift");
      await expect(iframeAdvancedSurface).toBeHidden();
      await expect(dimmingOverlay).toBeHidden();
      await expect(compactSurface).toHaveAttribute("data-lifecycle-probe", "same-instance");
      await expect(widget).toBeFocused();

      await page.keyboard.press("Shift+Enter");
      await expect(advancedSurface).toBeVisible();
      await expect(page.getByRole("button", { name: "Close advanced view" })).toBeFocused();
      await expect(page.getByRole("button", { name: /advanced view is pinned|keep advanced view open/i })).toHaveCount(
        0,
      );
      await advancedSurface.evaluate((element) => {
        const probe = document.createElement("div");
        probe.dataset.shiftScrollProbe = "true";
        probe.style.cssText = "height:80px;overflow-y:auto";
        probe.innerHTML = '<svg data-shift-scroll-target="true"></svg><div style="height:600px"></div>';
        probe.addEventListener("wheel", (event) => event.stopPropagation());
        element.append(probe);

        const unrelated = probe.cloneNode(true) as HTMLDivElement;
        unrelated.dataset.shiftScrollProbe = "unrelated";
        element.append(unrelated);
      });
      const scrollProbe = advancedSurface.locator("[data-shift-scroll-probe='true']");
      await page.keyboard.down("Shift");
      const pixelEventCancelled = await scrollProbe.evaluate(
        (element) =>
          !element.dispatchEvent(
            new WheelEvent("wheel", { bubbles: true, cancelable: true, shiftKey: true, deltaX: 120 }),
          ),
      );
      expect(pixelEventCancelled).toBe(true);
      await scrollProbe.evaluate((element) => {
        element.scrollTop = 0;
      });
      const lineEventCancelled = await scrollProbe
        .locator("[data-shift-scroll-target='true']")
        .evaluate(
          (element) =>
            !element.dispatchEvent(
              new WheelEvent("wheel", { bubbles: true, cancelable: true, shiftKey: true, deltaX: 3, deltaMode: 1 }),
            ),
        );
      await page.keyboard.up("Shift");
      expect(lineEventCancelled).toBe(true);
      expect(await scrollProbe.evaluate((element) => element.scrollTop)).toBeGreaterThanOrEqual(48);
      await scrollProbe.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
        element.dispatchEvent(
          new WheelEvent("wheel", { bubbles: true, cancelable: true, shiftKey: true, deltaX: 120 }),
        );
      });
      expect(
        await advancedSurface.locator("[data-shift-scroll-probe='unrelated']").evaluate((element) => element.scrollTop),
      ).toBe(0);
      await page.keyboard.press("Escape");
      await expect(advancedSurface).toBeHidden();
      await expect(widget).toBeFocused();

      await widget.click({ button: "right" });
      await page.getByRole("menuitem", { name: "Open advanced view" }).click();
      await expect(advancedSurface).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(advancedSurface).toBeHidden();

      const appWidget = page.locator(".grid-stack-item[data-kind='app'] > .grid-stack-item-content").first();
      await expect(appWidget).not.toHaveAttribute("aria-keyshortcuts", "Shift+Enter");
      await appWidget.click({ button: "right" });
      await expect(page.getByRole("menuitem", { name: "Open advanced view" })).toHaveCount(0);
      await page.keyboard.press("Escape");
      await page.keyboard.down("Shift");
      await appWidget.hover();
      await expect(advancedSurface).toBeHidden();
      await page.keyboard.up("Shift");
    } finally {
      await context.close();
    }
  }, 60_000);

  test("preserves iframe browsing state and dismisses focus when a responsive layout remounts", async () => {
    const { context, page } = await openBoardAsync(browser, baseUrl, ownerCredentials);

    try {
      const iframeSlot = page.locator(".grid-stack-item[data-kind='iframe'] > .grid-stack-item-content").first();
      const iframe = iframeSlot.locator("iframe");
      await iframe.evaluate((element) => {
        element.srcdoc = '<label>State <input id="state" value="initial"></label>';
      });
      const frame = page.frameLocator(".grid-stack-item[data-kind='iframe'] iframe");
      await frame.locator("#state").fill("changed");

      await iframeSlot.focus();
      await page.keyboard.press("Shift+Enter");
      await expect(page.getByRole("region", { name: "iFrame advanced view" })).toBeVisible();
      await expect(frame.locator("#state")).toHaveValue("changed");
      await page.keyboard.press("Escape");
      await expect(frame.locator("#state")).toHaveValue("changed");

      await iframeSlot.focus();
      await page.keyboard.press("Shift+Enter");
      await page.setViewportSize({ width: 800, height: 900 });
      await expect(page.getByRole("region", { name: "iFrame advanced view" })).toBeHidden();
      await expect(page.locator(".grid-stack-item[data-kind='iframe'] iframe")).toBeVisible();
    } finally {
      await context.close();
    }
  }, 60_000);

  test("keeps advanced controls below the fixed header on short screens", async () => {
    const { context, page } = await openBoardAsync(browser, baseUrl, ownerCredentials, { width: 1366, height: 768 });

    try {
      const widget = page.locator(".grid-stack-item[data-kind='clock'] > .grid-stack-item-content").first();
      await widget.focus();
      await page.keyboard.press("Shift+Enter");
      const closeButton = page.getByRole("button", { name: "Close advanced view" });
      const bounds = await closeButton.boundingBox();
      expect(bounds).not.toBeNull();
      if (!bounds) return;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(60);
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(1366);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(768);
      const surfaceBounds = await page.getByRole("region", { name: "Date and time advanced view" }).boundingBox();
      const contentBounds = await page.locator(".clock-widget-container").boundingBox();
      expect(surfaceBounds).not.toBeNull();
      expect(contentBounds).not.toBeNull();
      if (surfaceBounds && contentBounds) {
        expect(contentBounds.y - surfaceBounds.y).toBeLessThan(32);
        expect(bounds.x >= surfaceBounds.x + surfaceBounds.width || bounds.x + bounds.width <= surfaceBounds.x).toBe(
          true,
        );
      }
      await closeButton.click();
      await expect(page.getByRole("region", { name: "Date and time advanced view" })).toBeHidden();
    } finally {
      await context.close();
    }
  }, 60_000);

  test("opens the add-at-position chooser only when right click and change access are enabled", async () => {
    const { context, page } = await openBoardAsync(browser, baseUrl, ownerCredentials);

    try {
      const grid = page.locator(".grid-stack[data-kind='empty']");
      const addHereMenuItem = page.getByRole("menuitem", { name: "Add item here" });
      await expect(grid).toHaveAttribute("aria-label", "Add item here");

      await grid.press("Shift+F10");
      await expect(addHereMenuItem).toBeVisible();
      await page.keyboard.press("ArrowDown");
      await expect(addHereMenuItem).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog").filter({ hasText: "Choose item to add" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(grid).toBeFocused();

      await touchAndHoldEmptyGridSpaceAsync(grid);
      await expect(addHereMenuItem).toBeVisible({ timeout: 1_000 });
      await page.keyboard.press("Escape");
      await expect(addHereMenuItem).toBeHidden();

      await rightClickEmptyGridSpaceAsync(grid);
      await expect(addHereMenuItem).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(addHereMenuItem).toBeHidden();
    } finally {
      await context.close();
    }
  }, 60_000);

  test("honors the user setting gate even when the user can modify the board", async () => {
    const { context, page } = await openBoardAsync(browser, baseUrl, disabledModifierCredentials);

    try {
      const widget = page.locator(".grid-stack-item[data-kind='clock'] > .grid-stack-item-content").first();
      const grid = page.locator(".grid-stack[data-kind='empty']");

      await widget.click({ button: "right" });
      await expect(page.getByRole("menuitem", { name: "Open advanced view" })).toHaveCount(0);
      await expect(grid).not.toHaveAttribute("aria-label", "Add item here");
      await rightClickEmptyGridSpaceAsync(grid);
      await expect(page.getByRole("menuitem", { name: "Add item here" })).toHaveCount(0);
    } finally {
      await context.close();
    }
  }, 60_000);

  test("keeps read-only advanced viewing but blocks add-at-position without change access", async () => {
    const { context, page } = await openBoardAsync(browser, baseUrl, viewerCredentials);

    try {
      const widget = page.locator(".grid-stack-item[data-kind='clock'] > .grid-stack-item-content").first();
      const grid = page.locator(".grid-stack[data-kind='empty']");

      await widget.click({ button: "right" });
      await page.getByRole("menuitem", { name: "Open advanced view" }).click();
      await expect(page.getByRole("region", { name: "Date and time advanced view" })).toBeVisible();
      await page.keyboard.press("Escape");

      await expect(grid).not.toHaveAttribute("aria-label", "Add item here");
      await rightClickEmptyGridSpaceAsync(grid);
      await expect(page.getByRole("menuitem", { name: "Add item here" })).toHaveCount(0);
    } finally {
      await context.close();
    }
  }, 60_000);
});

const openBoardAsync = async (
  browser: Browser,
  baseUrl: string,
  credentials: { username: string; password: string },
  viewport = { width: 1280, height: 900 },
): Promise<{ context: BrowserContext; page: Page }> => {
  const context = await browser.newContext({ reducedMotion: "reduce", viewport });
  const page = await context.newPage();

  await page.goto(`${baseUrl}/auth/login`);
  await page.getByLabel("Username").fill(credentials.username);
  await page.locator("#password").fill(credentials.password);
  const loginRedirect = page.waitForURL(baseUrl, { timeout: 15_000, waitUntil: "commit" });
  await page.locator("css=button[type='submit']").click();
  await loginRedirect;
  await page.goto(`${baseUrl}/boards/${boardName}`);
  await expect(page.locator(".grid-stack-item[data-kind='clock'] .clock-wrapper").first()).toBeVisible({
    timeout: 15_000,
  });

  return { context, page };
};

const rightClickEmptyGridSpaceAsync = async (grid: Locator) => {
  const bounds = await grid.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;

  await grid.click({
    button: "right",
    position: { x: bounds.width * emptyCellCenterXRatio, y: Math.min(24, bounds.height / 2) },
  });
};

const touchAndHoldEmptyGridSpaceAsync = async (grid: Locator) => {
  const bounds = await grid.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;

  const clientX = bounds.x + bounds.width * emptyCellCenterXRatio;
  const clientY = bounds.y + Math.min(24, bounds.height / 2);
  await grid.dispatchEvent("pointerdown", { pointerType: "touch", clientX, clientY });
  await new Promise((resolve) => setTimeout(resolve, 800));
  await grid.dispatchEvent("pointerup", { pointerType: "touch", clientX, clientY });
};

const seedInteractionBoardAsync = async (db: SqliteDatabase, ownerId: string) => {
  const boardId = createId();
  const baseLayoutId = createId();
  const desktopLayoutId = createId();
  const sectionId = createId();
  const clockItemId = createId();
  const iframeItemId = createId();
  const appItemId = createId();
  const appId = createId();

  await db.insert(boards).values({ id: boardId, name: boardName, creatorId: ownerId, isPublic: false });
  await db.insert(apps).values({
    id: appId,
    name: "Example app",
    iconUrl: "/favicon.ico",
    href: "https://example.com",
  });
  await db.insert(layouts).values([
    { id: baseLayoutId, name: "Base", columnCount: 12, breakpoint: 0, boardId },
    { id: desktopLayoutId, name: "Desktop", columnCount: 12, breakpoint: 1000, boardId },
  ]);
  await db.insert(sections).values({ id: sectionId, kind: "empty", xOffset: 0, yOffset: 0, boardId });
  await db.insert(items).values([
    {
      id: clockItemId,
      kind: "clock",
      boardId,
      options: stringify({ is24HourFormat: true, showSeconds: false, showDate: true }),
      advancedOptions: stringify({ title: null, customCssClasses: [], borderColor: "" }),
    },
    {
      id: iframeItemId,
      kind: "iframe",
      boardId,
      options: stringify({ embedUrl: "http://127.0.0.1:9", allowScrolling: true }),
      advancedOptions: stringify({ title: null, customCssClasses: [], borderColor: "" }),
    },
    {
      id: appItemId,
      kind: "app",
      boardId,
      options: stringify({ appId, openInNewTab: true, showTitle: true, pingEnabled: false }),
      advancedOptions: stringify({ title: null, customCssClasses: [], borderColor: "" }),
    },
  ]);
  await db.insert(itemLayouts).values(
    [baseLayoutId, desktopLayoutId].flatMap((layoutId) => [
      {
        itemId: clockItemId,
        sectionId,
        layoutId,
        xOffset: 0,
        yOffset: 0,
        width: 4,
        height: 3,
      },
      {
        itemId: iframeItemId,
        sectionId,
        layoutId,
        xOffset: 8,
        yOffset: 0,
        width: 4,
        height: 3,
      },
      {
        itemId: appItemId,
        sectionId,
        layoutId,
        xOffset: 4,
        yOffset: 0,
        width: 3,
        height: 3,
      },
    ]),
  );
  await db
    .update(users)
    .set({ homeBoardId: boardId, completedBoardTour: true, completedManageTour: true })
    .where(eq(users.id, ownerId));
};

const seedCredentialsUserAsync = async (
  db: SqliteDatabase,
  input: {
    username: string;
    password: string;
    enableRightClickOnWidgets: boolean;
    boardPermission: "view" | "modify";
  },
) => {
  const userId = createId();
  const board = await db.query.boards.findFirst({ where: eq(boards.name, boardName) });
  if (!board) throw new Error("Interaction board was not seeded");

  await db.insert(users).values({
    id: userId,
    name: input.username,
    provider: "credentials",
    password: await hashPasswordAsync(input.password),
    enableRightClickOnWidgets: input.enableRightClickOnWidgets,
    homeBoardId: board.id,
    completedBoardTour: true,
    completedManageTour: true,
  });
  await db.insert(boardUserPermissions).values({
    boardId: board.id,
    userId,
    permission: input.boardPermission,
  });
};
