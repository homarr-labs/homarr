import { mkdir } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { chromium, expect } from "@playwright/test";
import type { Locator, Page, Request, Response } from "@playwright/test";
import { createId } from "@paralleldrive/cuid2";
import { stringify as stringifySuperJSON } from "superjson";
import { describe, test } from "vitest";

import { LOGICAL_GRID_CELL_SIZE, LOGICAL_GRID_GAP } from "../apps/nextjs/src/components/board/layout/constants";
import * as sqliteSchema from "../packages/db/schema/sqlite";
import { createHomarrContainer } from "./shared/create-homarr-container";
import { createSqliteDbFileAsync } from "./shared/e2e-db";
import type { SqliteDatabase } from "./shared/e2e-db";
import { seedAdminUserAsync } from "./shared/seed-admin-user";

const adminCredentials = {
  username: "admin",
  password: "Comp(exP4sswOrd",
};

const gridRuntimeMarker = "homarr-dnd-kit-v1";
const dndKitPayloadMarker = "dnd-kit-description";
const logicalCellSize = LOGICAL_GRID_CELL_SIZE;
const logicalCellPitch = LOGICAL_GRID_CELL_SIZE + LOGICAL_GRID_GAP;

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

      const canvas = page.locator('[data-testid="board-canvas"][data-board-hydrated="true"]');
      await expect(canvas).toHaveAttribute("data-board-hydrated", "true");
      const normalCanvasScale = await readCanvasScaleAsync(canvas);
      await expect(page.locator(`[data-grid-runtime="${gridRuntimeMarker}"]`)).toHaveCount(0);

      const mainSection = page.locator(`[data-section-id="${fixture.sectionId}"]`);
      const rail = page.getByRole("complementary", { name: "Left dashboard rail" });
      const railRootSection = rail.locator(`[data-section-id="${fixture.railSectionId}"][data-section-kind="empty"]`);
      const railItem = page.locator(`[data-grid-item-id="${fixture.railItemId}"]`);
      const containerSection = page.locator(`[data-grid-item-id="${fixture.containerSectionId}"]`);
      const nestedItem = page.locator(`[data-grid-item-id="${fixture.nestedItemId}"]`);
      const belowItem = page.locator(`[data-grid-item-id="${fixture.belowItemId}"]`);
      await expect(mainSection).toHaveAttribute("data-section-kind", "empty");
      await expect(mainSection).toHaveAttribute("data-rail-placement", "main");
      await expect(rail).toBeVisible();
      await expect(rail).toHaveAttribute("data-board-gutter", "left");
      await expect(railRootSection).toHaveAttribute("data-rail-placement", "left");
      await expect(railItem).toHaveAttribute("data-grid-x", "0");
      await expect(containerSection).toHaveAttribute("data-grid-w", "2");
      await expect(containerSection).toHaveAttribute("data-grid-h", "2");
      const containerLabel = containerSection.locator("[data-board-container-label]");
      await expect(containerLabel).toHaveText("Nested box");
      await expect(containerLabel).toHaveCSS("border-top-left-radius", "4px");
      const expandedContainerBox = await expectBoundingBoxAsync(containerSection);
      const expandedContainerLabelBox = await expectBoundingBoxAsync(containerLabel);
      expect(Math.abs(expandedContainerLabelBox.x - expandedContainerBox.x)).toBeLessThanOrEqual(3);
      expect(Math.abs(expandedContainerLabelBox.width - expandedContainerBox.width)).toBeLessThanOrEqual(3);
      const openContainerApps = containerSection.getByRole("button", {
        name: "Open all apps in Nested box in tabs",
        exact: true,
      });
      const expandedOpenContainerAppsBox = await expectBoundingBoxAsync(openContainerApps);
      expect(
        expandedContainerLabelBox.x +
          expandedContainerLabelBox.width -
          expandedOpenContainerAppsBox.x -
          expandedOpenContainerAppsBox.width,
      ).toBeCloseTo(8 * normalCanvasScale, 1);
      await expect(nestedItem).toHaveAttribute("data-grid-x", "0");
      await expect(belowItem).toHaveAttribute("data-grid-y", "2");
      const containerLabelBox = await expectBoundingBoxAsync(containerLabel);
      const nestedItemBox = await expectBoundingBoxAsync(nestedItem.locator("[data-grid-item-content]"));
      expect(containerLabelBox.y + containerLabelBox.height).toBeLessThanOrEqual(nestedItemBox.y + 0.5);

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
      await expect(logicalTile).toHaveCSS("overflow-x", "hidden");
      await expect(logicalTile).toHaveCSS("overflow-y", "auto");
      await page.addStyleTag({ content: ".e2e-widget-overflow { overflow: visible; }" });
      await expect(secondItem.locator("[data-grid-item-content]")).toHaveCSS("overflow", "visible");
      await expect(canvas).toHaveAttribute("data-canvas-overflow", "false");
      await expectDocumentNotHorizontallyScrollableAsync(page);
      const nestedAppLink = nestedItem.locator('a[href="#board-app-opened"]');
      await expect(nestedAppLink).toBeVisible();
      await nestedAppLink.click();
      await expect(page).toHaveURL(/#board-app-opened$/);
      await page.evaluate(() => history.replaceState(null, "", `${location.pathname}${location.search}`));
      const normalZoomTileBox = await expectBoundingBoxAsync(logicalTile);
      const secondItemBox = await expectBoundingBoxAsync(secondItem);
      expect(secondItemBox.x - (normalZoomTileBox.x + normalZoomTileBox.width)).toBeCloseTo(
        (logicalCellPitch - logicalCellSize) * normalCanvasScale,
        1,
      );

      const editToggle = page.getByTestId("board-edit-mode-toggle");
      await runtimeResources.waitForQuietAsync();
      expect(runtimeResources.urlsFor("read-only", "runtime-marker")).toEqual([]);
      expect(runtimeResources.urlsFor("read-only", "dnd-kit")).toEqual([]);
      expect(await readLayoutShiftScoreAsync(page)).toBeLessThan(0.01);

      await resetLayoutShiftScoreAsync(page);
      await releaseIdleCallbacksAsync(page);
      await expect(editToggle).toHaveAttribute("data-board-editor-preload-state", "ready", {
        timeout: 15_000,
      });
      await runtimeResources.waitForQuietAsync();
      expect(runtimeResources.urlsFor("read-only", "runtime-marker").length).toBeGreaterThan(0);
      expect(runtimeResources.urlsFor("read-only", "dnd-kit").length).toBeGreaterThan(0);
      expect(await readLayoutShiftScoreAsync(page)).toBeLessThan(0.01);

      // CSS zoom exercises Chromium's browser-zoom layout path without relying
      // on desktop browser chrome. The board must keep fitting without adding
      // horizontal scrolling at any effective zoom.
      await setDocumentZoomAsync(page, 2);
      const zoomedCanvasScale = await readCanvasScaleAsync(canvas);
      expect(zoomedCanvasScale).toBeLessThan(normalCanvasScale);
      await expect(canvas).toHaveAttribute("data-canvas-overflow", "false");
      await expectFixedLogicalTileAsync(logicalTile);
      await expectUniformVisualScaleAsync(logicalTile);
      await expect(canvas).toHaveCSS("overflow-x", "clip");
      await expectDocumentNotHorizontallyScrollableAsync(page);
      const overflowRailY = (await expectBoundingBoxAsync(rail)).y;
      await page.evaluate(() => window.scrollTo({ top: 300, behavior: "auto" }));
      await expect.poll(async () => (await expectBoundingBoxAsync(rail)).y).toBeGreaterThanOrEqual(0);
      expect((await expectBoundingBoxAsync(rail)).y).toBeLessThanOrEqual(overflowRailY);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
      await setDocumentZoomAsync(page, 1);
      await expect(canvas).toHaveAttribute("data-canvas-overflow", "false");

      const collapseContainer = page.getByRole("button", {
        name: "Collapse: Nested box",
        exact: true,
      });
      await nestedItem.evaluate((element) => {
        element.setAttribute("data-e2e-preserved-through-collapse", "true");
      });
      await collapseContainer.click();
      await expect(containerSection).toHaveAttribute("data-grid-h", "0.5");
      await expect(belowItem).toHaveAttribute("data-grid-y", "0.5");
      await expect(nestedItem).toBeHidden();
      await expect(nestedItem).toHaveAttribute("data-e2e-preserved-through-collapse", "true");
      await expect(containerSection.locator("[data-collapsed='true']")).toHaveAttribute("inert", "");
      const collapsedControl = containerSection.getByRole("button", { name: "Expand: Nested box", exact: true });
      await expect(collapsedControl).toBeVisible();
      await expect(collapsedControl).toHaveAttribute("data-board-container-collapsed-control", "true");
      const expectedCollapsedHeight = (logicalCellPitch * 0.5 - LOGICAL_GRID_GAP) * normalCanvasScale;
      await expect
        .poll(async () => (await expectBoundingBoxAsync(containerSection)).height)
        .toBeCloseTo(expectedCollapsedHeight, 1);
      const collapsedContainerBox = await expectBoundingBoxAsync(containerSection);
      const collapsedControlBox = await expectBoundingBoxAsync(collapsedControl);
      const collapsedOpenContainerAppsBox = await expectBoundingBoxAsync(openContainerApps);
      expect(Math.abs(collapsedControlBox.x - collapsedContainerBox.x)).toBeLessThanOrEqual(3);
      expect(Math.abs(collapsedControlBox.y - collapsedContainerBox.y)).toBeLessThanOrEqual(3);
      expect(Math.abs(collapsedControlBox.width - collapsedContainerBox.width)).toBeLessThanOrEqual(3);
      expect(Math.abs(collapsedControlBox.height - collapsedContainerBox.height)).toBeLessThanOrEqual(3);
      expect(
        collapsedControlBox.x +
          collapsedControlBox.width -
          collapsedOpenContainerAppsBox.x -
          collapsedOpenContainerAppsBox.width,
      ).toBeCloseTo(8 * normalCanvasScale, 1);

      await page
        .getByRole("button", {
          name: "Expand: Nested box",
          exact: true,
        })
        .click();
      await expect(containerSection).toHaveAttribute("data-grid-h", "2");
      await expect(belowItem).toHaveAttribute("data-grid-y", "2");
      await expect(nestedItem).toBeVisible();
      await expect(nestedItem).toHaveAttribute("data-e2e-preserved-through-collapse", "true");
      await captureBoardScreenshotAsync(canvas, screenshotDirectory, "board-grid-read-only.png");

      const viewMainSectionBox = await expectBoundingBoxAsync(mainSection);
      const viewFirstItemBox = await expectBoundingBoxAsync(logicalTile);
      runtimeResources.enterEditMode();
      await editToggle.click();
      await expect(page.locator(`[data-grid-runtime="${gridRuntimeMarker}"]`)).toHaveCount(3);
      await expect(page.getByTestId("board-grid-editor-loading")).toHaveCount(0);
      await expect(page.getByTestId("board-canvas-row-count-button")).toHaveCount(0);
      await expect(rail).toHaveAttribute("data-board-editing", "true");
      await expect(rail).toHaveCSS("position", "sticky");
      await expect(rail).toHaveCSS("transform", "none");
      const railBox = await expectBoundingBoxAsync(rail);
      expect(railBox.height + railBox.y).toBeCloseTo(page.viewportSize()?.height ?? 0, 0);
      expect(await rail.evaluate((element) => getComputedStyle(element, "::before").content.replaceAll('"', ""))).toBe(
        "Left dashboard rail",
      );
      await expect(logicalTile).toHaveCSS("overflow-x", "hidden");
      await expect(logicalTile).toHaveCSS("overflow-y", "auto");
      await logicalTile.evaluate((element) => {
        const overflowFixture = document.createElement("div");
        overflowFixture.dataset.e2eWidgetOverflowFixture = "true";
        overflowFixture.style.width = "800px";
        overflowFixture.style.minWidth = "800px";
        overflowFixture.style.height = "800px";
        overflowFixture.style.minHeight = "800px";
        overflowFixture.style.flex = "0 0 800px";
        element.appendChild(overflowFixture);
      });
      await expect
        .poll(async () => await logicalTile.evaluate((element) => element.scrollWidth - element.clientWidth))
        .toBeGreaterThan(0);
      await expect
        .poll(async () => await logicalTile.evaluate((element) => element.scrollHeight - element.clientHeight))
        .toBeGreaterThan(0);
      await logicalTile.evaluate((element) => {
        element.scrollTop = 100;
      });
      await expect.poll(async () => await logicalTile.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      await expectDocumentNotHorizontallyScrollableAsync(page);
      await logicalTile.locator('[data-e2e-widget-overflow-fixture="true"]').evaluate((element) => element.remove());
      await expectBoundingBoxToMatchAsync(mainSection, viewMainSectionBox);
      await expectBoundingBoxToMatchAsync(logicalTile, viewFirstItemBox);
      await runtimeResources.waitForQuietAsync();
      expect(runtimeResources.urlsFor("edit", "runtime-marker")).toEqual([]);
      expect(runtimeResources.urlsFor("edit", "dnd-kit")).toEqual([]);
      runtimeResources.stop();

      await expect(mainSection).toHaveAttribute("role", "region");
      await expect(mainSection).toHaveAttribute("data-grid-editable", "true");
      await expect(firstItem).toHaveClass(/\bboard-grid-entry\b/);
      const firstKeyboardEntry = firstItem.locator(`[data-grid-id="${fixture.firstItemId}"]`);
      await expect(firstKeyboardEntry).toHaveAttribute("role", "group");
      await expect(firstKeyboardEntry).not.toHaveAttribute("aria-pressed");
      await expect(firstKeyboardEntry).not.toHaveAttribute("aria-grabbed");
      await expectTargetSizeAsync(firstItem);
      await expect(firstItem.getByTestId("board-grid-drag-affordance")).toHaveCount(0);
      const firstResizeHandles = firstItem.locator(":scope > [data-grid-resize-handle]");
      await expect(firstResizeHandles).toHaveCount(8);
      expect(
        await firstResizeHandles.evaluateAll((handles) =>
          handles.map((handle) => handle.getAttribute("data-grid-resize-handle")),
        ),
      ).toEqual(["n", "ne", "e", "se", "s", "sw", "w", "nw"]);
      expect(
        await firstResizeHandles.evaluateAll((handles) =>
          handles.every((handle) => handle.getAttribute("aria-hidden") === "true" && handle.tabIndex === -1),
        ),
      ).toBe(true);
      await expectTargetSizeAsync(firstResizeHandles.first());
      const southEastResizeHandle = firstItem.locator(':scope > [data-grid-resize-handle="se"]');
      await expectLogicalTargetSizeAsync(southEastResizeHandle, 44);
      await expect(southEastResizeHandle).toHaveCSS("transform", "none");
      const firstEastHandleBox = await expectBoundingBoxAsync(
        firstItem.locator(':scope > [data-grid-resize-handle="e"]'),
      );
      const secondWestHandleBox = await expectBoundingBoxAsync(
        secondItem.locator(':scope > [data-grid-resize-handle="w"]'),
      );
      const firstSouthEastHandleBox = await expectBoundingBoxAsync(
        firstItem.locator(':scope > [data-grid-resize-handle="se"]'),
      );
      const secondSouthWestHandleBox = await expectBoundingBoxAsync(
        secondItem.locator(':scope > [data-grid-resize-handle="sw"]'),
      );
      expect(firstEastHandleBox.x + firstEastHandleBox.width).toBeLessThanOrEqual(secondWestHandleBox.x + 0.5);
      expect(firstSouthEastHandleBox.x + firstSouthEastHandleBox.width).toBeLessThanOrEqual(
        secondSouthWestHandleBox.x + 0.5,
      );
      const inertContent = firstItem.locator("[data-board-grid-inert-content]");
      await expect(inertContent).toHaveAttribute("inert", "");
      await expect(inertContent).toHaveCSS("pointer-events", "none");

      await page.getByRole("button", { name: "Add board content" }).click();
      await expect(page.getByRole("menuitem", { name: "New container", exact: true })).toBeVisible();
      await expect(page.getByRole("menuitem", { name: "New category", exact: true })).toHaveCount(0);
      await page.getByRole("menuitem", { name: "New item", exact: true }).click();
      const itemSelectDialog = page.getByRole("dialog", { name: "Choose item to add" });
      await expect(itemSelectDialog).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(itemSelectDialog).toHaveCount(0);

      const mainGrid = page.locator(`[data-grid-section-id="${fixture.sectionId}"]`);
      const editorViewport = page.viewportSize();
      if (!editorViewport) throw new Error("Expected a browser viewport");
      expect((await expectBoundingBoxAsync(mainGrid)).height).toBeGreaterThanOrEqual(editorViewport.height - 1);
      const interactionSnapshot = await readEditorGridSnapshotAsync(mainGrid);
      await expectGridGrowsAtBoundaryAsync(page, canvas, mainGrid, firstItem);
      await firstItem.locator("[data-grid-item-content]").evaluate((element) => {
        const iframe = document.createElement("iframe");
        iframe.dataset.e2eDragIframe = "true";
        iframe.src = "about:blank";
        iframe.style.width = "1px";
        iframe.style.height = "1px";
        iframe.style.pointerEvents = "none";
        element.appendChild(iframe);
      });
      const responsiveScale = await readCanvasScaleAsync(canvas);
      const responsiveDragBox = await expectBoundingBoxAsync(firstItem);
      const responsiveStartX = responsiveDragBox.x + responsiveDragBox.width * 0.7;
      const responsiveStartY = responsiveDragBox.y + responsiveDragBox.height * 0.4;
      await page.mouse.move(responsiveStartX, responsiveStartY);
      await page.mouse.down();
      await page.mouse.move(responsiveStartX + logicalCellPitch * responsiveScale, responsiveStartY, { steps: 8 });
      await expect(firstItem).toHaveAttribute("data-dnd-drag-source", "true");
      await expect(page.locator('iframe[data-e2e-drag-iframe="true"]')).toHaveCount(1);
      await page.setViewportSize({ width: 1000, height: 1200 });
      await expect(page.locator(`[data-grid-runtime="${gridRuntimeMarker}"]`)).toHaveCount(2);
      await expect(page.locator("body")).not.toHaveAttribute("data-board-grid-interacting");
      await expect(firstItem).not.toHaveAttribute("data-dnd-drag-source");
      await page.mouse.up();
      await page
        .locator('iframe[data-e2e-drag-iframe="true"]')
        .evaluateAll((elements) => elements.forEach((element) => element.remove()));

      await page.setViewportSize({ width: 600, height: 1200 });
      await expect(canvas).toHaveAttribute("data-canvas-overflow", "false");
      await expectNoHorizontalOverflowAsync(canvas);
      await expectDocumentNotHorizontallyScrollableAsync(page);
      for (const direction of ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const) {
        await expectTargetSizeAsync(firstItem.locator(`:scope > [data-grid-resize-handle="${direction}"]`));
      }

      await page.setViewportSize({ width: 1920, height: 1200 });
      await expect(page.locator(`[data-grid-runtime="${gridRuntimeMarker}"]`)).toHaveCount(3);
      await expect(canvas).toHaveAttribute("data-canvas-overflow", "false");
      await expectDocumentNotHorizontallyScrollableAsync(page);
      await expect.poll(async () => await readEditorGridSnapshotAsync(mainGrid)).toEqual(interactionSnapshot);

      const settingsButton = firstItem.getByRole("button", { name: /^Settings for / });
      await firstItem.hover();
      const widgetHeader = firstItem.locator("[data-board-widget-header]");
      await expect(widgetHeader).toBeVisible();
      const settingsBox = await expectBoundingBoxAsync(settingsButton);
      const widgetHeaderBox = await expectBoundingBoxAsync(widgetHeader);
      const firstItemBox = await expectBoundingBoxAsync(firstItem);
      expect(settingsBox.y).toBeGreaterThanOrEqual(firstItemBox.y);
      expect(settingsBox.y + settingsBox.height).toBeLessThanOrEqual(firstItemBox.y + firstItemBox.height);
      expect(settingsBox.y).toBeLessThan(widgetHeaderBox.y + widgetHeaderBox.height);
      expect(settingsBox.y + settingsBox.height).toBeGreaterThan(widgetHeaderBox.y);
      await expect(settingsButton).toHaveCSS("border-radius", "4px");
      await page.mouse.move(settingsBox.x + settingsBox.width / 2, settingsBox.y + settingsBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(settingsBox.x + settingsBox.width / 2 + 8, settingsBox.y + settingsBox.height / 2 + 8);
      await expect(firstItem).not.toHaveAttribute("data-dnd-drag-source");
      await page.mouse.up();
      await page.keyboard.press("Escape");
      await expect.poll(async () => await readEditorGridSnapshotAsync(mainGrid)).toEqual(interactionSnapshot);

      const railBoxBeforeMainDrag = await expectBoundingBoxAsync(rail);
      const canvasScale = await readCanvasScaleAsync(canvas);
      await dragLocatorByFromOffsetAsync(page, firstItem, {
        deltaX: logicalCellPitch * canvasScale,
        deltaY: 0,
        startXRatio: 0.78,
        startYRatio: 0.31,
      });
      await expect(firstItem).toHaveAttribute("data-grid-x", "1");
      await expect(secondItem).toHaveAttribute("data-grid-x", "0");

      await dragLocatorByTouchAsync(page, firstItem, 0, logicalCellPitch * canvasScale);
      await expect(firstItem).toHaveAttribute("data-grid-y", "1");
      await dragLocatorByTouchAsync(page, firstItem, 0, -logicalCellPitch * canvasScale);
      await expect(firstItem).toHaveAttribute("data-grid-y", "0");

      await expectGridEntryGeometrySettledAsync(firstItem);
      await dragLocatorByImmediateReleaseAsync(page, firstItem, 0, logicalCellPitch * canvasScale);
      await expect(firstItem).toHaveAttribute("data-grid-y", "1");
      await expectGridEntryGeometrySettledAsync(firstItem);
      await dragLocatorByImmediateReleaseAsync(page, firstItem, 0, -logicalCellPitch * canvasScale);
      await expect(firstItem).toHaveAttribute("data-grid-y", "0");
      await expectGridEntryGeometrySettledAsync(firstItem);

      await expectCancelledDragRestoresSnapshotAsync(page, mainGrid, firstItem, 0, logicalCellPitch * canvasScale * 2);
      await expectInvalidDropRestoresSnapshotAsync(page, mainGrid, firstItem);
      await expectImmediateOutsideReleaseRestoresSnapshotAsync(page, mainGrid, firstItem);

      await dragLocatorByAsync(page, firstItem, logicalCellPitch * canvasScale * 3, 0);
      await expect(firstItem).toHaveAttribute("data-grid-x", "4");
      expect(gridLayoutsOverlap(await readGridLayoutAsync(firstItem), await readGridLayoutAsync(secondItem))).toBe(
        false,
      );

      const railBoxAfterMainDrag = await expectBoundingBoxAsync(rail);
      expect(railBoxAfterMainDrag.x).toBeCloseTo(railBoxBeforeMainDrag.x, 1);
      expect(railBoxAfterMainDrag.width).toBeCloseTo(railBoxBeforeMainDrag.width, 1);
      await expect(railItem.locator("xpath=ancestor::aside[1]")).toHaveAttribute("aria-label", "Left dashboard rail");

      const oversizedKeyboardEntry = getKeyboardEditorEntry(belowItem);
      await oversizedKeyboardEntry.focus();
      await oversizedKeyboardEntry.press("Enter");
      await oversizedKeyboardEntry.press("Shift+ArrowRight");
      await oversizedKeyboardEntry.press("Escape");
      await expect(belowItem).toHaveAttribute("data-grid-w", "3");
      const nestedEditor = containerSection.locator(`[data-grid-section-id="${fixture.containerSectionId}"]`);
      const nestedGridBox = await expectBoundingBoxAsync(nestedEditor);
      await expectInvalidNestedDropRestoresSnapshotAsync(
        page,
        mainGrid,
        nestedEditor,
        belowItem,
        nestedGridBox.x + nestedGridBox.width / 2,
        nestedGridBox.y + logicalCellSize * canvasScale * 0.5,
      );
      await expect(belowItem.locator("xpath=ancestor::*[@data-grid-section-id][1]")).toHaveAttribute(
        "data-grid-section-id",
        fixture.sectionId,
      );
      await oversizedKeyboardEntry.focus();
      await oversizedKeyboardEntry.press("Enter");
      await oversizedKeyboardEntry.press("Shift+ArrowLeft");
      await oversizedKeyboardEntry.press("Escape");
      await expect(belowItem).toHaveAttribute("data-grid-w", "2");
      await oversizedKeyboardEntry.focus();
      await oversizedKeyboardEntry.press("Enter");
      await oversizedKeyboardEntry.press("Shift+ArrowDown");
      await oversizedKeyboardEntry.press("Shift+ArrowDown");
      await oversizedKeyboardEntry.press("Escape");
      await expect(belowItem).toHaveAttribute("data-grid-h", "3");
      await expectInvalidNestedDropRestoresSnapshotAsync(
        page,
        mainGrid,
        nestedEditor,
        belowItem,
        nestedGridBox.x + nestedGridBox.width / 2,
        nestedGridBox.y + logicalCellSize * canvasScale * 0.5,
      );
      await oversizedKeyboardEntry.focus();
      await oversizedKeyboardEntry.press("Enter");
      await oversizedKeyboardEntry.press("Shift+ArrowUp");
      await oversizedKeyboardEntry.press("Shift+ArrowUp");
      await oversizedKeyboardEntry.press("Escape");
      await expect(belowItem).toHaveAttribute("data-grid-h", "1");

      const secondItemContent = secondItem.locator("[data-grid-item-content]");
      await expect(secondItemContent).toHaveCount(1);
      await secondItemContent.evaluate((element) => {
        element.setAttribute("data-e2e-portal-instance", "second-item-content");
      });

      await dragLocatorToImmediateReleaseAsync(
        page,
        secondItem,
        nestedGridBox.x + logicalCellPitch * canvasScale * 1.5,
        nestedGridBox.y + logicalCellSize * canvasScale * 0.5,
      );
      await expect(secondItem.locator("xpath=ancestor::*[@data-grid-section-id][1]")).toHaveAttribute(
        "data-grid-section-id",
        fixture.containerSectionId,
      );
      await expect(
        secondItem.locator('[data-grid-item-content][data-e2e-portal-instance="second-item-content"]'),
      ).toBeVisible();

      const packedSecondKeyboardEntry = getKeyboardEditorEntry(secondItem);
      await packedSecondKeyboardEntry.focus();
      await packedSecondKeyboardEntry.press("Enter");
      await packedSecondKeyboardEntry.press("Shift+ArrowDown");
      await packedSecondKeyboardEntry.press("Escape");
      await expect(secondItem).toHaveAttribute("data-grid-h", "2");

      const packedSecondBox = await expectBoundingBoxAsync(secondItem);
      const initialMainGridBox = await expectBoundingBoxAsync(mainGrid);
      await page.mouse.move(
        packedSecondBox.x + packedSecondBox.width / 2,
        packedSecondBox.y + packedSecondBox.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(nestedGridBox.x + 1, packedSecondBox.y + packedSecondBox.height / 2, { steps: 8 });
      await expect(mainGrid).toHaveAttribute("data-dnd-drop-target", "true");
      await expect(nestedEditor).toHaveAttribute("data-dnd-drop-target", "false");
      await page.mouse.move(
        initialMainGridBox.x + logicalCellSize * canvasScale * 0.5,
        initialMainGridBox.y + logicalCellSize * canvasScale * 0.5,
        { steps: 8 },
      );
      await page.mouse.up();
      await expect(secondItem.locator("xpath=ancestor::*[@data-grid-section-id][1]")).toHaveAttribute(
        "data-grid-section-id",
        fixture.sectionId,
      );
      await dragLocatorToImmediateReleaseAsync(
        page,
        secondItem,
        nestedGridBox.x + logicalCellPitch * canvasScale * 1.5,
        nestedGridBox.y + logicalCellSize * canvasScale * 0.5,
      );
      await expect(secondItem.locator("xpath=ancestor::*[@data-grid-section-id][1]")).toHaveAttribute(
        "data-grid-section-id",
        fixture.containerSectionId,
      );

      const nestedSouthResizeHandle = nestedItem.locator(':scope > [data-grid-resize-handle="s"]');
      await expect(containerSection).toHaveAttribute("data-grid-section-chrome-active", "false");
      await expect(nestedSouthResizeHandle).not.toHaveAttribute("data-grid-resize-disabled");
      await dragLocatorByAsync(page, nestedSouthResizeHandle, 0, -logicalCellPitch * canvasScale);
      await expect(nestedItem).toHaveAttribute("data-grid-h", "1");
      await expect(containerSection).toHaveAttribute("data-grid-h", "2");
      const packedNestedKeyboardEntry = getKeyboardEditorEntry(nestedItem);
      await packedNestedKeyboardEntry.focus();
      await packedNestedKeyboardEntry.press("Enter");
      await packedNestedKeyboardEntry.press("Shift+ArrowDown");
      await packedNestedKeyboardEntry.press("Escape");
      await expect(nestedItem).toHaveAttribute("data-grid-h", "2");

      await nestedItem.locator("[data-grid-item-content]").evaluate((element) => {
        element.setAttribute("data-e2e-container-child", "nested-item-content");
      });
      const containerGrip = containerSection.locator("[data-grid-container-drag-handle]");
      await expectTargetSizeAsync(containerGrip);
      const railEditor = rail.locator("[data-grid-section-id]").first();
      const railGridBox = await expectBoundingBoxAsync(railEditor);
      await dragHandleToGridPositionAsync(page, containerGrip, containerSection, railEditor, 0, 0, canvasScale);
      await expect(containerSection.locator("xpath=ancestor::aside[1]")).toHaveAttribute("data-board-gutter", "left");
      await expect(secondItem.locator("xpath=ancestor::*[@data-grid-section-id][1]")).toHaveAttribute(
        "data-grid-section-id",
        fixture.containerSectionId,
      );
      await expect(
        nestedItem.locator('[data-grid-item-content][data-e2e-container-child="nested-item-content"]'),
      ).toBeVisible();

      await Promise.all([
        page.waitForResponse(
          (response) => response.url().includes("/api/trpc/board.saveBoard") && response.status() === 200,
        ),
        editToggle.click(),
      ]);
      await expect(page.locator(`[data-grid-runtime="${gridRuntimeMarker}"]`)).toHaveCount(0);
      await page.reload();
      await expect(canvas).toHaveAttribute("data-board-hydrated", "true");
      await expect(secondItem).toHaveCount(1);
      const reloadedSecondItemGrid = secondItem.locator("xpath=ancestor::*[@data-grid-section-id][1]");
      await expect(reloadedSecondItemGrid).toHaveCount(1);
      await expect(reloadedSecondItemGrid).toHaveAttribute("data-grid-section-id", fixture.containerSectionId);
      await expect(containerSection.locator("xpath=ancestor::aside[1]")).toHaveAttribute("data-board-gutter", "left");
      await editToggle.click();
      await expect(page.locator(`[data-grid-runtime="${gridRuntimeMarker}"]`)).toHaveCount(3);
      await dragHandleToGridPositionAsync(page, containerGrip, containerSection, mainGrid, 2, 0, canvasScale);
      await expect(containerSection.locator("xpath=ancestor::*[@data-grid-section-id][1]")).toHaveAttribute(
        "data-grid-section-id",
        fixture.sectionId,
      );
      await expect(containerSection).toHaveAttribute("data-grid-x", "2");
      const containerKeyboardEntry = getKeyboardEditorEntry(containerSection);
      await containerKeyboardEntry.focus();
      await containerKeyboardEntry.press("Enter");
      await expect(containerKeyboardEntry).toHaveAttribute("data-keyboard-editing", "true");
      await getKeyboardEditorEntry(nestedItem).focus();
      await expect(containerKeyboardEntry).toHaveAttribute("data-keyboard-editing", "false");
      await secondItem.locator("[data-grid-item-content]").evaluate((element) => {
        element.setAttribute("data-e2e-portal-instance", "second-item-content");
      });
      const mainGridBox = await expectBoundingBoxAsync(mainGrid);
      await dragLocatorToAsync(
        page,
        secondItem,
        mainGridBox.x + logicalCellSize * canvasScale * 0.5,
        mainGridBox.y + logicalCellSize * canvasScale * 0.5,
      );
      await expect(secondItem.locator("xpath=ancestor::*[@data-grid-section-id][1]")).toHaveAttribute(
        "data-grid-section-id",
        fixture.sectionId,
      );
      await expect(
        secondItem.locator('[data-grid-item-content][data-e2e-portal-instance="second-item-content"]'),
      ).toBeVisible();

      await expect(containerSection).toHaveAttribute("data-grid-section-chrome-active", "false");
      await expect(nestedSouthResizeHandle).not.toHaveAttribute("data-grid-resize-disabled");
      await dragLocatorByAsync(page, nestedSouthResizeHandle, 0, -logicalCellPitch * canvasScale);
      await expect(nestedItem).toHaveAttribute("data-grid-h", "1");
      await expect(containerSection).toHaveAttribute("data-grid-h", "2");
      await containerGrip.click();
      await expect(containerSection).toHaveAttribute("data-grid-section-chrome-active", "true");

      await dragLocatorToAsync(
        page,
        secondItem,
        railGridBox.x + logicalCellPitch * canvasScale * 1.5,
        railGridBox.y + logicalCellSize * canvasScale * 0.5,
      );
      await expect(secondItem.locator("xpath=ancestor::aside[1]")).toHaveAttribute("data-board-gutter", "left");
      await expect(
        secondItem.locator('[data-grid-item-content][data-e2e-portal-instance="second-item-content"]'),
      ).toBeVisible();
      await expect(secondItem).toHaveClass(/\bboard-grid-entry\b/);
      expect(pageErrors).toEqual([]);

      await moveEntryWithModalAsync(page, secondItem, /Dashboard canvas, destination \d+/);
      await expect(secondItem.locator("xpath=ancestor::*[@data-grid-section-id][1]")).toHaveAttribute(
        "data-grid-section-id",
        fixture.sectionId,
      );
      await expect(getKeyboardEditorEntry(secondItem)).toBeFocused();
      await moveEntryWithModalAsync(page, secondItem, /Left dashboard rail, destination \d+/);
      await expect(secondItem.locator("xpath=ancestor::aside[1]")).toHaveAttribute("data-board-gutter", "left");
      await expect(getKeyboardEditorEntry(secondItem)).toBeFocused();
      await expect(
        secondItem.locator('[data-grid-item-content][data-e2e-portal-instance="second-item-content"]'),
      ).toBeVisible();

      const railKeyboardEntry = getKeyboardEditorEntry(railItem);
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

      const eastResizeHandle = containerSection.locator(':scope > [data-grid-resize-handle="e"]');
      await expectTargetSizeAsync(eastResizeHandle);
      await expect(eastResizeHandle).not.toHaveAttribute("data-grid-resize-disabled");
      await railKeyboardEntry.focus();
      await railKeyboardEntry.press("Enter");
      const mixedInputSnapshot = await readEditorGridSnapshotAsync(mainGrid);
      const mixedInputRailSnapshot = await readEditorGridSnapshotAsync(railEditor);
      const mixedInputHandleBox = await expectBoundingBoxAsync(eastResizeHandle);
      await page.mouse.move(
        mixedInputHandleBox.x + mixedInputHandleBox.width / 2,
        mixedInputHandleBox.y + mixedInputHandleBox.height / 2,
      );
      await page.mouse.down();
      await expect(page.locator("body")).toHaveAttribute("data-board-grid-interacting", "resize");
      await railKeyboardEntry.press("ArrowLeft");
      await expect(railKeyboardEntry).toHaveAttribute("data-keyboard-editing", "false");
      await page.keyboard.press("Escape");
      await page.mouse.up();
      await expect.poll(async () => await readEditorGridSnapshotAsync(mainGrid)).toEqual(mixedInputSnapshot);
      await expect.poll(async () => await readEditorGridSnapshotAsync(railEditor)).toEqual(mixedInputRailSnapshot);
      await expectTouchResizeCancellationRestoresAsync(
        page,
        mainGrid,
        eastResizeHandle,
        -logicalCellPitch * canvasScale,
        0,
      );
      await expectGridEntryGeometrySettledAsync(containerSection);

      const eastResizeBox = await expectBoundingBoxAsync(eastResizeHandle);
      const eastResizeStart = {
        x: eastResizeBox.x + eastResizeBox.width / 2,
        y: eastResizeBox.y + eastResizeBox.height / 2,
      };
      await page.mouse.move(eastResizeStart.x, eastResizeStart.y);
      await page.mouse.down();
      await page.mouse.move(eastResizeStart.x - logicalCellPitch * canvasScale * 0.35, eastResizeStart.y, {
        steps: 6,
      });
      const resizeOutline = containerSection.locator(":scope > [data-grid-resize-outline]");
      const resizePlaceholder = mainGrid.locator(`[data-grid-placeholder-for="${fixture.containerSectionId}"]`);
      await expect(resizeOutline).toBeVisible();
      await expect(resizeOutline).toHaveAttribute("data-grid-resize-valid", "true");
      await expect(resizePlaceholder).toHaveAttribute("data-grid-placeholder-mode", "resize");
      await expect(resizePlaceholder).toHaveAttribute("data-grid-w", "2");
      await expect(containerSection).toHaveAttribute("data-grid-w", "2");
      const originalResizeWidth = (await expectBoundingBoxAsync(containerSection)).width;
      const continuousResizeWidth = (await expectBoundingBoxAsync(resizeOutline)).width;
      expect(continuousResizeWidth).toBeLessThan(originalResizeWidth);
      expect(continuousResizeWidth).toBeGreaterThan(logicalCellSize * canvasScale);

      await page.mouse.move(eastResizeStart.x - logicalCellPitch * canvasScale, eastResizeStart.y, { steps: 6 });
      await expect(containerSection).toHaveAttribute("data-grid-w", "1");
      await expect(resizePlaceholder).toHaveAttribute("data-grid-w", "1");
      expect((await expectBoundingBoxAsync(resizeOutline)).width).toBeCloseTo(logicalCellSize * canvasScale, 1);
      const liveContainerBox = await expectBoundingBoxAsync(containerSection);
      expect(liveContainerBox.width).toBeCloseTo(logicalCellSize * canvasScale, 1);
      await expect(containerSection.locator(":scope > .board-grid-content-mount")).toHaveCSS("overflow", "clip");
      await page.mouse.up();
      await expect(containerSection).toHaveAttribute("data-grid-w", "1");
      await expect(resizeOutline).toHaveCount(0);
      await expect(containerSection).toHaveAttribute("data-grid-section-chrome-active", "true");
      await expect(eastResizeHandle).not.toHaveAttribute("data-grid-resize-disabled");
      await resizeLocatorByImmediateReleaseAsync(page, eastResizeHandle, logicalCellPitch * canvasScale, 0);
      await expect(containerSection).toHaveAttribute("data-grid-w", "2");

      const northResizeHandle = containerSection.locator(':scope > [data-grid-resize-handle="n"]');
      await expectTargetSizeAsync(northResizeHandle);
      await dragLocatorByAsync(page, northResizeHandle, 0, logicalCellPitch * canvasScale);
      await expect(containerSection).toHaveAttribute("data-grid-y", "1");
      await expect(containerSection).toHaveAttribute("data-grid-h", "1");
      await expectGridEntryGeometrySettledAsync(containerSection);

      const minimumSectionBox = await expectBoundingBoxAsync(containerSection);
      const minimumHandleBox = await expectBoundingBoxAsync(northResizeHandle);
      const resizeStartX = minimumHandleBox.x + minimumHandleBox.width / 2;
      const resizeStartY = minimumHandleBox.y + minimumHandleBox.height / 2;
      await page.mouse.move(resizeStartX, resizeStartY);
      await page.mouse.down();
      await page.mouse.move(resizeStartX, resizeStartY + logicalCellPitch * canvasScale * 2, { steps: 12 });
      const constrainedSectionBox = await expectBoundingBoxAsync(containerSection);
      expect(Math.abs(constrainedSectionBox.height - minimumSectionBox.height)).toBeLessThan(1);
      expect(Math.abs(constrainedSectionBox.y - minimumSectionBox.y)).toBeLessThan(1);
      await page.mouse.up();
      await expect(containerSection).toHaveAttribute("data-grid-y", "1");
      await expect(containerSection).toHaveAttribute("data-grid-h", "1");

      await dragLocatorByAsync(page, northResizeHandle, 0, -logicalCellPitch * canvasScale);
      await expect(containerSection).toHaveAttribute("data-grid-y", "0");
      await expect(containerSection).toHaveAttribute("data-grid-h", "2");

      const southResizeHandle = containerSection.locator(':scope > [data-grid-resize-handle="s"]');
      const gridHeightBeforeSouthResize = (await expectBoundingBoxAsync(mainGrid)).height;
      const southResizeBox = await expectBoundingBoxAsync(southResizeHandle);
      const southResizeStart = {
        x: southResizeBox.x + southResizeBox.width / 2,
        y: southResizeBox.y + southResizeBox.height / 2,
      };
      await page.mouse.move(southResizeStart.x, southResizeStart.y);
      await page.mouse.down();
      await page.mouse.move(southResizeStart.x, southResizeStart.y + logicalCellPitch * canvasScale, { steps: 8 });
      await expect(containerSection).toHaveAttribute("data-grid-h", "3");
      await expect(belowItem).toHaveAttribute("data-grid-y", "3");
      await expect
        .poll(async () => (await expectBoundingBoxAsync(mainGrid)).height)
        .toBeGreaterThan(gridHeightBeforeSouthResize);
      await page.mouse.up();
      expect(
        gridLayoutsOverlap(await readGridLayoutAsync(containerSection), await readGridLayoutAsync(belowItem)),
      ).toBe(false);

      // Grow the canvas further to exercise sustained document auto-scroll.
      await dragLocatorByAsync(page, southResizeHandle, 0, logicalCellPitch * canvasScale * 6);
      await expect(containerSection).toHaveAttribute("data-grid-h", "9");
      await expect(belowItem).toHaveAttribute("data-grid-y", "9");

      await firstItem.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
      const autoScrollStartBox = await expectBoundingBoxAsync(firstItem);
      const autoScrollStart = {
        x: autoScrollStartBox.x + autoScrollStartBox.width * 0.63,
        y: autoScrollStartBox.y + autoScrollStartBox.height * 0.42,
      };
      const viewport = page.viewportSize();
      if (!viewport) throw new Error("Expected a browser viewport");
      const scrollBeforeDrag = await page.evaluate(() => window.scrollY);
      await page.mouse.move(autoScrollStart.x, autoScrollStart.y);
      await page.mouse.down();
      await page.mouse.move(autoScrollStart.x + 8, autoScrollStart.y);
      await expect(firstItem).toHaveAttribute("data-dnd-drag-source", "true");
      const autoScrollTarget = { x: autoScrollStart.x, y: viewport.height - 12 };
      await page.mouse.move(autoScrollTarget.x, autoScrollTarget.y, { steps: 3 });
      await expect.poll(async () => await page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBeforeDrag);
      const autoScrollPreview = await page.evaluate(
        ({ itemId, x, y }) => {
          const placeholder = document.querySelector<HTMLElement>(`[data-grid-placeholder-for="${itemId}"]`);
          const targetGrid = placeholder?.closest<HTMLElement>("[data-grid-section-id]");
          const preview = {
            row: placeholder?.dataset.gridY,
            revision: targetGrid?.dataset.dndPreviewRevision,
          };
          document.dispatchEvent(
            new PointerEvent("pointerup", {
              bubbles: true,
              pointerId: 1,
              pointerType: "mouse",
              isPrimary: true,
              button: 0,
              buttons: 0,
              clientX: x,
              clientY: y,
            }),
          );
          return preview;
        },
        { itemId: fixture.firstItemId, ...autoScrollTarget },
      );
      expect(autoScrollPreview.row).toBeDefined();
      expect(autoScrollPreview.revision).toBeDefined();
      await page.mouse.up();
      await expect(firstItem).toHaveAttribute("data-grid-y", autoScrollPreview.row ?? "missing");
      await expect(page.locator("body")).not.toHaveAttribute("data-board-grid-interacting");
      await expect(page.locator(`[data-grid-placeholder-for="${fixture.firstItemId}"]`)).toHaveCount(0);
      expect(Number(autoScrollPreview.row)).toBeGreaterThan(0);
      await firstItem.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
      const autoScrollKeyboardEntry = getKeyboardEditorEntry(firstItem);
      await autoScrollKeyboardEntry.focus();
      await autoScrollKeyboardEntry.press("Enter");
      for (let row = Number(autoScrollPreview.row); row > 0; row -= 1) {
        await autoScrollKeyboardEntry.press("ArrowUp");
      }
      await autoScrollKeyboardEntry.press("Escape");
      await expect(firstItem).toHaveAttribute("data-grid-y", "0");

      // The main canvas grows with its content instead of requiring a manual
      // row limit, and items can occupy empty rows below their original position.
      for (let targetRow = 1; targetRow <= 8; targetRow += 1) {
        await expectGridEntryGeometrySettledAsync(firstItem);
        await firstItem.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
        await dragLocatorByImmediateReleaseAsync(page, firstItem, 0, logicalCellPitch * canvasScale + 2);
        await expect(firstItem).toHaveAttribute("data-grid-y", String(targetRow));
      }
      await expect(firstItem).toHaveAttribute("data-grid-y", "8");
      await expect(firstItem).toHaveAttribute("data-grid-x", "4");
      expect(gridLayoutsOverlap(await readGridLayoutAsync(firstItem), await readGridLayoutAsync(belowItem))).toBe(
        false,
      );

      const stickyRailY = (await expectBoundingBoxAsync(rail)).y;
      await page.evaluate(() => window.scrollTo({ top: 500, behavior: "auto" }));
      await expect
        .poll(async () => {
          const y = (await expectBoundingBoxAsync(rail)).y;
          return y >= 0 && y <= stickyRailY + 0.5;
        })
        .toBe(true);
      const scrolledRailY = (await expectBoundingBoxAsync(rail)).y;
      await page.evaluate(() => window.scrollTo({ top: 600, behavior: "auto" }));
      await expect.poll(async () => (await expectBoundingBoxAsync(rail)).y).toBeCloseTo(scrolledRailY, 1);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));

      await setDocumentZoomAsync(page, 1.25);
      await expectFixedLogicalTileAsync(logicalTile);
      await expectUniformVisualScaleAsync(logicalTile);
      await expectTargetSizeAsync(firstItem);
      await expectTargetSizeAsync(firstItem.locator(':scope > [data-grid-resize-handle="se"]'));
      await firstItem.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
      const zoomedEastResizeHandle = firstItem.locator(':scope > [data-grid-resize-handle="e"]');
      const zoomedOneColumnScale = (await expectBoundingBoxAsync(firstItem)).width / logicalCellSize;
      await dragLocatorByAsync(page, zoomedEastResizeHandle, logicalCellPitch * zoomedOneColumnScale, 0);
      await expect(firstItem).toHaveAttribute("data-grid-w", "2");
      await expectGridEntryGeometrySettledAsync(firstItem);
      const zoomedTwoColumnScale =
        (await expectBoundingBoxAsync(firstItem)).width / (logicalCellSize * 2 + LOGICAL_GRID_GAP);
      await dragLocatorByAsync(page, zoomedEastResizeHandle, -logicalCellPitch * zoomedTwoColumnScale, 0);
      await expect(firstItem).toHaveAttribute("data-grid-w", "1");
      await expect(firstItem).toHaveAttribute("data-grid-x", "4");
      await expectGridEntryGeometrySettledAsync(firstItem);
      await expectImmediateOutsideReleaseRestoresSnapshotAsync(page, mainGrid, firstItem);
      await expectGridEntryGeometrySettledAsync(firstItem);
      const zoomedDragSourceBox = await expectBoundingBoxAsync(firstItem);
      await dragLocatorByImmediateReleaseAsync(
        page,
        firstItem,
        0,
        -logicalCellPitch * zoomedOneColumnScale,
        async () => {
          const overlayBox = await expectBoundingBoxAsync(page.locator(".board-grid-drag-overlay[data-dnd-dragging]"));
          const overlayCardBox = await expectBoundingBoxAsync(page.locator(".board-grid-drag-overlay-card"));
          expect(Math.abs(overlayBox.x - zoomedDragSourceBox.x)).toBeLessThan(1);
          expect(Math.abs(overlayBox.y - zoomedDragSourceBox.y)).toBeLessThan(1);
          expect(Math.abs(overlayBox.width - zoomedDragSourceBox.width)).toBeLessThan(1);
          expect(Math.abs(overlayBox.height - zoomedDragSourceBox.height)).toBeLessThan(1);
          expect(Math.abs(overlayCardBox.x - overlayBox.x)).toBeLessThan(1);
          expect(Math.abs(overlayCardBox.y - overlayBox.y)).toBeLessThan(1);
          expect(Math.abs(overlayCardBox.width - overlayBox.width)).toBeLessThan(1);
          expect(Math.abs(overlayCardBox.height - overlayBox.height)).toBeLessThan(1);
        },
      );
      await expect(firstItem).toHaveAttribute("data-grid-x", "4");
      await expect(firstItem).toHaveAttribute("data-grid-y", "7");
      await expectGridEntryGeometrySettledAsync(firstItem);
      await dragLocatorByImmediateReleaseAsync(page, firstItem, 0, logicalCellPitch * zoomedOneColumnScale);
      await expect(firstItem).toHaveAttribute("data-grid-x", "4");
      await expect(firstItem).toHaveAttribute("data-grid-y", "8");
      await expect(page.locator("body")).not.toHaveAttribute("data-board-grid-interacting");
      await setDocumentZoomAsync(page, 1);
      await captureBoardScreenshotAsync(canvas, screenshotDirectory, "board-grid-edit-mode.png");

      const containerLayoutBeforeDelete = await readGridLayoutAsync(containerSection);
      await containerSection.getByRole("button", { name: "Settings for Nested box" }).click();
      await page
        .getByRole("menuitem", {
          name: "Remove container",
          exact: true,
        })
        .click();
      await page
        .getByRole("dialog", {
          name: "Remove container",
        })
        .getByRole("button", {
          name: "Confirm",
          exact: true,
        })
        .click();

      await expect(containerSection).toHaveCount(0);
      await expect(nestedItem).toHaveCount(1);
      await expect(nestedItem.locator("xpath=ancestor::*[@data-grid-section-id][1]")).toHaveAttribute(
        "data-grid-section-id",
        fixture.sectionId,
      );
      await expect(nestedItem).toHaveAttribute("data-grid-x", String(containerLayoutBeforeDelete.x));
      await expect(nestedItem).toHaveAttribute("data-grid-y", String(containerLayoutBeforeDelete.y));

      await page.getByTestId("board-edit-mode-toggle").click();
      await expect(page.locator(`[data-grid-runtime="${gridRuntimeMarker}"]`)).toHaveCount(0);

      await page.reload();
      const reloadedCanvas = page.locator('[data-testid="board-canvas"][data-board-hydrated="true"]');
      const reloadedFirstItem = reloadedCanvas.locator(`[data-grid-item-id="${fixture.firstItemId}"]`);
      const reloadedSecondItem = reloadedCanvas.locator(`[data-grid-item-id="${fixture.secondItemId}"]`);
      const reloadedRailItem = reloadedCanvas.locator(`[data-grid-item-id="${fixture.railItemId}"]`);
      const reloadedContainerSection = reloadedCanvas.locator(`[data-grid-item-id="${fixture.containerSectionId}"]`);
      const reloadedNestedItem = reloadedCanvas.locator(`[data-grid-item-id="${fixture.nestedItemId}"]`);
      await expect(reloadedCanvas).toHaveCount(1);
      await expect(reloadedFirstItem).toHaveAttribute("data-grid-x", "4");
      await expect(reloadedFirstItem).toHaveAttribute("data-grid-y", "8");
      await expect(reloadedRailItem).toHaveAttribute("data-grid-x", "1");
      await expect(reloadedRailItem).toHaveAttribute("data-grid-w", "1");
      await expect(reloadedContainerSection).toHaveCount(0);
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
      const desktopLayoutGroup = page.getByRole("group", { name: "Desktop" });
      const gutterPreview = desktopLayoutGroup.getByLabel("Dashboard layout preview");
      await expect(gutterPreview).toBeVisible();
      const rightGutterSwitch = desktopLayoutGroup.getByRole("switch", { name: "Right sidebar" });
      await rightGutterSwitch.check();
      const rightGutterSlider = desktopLayoutGroup.getByRole("slider", { name: "Right sidebar width" });
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
  }, 300_000);
});

