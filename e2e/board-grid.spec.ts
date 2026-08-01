import { mkdir } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { chromium, expect } from "@playwright/test";
import type { Locator, Page, Request, Response } from "@playwright/test";
import { createId } from "@paralleldrive/cuid2";
import { stringify as stringifySuperJSON } from "superjson";
import { describe, test } from "vitest";

import {
  LOGICAL_GRID_CELL_SIZE,
  LOGICAL_GRID_GAP,
  MIN_ACCESSIBLE_CANVAS_SCALE,
} from "../apps/nextjs/src/components/board/layout/constants";
import * as sqliteSchema from "../packages/db/schema/sqlite";
import { createHomarrContainer } from "./shared/create-homarr-container";
import { createSqliteDbFileAsync } from "./shared/e2e-db";
import type { SqliteDatabase } from "./shared/e2e-db";
import { seedAdminUserAsync } from "./shared/seed-admin-user";

const adminCredentials = {
  username: "admin",
  password: "Comp(exP4sswOrd",
};

const editRuntimeMarker = "homarr-edit-grid-v1";
const gridStackPayloadMarker = "--gs-column-width";
const logicalCellSize = LOGICAL_GRID_CELL_SIZE;
const logicalCellPitch = LOGICAL_GRID_CELL_SIZE + LOGICAL_GRID_GAP;
const minimumCanvasScale = MIN_ACCESSIBLE_CANVAS_SCALE;

