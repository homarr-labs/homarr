import type { Page } from "@playwright/test";

export class ItemSelectActions {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Enter board edit mode if not already active
   */
  public async enterEditModeAsync() {
    const editToggle = this.page.getByTestId("board-edit-mode-toggle");
    await editToggle.waitFor({ state: "visible", timeout: 15_000 });
    const isPressed = await editToggle.getAttribute("aria-pressed");
    if (isPressed !== "true") {
      await editToggle.click();
      await this.page.waitForFunction(
        () => document.querySelector('[data-testid="board-edit-mode-toggle"]')?.getAttribute("aria-pressed") === "true",
        { timeout: 15_000 },
      );
    }
  }

  /**
   * Open the ItemSelectModal ("Choose item to add") from the board
   */
  public async openItemSelectModalAsync() {
    await this.enterEditModeAsync();

    // Check if universal create button in header or empty state button is available
    const headerAddButton = this.page.locator('button[aria-label="Add board content"]');
    const emptyStateAddButton = this.page.getByRole("button", { name: "Add widget", exact: false });

    if (await headerAddButton.isVisible()) {
      await headerAddButton.click();
      // In Universal Create modal, click "Widget"
      const widgetOption = this.page
        .getByRole("dialog")
        .locator("button")
        .filter({ hasText: /Widget/i })
        .first();
      await widgetOption.waitFor({ state: "visible", timeout: 10_000 });
      await widgetOption.click();
    } else if (await emptyStateAddButton.isVisible()) {
      await emptyStateAddButton.click();
    }

    // Wait for ItemSelectModal to be visible
    const modal = this.page.getByRole("dialog").filter({ hasText: "Choose item to add" }).first();
    await modal.waitFor({ state: "visible", timeout: 15_000 });
  }

  /**
   * Filter catalog items by search query
   */
  public async searchWidgetsAsync(query: string) {
    const searchInput = this.page
      .getByRole("dialog")
      .locator('input[placeholder*="Filter items"], input[aria-label*="Filter items"]')
      .first();
    await searchInput.waitFor({ state: "visible", timeout: 10_000 });
    await searchInput.fill(query);
    // Allow debounce / filtering to update
    await this.page.waitForTimeout(200);
  }

  /**
   * Clear the search input
   */
  public async clearSearchAsync() {
    const searchInput = this.page
      .getByRole("dialog")
      .locator('input[placeholder*="Filter items"], input[aria-label*="Filter items"]')
      .first();
    await searchInput.waitFor({ state: "visible", timeout: 10_000 });
    await searchInput.clear();
    await this.page.waitForTimeout(200);
  }

  /**
   * Click a widget card in the catalog grid to select it and trigger live preview
   */
  public async selectWidgetAsync(widgetName: string) {
    const modal = this.page.getByRole("dialog").filter({ hasText: "Choose item to add" }).first();
    const widgetCard = modal
      .locator("button")
      .filter({ hasText: new RegExp(`^${widgetName}`, "i") })
      .first();
    await widgetCard.waitFor({ state: "visible", timeout: 10_000 });
    await widgetCard.click();
    // Wait for live preview container to appear
    await modal.locator('text="Live Preview & Options"').waitFor({ state: "visible", timeout: 15_000 });
  }

  /**
   * Close the live preview pane via the close button
   */
  public async closePreviewAsync() {
    const modal = this.page.getByRole("dialog").filter({ hasText: "Choose item to add" }).first();
    const closeBtn = modal.locator('button[aria-label="Close preview"]').first();
    await closeBtn.waitFor({ state: "visible", timeout: 10_000 });
    await closeBtn.click();
  }