const seedBoardGridAsync = async (db: SqliteDatabase, creatorId: string) => {
  const boardId = createId();
  const boardName = "grid-e2e";
  const layoutId = createId();
  const compactLayoutId = createId();
  const sectionId = createId();
  const railSectionId = createId();
  const rightSectionId = createId();
  const containerSectionId = createId();
  const firstItemId = createId();
  const secondItemId = createId();
  const belowItemId = createId();
  const nestedItemId = createId();
  const railItemId = createId();
  const nestedAppId = createId();

  await db.insert(sqliteSchema.boards).values({
    id: boardId,
    name: boardName,
    creatorId,
    isPublic: true,
  });
  await db.insert(sqliteSchema.layouts).values([
    {
      id: layoutId,
      name: "Desktop",
      boardId,
      columnCount: 8,
      leftGutterColumnCount: 2,
      breakpoint: 1200,
    },
    {
      id: compactLayoutId,
      name: "Compact",
      boardId,
      columnCount: 4,
      breakpoint: 0,
    },
  ]);
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
      kind: "empty",
      xOffset: -1,
      yOffset: 0,
    },
    {
      id: rightSectionId,
      boardId,
      kind: "empty",
      xOffset: 1,
      yOffset: 0,
    },
    {
      id: containerSectionId,
      boardId,
      kind: "container",
      options: stringifySuperJSON({
        title: "Nested box",
        customCssClasses: [],
        borderColor: "",
        showLabel: true,
        collapsible: true,
        showOpenAll: true,
      }),
    },
  ]);
  await db.insert(sqliteSchema.sectionLayouts).values([
    {
      sectionId: containerSectionId,
      layoutId,
      parentSectionId: sectionId,
      xOffset: 2,
      yOffset: 0,
      width: 2,
      height: 2,
    },
    {
      sectionId: containerSectionId,
      layoutId: compactLayoutId,
      parentSectionId: sectionId,
      xOffset: 2,
      yOffset: 0,
      width: 2,
      height: 2,
    },
  ]);
  await db.insert(sqliteSchema.apps).values({
    id: nestedAppId,
    name: "Interactive nested app",
    iconUrl: "/favicon.ico",
    href: "#board-app-opened",
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
      advancedOptions: stringifySuperJSON({
        title: null,
        customCssClasses: ["e2e-widget-overflow"],
        borderColor: "",
      }),
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
      kind: "app",
      options: stringifySuperJSON({
        appId: nestedAppId,
        descriptionDisplayMode: "hidden",
        layout: "column",
        openInNewTab: false,
        pingEnabled: false,
        showTitle: true,
      }),
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
      sectionId: containerSectionId,
      layoutId,
      xOffset: 0,
      yOffset: 0,
      width: 1,
      height: 2,
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
    {
      itemId: firstItemId,
      sectionId,
      layoutId: compactLayoutId,
      xOffset: 0,
      yOffset: 0,
      width: 1,
      height: 1,
    },
    {
      itemId: secondItemId,
      sectionId,
      layoutId: compactLayoutId,
      xOffset: 1,
      yOffset: 0,
      width: 1,
      height: 1,
    },
    {
      itemId: belowItemId,
      sectionId,
      layoutId: compactLayoutId,
      xOffset: 0,
      yOffset: 2,
      width: 2,
      height: 1,
    },
    {
      itemId: nestedItemId,
      sectionId: containerSectionId,
      layoutId: compactLayoutId,
      xOffset: 0,
      yOffset: 0,
      width: 1,
      height: 2,
    },
    {
      itemId: railItemId,
      sectionId: railSectionId,
      layoutId: compactLayoutId,
      xOffset: 0,
      yOffset: 0,
      width: 1,
      height: 1,
    },
  ]);

  return {
    boardName,
    compactLayoutId,
    layoutId,
    sectionId,
    railSectionId,
    containerSectionId,
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
  await Promise.all([
    page.waitForURL(`${baseUrl}${callbackPath}`, { timeout: 30_000, waitUntil: "commit" }),
    page.locator("button[type='submit']").click(),
  ]);
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
type RuntimePayload = "dnd-kit" | "runtime-marker";

interface RuntimeResource {
  phase: RuntimeResourcePhase;
  url: string;
  hasRuntimeMarker: boolean;
  hasDndKitPayload: boolean;
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
          hasRuntimeMarker: body.includes(Buffer.from(gridRuntimeMarker)),
          hasDndKitPayload: body.includes(Buffer.from(dndKitPayloadMarker)),
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
      const key = payload === "runtime-marker" ? "hasRuntimeMarker" : "hasDndKitPayload";
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

const expectGridEntryGeometrySettledAsync = async (entry: Locator) => {
  let previous: Awaited<ReturnType<Locator["boundingBox"]>> = null;
  let stableFrames = 0;
  await expect
    .poll(
      async () => {
        const current = await entry.boundingBox();
        if (!current) return false;
        const isStable =
          previous !== null &&
          Math.abs(current.x - previous.x) < 0.25 &&
          Math.abs(current.y - previous.y) < 0.25 &&
          Math.abs(current.width - previous.width) < 0.25 &&
          Math.abs(current.height - previous.height) < 0.25;
        stableFrames = isStable ? stableFrames + 1 : 0;
        previous = current;
        return stableFrames >= 3;
      },
      { intervals: [16] },
    )
    .toBe(true);
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
  const entry = await getGridEntryLocatorAsync(locator);
  await expectGridEntryGeometrySettledAsync(entry);
  const box = await expectBoundingBoxAsync(locator);
  await dragLocatorToAsync(page, locator, box.x + box.width / 2 + deltaX, box.y + box.height / 2 + deltaY);
};

const dragHandleToGridPositionAsync = async (
  page: Page,
  handle: Locator,
  entry: Locator,
  grid: Locator,
  x: number,
  y: number,
  scale: number,
) => {
  await expectGridEntryGeometrySettledAsync(entry);
  const handleBox = await expectBoundingBoxAsync(handle);
  const entryBox = await expectBoundingBoxAsync(entry);
  const gridBox = await expectBoundingBoxAsync(grid);
  const grabOffset = {
    x: handleBox.x + handleBox.width / 2 - entryBox.x,
    y: handleBox.y + handleBox.height / 2 - entryBox.y,
  };
  await dragLocatorToAsync(
    page,
    handle,
    gridBox.x + x * logicalCellPitch * scale + grabOffset.x,
    gridBox.y + y * logicalCellPitch * scale + grabOffset.y,
  );
};

interface OffsetDragInput {
  deltaX: number;
  deltaY: number;
  startXRatio: number;
  startYRatio: number;
}

const dragLocatorByFromOffsetAsync = async (
  page: Page,
  locator: Locator,
  { deltaX, deltaY, startXRatio, startYRatio }: OffsetDragInput,
) => {
  const itemId = await locator.getAttribute("data-grid-item-id");
  expect(itemId).not.toBeNull();
  if (!itemId) throw new Error("Expected draggable grid entry id");

  const grid = locator.locator("xpath=ancestor::*[@data-grid-section-id][1]");
  const box = await expectBoundingBoxAsync(locator);
  const startX = box.x + box.width * startXRatio;
  const startY = box.y + box.height * startYRatio;
  const targetX = startX + deltaX;
  const targetY = startY + deltaY;
  const expectedOffset = { x: startX - box.x, y: startY - box.y };

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 12 });

  await expect(locator).toHaveAttribute("data-dnd-active", "true");
  await expect(locator).toHaveAttribute("data-dnd-drag-source", "true");
  await expect(grid).toHaveAttribute("data-dnd-drop-target", "true");
  await expect(grid).toHaveAttribute("data-dnd-drop-valid", "true");
  await expect(page.locator(`[data-grid-placeholder-for="${itemId}"]`)).toHaveCount(1);
  const dragOverlay = page.locator("[data-dnd-overlay][data-dnd-dragging]");
  await expect(dragOverlay).toBeVisible();
  await expect
    .poll(async () => {
      const draggedBox = await dragOverlay.evaluate((element) => {
        const rectangle = element.getBoundingClientRect();
        return {
          x: rectangle.x,
          y: rectangle.y,
          width: rectangle.width,
          height: rectangle.height,
        };
      });
      if (draggedBox.width <= 0 || draggedBox.height <= 0) return false;
      const actualOffset = {
        x: targetX - draggedBox.x,
        y: targetY - draggedBox.y,
      };
      return Math.abs(actualOffset.x - expectedOffset.x) < 2 && Math.abs(actualOffset.y - expectedOffset.y) < 2;
    })
    .toBe(true);

  await page.mouse.up();
  await expect(locator).not.toHaveAttribute("data-dnd-active");
  await expect(locator).not.toHaveAttribute("data-dnd-drag-source");
  await expect(dragOverlay).toHaveCount(0);
  await expect(grid).toHaveAttribute("data-dnd-drop-target", "false");
  await expect(grid).not.toHaveAttribute("data-dnd-drop-valid");
  await expect(page.locator(`[data-grid-placeholder-for="${itemId}"]`)).toHaveCount(0);
};