describe("Board grid", () => {
  test("supports fixed, nested, rail, pointer, keyboard and reconciliation workflows", async () => {
    const { db, localMountPath } = await createSqliteDbFileAsync();
    const { userId } = await seedAdminUserAsync(db, adminCredentials);
    const fixture = await seedBoardGridAsync(db, userId);
    const screenshotDirectory = await prepareScreenshotDirectoryAsync();

    const homarrContainer = await createHomarrContainer({
      environment: {
        AUTH_PROVIDERS: "credentials",
      },
      mounts: {
        "/appdata": localMountPath,
      },
    }).start();

    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    let runtimeResources: ReturnType<typeof trackRuntimeResources> | undefined;

    try {
      const baseUrl = `http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}`;
      browser = await chromium.launch();
      const context = await browser.newContext({
        viewport: {
          width: 1920,
          height: 1200,
        },
      });
      const page = await context.newPage();
      await installLayoutShiftObserverAsync(page);
      runtimeResources = trackRuntimeResources(page);
      const pageErrors: Error[] = [];
      page.on("pageerror", (error) => {
        pageErrors.push(error);
        console.error(error.stack);
      });

      const noScriptContext = await browser.newContext({
        javaScriptEnabled: false,
        viewport: {
          width: 1920,
          height: 1200,
        },
      });
      const noScriptPage = await noScriptContext.newPage();
      await noScriptPage.goto(`${baseUrl}/boards/${fixture.boardName}`);
      const serverRenderedCanvas = noScriptPage.getByTestId("board-canvas");
      await expect(serverRenderedCanvas).toHaveAttribute("data-board-hydrated", "false");
      const initialCanvasHeight = Number(await serverRenderedCanvas.getAttribute("data-canvas-initial-height"));
      expect(initialCanvasHeight).toBeGreaterThan(0);
      await expect(serverRenderedCanvas.locator(`[data-grid-item-id="${fixture.firstItemId}"]`)).toHaveCount(1);
      await noScriptContext.close();

      await signInAsync(page, baseUrl, `/boards/${fixture.boardName}`);

      const canvas = page.getByTestId("board-canvas");
      await expect(canvas).toHaveAttribute("data-board-hydrated", "true");
      await expect(page.locator(`[data-grid-runtime="${editRuntimeMarker}"]`)).toHaveCount(0);

      const mainSection = page.locator(`[data-section-id="${fixture.sectionId}"]`);
      const rail = page.getByRole("complementary", { name: "Left dashboard rail" });
      const railSection = page.locator(`[data-grid-item-id="${fixture.railSectionId}"]`);
      const railRootSection = rail.locator("[data-section-kind='empty']");
      const railItem = page.locator(`[data-grid-item-id="${fixture.railItemId}"]`);
      const dynamicSection = page.locator(`[data-grid-item-id="${fixture.dynamicSectionId}"]`);
      const nestedItem = page.locator(`[data-grid-item-id="${fixture.nestedItemId}"]`);
      const belowItem = page.locator(`[data-grid-item-id="${fixture.belowItemId}"]`);
      await expect(mainSection).toHaveAttribute("data-section-kind", "empty");
      await expect(mainSection).toHaveAttribute("data-rail-placement", "main");
      await expect(rail).toBeVisible();
      await expect(rail).toHaveAttribute("data-board-gutter", "left");
      await expect(railRootSection).toHaveAttribute("data-rail-placement", "left");
      await expect(railSection).toHaveAttribute("data-grid-w", "2");
      await expect(railItem).toHaveAttribute("data-grid-x", "0");
      await expect(dynamicSection).toHaveAttribute("data-grid-w", "2");
      await expect(dynamicSection).toHaveAttribute("data-grid-h", "2");
      await expect(dynamicSection.getByText("Nested box", { exact: true })).toBeVisible();
      await expect(nestedItem).toHaveAttribute("data-grid-x", "0");
      await expect(belowItem).toHaveAttribute("data-grid-y", "2");

      const firstItem = page.locator(`[data-grid-item-id="${fixture.firstItemId}"]`);
      const secondItem = page.locator(`[data-grid-item-id="${fixture.secondItemId}"]`);
      await expect(firstItem).toHaveAttribute("data-grid-x", "0");
      await expect(firstItem).toHaveAttribute("data-grid-y", "0");
      await expect(firstItem).toHaveAttribute("data-grid-w", "1");
      await expect(firstItem).toHaveAttribute("data-grid-h", "1");
      await expect(secondItem).toHaveAttribute("data-grid-x", "1");
      await expect(secondItem).toHaveAttribute("data-grid-y", "0");

      const logicalTile = firstItem.locator("[data-grid-item-content]");
      await expect(logicalTile).toHaveCount(1);
      await expectFixedLogicalTileAsync(logicalTile);
      await expect(canvas).toHaveAttribute("data-canvas-overflow", "false");
      const normalZoomTileBox = await expectBoundingBoxAsync(logicalTile);
      const normalCanvasScale = await readCanvasScaleAsync(canvas);
      const secondItemBox = await expectBoundingBoxAsync(secondItem);
      expect(secondItemBox.x - (normalZoomTileBox.x + normalZoomTileBox.width)).toBeCloseTo(
        (logicalCellPitch - logicalCellSize) * normalCanvasScale,
        1,
      );

      const editToggle = page.getByTestId("board-edit-mode-toggle");
      await runtimeResources.waitForQuietAsync();
      expect(runtimeResources.urlsFor("read-only", "editor")).toEqual([]);
      expect(runtimeResources.urlsFor("read-only", "gridstack")).toEqual([]);
      expect(await readLayoutShiftScoreAsync(page)).toBeLessThan(0.01);

      await resetLayoutShiftScoreAsync(page);
      await releaseIdleCallbacksAsync(page);
      await expect(editToggle).toHaveAttribute("data-board-editor-preload-state", "ready", {
        timeout: 15_000,
      });
      await runtimeResources.waitForQuietAsync();
      expect(runtimeResources.urlsFor("read-only", "editor").length).toBeGreaterThan(0);
      expect(runtimeResources.urlsFor("read-only", "gridstack").length).toBeGreaterThan(0);
      expect(await readLayoutShiftScoreAsync(page)).toBeLessThan(0.01);

      // CSS zoom exercises Chromium's browser-zoom layout path without relying
      // on desktop browser chrome. At 200% the scale floor must preserve
      // magnification and expose horizontal scrolling instead of shrinking the
      // board by the inverse zoom factor.
      await setDocumentZoomAsync(page, 2);
      await expect(canvas).toHaveAttribute("data-canvas-scale", String(minimumCanvasScale));
      await expect(canvas).toHaveAttribute("data-canvas-overflow", "true");
      await expectFixedLogicalTileAsync(logicalTile);
      await expectUniformVisualScaleAsync(logicalTile);
      const fittedClockFontSize = await firstItem.locator(".clock-time-text").evaluate((element) => {
        return Number.parseFloat(getComputedStyle(element).fontSize);
      });
      expect(fittedClockFontSize * minimumCanvasScale).toBeGreaterThanOrEqual(25);
      const zoomedTileBox = await expectBoundingBoxAsync(logicalTile);
      expect(zoomedTileBox.width).toBeGreaterThan(normalZoomTileBox.width * 1.25);
      await expectHorizontalOverflowAsync(canvas);
      const overflowRailY = (await expectBoundingBoxAsync(rail)).y;
      await page.evaluate(() => window.scrollTo({ top: 300, behavior: "auto" }));
      await expect.poll(async () => (await expectBoundingBoxAsync(rail)).y).toBeGreaterThanOrEqual(0);
      expect((await expectBoundingBoxAsync(rail)).y).toBeLessThanOrEqual(overflowRailY);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
      await setDocumentZoomAsync(page, 1);
      await expect(canvas).toHaveAttribute("data-canvas-overflow", "false");

      const collapseDynamic = page.getByRole("button", {
        name: "Collapse: Nested box",
        exact: true,
      });
      await collapseDynamic.click();
      await expect(dynamicSection).toHaveAttribute("data-grid-h", "1");
      await expect(belowItem).toHaveAttribute("data-grid-y", "1");
      await expect(nestedItem).toHaveCount(0);

      await page
        .getByRole("button", {
          name: "Expand: Nested box",
          exact: true,
        })
        .click();
      await expect(dynamicSection).toHaveAttribute("data-grid-h", "2");
      await expect(belowItem).toHaveAttribute("data-grid-y", "2");
      await expect(nestedItem).toHaveCount(1);
      await captureBoardScreenshotAsync(canvas, screenshotDirectory, "board-grid-read-only.png");

      const viewMainSectionBox = await expectBoundingBoxAsync(mainSection);
      const viewFirstItemBox = await expectBoundingBoxAsync(logicalTile);
      runtimeResources.enterEditMode();
      await editToggle.click();
      await expect(page.locator(`[data-grid-runtime="${editRuntimeMarker}"]`)).toHaveCount(4);
      await expect(page.getByTestId("board-grid-editor-loading")).toHaveCount(0);
      await expect(page.getByTestId("board-canvas-row-count-button")).toHaveCount(0);
      await expectBoundingBoxToMatchAsync(mainSection, viewMainSectionBox);
      await expectBoundingBoxToMatchAsync(logicalTile, viewFirstItemBox);
      await runtimeResources.waitForQuietAsync();
      expect(runtimeResources.urlsFor("edit", "editor")).toEqual([]);
      expect(runtimeResources.urlsFor("edit", "gridstack")).toEqual([]);
      runtimeResources.stop();

      await expect(mainSection).toHaveAttribute("role", "region");
      await expect(mainSection).toHaveAttribute("data-grid-editable", "true");
      await expect(firstItem.locator(`[data-grid-id="${fixture.firstItemId}"]`)).toHaveAttribute("role", "group");
      await expectTargetSizeAsync(getEditorEntry(firstItem));
      const dragAffordance = firstItem.getByTestId("board-grid-drag-affordance");
      const diagonalResizeHandle = firstItem.locator(':scope > [data-testid="board-grid-resize-handle"]');
      const inertContent = firstItem.locator("[data-board-grid-inert-content]");
      await expect(dragAffordance).toBeVisible();
      await expect(dragAffordance).toHaveCSS("pointer-events", "none");
      await expectTargetSizeAsync(diagonalResizeHandle);
      await expectLogicalTargetSizeAsync(diagonalResizeHandle, 44);
      await expect(diagonalResizeHandle).toHaveCSS("transform", "none");
      await expect(inertContent).toHaveAttribute("inert", "");
      await expect(inertContent).toHaveCSS("pointer-events", "none");

      await page.getByRole("button", { name: "Add board content" }).click();
      await expect(page.getByRole("menuitem", { name: "New section", exact: true })).toBeVisible();
      await expect(page.getByRole("menuitem", { name: "New category", exact: true })).toHaveCount(0);
      await page.getByRole("menuitem", { name: "New item", exact: true }).click();
      const itemSelectDialog = page.getByRole("dialog", { name: "Choose item to add" });
      await expect(itemSelectDialog).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(itemSelectDialog).toHaveCount(0);

      const railBoxBeforeMainDrag = await expectBoundingBoxAsync(rail);
      const canvasScale = await readCanvasScaleAsync(canvas);
      await dragLocatorByAsync(page, getEditorEntry(firstItem), logicalCellPitch * canvasScale, 0);
      await expect(firstItem).toHaveAttribute("data-grid-x", "1");
      await expect(secondItem).toHaveAttribute("data-grid-x", "0");

      await dragLocatorByAsync(page, getEditorEntry(firstItem), logicalCellPitch * canvasScale * 3, 0);
      await expect(firstItem).toHaveAttribute("data-grid-x", "4");
      expect(gridLayoutsOverlap(await readGridLayoutAsync(firstItem), await readGridLayoutAsync(secondItem))).toBe(
        false,
      );

      const railBoxAfterMainDrag = await expectBoundingBoxAsync(rail);
      expect(railBoxAfterMainDrag.x).toBeCloseTo(railBoxBeforeMainDrag.x, 1);
      expect(railBoxAfterMainDrag.width).toBeCloseTo(railBoxBeforeMainDrag.width, 1);
      await expect(railItem.locator("xpath=ancestor::aside[1]")).toHaveAttribute("aria-label", "Left dashboard rail");

      const secondItemContent = secondItem.locator("[data-grid-item-content]");
      await expect(secondItemContent).toHaveCount(1);
      await secondItemContent.evaluate((element) => {
        element.setAttribute("data-e2e-portal-instance", "second-item-content");
      });

      const railEditor = rail.locator("[data-grid-section-id]").first();
      const railGridBox = await expectBoundingBoxAsync(railEditor);
      await dragLocatorToAsync(
        page,
        getEditorEntry(secondItem),
        railGridBox.x + logicalCellPitch * canvasScale * 1.5,
        railGridBox.y + logicalCellSize * canvasScale * 0.5,
      );
      await expect(secondItem.locator("xpath=ancestor::aside[1]")).toHaveAttribute("data-board-gutter", "left");
      await expect(
        secondItem.locator('[data-grid-item-content][data-e2e-portal-instance="second-item-content"]'),
      ).toBeVisible();
      await expect(getEditorEntry(secondItem)).toHaveCount(1);
      expect(pageErrors).toEqual([]);

      await moveEntryWithModalAsync(page, secondItem, /Dashboard canvas, destination \d+/);
      await expect(secondItem.locator("xpath=ancestor::*[@data-grid-section-id][1]")).toHaveAttribute(
        "data-grid-section-id",
        fixture.sectionId,
      );
      await expect(getEditorEntry(secondItem)).toBeFocused();
      await moveEntryWithModalAsync(page, secondItem, /Left dashboard rail, destination \d+/);
      await expect(secondItem.locator("xpath=ancestor::aside[1]")).toHaveAttribute("data-board-gutter", "left");
      await expect(getEditorEntry(secondItem)).toBeFocused();
      await expect(
        secondItem.locator('[data-grid-item-content][data-e2e-portal-instance="second-item-content"]'),
      ).toBeVisible();

      const railKeyboardEntry = getEditorEntry(railItem);
      await railKeyboardEntry.focus();
      await railKeyboardEntry.press("Enter");
      await expect(railKeyboardEntry).toHaveAttribute("data-keyboard-editing", "true");
      await railKeyboardEntry.press("Shift+ArrowRight");
      await expect(railItem).toHaveAttribute("data-grid-w", "2");
      await railKeyboardEntry.press("Shift+ArrowLeft");
      await expect(railItem).toHaveAttribute("data-grid-w", "1");
      await railKeyboardEntry.press("ArrowRight");
      await expect(railItem).toHaveAttribute("data-grid-x", "1");
      await railKeyboardEntry.press("Escape");
      await expect(railKeyboardEntry).toHaveAttribute("data-keyboard-editing", "false");

      const dynamicResizeHandle = dynamicSection.locator(':scope > [data-testid="board-grid-resize-handle"]');
      await expectLogicalTargetSizeAsync(dynamicResizeHandle, 44);
      await dragLocatorByAsync(page, dynamicResizeHandle, 0, -logicalCellPitch * canvasScale);
      await expect(dynamicSection).toHaveAttribute("data-grid-h", "1");

      const minimumSectionBox = await expectBoundingBoxAsync(dynamicSection);
      const minimumHandleBox = await expectBoundingBoxAsync(dynamicResizeHandle);
      const resizeStartX = minimumHandleBox.x + minimumHandleBox.width / 2;
      const resizeStartY = minimumHandleBox.y + minimumHandleBox.height / 2;
      await page.mouse.move(resizeStartX, resizeStartY);
      await page.mouse.down();
      await page.mouse.move(resizeStartX, resizeStartY - logicalCellPitch * canvasScale * 2, { steps: 12 });
      const constrainedSectionBox = await expectBoundingBoxAsync(dynamicSection);
      expect(Math.abs(constrainedSectionBox.height - minimumSectionBox.height)).toBeLessThan(1);
      await page.mouse.up();
      await expect(dynamicSection).toHaveAttribute("data-grid-h", "1");

      await dragLocatorByAsync(page, dynamicResizeHandle, 0, logicalCellPitch * canvasScale * 2);
      await expect(dynamicSection).toHaveAttribute("data-grid-h", "3");
      await expect(belowItem).toHaveAttribute("data-grid-y", "3");
      expect(gridLayoutsOverlap(await readGridLayoutAsync(dynamicSection), await readGridLayoutAsync(belowItem))).toBe(
        false,
      );

      // The main canvas grows with its content instead of requiring a manual
      // row limit, and items can occupy empty rows below their original position.
      for (let targetRow = 1; targetRow <= 8; targetRow += 1) {
        await firstItem.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
        await dragLocatorByAsync(page, getEditorEntry(firstItem), 0, logicalCellPitch * canvasScale + 2);
        await expect(firstItem).toHaveAttribute("data-grid-y", String(targetRow));
        await waitForControlledGridReconciliationAsync(firstItem);
        await expect(firstItem).toHaveAttribute("data-grid-y", String(targetRow));
      }
      await expect(firstItem).toHaveAttribute("data-grid-y", "8");
      expect(gridLayoutsOverlap(await readGridLayoutAsync(firstItem), await readGridLayoutAsync(belowItem))).toBe(
        false,
      );

      const stickyRailY = (await expectBoundingBoxAsync(rail)).y;
      await page.evaluate(() => window.scrollTo({ top: 500, behavior: "auto" }));
      const scrolledRailY = (await expectBoundingBoxAsync(rail)).y;
      expect(scrolledRailY).toBeGreaterThanOrEqual(0);
      expect(scrolledRailY).toBeLessThanOrEqual(stickyRailY + 0.5);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));

      await setDocumentZoomAsync(page, 1.25);
      await expectFixedLogicalTileAsync(logicalTile);
      await expectUniformVisualScaleAsync(logicalTile);
      await expectTargetSizeAsync(getEditorEntry(firstItem));
      await expectTargetSizeAsync(firstItem.locator(':scope > [data-testid="board-grid-resize-handle"]'));
      await setDocumentZoomAsync(page, 1);
      await captureBoardScreenshotAsync(canvas, screenshotDirectory, "board-grid-edit-mode.png");

      const dynamicLayoutBeforeDelete = await readGridLayoutAsync(dynamicSection);
      await dynamicSection.getByRole("button", { name: "Settings for Nested box" }).click();
      await page
        .getByRole("menuitem", {
          name: "Remove section",
          exact: true,
        })
        .click();
      await page
        .getByRole("dialog", {
          name: "Remove section",
        })
        .getByRole("button", {
          name: "Confirm",
          exact: true,
        })
        .click();

      await expect(dynamicSection).toHaveCount(0);
      await expect(nestedItem).toHaveCount(1);
      await expect(nestedItem.locator("xpath=ancestor::*[@data-grid-section-id][1]")).toHaveAttribute(
        "data-grid-section-id",
        fixture.sectionId,
      );
      await expect(nestedItem).toHaveAttribute("data-grid-x", String(dynamicLayoutBeforeDelete.x));
      await expect(nestedItem).toHaveAttribute("data-grid-y", String(dynamicLayoutBeforeDelete.y));

      await page.getByTestId("board-edit-mode-toggle").click();
      await expect(page.locator(`[data-grid-runtime="${editRuntimeMarker}"]`)).toHaveCount(0);

      await page.reload();
      const reloadedCanvas = page.locator('[data-testid="board-canvas"][data-board-hydrated="true"]');
      const reloadedFirstItem = reloadedCanvas.locator(`[data-grid-item-id="${fixture.firstItemId}"]`);
      const reloadedSecondItem = reloadedCanvas.locator(`[data-grid-item-id="${fixture.secondItemId}"]`);
      const reloadedRailItem = reloadedCanvas.locator(`[data-grid-item-id="${fixture.railItemId}"]`);
      const reloadedDynamicSection = reloadedCanvas.locator(`[data-grid-item-id="${fixture.dynamicSectionId}"]`);
      const reloadedNestedItem = reloadedCanvas.locator(`[data-grid-item-id="${fixture.nestedItemId}"]`);
      await expect(reloadedCanvas).toHaveCount(1);
      await expect(reloadedFirstItem).toHaveAttribute("data-grid-x", "4");
      await expect(reloadedFirstItem).toHaveAttribute("data-grid-y", "8");
      await expect(reloadedRailItem).toHaveAttribute("data-grid-x", "1");
      await expect(reloadedRailItem).toHaveAttribute("data-grid-w", "1");
      await expect(reloadedDynamicSection).toHaveCount(0);
      await expect(reloadedNestedItem).toHaveCount(1);
      await expect(reloadedNestedItem.locator("xpath=ancestor::*[@data-grid-section-id][1]")).toHaveAttribute(
        "data-grid-section-id",
        fixture.sectionId,
      );
      await expect(reloadedSecondItem.locator("xpath=ancestor::aside[1]")).toHaveAttribute("data-board-gutter", "left");
      const persistedFirstLayout = await readGridLayoutAsync(reloadedFirstItem);
      const persistedSecondLayout = await readGridLayoutAsync(reloadedSecondItem);
      expect(gridLayoutsOverlap(persistedFirstLayout, persistedSecondLayout)).toBe(false);

      await page.goto(`${baseUrl}/boards/${fixture.boardName}/settings?tab=layout`);
      const gutterPreview = page.getByLabel("Dashboard layout preview").filter({ visible: true });
      await expect(gutterPreview).toBeVisible();
      const rightGutterSwitch = page.getByRole("switch", { name: "Right sidebar" });
      await rightGutterSwitch.check();
      const rightGutterSlider = page.getByRole("slider", { name: "Right sidebar width" });
      await expect(rightGutterSlider).toHaveAttribute("aria-valuenow", "2");
      await rightGutterSlider.press("ArrowRight");
      await expect(rightGutterSlider).toHaveAttribute("aria-valuenow", "3");
      await captureBoardScreenshotAsync(page.locator("main"), screenshotDirectory, "board-layout-gutter-settings.png");
      await Promise.all([
        page.waitForResponse(
          (response) => response.url().includes("/api/trpc/board.saveLayouts") && response.status() === 200,
        ),
        rightGutterSwitch.locator("xpath=ancestor::form[1]").getByRole("button", { name: "Save changes" }).click(),
      ]);

      await page.goto(`${baseUrl}/boards/${fixture.boardName}`);
      const boardWithBothGutters = page.locator('[data-testid="board-canvas"][data-board-hydrated="true"]');
      await expect(boardWithBothGutters).toHaveCount(1);
      await expect(page.getByRole("complementary", { name: "Left dashboard rail" })).toBeVisible();
      const emptyRightGutter = page.getByRole("complementary", { name: "Right dashboard rail" });
      await expect(emptyRightGutter).toHaveCount(1);
      expect((await expectBoundingBoxAsync(emptyRightGutter)).width).toBeGreaterThan(0);
      expect(pageErrors).toEqual([]);
    } finally {
      runtimeResources?.stop();
      await browser?.close();
      await homarrContainer.stop();
    }
  }, 180_000);
});

