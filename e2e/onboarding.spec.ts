import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";
import type { Page } from "@playwright/test";
import { describe, expect, test } from "vitest";

import { OnboardingActions } from "./shared/actions/onboarding-actions";
import { OnboardingAssertions } from "./shared/assertions/onboarding-assertions";
import { createHomarrContainer } from "./shared/create-homarr-container";
import { createSqliteDbFileAsync } from "./shared/e2e-db";

const captureScreenshotAsync = async (page: Page, name: string) => {
  const directory = process.env.HOMARR_E2E_SCREENSHOT_DIR?.trim();
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `onboarding-${name}.png`), fullPage: true });
};

describe("Onboarding", () => {
  test.each([
    { name: "mobile", width: 320, height: 740 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1440, height: 900 },
  ])("Onboarding is usable at the $name viewport", async ({ name, width, height }) => {
    const { localMountPath } = await createSqliteDbFileAsync();
    const homarrContainer = await createHomarrContainer({ mounts: { "/appdata": localMountPath } }).start();
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
    const page = await context.newPage();

    try {
      await page.goto(`http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}/init`);
      await page.getByRole("heading", { name: "Make home feel organized." }).waitFor();
      const start = page.getByRole("button", { name: "Get started" });
      await start.focus();
      await start.press("Enter");
      await page.getByRole("heading", { name: "Create your administrator" }).waitFor();

      await page.getByLabel("Administrator username").fill("admin");
      await page.getByLabel("Password", { exact: true }).fill("Comp(exP4sswOrd");
      await page.getByLabel("Confirm password").fill("Comp(exP4sswOrd");
      await page.locator("css=button[type='submit']").click();
      await page.getByRole("heading", { name: "Start with familiar defaults" }).waitFor({ timeout: 30_000 });

      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true);
      await captureScreenshotAsync(page, `${name}-studio`);

      const activeSection = page.locator('[aria-current="step"]');
      await activeSection.focus();
      await activeSection.press("ArrowLeft");
      await page.getByRole("heading", { name: "One board, built around your services" }).waitFor();
      expect(await activeSection.evaluate((element) => element === document.activeElement)).toBe(true);
      await activeSection.press("ArrowRight");
      await page.getByRole("heading", { name: "Start with familiar defaults" }).waitFor();
      expect(await activeSection.evaluate((element) => element === document.activeElement)).toBe(true);
      await activeSection.press("End");
      await page.getByRole("heading", { name: "One board, built around your services" }).waitFor();
      await activeSection.press("Home");
      await page.getByRole("heading", { name: "Start with familiar defaults" }).waitFor();
      expect(await activeSection.evaluate((element) => element === document.activeElement)).toBe(true);

      const sections = [
        ["Discover", "See what this installation can actually reach"],
        ["Connect", "Connect what makes the board useful"],
        ["Board", "Shape the board before it is built"],
        ["Extend", "Add intelligence when it helps"],
      ] as const;
      for (const [section, heading] of sections) {
        await page.getByRole("button", { name: new RegExp(`^${section}`) }).click();
        await page.getByRole("heading", { name: heading }).waitFor();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        ).toBe(true);
      }

      await page.getByRole("button", { name: /^Connect/ }).click();
      const sonarr = page.locator('button[aria-label="Sonarr"]');
      await sonarr.click();
      await page.getByLabel("Service URL").waitFor();
      await captureScreenshotAsync(page, `${name}-integration-details`);
      await sonarr.click();
      await page.getByLabel("Service URL").waitFor({ state: "detached" });

      await activeSection.focus();
      await activeSection.press("End");
      await page.getByRole("heading", { name: "One board, built around your services" }).waitFor();
      await captureScreenshotAsync(page, `${name}-review`);

      await page.getByRole("button", { name: "Build my board" }).click();
      await page.getByRole("heading", { name: "Your first board is ready." }).waitFor({ timeout: 30_000 });
      await captureScreenshotAsync(page, `${name}-finish`);
    } finally {
      await Promise.all([browser.close(), homarrContainer.stop()]);
    }
  }, 90_000);

  test("Credentials onboarding should be successful", async () => {
    // Arrange
    const { db, localMountPath } = await createSqliteDbFileAsync();
    const homarrContainer = await createHomarrContainer({
      mounts: {
        "/appdata": localMountPath,
      },
    }).start();

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    const actions = new OnboardingActions(page, db);
    const assertions = new OnboardingAssertions(page, db);

    try {
      // Act
      await page.goto(`http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}`);
      await actions.startOnboardingAsync();

      const competingContext = await browser.newContext();
      const claimResponse = await competingContext.request.post(
        `http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}/api/onboarding/claim`,
      );
      expect(claimResponse.status()).toBe(423);
      await competingContext.close();

      await actions.processUserStepAsync({
        username: "admin",
        password: "Comp(exP4sswOrd",
        confirmPassword: "Comp(exP4sswOrd",
      });
      await actions.processSettingsStepAsync();
      await actions.processIntegrationsStepAsync();

      // Assert
      await assertions.assertFinishStepVisibleAsync();
      await assertions.assertUserAndAdminGroupInsertedAsync("admin");
      await assertions.assertDbOnboardingStepAsync("finish");
    } finally {
      await Promise.all([browser.close(), homarrContainer.stop()]);
    }
  }, 60_000);

  test("External provider onboarding requires sign-in before privileged setup", async () => {
    // Arrange
    const { db, localMountPath } = await createSqliteDbFileAsync();
    const homarrContainer = await createHomarrContainer({
      environment: {
        AUTH_PROVIDERS: "ldap",
        AUTH_LDAP_URI: "ldap://host.docker.internal:3890",
        AUTH_LDAP_BASE: "not-used",
        AUTH_LDAP_BIND_DN: "not-used",
        AUTH_LDAP_BIND_PASSWORD: "not-used",
      },
      mounts: {
        "/appdata": localMountPath,
      },
    }).start();
    const externalGroupName = "oidc-admins";

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    const actions = new OnboardingActions(page, db);
    const assertions = new OnboardingAssertions(page, db);

    try {
      // Act
      await page.goto(`http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}`);
      await actions.startOnboardingAsync();
      await actions.processExternalGroupStepAsync({
        name: externalGroupName,
      });

      // Assert
      await page.getByRole("heading", { name: "Administrator sign-in required" }).waitFor();
      expect(await page.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe(
        "/auth/login?callbackUrl=%2Finit",
      );
      await assertions.assertExternalGroupInsertedAsync(externalGroupName);
      await assertions.assertDbOnboardingStepAsync("setup");
    } finally {
      await Promise.all([browser.close(), homarrContainer.stop()]);
    }
  }, 60_000);
});