const expectCancelledDragRestoresSnapshotAsync = async (
  page: Page,
  grid: Locator,
  locator: Locator,
  deltaX: number,
  deltaY: number,
) => {
  const snapshot = await readEditorGridSnapshotAsync(grid);
  const itemId = await locator.getAttribute("data-grid-item-id");
  expect(itemId).not.toBeNull();
  if (!itemId) throw new Error("Expected draggable grid entry id");

  const box = await expectBoundingBoxAsync(locator);
  const startX = box.x + box.width * 0.63;
  const startY = box.y + box.height * 0.42;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 12 });
  await expect(locator).toHaveAttribute("data-dnd-drag-source", "true");
  await expect(grid).toHaveAttribute("data-dnd-drop-valid", "true");
  await expect(page.locator(`[data-grid-placeholder-for="${itemId}"]`)).toHaveCount(1);

  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.locator("body")).not.toHaveAttribute("data-board-grid-interacting");
  await expect(locator).not.toHaveAttribute("data-dnd-active");
  await expect(locator).not.toHaveAttribute("data-dnd-drag-source");
  await expect(grid).toHaveAttribute("data-dnd-drop-target", "false");
  await expect(grid).not.toHaveAttribute("data-dnd-drop-valid");
  await expect(page.locator(`[data-grid-placeholder-for="${itemId}"]`)).toHaveCount(0);
  await expect.poll(async () => await readEditorGridSnapshotAsync(grid)).toEqual(snapshot);
};