const seedBoardGridAsync = async (db: SqliteDatabase, creatorId: string) => {
  const boardId = createId();
  const boardName = "grid-e2e";
  const layoutId = createId();
  const sectionId = createId();
  const railSectionId = createId();
  const dynamicSectionId = createId();
  const firstItemId = createId();
  const secondItemId = createId();
  const belowItemId = createId();
  const nestedItemId = createId();
  const railItemId = createId();

  await db.insert(sqliteSchema.boards).values({
    id: boardId,
    name: boardName,
    creatorId,
    isPublic: true,
  });
  await db.insert(sqliteSchema.layouts).values({
    id: layoutId,
    name: "Desktop",
    boardId,
    columnCount: 8,
    breakpoint: 0,
  });
  await db.insert(sqliteSchema.sections).values([
    {
      id: sectionId,
      boardId,
      kind: "empty",
      xOffset: 0,
      yOffset: 0,
    },
    {
      id: railSectionId,
      boardId,
      kind: "category",
      name: "Pinned rail",
      xOffset: 0,
      yOffset: 0,
      options: stringifySuperJSON({
        showLabel: true,
        collapsible: true,
        showOpenAll: false,
        railPlacement: "left",
        columnCount: 2,
      }),
    },
    {
      id: dynamicSectionId,
      boardId,
      kind: "dynamic",
      options: stringifySuperJSON({
        title: "Nested box",
        customCssClasses: [],
        borderColor: "",
        showLabel: true,
        collapsible: true,
        showOpenAll: false,
      }),
    },
  ]);
  await db.insert(sqliteSchema.sectionCollapseStates).values({
    userId: creatorId,
    sectionId: railSectionId,
    // Legacy categories stored true when the category was open.
    collapsed: true,
  });
  await db.insert(sqliteSchema.sectionLayouts).values({
    sectionId: dynamicSectionId,
    layoutId,
    parentSectionId: sectionId,
    xOffset: 2,
    yOffset: 0,
    width: 2,
    height: 2,
  });
  await db.insert(sqliteSchema.items).values([
    {
      id: firstItemId,
      boardId,
      kind: "clock",
      options: stringifySuperJSON({ is24HourFormat: true }),
    },
    {
      id: secondItemId,
      boardId,
      kind: "clock",
      options: stringifySuperJSON({ is24HourFormat: true }),
    },
    {
      id: belowItemId,
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
    {
      id: railItemId,
      boardId,
      kind: "clock",
      options: stringifySuperJSON({ is24HourFormat: true }),
    },
  ]);
  await db.insert(sqliteSchema.itemLayouts).values([
    {
      itemId: firstItemId,
      sectionId,
      layoutId,
      xOffset: 0,
      yOffset: 0,
      width: 1,
      height: 1,
    },
    {
      itemId: secondItemId,
      sectionId,
      layoutId,
      xOffset: 1,
      yOffset: 0,
      width: 1,
      height: 1,
    },
    {
      itemId: belowItemId,
      sectionId,
      layoutId,
      xOffset: 2,
      yOffset: 2,
      width: 2,
      height: 1,
    },
    {
      itemId: nestedItemId,
      sectionId: dynamicSectionId,
      layoutId,
      xOffset: 0,
      yOffset: 0,
      width: 1,
      height: 1,
    },
    {
      itemId: railItemId,
      sectionId: railSectionId,
      layoutId,
      xOffset: 0,
      yOffset: 0,
      width: 1,
      height: 1,
    },
  ]);

  return {
    boardName,
    sectionId,
    railSectionId,
    dynamicSectionId,
    firstItemId,
    secondItemId,
    belowItemId,
    nestedItemId,
    railItemId,
  };
};

const signInAsync = async (page: Page, baseUrl: string, callbackPath: string) => {
  const loginUrl = new URL("/auth/login", baseUrl);
  loginUrl.searchParams.set("callbackUrl", callbackPath);
  await page.goto(loginUrl.href);
  await page.getByLabel("Username").fill(adminCredentials.username);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(adminCredentials.password);
  await page.locator("button[type='submit']").click();
  await page.waitForURL(`${baseUrl}${callbackPath}`, { timeout: 15_000 });
};

const prepareScreenshotDirectoryAsync = async () => {
  const configuredDirectory = process.env.HOMARR_E2E_SCREENSHOT_DIR?.trim();
  if (!configuredDirectory) return undefined;

  const directory = resolvePath(configuredDirectory);
  await mkdir(directory, { recursive: true });
  return directory;
};

const captureBoardScreenshotAsync = async (
  canvas: Locator,
  screenshotDirectory: string | undefined,
  fileName: string,
) => {
  if (!screenshotDirectory) return;
  await canvas.screenshot({
    animations: "disabled",
    caret: "hide",
    path: resolvePath(screenshotDirectory, fileName),
  });
};

type RuntimeResourcePhase = "read-only" | "edit";
type RuntimePayload = "editor" | "gridstack";

interface RuntimeResource {
  phase: RuntimeResourcePhase;
  url: string;
  hasEditorPayload: boolean;
  hasGridStackPayload: boolean;
}

const trackRuntimeResources = (page: Page) => {
  const resources: RuntimeResource[] = [];
  const pendingResponses = new Set<Promise<void>>();
  const inFlightRequests = new Set<Request>();
  const requestPhases = new WeakMap<Request, RuntimeResourcePhase>();
  const bodyErrors: Error[] = [];
  let phase: RuntimeResourcePhase = "read-only";
  let lastActivityAt = Date.now();
  let stopped = false;

  const handleRequest = (request: Request) => {
    requestPhases.set(request, phase);
    if (!isRuntimeResourceType(request.resourceType())) return;
    inFlightRequests.add(request);
    lastActivityAt = Date.now();
  };

  const handleRequestFailed = (request: Request) => {
    if (!inFlightRequests.delete(request)) return;
    lastActivityAt = Date.now();
  };

  const handleResponse = (response: Response) => {
    const resourceKind = getRuntimeResourceKind(response);
    if (!resourceKind) return;

    const request = response.request();
    const responsePhase = requestPhases.get(request) ?? phase;
    inFlightRequests.delete(request);
    lastActivityAt = Date.now();
    const task = readRuntimeResponseBodyAsync(page, response)
      .then((body) => {
        resources.push({
          phase: responsePhase,
          url: response.url(),
          hasEditorPayload: body.includes(Buffer.from(editRuntimeMarker)),
          hasGridStackPayload: body.includes(Buffer.from(gridStackPayloadMarker)),
        });
      })
      .catch((error: unknown) => {
        bodyErrors.push(new Error(`Unable to inspect ${resourceKind} response ${response.url()}`, { cause: error }));
      });

    pendingResponses.add(task);
    void task.finally(() => {
      pendingResponses.delete(task);
      lastActivityAt = Date.now();
    });
  };

  page.on("request", handleRequest);
  page.on("requestfailed", handleRequestFailed);
  page.on("response", handleResponse);

  return {
    enterEditMode() {
      phase = "edit";
    },
    urlsFor(resourcePhase: RuntimeResourcePhase, payload: RuntimePayload) {
      const key = payload === "editor" ? "hasEditorPayload" : "hasGridStackPayload";
      return [
        ...new Set(
          resources
            .filter((resource) => resource.phase === resourcePhase && resource[key])
            .map((resource) => resource.url),
        ),
      ];
    },
    async waitForQuietAsync({ quietMs = 300, timeoutMs = 15_000 } = {}) {
      const deadline = Date.now() + timeoutMs;

      while (true) {
        if (pendingResponses.size > 0) {
          await Promise.all(pendingResponses);
        }
        if (bodyErrors.length > 0) {
          throw new AggregateError(bodyErrors, "Unable to inspect one or more JavaScript or CSS responses");
        }

        const quietFor = Date.now() - lastActivityAt;
        if (pendingResponses.size === 0 && inFlightRequests.size === 0 && quietFor >= quietMs) return;
        if (Date.now() >= deadline) {
          throw new Error(
            `JavaScript and CSS requests did not become quiet within ${timeoutMs}ms ` +
              `(${inFlightRequests.size} requests and ${pendingResponses.size} response bodies pending)`,
          );
        }

        await new Promise((resolve) => setTimeout(resolve, Math.min(50, Math.max(1, quietMs - quietFor))));
      }
    },
    stop() {
      if (stopped) return;
      stopped = true;
      page.off("request", handleRequest);
      page.off("requestfailed", handleRequestFailed);
      page.off("response", handleResponse);
    },
  };
};

const readRuntimeResponseBodyAsync = async (page: Page, response: Response) => {
  try {
    return await response.body();
  } catch (originalError) {
    try {
      const fallbackResponse = await page.request.get(response.url(), {
        failOnStatusCode: false,
      });
      if (!fallbackResponse.ok()) {
        throw new Error(`Fallback request returned HTTP ${fallbackResponse.status()}`, {
          cause: originalError,
        });
      }
      return await fallbackResponse.body();
    } catch (fallbackError) {
      throw new Error(
        `Unable to read or refetch runtime response ${response.url()}. Original read error: ${String(originalError)}`,
        { cause: fallbackError },
      );
    }
  }
};

const isRuntimeResourceType = (resourceType: string) => resourceType === "script" || resourceType === "stylesheet";

const getRuntimeResourceKind = (response: Response): "script" | "stylesheet" | null => {
  const resourceType = response.request().resourceType();
  if (resourceType === "script" || resourceType === "stylesheet") return resourceType;

  const contentType = response.headers()["content-type"]?.toLowerCase() ?? "";
  if (contentType.includes("javascript") || contentType.includes("ecmascript")) return "script";
  if (contentType.includes("text/css")) return "stylesheet";
  return null;
};

const expectBoundingBoxAsync = async (locator: Locator) => {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) {
    throw new Error("Expected locator to have a bounding box");
  }
  return box;
};

