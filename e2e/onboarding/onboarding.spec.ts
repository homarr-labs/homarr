import { chromium } from "playwright";
import { describe, test } from "vitest";

import { createHomarrContainer } from "../shared/create-homarr-container";
import { createSqliteDbFileAsync } from "../shared/e2e-db";
import { Onboarding } from "./onboarding-steps";

describe("Onboarding", () => {
  test("Credentials onboarding should be successful", async () => {
    // Arrange
    const { db, localMountPath } = await createSqliteDbFileAsync();
    const homarrContainer = await createHomarrContainer({
      mounts: {
        "/appdata": localMountPath,
      },
    }).start();

    // Act
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    const onboarding = new Onboarding(page);

    await page.goto(`http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}`);
    await onboarding.steps.start.pressButtonAsync("fromScratch");

    await onboarding.steps.user.waitUntilReadyAsync();
    await onboarding.steps.user.fillFormAsync({
      username: "admin",
      password: "Comp(exP4sswOrd",
      confirmPassword: "Comp(exP4sswOrd",
    });
    await onboarding.steps.user.submitAsync();

    await onboarding.steps.settings.waitUntilReadyAsync();
    await onboarding.steps.settings.submitAsync();

    await onboarding.steps.finish.waitUntilReadyAsync();

    // Assert
    await onboarding.steps.user.assertUserAndAdminGroupInsertedAsync(db, "admin");
    await onboarding.assertOnboardingStepAsync(db, "finish");

    // Cleanup
    await browser.close();
    await homarrContainer.stop();
  }, 120_000);

  test("External provider onboarding setup should be successful", async () => {
    // Arrange
    const { db, localMountPath } = await createSqliteDbFileAsync();
    const homarrContainer = await createHomarrContainer({
      environment: {
        AUTH_PROVIDERS: "ldap",
        AUTH_LDAP_URI: "ldap://host.docker.internal:3890",
        AUTH_LDAP_BASE: "",
        AUTH_LDAP_BIND_DN: "",
        AUTH_LDAP_BIND_PASSWORD: "",
      },
      mounts: {
        "/appdata": localMountPath,
      },
    }).start();
    const externalGroupName = "oidc-admins";

    // Act
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    const onboarding = new Onboarding(page);

    await page.goto(`http://${homarrContainer.getHost()}:${homarrContainer.getMappedPort(7575)}`);
    await onboarding.steps.start.pressButtonAsync("fromScratch");

    await onboarding.steps.group.waitUntilReadyAsync();
    await onboarding.steps.group.fillGroupAsync(externalGroupName);
    await onboarding.steps.group.submitAsync();

    await onboarding.steps.settings.waitUntilReadyAsync();
    await onboarding.steps.settings.submitAsync();

    await onboarding.steps.finish.waitUntilReadyAsync();

    // Assert
    await onboarding.steps.group.assertGroupInsertedAsync(db, externalGroupName);
    await onboarding.assertOnboardingStepAsync(db, "finish");

    // Cleanup
    await browser.close();
    await homarrContainer.stop();
  }, 120_000);
});