const expectInvalidDropRestoresSnapshotAsync = async (page: Page, grid: Locator, locator: Locator) => {
  const snapshot = await readEditorGridSnapshotAsync(grid);
  const box = await expectBoundingBoxAsync(locator);
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 8, startY + 8, { steps: 2 });
  await expect(locator).toHaveAttribute("data-dnd-drag-source", "true");
  await page.mouse.move(2, 2, { steps: 12 });
  await expect(page.locator("[data-grid-placeholder-for]")).toHaveCount(0);
  await expect(grid).toHaveAttribute("data-dnd-drop-target", "false");

  await page.mouse.up();
  await expect(page.locator("body")).not.toHaveAttribute("data-board-grid-interacting");
  await expect(locator).not.toHaveAttribute("data-dnd-active");
  await expect(locator).not.toHaveAttribute("data-dnd-drag-source");
  await expect.poll(async () => await readEditorGridSnapshotAsync(grid)).toEqual(snapshot);
};

const expectImmediateOutsideReleaseRestoresSnapshotAsync = async (page: Page, grid: Locator, locator: Locator) => {
  const snapshot = await readEditorGridSnapshotAsync(grid);
  const itemId = await locator.getAttribute("data-grid-item-id");
  expect(itemId).not.toBeNull();
  if (!itemId) throw new Error("Expected draggable grid entry id");

  const box = await expectBoundingBoxAsync(locator);
  const start = { x: box.x + box.width * 0.63, y: box.y + box.height * 0.42 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 8, start.y);
  await expect(locator).toHaveAttribute("data-dnd-drag-source", "true");
  await expect(page.locator(`[data-grid-placeholder-for="${itemId}"]`)).toHaveCount(1);

  await page.evaluate(() => {
    document.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        buttons: 0,
        clientX: 2,
        clientY: 2,
      }),
    );
  });
  await page.mouse.up();
  await expect(page.locator("body")).not.toHaveAttribute("data-board-grid-interacting");
  await expect(page.locator(`[data-grid-placeholder-for="${itemId}"]`)).toHaveCount(0);
  await expect.poll(async () => await readEditorGridSnapshotAsync(grid)).toEqual(snapshot);
};