const expectBoundingBoxToMatchAsync = async (
  locator: Locator,
  expected: { x: number; y: number; width: number; height: number },
) => {
  const actual = await expectBoundingBoxAsync(locator);
  expect(actual.x).toBeCloseTo(expected.x, 0);
  expect(actual.y).toBeCloseTo(expected.y, 0);
  expect(actual.width).toBeCloseTo(expected.width, 0);
  expect(actual.height).toBeCloseTo(expected.height, 0);
};

const installLayoutShiftObserverAsync = async (page: Page) => {
  await page.addInitScript(() => {
    const target = window as typeof window & {
      homarrLayoutShiftScore?: number;
      homarrReleaseIdleCallbacks?: () => void;
    };
    const idleCallbacks = new Map<number, IdleRequestCallback>();
    let nextIdleCallbackId = 1;

    target.homarrLayoutShiftScore = 0;
    target.requestIdleCallback = (callback) => {
      const callbackId = nextIdleCallbackId++;
      idleCallbacks.set(callbackId, callback);
      return callbackId;
    };
    target.cancelIdleCallback = (callbackId) => {
      idleCallbacks.delete(callbackId);
    };
    target.homarrReleaseIdleCallbacks = () => {
      const callbacks = [...idleCallbacks.values()];
      idleCallbacks.clear();
      for (const callback of callbacks) {
        callback({
          didTimeout: false,
          timeRemaining: () => 50,
        });
      }
    };

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
        if (!shift.hadRecentInput) {
          target.homarrLayoutShiftScore = (target.homarrLayoutShiftScore ?? 0) + shift.value;
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
};

const releaseIdleCallbacksAsync = async (page: Page) => {
  await page.evaluate(() => {
    const release = (
      window as typeof window & {
        homarrReleaseIdleCallbacks?: () => void;
      }
    ).homarrReleaseIdleCallbacks;
    if (!release) {
      throw new Error("Idle callback release hook was not installed");
    }
    release();
  });
};

const readLayoutShiftScoreAsync = async (page: Page) =>
  await page.evaluate(
    () => (window as typeof window & { homarrLayoutShiftScore?: number }).homarrLayoutShiftScore ?? 0,
  );

const resetLayoutShiftScoreAsync = async (page: Page) => {
  await page.evaluate(() => {
    (window as typeof window & { homarrLayoutShiftScore?: number }).homarrLayoutShiftScore = 0;
  });
};

const dragLocatorByAsync = async (page: Page, locator: Locator, deltaX: number, deltaY: number) => {
  const box = await expectBoundingBoxAsync(locator);
  await dragLocatorToAsync(page, locator, box.x + box.width / 2 + deltaX, box.y + box.height / 2 + deltaY);
};

const waitForControlledGridReconciliationAsync = async (locator: Locator) => {
  await locator.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
};

const dragLocatorToAsync = async (page: Page, locator: Locator, targetX: number, targetY: number) => {
  const box = await expectBoundingBoxAsync(locator);
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 12 });
  await page.mouse.up();
};

const readCanvasScaleAsync = async (canvas: Locator) => {
  const scale = Number(await canvas.getAttribute("data-canvas-scale"));
  expect(Number.isFinite(scale)).toBe(true);
  expect(scale).toBeGreaterThan(0);
  return scale;
};

const setDocumentZoomAsync = async (page: Page, zoom: number) => {
  await page.evaluate((nextZoom) => {
    document.documentElement.style.zoom = String(nextZoom);
  }, zoom);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
};

const moveEntryWithModalAsync = async (page: Page, entry: Locator, targetName: RegExp) => {
  await entry.getByRole("button", { name: /^Settings for / }).click();
  await page.getByRole("menuitem", { name: "Move / resize item", exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "Move / resize item" });
  await dialog.getByLabel("Section or rail").click();
  await page.getByRole("option", { name: targetName }).click();
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
};

const getEditorEntry = (entry: Locator) => entry.locator("[data-editor-grid-entry]").first();

const expectFixedLogicalTileAsync = async (locator: Locator) => {
  await expect(locator).toHaveJSProperty("offsetWidth", logicalCellSize);
  await expect(locator).toHaveJSProperty("offsetHeight", logicalCellSize);
};

const expectUniformVisualScaleAsync = async (locator: Locator) => {
  const scale = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const htmlElement = element as HTMLElement;
    return {
      horizontal: rect.width / htmlElement.offsetWidth,
      vertical: rect.height / htmlElement.offsetHeight,
    };
  });

  expect(scale.horizontal).toBeCloseTo(scale.vertical, 3);
};

