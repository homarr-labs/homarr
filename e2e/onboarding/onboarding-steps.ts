import { eq } from "drizzle-orm";
import { Page } from "playwright";
import { expect } from "vitest";

import * as sqliteSchema from "../../packages/db/schema/sqlite";
import { credentialsAdminGroup, OnboardingStep } from "../../packages/definitions/src";
import { SqliteDatabase } from "../shared/e2e-db";

const buttonTexts = {
  fromScratch: "scratch",
  oldmarrImport: "before 1.0",
};

class OnboardingStartStep {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public async pressButtonAsync(button: keyof typeof buttonTexts) {
    await this.page
      .locator("button", {
        hasText: buttonTexts[button],
      })
      .click();
  }
}

class OnboardingUserStep {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public async waitUntilReadyAsync() {
    await this.page.waitForSelector("text=administrator user");
  }

  public async fillFormAsync(input: { username: string; password: string; confirmPassword: string }) {
    await this.page.getByLabel("Username").fill(input.username);
    await this.page.getByLabel("Password", { exact: true }).fill(input.password);
    await this.page.getByLabel("Confirm password").fill(input.confirmPassword);
  }

  public async submitAsync() {
    await this.page.locator("css=button[type='submit']").click();
  }

  public async assertUserAndAdminGroupInsertedAsync(db: SqliteDatabase, expectedUsername: string) {
    const users = await db.query.users.findMany({
      with: {
        groups: {
          with: {
            group: {
              with: {
                permissions: true,
              },
            },
          },
        },
      },
    });
    expect(users).toHaveLength(1);
    const user = users[0]!;
    expect(user).toEqual(
      expect.objectContaining({
        name: expectedUsername,
        provider: "credentials",
      }),
    );
    expect(user.password).not.toBeNull();
    expect(user.salt).not.toBeNull();

    const groups = user.groups.map((g) => g.group);
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toEqual(credentialsAdminGroup);
    expect(groups[0].permissions).toEqual([expect.objectContaining({ permission: "admin" })]);
  }
}

class OnboardingGroupStep {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public async waitUntilReadyAsync() {
    await this.page.waitForSelector("text=external provider");
  }

  public async fillGroupAsync(groupName: string) {
    await this.page.locator("input").fill(groupName);
  }

  public async submitAsync() {
    await this.page.locator("css=button[type='submit']").click();
  }

  public async assertGroupInsertedAsync(db: SqliteDatabase, expectedGroupName: string) {
    const group = await db.query.groups.findFirst({
      where: eq(sqliteSchema.groups.name, expectedGroupName),
      with: {
        permissions: true,
      },
    });
    expect(group).not.toBeUndefined();
    expect(group?.permissions).toEqual([expect.objectContaining({ permission: "admin" })]);
  }
}

class OnboardingSettingsStep {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public async waitUntilReadyAsync() {
    await this.page.waitForSelector("text=Analytics");
  }

  public async submitAsync() {
    await this.page.locator("css=button[type='submit']").click();
  }
}

class OnboardingFinishStep {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public async waitUntilReadyAsync() {
    await this.page.waitForSelector("text=completed the setup");
  }
}

export class Onboarding {
  private readonly page: Page;
  public readonly steps: {
    start: OnboardingStartStep;
    user: OnboardingUserStep;
    group: OnboardingGroupStep;
    settings: OnboardingSettingsStep;
    finish: OnboardingFinishStep;
  };

  constructor(page: Page) {
    this.page = page;
    this.steps = {
      start: new OnboardingStartStep(this.page),
      user: new OnboardingUserStep(this.page),
      group: new OnboardingGroupStep(this.page),
      settings: new OnboardingSettingsStep(this.page),
      finish: new OnboardingFinishStep(this.page),
    };
  }

  public async assertOnboardingStepAsync(db: SqliteDatabase, expectedStep: OnboardingStep) {
    const onboarding = await db.query.onboarding.findFirst();
    expect(onboarding?.step).toEqual(expectedStep);
  }
}