const expectGridGrowsAtBoundaryAsync = async (page: Page, canvas: Locator, grid: Locator, locator: Locator) => {
  const snapshot = await readEditorGridSnapshotAsync(grid);
  const gridBox = await expectBoundingBoxAsync(grid);
  const canvasBox = await expectBoundingBoxAsync(canvas);
  const itemBox = await expectBoundingBoxAsync(locator);
  const start = { x: itemBox.x + itemBox.width * 0.63, y: itemBox.y + itemBox.height * 0.42 };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 8, start.y);
  await expect(locator).toHaveAttribute("data-dnd-drag-source", "true");
  await expect.poll(async () => (await expectBoundingBoxAsync(grid)).height).toBeGreaterThan(gridBox.height);

  await page.mouse.move(gridBox.x + gridBox.width / 2, gridBox.y + gridBox.height + logicalCellPitch / 2, {
    steps: 12,
  });
  await expect(page.locator("[data-grid-placeholder-for]")).toHaveCount(1);
  const activeGridBox = await expectBoundingBoxAsync(grid);
  expect(activeGridBox.height).toBeGreaterThan(gridBox.height);

  await page.mouse.move(canvasBox.x + canvasBox.width + 1000, start.y, { steps: 12 });
  const overlayBox = await expectBoundingBoxAsync(page.locator(".board-grid-drag-overlay[data-dnd-dragging]"));
  expect(overlayBox.x + overlayBox.width).toBeLessThanOrEqual(canvasBox.x + canvasBox.width + 1);

  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.locator("body")).not.toHaveAttribute("data-board-grid-interacting");
  await expect.poll(async () => await readEditorGridSnapshotAsync(grid)).toEqual(snapshot);
};

