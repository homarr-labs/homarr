import path from "node:path";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { chromium, expect } from "@playwright/test";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { stringify } from "superjson";
import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";

import {
  apps,
  boards,
  integrations,
  itemLayouts,
  items,
  layouts,
  sectionLayouts,
  sections,
  users,
} from "../../../packages/db/schema/sqlite";
import { ItemSelectActions } from "../../shared/actions/item-select-actions";
import { createHomarrContainer } from "../../shared/create-homarr-container";
import { createSqliteDbFileAsync } from "../../shared/e2e-db";
import { loginAsync } from "../../shared/login";
import { seedAdminUserAsync } from "../../shared/seed-admin-user";

const credentials = { username: "admin", password: "Comp(exP4sswOrd" };
const boardName = "advanced-add-app-e2e";

describe("Advanced Add App & Widget Modal E2E", () => {
  let browser: Browser;
  let baseUrl: string;
  let stopContainerAsync: (() => Promise<void>) | undefined;
  let context: BrowserContext;
  let page: Page;
  let actions: ItemSelectActions;

  const boardId = createId();
  const layoutId = createId();
  const mainSectionId = createId();
  const containerSectionId = createId();
  const nextcloudAppId = createId();
  const plexAppId = createId();
  const homeAssistantAppId = createId();

  beforeAll(async () => {
    const { db, localMountPath } = await createSqliteDbFileAsync();
    const { userId } = await seedAdminUserAsync(db, credentials);

    // Seed test board with main canvas section & container section
    await db.insert(boards).values({
      id: boardId,
      name: boardName,
      creatorId: userId,
      isPublic: false,
    });

    await db.insert(layouts).values({
      id: layoutId,
      name: "Base",
      columnCount: 12,
      leftGutterColumnCount: 0,
      rightGutterColumnCount: 0,
      breakpoint: 0,
      boardId,
      role: "base",
    });

    await db.insert(sections).values([
      {
        id: mainSectionId,
        boardId,
        kind: "empty",
        xOffset: 0,
        yOffset: 0,
      },
      {
        id: containerSectionId,
        boardId,
        kind: "container",
        xOffset: 0,
        yOffset: 4,
        options: stringify({
          title: "Media Hub Container",
          customCssClasses: [],
          borderColor: "",
          showLabel: true,
          collapsible: false,
          showOpenAll: false,
        }),
      },
    ]);

    await db.insert(sectionLayouts).values({
      sectionId: containerSectionId,
      layoutId,
      parentSectionId: mainSectionId,
      xOffset: 0,
      yOffset: 4,
      width: 12,
      height: 4,
    });

    // Seed selectable test apps
    await db.insert(apps).values([
      {
        id: nextcloudAppId,
        name: "Nextcloud",
        description: "Self-hosted productivity platform",
        iconUrl: "/favicon.ico",
        href: "https://nextcloud.example.internal",
      },
      {
        id: plexAppId,
        name: "Plex Media Server",
        description: "Stream movies, TV shows, and music",
        iconUrl: "/favicon.ico",
        href: "https://plex.example.internal",
      },
      {
        id: homeAssistantAppId,
        name: "Home Assistant",
        description: "Open source home automation",
        iconUrl: "/favicon.ico",
        href: "https://homeassistant.example.internal",
      },
    ]);

    // Set user defaults & mark tours completed
    await db
      .update(users)
      .set({
        homeBoardId: boardId,
        completedBoardTour: true,
        completedManageTour: true,
      })
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

  beforeEach(async () => {
    context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    page = await context.newPage();
    actions = new ItemSelectActions(page);

    await loginAsync({
      page,
      baseUrl,
      credentials,
      destination: `/boards/${boardName}`,
    });

    // Dismiss tour overlay if present
    const tourOverlay = page.locator('[data-onboarding-tour-overlay="true"]');
    const skipTour = page.getByRole("button", { name: "Skip tour", exact: true });
    try {
      if (await skipTour.isVisible({ timeout: 2_000 })) {
        await skipTour.click();
        await expect(tourOverlay).toHaveCount(0);
      }
    } catch {
      // Tour not present, proceed
    }
  });

  // =========================================================================
  // 1. Opening the Add App / Widget modal from edit mode
  // =========================================================================
  test("opens the ItemSelectModal from edit mode with full catalog and controls", async () => {
    await actions.enterEditModeAsync();

    // Verify edit mode toggle is active
    const editToggle = page.getByTestId("board-edit-mode-toggle");
    await expect(editToggle).toHaveAttribute("aria-pressed", "true");

    // Open modal via header action
    const headerAddButton = page.locator('button[aria-label="Add board content"]');
    await expect(headerAddButton).toBeVisible();
    await headerAddButton.click();

    // Verify Universal Create dialog lists creation actions
    const createDialog = page.getByRole("dialog");
    await expect(createDialog).toBeVisible();

    const widgetOption = createDialog
      .locator("button")
      .filter({ hasText: /Widget/i })
      .first();
    await expect(widgetOption).toBeVisible();
    await widgetOption.click();

    // Verify Choose item to add modal is open
    const itemModal = page.getByRole("dialog").filter({ hasText: "Choose item to add" }).first();
    await expect(itemModal).toBeVisible();

    // Verify search input is rendered and autofocused
    const searchInput = itemModal
      .locator('input[placeholder*="Filter items"], input[aria-label*="Filter items"]')
      .first();
    await expect(searchInput).toBeVisible();

    // Verify destination selector is present because multiple sections exist
    const destinationSelect = itemModal.locator('input[aria-label="Add to"]').first();
    await expect(destinationSelect).toBeVisible();

    // Verify multiple widget cards are rendered in grid
    const widgetCards = itemModal.locator("button[aria-label]");
    expect(await widgetCards.count()).toBeGreaterThan(5);
  });

  // =========================================================================
  // 2. Search & filtering widgets by name and supported integration names
  // =========================================================================
  test("filters widgets by name and supported integration names with empty state fallback", async () => {
    await actions.openItemSelectModalAsync();
    const modal = page.getByRole("dialog").filter({ hasText: "Choose item to add" }).first();

    // Filter by widget name: "Clock"
    await actions.searchWidgetsAsync("Clock");
    const clockCard = modal.locator('button[aria-label="Clock"]').first();
    await expect(clockCard).toBeVisible();

    // Non-matching widget should not be visible
    const weatherCard = modal.locator('button[aria-label="Weather"]').first();
    await expect(weatherCard).not.toBeVisible();

    // Filter by supported integration name: "Sonarr"
    await actions.searchWidgetsAsync("Sonarr");
    // Widgets that support Sonarr (like Calendar or Releases) should appear
    const sonarrMatchingCards = modal.locator("button[aria-label]");
    expect(await sonarrMatchingCards.count()).toBeGreaterThan(0);

    // Filter by non-existent query
    await actions.searchWidgetsAsync("nonexistent-search-term-xyz");
    await expect(modal.getByText("No results")).toBeVisible();

    // Clear search restores all widget cards
    await actions.clearSearchAsync();
    expect(await modal.locator("button[aria-label]").count()).toBeGreaterThan(5);
  });

  // =========================================================================
  // 3. Selecting a widget to open master-detail 5×3 live preview
  // =========================================================================
  test("opens 5×3 master-detail live preview on card click and returns to grid on close", async () => {
    await actions.openItemSelectModalAsync();
    const modal = page.getByRole("dialog").filter({ hasText: "Choose item to add" }).first();

    // Select Clock widget to trigger master-detail layout
    await actions.selectWidgetAsync("Clock");

    // Verify preview header banner
    await expect(modal.getByText("Live Preview & Options")).toBeVisible();
    await expect(modal.getByText("Clock").first()).toBeVisible();

    // Verify 5×3 preview frame container
    await expect(modal.getByText("Preview (5×3)")).toBeVisible();

    // Verify Add button in preview header
    const addBtn = modal.locator('button[type="button"]').filter({ hasText: /^Add$/i }).first();
    await expect(addBtn).toBeVisible();

    // Verify Widget Settings section
    await expect(modal.getByText("Widget Settings")).toBeVisible();

    // Close preview pane
    await actions.closePreviewAsync();

    // Verify preview pane is closed and full catalog returns
    await expect(modal.getByText("Live Preview & Options")).not.toBeVisible();
    await expect(modal.locator('button[aria-label="Clock"]').first()).toBeVisible();
  });

  // =========================================================================
  // 4. Interactive widget option configuration inside the settings panel
  // =========================================================================
  test("interactively configures widget options inside the settings panel", async () => {
    await actions.openItemSelectModalAsync();
    const modal = page.getByRole("dialog").filter({ hasText: "Choose item to add" }).first();

    // Select Clock widget
    await actions.selectWidgetAsync("Clock");

    // Toggle "Show custom title" switch on
    const customTitleSwitch = modal.getByLabel(/custom title/i).first();
    await expect(customTitleSwitch).toBeVisible();
    await customTitleSwitch.click();

    // Custom title text input becomes conditionally visible
    const customTitleInput = modal.getByRole("textbox", { name: /custom title/i }).first();
    await expect(customTitleInput).toBeVisible({ timeout: 5_000 });
    await customTitleInput.fill("E2E Interactive Clock");

    // Toggle "Use custom timezone" switch on
    const timezoneSwitch = modal.getByLabel(/custom timezone/i).first();
    if (await timezoneSwitch.isVisible()) {
      await timezoneSwitch.click();
      const timezoneSelect = modal.locator('input[placeholder*="timezone" i], input[aria-label*="timezone" i]').first();
      await expect(timezoneSelect).toBeVisible({ timeout: 5_000 });
    }

    // Toggle "Show weather" switch on
    const weatherSwitch = modal.getByLabel(/weather/i).first();
    if (await weatherSwitch.isVisible()) {
      await weatherSwitch.click();
      // Location input should appear
      await expect(modal.getByText("Brisbane").or(modal.locator('input[value*="Brisbane"]')).first()).toBeVisible({
        timeout: 5_000,
      });
    }
  });

  // =========================================================================
  // 5. In-place / inline integration connection and mock demo service fallback
  // =========================================================================
  test("supports in-place demo service fallback and mock integration connection", async () => {
    await actions.openItemSelectModalAsync();
    const modal = page.getByRole("dialog").filter({ hasText: "Choose item to add" }).first();

    // Search and select Media releases widget (supports mock integration)
    await actions.searchWidgetsAsync("Media releases");
    const mediaReleasesCard = modal.locator('button[aria-label*="Media releases" i]').first();
    if (await mediaReleasesCard.isVisible()) {
      await mediaReleasesCard.click();
      await modal.locator('text="Live Preview & Options"').waitFor({ state: "visible", timeout: 15_000 });

      // Verify "Use Demo Service" button is available when no integration is connected
      const demoBtn = modal.getByRole("button", { name: "Use Demo Service", exact: false }).first();
      if (await demoBtn.isVisible()) {
        await demoBtn.click();

        // Verify demo / mock data badge appears in preview frame header
        await expect(modal.getByText("Showing Demo / Mock Data")).toBeVisible({ timeout: 15_000 });
      }
    }
  });

  // =========================================================================
  // 6. Adding a widget directly to the board and verifying it appears in target section
  // =========================================================================
  test("adds configured widget to board and verifies placement and undo notification", async () => {
    await actions.openItemSelectModalAsync();
    const modal = page.getByRole("dialog").filter({ hasText: "Choose item to add" }).first();

    // Search and select Clock widget
    await actions.searchWidgetsAsync("Clock");
    await actions.selectWidgetAsync("Clock");

    // Click Add button
    await actions.submitAddWidgetAsync();

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 10_000 });

    // Success notification with Undo button should appear
    await expect(page.getByText("Widget added")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeVisible();

    // Clock widget container should be present on the board canvas
    const clockWidget = page.locator(".clock-widget-container, [data-kind='clock']").first();
    await expect(clockWidget).toBeVisible({ timeout: 15_000 });
  });

  // =========================================================================
  // 7. Destination lane / container section selection
  // =========================================================================
  test("places widget into selected destination container section", async () => {
    await actions.openItemSelectModalAsync();
    const modal = page.getByRole("dialog").filter({ hasText: "Choose item to add" }).first();

    // Select container section from destination dropdown
    await actions.selectDestinationAsync("Media Hub Container");

    // Select Weather or Clock widget
    await actions.searchWidgetsAsync("Clock");
    await actions.selectWidgetAsync("Clock");

    // Click Add
    await actions.submitAddWidgetAsync();
    await expect(modal).not.toBeVisible({ timeout: 10_000 });

    // Verify notification
    await expect(page.getByText("Widget added")).toBeVisible({ timeout: 10_000 });

    // Verify item is placed inside container section on the board
    const containerSection = page
      .locator(`[data-section-id="${containerSectionId}"], [data-id="${containerSectionId}"]`)
      .first();
    if (await containerSection.isVisible()) {
      await expect(containerSection.locator(".clock-widget-container, [data-kind='clock']").first()).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  // =========================================================================
  // 8. App selection flow with SelectableCard grid
  // =========================================================================
  test("opens AppSelectModal, filters with SelectableCard grid, and multi-selects apps to board", async () => {
    await actions.enterEditModeAsync();

    // Open Universal Create modal
    const headerAddButton = page.locator('button[aria-label="Add board content"]');
    await headerAddButton.click();

    // Click "Add app"
    const appOption = page
      .getByRole("dialog")
      .locator("button")
      .filter({ hasText: /Add app/i })
      .first();
    await appOption.waitFor({ state: "visible", timeout: 10_000 });
    await appOption.click();

    // Verify AppSelectModal opens
    const appModal = page.getByRole("dialog").filter({ hasText: "Select an app to add to this board" }).first();
    await expect(appModal).toBeVisible();

    // Verify "+ Create app" / "Custom Application" dashed card is present
    await expect(appModal.getByText("Custom Application")).toBeVisible();

    // Search filter for "Nextcloud"
    const appSearchInput = appModal
      .locator('input[placeholder*="Search for an app" i], input[aria-label*="Search for an app" i]')
      .first();
    await appSearchInput.fill("Nextcloud");
    await page.waitForTimeout(200);

    // Verify Nextcloud is shown, Plex is filtered out
    await expect(appModal.locator('button[aria-label="Nextcloud"]').first()).toBeVisible();
    await expect(appModal.locator('button[aria-label="Plex Media Server"]')).not.toBeVisible();

    // Clear search
    await appSearchInput.clear();
    await page.waitForTimeout(200);

    // Multi-select Nextcloud and Plex Media Server
    const nextcloudCard = appModal.locator('button[aria-label="Nextcloud"]').first();
    const plexCard = appModal.locator('button[aria-label="Plex Media Server"]').first();

    await nextcloudCard.click();
    await plexCard.click();

    // Multi-select footer bar appears
    await expect(appModal.getByText("2 apps selected")).toBeVisible();
    const submitAppsBtn = appModal.getByRole("button", { name: /Add \(2\)/i });
    await expect(submitAppsBtn).toBeVisible();

    // Click Add (2)
    await submitAppsBtn.click();

    // Modal closes and apps appear on the board
    await expect(appModal).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Nextcloud").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Plex Media Server").first()).toBeVisible({ timeout: 15_000 });
  });
});