  /**
   * Change destination dropdown (e.g. Main canvas or a container section)
   */
  public async selectDestinationAsync(destinationLabel: string) {
    const modal = this.page.getByRole("dialog").filter({ hasText: "Choose item to add" }).first();
    const destinationSelect = modal.locator('input[aria-label="Add to"]').first();
    if (await destinationSelect.isVisible()) {
      await destinationSelect.click();
      const option = this.page.getByRole("option", { name: destinationLabel }).first();
      await option.waitFor({ state: "visible", timeout: 5_000 });
      await option.click();
    }
  }

  /**
   * Toggle a switch in Widget Settings
   */
  public async toggleSettingSwitchAsync(labelText: string | RegExp) {
    const modal = this.page.getByRole("dialog").filter({ hasText: "Choose item to add" }).first();
    const switchInput = modal.getByLabel(labelText).first();
    await switchInput.waitFor({ state: "visible", timeout: 10_000 });
    await switchInput.click();
  }

  /**
   * Select an option in a dropdown in Widget Settings
   */
  public async selectSettingOptionAsync(selectLabel: string | RegExp, optionText: string | RegExp) {
    const modal = this.page.getByRole("dialog").filter({ hasText: "Choose item to add" }).first();
    const selectField = modal.getByLabel(selectLabel).first();
    await selectField.waitFor({ state: "visible", timeout: 10_000 });
    await selectField.click();
    const option = this.page.getByRole("option", { name: optionText }).first();
    await option.waitFor({ state: "visible", timeout: 5_000 });
    await option.click();
  }

  /**
   * Fill a text input in Widget Settings
   */
  public async fillSettingInputAsync(labelText: string | RegExp, value: string) {
    const modal = this.page.getByRole("dialog").filter({ hasText: "Choose item to add" }).first();
    const inputField = modal.getByLabel(labelText).first();
    await inputField.waitFor({ state: "visible", timeout: 10_000 });
    await inputField.fill(value);
  }

  /**
   * Click "Use Demo Service" button when available in Widget Settings
   */
  public async clickUseDemoServiceAsync() {
    const modal = this.page.getByRole("dialog").filter({ hasText: "Choose item to add" }).first();
    const demoBtn = modal.getByRole("button", { name: "Use Demo Service", exact: false }).first();
    await demoBtn.waitFor({ state: "visible", timeout: 10_000 });
    await demoBtn.click();
  }

  /**
   * Fill inline integration form within the Widget Settings panel
   */
  public async fillInlineIntegrationFormAsync(input: { name: string; url: string; apiKey?: string }) {
    const modal = this.page.getByRole("dialog").filter({ hasText: "Choose item to add" }).first();
    // Name input
    const nameInput = modal
      .locator('input[placeholder*="name" i], input[name="name"], input[aria-label*="name" i]')
      .first();
    await nameInput.waitFor({ state: "visible", timeout: 10_000 });
    await nameInput.fill(input.name);

    // URL input
    const urlInput = modal
      .locator('input[placeholder*="url" i], input[placeholder*="http" i], input[name="url"]')
      .first();
    await urlInput.waitFor({ state: "visible", timeout: 10_000 });
    await urlInput.fill(input.url);

    // API Key input if provided
    if (input.apiKey) {
      const apiInput = modal
        .locator('input[placeholder*="api" i], input[placeholder*="key" i], input[type="password"]')
        .first();
      if (await apiInput.isVisible()) {
        await apiInput.fill(input.apiKey);
      }
    }

    // Submit inline form
    const submitBtn = modal
      .locator('button[type="submit"]')
      .filter({ hasText: /save|create|connect/i })
      .first();
    await submitBtn.waitFor({ state: "visible", timeout: 10_000 });
    await submitBtn.click();
  }

  /**
   * Click the "Add" button in the Live Preview header to place the widget on the board
   */
  public async submitAddWidgetAsync() {
    const modal = this.page.getByRole("dialog").filter({ hasText: "Choose item to add" }).first();
    const addBtn = modal.locator('button[type="button"]').filter({ hasText: /^Add$/i }).first();
    await addBtn.waitFor({ state: "visible", timeout: 10_000 });
    await addBtn.click();
  }
}