const expectInvalidNestedDropRestoresSnapshotAsync = async (
  page: Page,
  sourceGrid: Locator,
  targetGrid: Locator,
  locator: Locator,
  targetX: number,
  targetY: number,
) => {
  const snapshot = await readEditorGridSnapshotAsync(sourceGrid);
  const box = await expectBoundingBoxAsync(locator);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 12 });

  await expect(locator).toHaveAttribute("data-dnd-drag-source", "true");
  await expect(targetGrid).toHaveAttribute("data-dnd-drop-target", "true");
  await expect(targetGrid).toHaveAttribute("data-dnd-drop-valid", "false");
  await expect(sourceGrid).toHaveAttribute("data-dnd-drop-target", "false");
  await expect(page.locator("[data-grid-placeholder-for]")).toHaveCount(0);
  const previewRevision = await targetGrid.getAttribute("data-dnd-preview-revision");
  expect(previewRevision).not.toBeNull();
  await page.waitForTimeout(250);
  await expect(targetGrid).toHaveAttribute("data-dnd-drop-valid", "false");
  await expect(targetGrid).toHaveAttribute("data-dnd-preview-revision", previewRevision ?? "");
  await expect(page.locator("[data-grid-placeholder-for]")).toHaveCount(0);

  await page.mouse.up();
  await expect(page.locator("body")).not.toHaveAttribute("data-board-grid-interacting");
  await expect(locator).not.toHaveAttribute("data-dnd-drag-source");
  await expect(targetGrid).toHaveAttribute("data-dnd-drop-target", "false");
  await expect.poll(async () => await readEditorGridSnapshotAsync(sourceGrid)).toEqual(snapshot);
};

