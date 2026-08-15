import { chromium, expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { createId } from "@paralleldrive/cuid2";
import { stringify as stringifySuperJSON } from "superjson";
import { describe, test } from "vitest";

import * as sqliteSchema from "../packages/db/schema/sqlite";
import { createHomarrContainer } from "./shared/create-homarr-container";
import { createSqliteDbFileAsync } from "./shared/e2e-db";
import type { SqliteDatabase } from "./shared/e2e-db";
import { seedAdminUserAsync } from "./shared/seed-admin-user";

const credentials = {
  username: "admin",
  password: "Comp(exP4sswOrd",
};

describe("Board grid container regressions", () => {
  test("keeps shells aligned when adding containers and releases items blocked by full containers", async () => {
    const { db, localMountPath } = await createSqliteDbFileAsync();
    const { userId } = await seedAdminUserAsync(db, credentials);
    const fixture = await seedContainerRegressionBoardAsync(db, userId);
    const homarrContainer = await createHomarrContainer({
      environment: { AUTH_PROVIDERS: "credentials" },
      mounts: { "/appdata": localMountPath },
    }).start();

    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    try {
      const baseUrl = `http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}`;
      browser = await chromium.launch();
      const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
      await signInAsync(page, baseUrl, `/boards/${fixture.boardName}`);

      const editToggle = page.getByTestId("board-edit-mode-toggle");
      await expect(editToggle).toHaveAttribute("data-board-editor-preload-state", "ready", { timeout: 15_000 });
      await editToggle.click();
      await expect(page.locator('[data-grid-runtime="homarr-dnd-kit-v1"]')).toHaveCount(2, { timeout: 15_000 });

      const rootGrid = page.locator(`[data-grid-section-id="${fixture.rootSectionId}"]`);
      const container = page.locator(`[data-grid-item-id="${fixture.containerSectionId}"]`);
      const movable = page.locator(`[data-grid-item-id="${fixture.movableItemId}"]`);
      await expectEntryContentAlignedAsync(movable);
      await expectEntryContentAlignedAsync(container);
      await expect(page.locator("[data-grid-container-drag-handle]")).toHaveCount(0);
      const containerSettings = container.getByRole("button", { name: "Settings for Full container" });
      await expect(containerSettings).toBeVisible();
      await containerSettings.click();
      await expect(page.getByRole("menuitem", { name: "Edit", exact: true })).toBeVisible();
      await page.keyboard.press("Escape");

      const nestedGrid = container.locator(`[data-grid-section-id="${fixture.containerSectionId}"]`);
      await nestedGrid.evaluate((element) => {
        element.setAttribute("data-dnd-drop-target", "true");
        element.setAttribute("data-dnd-drop-valid", "false");
      });
      const invalidTargetStyle = await nestedGrid.evaluate((element) => {
        const style = getComputedStyle(element);
        return { boxShadow: style.boxShadow, outlineStyle: style.outlineStyle };
      });
      await expectContainedByAsync(nestedGrid, container);
      await nestedGrid.evaluate((element) => {
        element.removeAttribute("data-dnd-drop-target");
        element.removeAttribute("data-dnd-drop-valid");
      });

      await rootGrid.evaluate((element) => {
        element.setAttribute("data-dnd-drop-target", "true");
        element.setAttribute("data-dnd-drop-valid", "false");
      });
      const rootTargetStyle = await rootGrid.evaluate((element) => {
        const style = getComputedStyle(element);
        return { boxShadow: style.boxShadow, outlineColor: style.outlineColor, outlineOffset: style.outlineOffset };
      });
      expect(rootTargetStyle.boxShadow).toBe("none");
      expect(rootTargetStyle.outlineColor).toBe("rgb(250, 82, 82)");
      expect(rootTargetStyle.outlineOffset).toBe("4px");
      await rootGrid.evaluate((element) => {
        element.removeAttribute("data-dnd-drop-target");
        element.removeAttribute("data-dnd-drop-valid");
      });

      await page.getByRole("button", { name: "Add board content" }).click();
      await page.getByRole("menuitem", { name: "New container", exact: true }).click();
      await expect(page.locator('[data-grid-item-type="section"]')).toHaveCount(2);
      const newContainer = page
        .locator(`[data-grid-item-type="section"]:not([data-grid-item-id="${fixture.containerSectionId}"])`)
        .first();
      await expectCanStartDragAtCenterAsync(page, newContainer);
      await expectCannotStartDragOutsideRightAsync(page, newContainer);
      await expectEntryContentAlignedAsync(movable);
      await expectEntryContentAlignedAsync(container);
      await expect(rootGrid.locator("[data-grid-preview='true']")).toHaveCount(0);

      const containerStart = await readGridPositionAsync(container);
      expect(containerStart).toEqual({ x: 0, y: 0 });
      await dragEntryToGridCellAsync(page, movable, rootGrid, 0, 0);

      await expect(movable).toHaveAttribute("data-grid-x", "0");
      await expect(movable).toHaveAttribute("data-grid-y", "0");
      await expect(container).toHaveAttribute("data-grid-y", "1");
      await expectEntryContentAlignedAsync(movable);
      await expectEntryContentAlignedAsync(container);
      await expectContainedByAsync(nestedGrid, container);
      expect(invalidTargetStyle.outlineStyle).toBe("none");
      expect(invalidTargetStyle.boxShadow).toContain("inset");

      await editToggle.click();
      await expect(editToggle).toHaveAttribute("aria-pressed", "false", { timeout: 15_000 });
      await page.reload();
      await expect(movable).toHaveAttribute("data-grid-x", "0");
      await expect(movable).toHaveAttribute("data-grid-y", "0");
      await expect(container).toHaveAttribute("data-grid-y", "1");
      await expectContainedByAsync(nestedGrid, container);
    } finally {
      await browser?.close();
      await homarrContainer.stop();
    }
  }, 180_000);
});

const seedContainerRegressionBoardAsync = async (db: SqliteDatabase, creatorId: string) => {
  const boardId = createId();
  const boardName = "container-regressions";
  const layoutId = createId();
  const rootSectionId = createId();
  const containerSectionId = createId();
  const movableItemId = createId();
  const nestedItemId = createId();

  await db.insert(sqliteSchema.boards).values({ id: boardId, name: boardName, creatorId, isPublic: true });
  await db.insert(sqliteSchema.layouts).values({
    id: layoutId,
    name: "Desktop",
    boardId,
    columnCount: 6,
    breakpoint: 0,
  });
  await db.insert(sqliteSchema.sections).values([
    { id: rootSectionId, boardId, kind: "empty", xOffset: 0, yOffset: 0 },
    {
      id: containerSectionId,
      boardId,
      kind: "container",
      options: stringifySuperJSON({
        title: "Full container",
        customCssClasses: [],
        borderColor: "",
        showLabel: true,
        collapsible: false,
        showOpenAll: false,
      }),
    },
  ]);
  await db.insert(sqliteSchema.sectionLayouts).values({
    sectionId: containerSectionId,
    layoutId,
    parentSectionId: rootSectionId,
    xOffset: 0,
    yOffset: 0,
    width: 8,
    height: 3,
  });
  await db.insert(sqliteSchema.items).values([
    {
      id: movableItemId,
      boardId,
      kind: "clock",
      options: stringifySuperJSON({ is24HourFormat: true }),
    },
    {
      id: nestedItemId,
      boardId,
      kind: "clock",
      options: stringifySuperJSON({ is24HourFormat: true }),
    },
  ]);
  await db.insert(sqliteSchema.itemLayouts).values([
    {
      itemId: movableItemId,
      sectionId: rootSectionId,
      layoutId,
      xOffset: 0,
      yOffset: 3,
      width: 1,
      height: 1,
    },
    {
      itemId: nestedItemId,
      sectionId: containerSectionId,
      layoutId,
      xOffset: 0,
      yOffset: 0,
      width: 8,
      height: 3,
    },
  ]);

  return { boardName, rootSectionId, containerSectionId, movableItemId };
};

const signInAsync = async (page: Page, baseUrl: string, callbackPath: string) => {
  const loginUrl = new URL("/auth/login", baseUrl);
  loginUrl.searchParams.set("callbackUrl", callbackPath);
  await page.goto(loginUrl.href);
  await page.getByLabel("Username").fill(credentials.username);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(credentials.password);
  await Promise.all([
    page.waitForURL(`${baseUrl}${callbackPath}`, { timeout: 30_000, waitUntil: "commit" }),
    page.locator("button[type='submit']").click(),
  ]);
};

const expectBoundingBoxAsync = async (locator: Locator) => {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error("Expected locator to have a bounding box");
  return box;
};

const expectEntryContentAlignedAsync = async (entry: Locator) => {
  const shell = await expectBoundingBoxAsync(entry);
  const content = await expectBoundingBoxAsync(entry.locator(":scope > .board-grid-content-mount"));
  expect(content.x).toBeCloseTo(shell.x, 1);
  expect(content.y).toBeCloseTo(shell.y, 1);
  expect(content.width).toBeCloseTo(shell.width, 1);
  expect(content.height).toBeCloseTo(shell.height, 1);
};

const expectContainedByAsync = async (child: Locator, parent: Locator) => {
  const childBox = await expectBoundingBoxAsync(child);
  const parentBox = await expectBoundingBoxAsync(parent);
  expect(childBox.x).toBeGreaterThanOrEqual(parentBox.x - 1);
  expect(childBox.y).toBeGreaterThanOrEqual(parentBox.y - 1);
  expect(childBox.x + childBox.width).toBeLessThanOrEqual(parentBox.x + parentBox.width + 1);
  expect(childBox.y + childBox.height).toBeLessThanOrEqual(parentBox.y + parentBox.height + 1);
};

const readGridPositionAsync = async (entry: Locator) => ({
  x: Number(await entry.getAttribute("data-grid-x")),
  y: Number(await entry.getAttribute("data-grid-y")),
});

const dragEntryToGridCellAsync = async (page: Page, entry: Locator, grid: Locator, x: number, y: number) => {
  const entryBox = await expectBoundingBoxAsync(entry);
  const gridBox = await expectBoundingBoxAsync(grid);
  const scale = entryBox.width / 200;
  const grabOffset = { x: entryBox.width / 2, y: entryBox.height / 2 };
  const start = { x: entryBox.x + grabOffset.x, y: entryBox.y + grabOffset.y };
  const destination = {
    x: gridBox.x + x * 224 * scale + grabOffset.x,
    y: gridBox.y + y * 224 * scale + grabOffset.y,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 8, start.y, { steps: 4 });
  await expect(entry).toHaveAttribute("data-dnd-drag-source", "true");
  await page.mouse.move(destination.x, destination.y, { steps: 12 });
  await expect(
    grid.locator(`[data-grid-placeholder-for="${await entry.getAttribute("data-grid-item-id")}"]`),
  ).toBeVisible();
  await page.mouse.up();
};

const expectCanStartDragAtCenterAsync = async (page: Page, entry: Locator) => {
  const box = await expectBoundingBoxAsync(entry);
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 8, center.y, { steps: 4 });
  await expect(entry).toHaveAttribute("data-dnd-drag-source", "true");
  await page.mouse.up();
};

const expectCannotStartDragOutsideRightAsync = async (page: Page, entry: Locator) => {
  const box = await expectBoundingBoxAsync(entry);
  const outside = { x: box.x + box.width + 4, y: box.y + box.height / 2 };
  await page.mouse.move(outside.x, outside.y);
  await page.mouse.down();
  await page.mouse.move(outside.x + 8, outside.y, { steps: 4 });
  await expect(entry).not.toHaveAttribute("data-dnd-drag-source", "true");
  await page.mouse.up();
};
