import { chromium } from "playwright";
import { describe, expect, test } from "vitest";

import { e2eEnv } from "./env.mjs";
import { OnboardingActions } from "./shared/actions/onboarding-actions";
import { createHomarrContainer } from "./shared/create-homarr-container";
import { createSqliteDbFileAsync } from "./shared/e2e-db";

describe("OIDC authorization", () => {
  test("Authorize with OIDC Azure app registration successfully", async () => {
    // Arrange
    const azureRole = "AzureAdmin";

    const { db, localMountPath } = await createSqliteDbFileAsync();
    const homarrContainer = await createHomarrContainer({
      environment: {
        AUTH_PROVIDERS: "oidc",
        AUTH_OIDC_ISSUER: `https://login.microsoftonline.com/${e2eEnv.E2E_AZURE_OIDC_TENANT_ID}/v2.0`,
        AUTH_OIDC_CLIENT_SECRET: e2eEnv.E2E_AZURE_OIDC_CLIENT_SECRET,
        AUTH_OIDC_CLIENT_ID: e2eEnv.E2E_AZURE_OIDC_CLIENT_ID,
        AUTH_OIDC_SCOPE_OVERWRITE: "openid profile email",
        AUTH_OIDC_GROUPS_ATTRIBUTE: "roles",
      },
      mounts: {
        "/appdata": localMountPath,
      },
    }).start();

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    const onboardingActions = new OnboardingActions(page, db);
    await onboardingActions.skipOnboardingAsync({ group: azureRole });

    // Act
    await page.goto(`http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}/auth/login`);
    await page.locator("css=button").click();

    await page.waitForURL("https://login.microsoftonline.com/**");
    await page.locator("css=input[type='email']").fill(e2eEnv.E2E_AZURE_OIDC_EMAIL);
    await page.locator("css=input[type='submit']").click();

    await page.waitForSelector("text=Password");
    await page.locator("css=input[type='password']").fill(e2eEnv.E2E_AZURE_OIDC_PASSWORD);
    await page.locator("css=[type='submit']").click();

    try {
      await page.waitForSelector("text=Stay signed in?", { timeout: 5000 });
      await page
        .locator("button", {
          hasText: "No",
        })
        .click({ timeout: 1000 });
    } catch (e) {
      console.log("Stay signed in not requested");
    }

    try {
      await page.waitForSelector("text=Permissions requested", { timeout: 5000 });
      await page.locator("css=[type='submit']").click({ timeout: 1000 });
    } catch (e) {
      console.log("Permissions not requested");
    }

    // Assert
    await page.waitForURL(`http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}`, {
      timeout: 10000,
    });
    const users = await db.query.users.findMany({
      with: {
        groups: {
          with: {
            group: true,
          },
        },
      },
    });
    expect(users).toHaveLength(1);
    const user = users[0]!;
    expect(user).toEqual(
      expect.objectContaining({
        name: e2eEnv.E2E_AZURE_OIDC_NAME,
        email: e2eEnv.E2E_AZURE_OIDC_EMAIL,
        provider: "oidc",
      }),
    );

    const groups = user.groups.map((g) => g.group.name);
    expect(groups).toContain(azureRole);

    // Cleanup
    await browser.close();
    await homarrContainer.stop();
  }, 60000);
});