const getGridEntryLocatorAsync = async (locator: Locator) => {
  const entry = (await locator.getAttribute("data-grid-item-id"))
    ? locator
    : locator.locator("xpath=ancestor::*[@data-grid-item-id][1]");
  await expect(entry).toHaveCount(1);
  return entry;
};
const dragLocatorToAsync = async (page: Page, locator: Locator, targetX: number, targetY: number) => {
  const entry = await getGridEntryLocatorAsync(locator);
  await expectGridEntryGeometrySettledAsync(entry);

  const box = await expectBoundingBoxAsync(locator);
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 12 });

  if (await locator.getAttribute("data-grid-resize-handle")) {
    await expect(page.locator("body")).toHaveAttribute("data-board-grid-interacting", "resize");
  } else {
    const itemId = await entry.getAttribute("data-grid-item-id");
    expect(itemId).not.toBeNull();
    if (!itemId) throw new Error("Expected draggable grid entry id");
    await expect(entry).toHaveAttribute("data-dnd-drag-source", "true");
    await expect(page.locator(`[data-grid-placeholder-for="${itemId}"]`)).toHaveCount(1);
  }

  await page.mouse.up();
  await expect(page.locator("body")).not.toHaveAttribute("data-board-grid-interacting");
};

const dragLocatorByTouchAsync = async (page: Page, locator: Locator, deltaX: number, deltaY: number) => {
  const box = await expectBoundingBoxAsync(locator);
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });

  try {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...start, id: 1, radiusX: 1, radiusY: 1, force: 1 }],
    });
    await page.waitForTimeout(225);
    for (let step = 1; step <= 12; step += 1) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: start.x + (deltaX * step) / 12,
            y: start.y + (deltaY * step) / 12,
            id: 1,
            radiusX: 1,
            radiusY: 1,
            force: 1,
          },
        ],
      });
    }
    await expect(locator).toHaveAttribute("data-dnd-drag-source", "true");
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(locator).not.toHaveAttribute("data-dnd-drag-source");
  } finally {
    await session.send("Emulation.setTouchEmulationEnabled", { enabled: false });
    await session.detach();
  }
};

