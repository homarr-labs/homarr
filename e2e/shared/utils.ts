import { Page } from "playwright";
import { expect } from "vitest";

export const waitForSelectorOrScreenshotAsync = async (page: Page, selector: string) => {
  try {
    await page.waitForSelector(selector);
  } catch (error) {
    await page.screenshot({
      path: `screenshots/${expect.getState().currentTestName?.replace(/[^a-zA-Z0-9]/g, "_")}.png`,
    });
    throw error;
  }
};