const expectHorizontalOverflowAsync = async (locator: Locator) => {
  const dimensions = await locator.evaluate((element) => {
    const htmlElement = element as HTMLElement;
    return {
      clientWidth: htmlElement.clientWidth,
      scrollWidth: htmlElement.scrollWidth,
    };
  });

  expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
};

const expectTargetSizeAsync = async (locator: Locator) => {
  const box = await expectBoundingBoxAsync(locator);
  expect(box.width).toBeGreaterThanOrEqual(24);
  expect(box.height).toBeGreaterThanOrEqual(24);
};

const expectLogicalTargetSizeAsync = async (locator: Locator, minimumSize: number) => {
  const dimensions = await locator.evaluate((element) => ({
    width: (element as HTMLElement).offsetWidth,
    height: (element as HTMLElement).offsetHeight,
  }));
  expect(dimensions.width).toBeGreaterThanOrEqual(minimumSize);
  expect(dimensions.height).toBeGreaterThanOrEqual(minimumSize);
};

const readGridLayoutAsync = async (locator: Locator) => {
  const [x, y, width, height] = await Promise.all([
    locator.getAttribute("data-grid-x"),
    locator.getAttribute("data-grid-y"),
    locator.getAttribute("data-grid-w"),
    locator.getAttribute("data-grid-h"),
  ]);

  expect(x).not.toBeNull();
  expect(y).not.toBeNull();
  expect(width).not.toBeNull();
  expect(height).not.toBeNull();

  return {
    x: Number(x),
    y: Number(y),
    width: Number(width),
    height: Number(height),
  };
};

const gridLayoutsOverlap = (
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
) =>
  first.x < second.x + second.width &&
  first.x + first.width > second.x &&
  first.y < second.y + second.height &&
  first.y + first.height > second.y;