const expectTouchResizeCancellationRestoresAsync = async (
  page: Page,
  grid: Locator,
  handle: Locator,
  deltaX: number,
  deltaY: number,
) => {
  const snapshot = await readEditorGridSnapshotAsync(grid);
  const box = await expectBoundingBoxAsync(handle);
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });

  try {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...start, id: 1, radiusX: 1, radiusY: 1, force: 1 }],
    });
    await expect(page.locator("body")).toHaveAttribute("data-board-grid-interacting", "resize");
    for (let step = 1; step <= 4; step += 1) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: start.x + (deltaX * step) / 4,
            y: start.y + (deltaY * step) / 4,
            id: 1,
            radiusX: 1,
            radiusY: 1,
            force: 1,
          },
        ],
      });
    }
    await session.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await expect(page.locator("body")).not.toHaveAttribute("data-board-grid-interacting");
    await expect.poll(async () => await readEditorGridSnapshotAsync(grid)).toEqual(snapshot);
  } finally {
    await session.send("Emulation.setTouchEmulationEnabled", { enabled: false });
    await session.detach();
  }
};

const dragLocatorByImmediateReleaseAsync = async (
  page: Page,
  locator: Locator,
  deltaX: number,
  deltaY: number,
  afterActivation?: () => Promise<void>,
) => {
  const box = await expectBoundingBoxAsync(locator);
  await dragLocatorToImmediateReleaseAsync(
    page,
    locator,
    box.x + box.width * 0.63 + deltaX,
    box.y + box.height * 0.42 + deltaY,
    afterActivation,
  );
};

const dragLocatorToImmediateReleaseAsync = async (
  page: Page,
  locator: Locator,
  targetX: number,
  targetY: number,
  afterActivation?: () => Promise<void>,
) => {
  const box = await expectBoundingBoxAsync(locator);
  const start = { x: box.x + box.width * 0.63, y: box.y + box.height * 0.42 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 8, start.y);
  await expect(locator).toHaveAttribute("data-dnd-drag-source", "true");
  await afterActivation?.();

  await page.evaluate(
    ({ x, y }) => {
      document.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
          button: -1,
          buttons: 1,
          clientX: x,
          clientY: y,
        }),
      );
      document.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
          button: 0,
          buttons: 0,
          clientX: x,
          clientY: y,
        }),
      );
    },
    { x: targetX, y: targetY },
  );
  await page.mouse.up();
  await expect(locator).not.toHaveAttribute("data-dnd-drag-source");
  await expect(page.locator("body")).not.toHaveAttribute("data-board-grid-interacting");
};

const resizeLocatorByImmediateReleaseAsync = async (page: Page, handle: Locator, deltaX: number, deltaY: number) => {
  const entry = await getGridEntryLocatorAsync(handle);
  await expectGridEntryGeometrySettledAsync(entry);
  const box = await expectBoundingBoxAsync(handle);
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(page.locator("body")).toHaveAttribute("data-board-grid-interacting", "resize");

  await handle.evaluate(
    (element, { x, y }) => {
      element.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
          button: 0,
          buttons: 0,
          clientX: x,
          clientY: y,
        }),
      );
    },
    { x: start.x + deltaX, y: start.y + deltaY },
  );
  await page.mouse.up();
  await expect(page.locator("body")).not.toHaveAttribute("data-board-grid-interacting");
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

const getKeyboardEditorEntry = (entry: Locator) => entry.locator("[data-editor-grid-entry]").first();

const readEditorGridSnapshotAsync = async (grid: Locator) =>
  await grid.locator(":scope > .board-grid-entry").evaluateAll((entries) =>
    entries
      .map((entry) => ({
        id: entry.getAttribute("data-grid-item-id"),
        x: entry.getAttribute("data-grid-x"),
        y: entry.getAttribute("data-grid-y"),
        w: entry.getAttribute("data-grid-w"),
        h: entry.getAttribute("data-grid-h"),
      }))
      .toSorted((first, second) => (first.id ?? "").localeCompare(second.id ?? "")),
  );

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

const expectNoHorizontalOverflowAsync = async (locator: Locator) => {
  const dimensions = await locator.evaluate((element) => {
    const htmlElement = element as HTMLElement;
    return {
      clientWidth: htmlElement.clientWidth,
      scrollWidth: htmlElement.scrollWidth,
    };
  });

  expect(dimensions.scrollWidth - dimensions.clientWidth).toBeLessThanOrEqual(1);
};

const expectDocumentNotHorizontallyScrollableAsync = async (page: Page) => {
  await expect
    .poll(
      async () =>
        await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    )
    .toBeLessThanOrEqual(1);
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
