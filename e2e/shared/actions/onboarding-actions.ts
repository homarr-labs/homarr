import { createId } from "@paralleldrive/cuid2";
import type { Page } from "@playwright/test";

import * as sqliteSchema from "../../../packages/db/schema/sqlite";
import type { SqliteDatabase } from "../e2e-db";

export class OnboardingActions {
  private readonly page: Page;
  private readonly db: SqliteDatabase;

  constructor(page: Page, db: SqliteDatabase) {
    this.page = page;
    this.db = db;
  }

  public async skipOnboardingAsync(input?: { group?: string }) {
    await this.db.update(sqliteSchema.onboarding).set({
      step: "finish",
    });

    if (input?.group) {
      await this.db.insert(sqliteSchema.groups).values({
        id: createId(),
        name: input.group,
        position: 1,
      });
    }
  }

  public async startOnboardingAsync() {
    await this.page.getByRole("button", { name: "Get started" }).click();
  }

  public async processUserStepAsync(input: { username: string; password: string; confirmPassword: string }) {
    await this.page.getByRole("heading", { name: "Create your administrator" }).waitFor();

    await this.page.getByLabel("Administrator username").fill(input.username);
    await this.page.getByLabel("Password", { exact: true }).fill(input.password);
    await this.page.getByLabel("Confirm password").fill(input.confirmPassword);

    await this.page.locator("css=button[type='submit']").click();
  }

  public async processExternalGroupStepAsync(input: { name: string }) {
    await this.page.getByRole("heading", { name: "Connect your administrator group" }).waitFor();
    await this.page.getByLabel("External administrator group").fill(input.name);
    await this.page.locator("css=button[type='submit']").click();
  }

  public async processSettingsStepAsync() {
    await this.page.getByRole("heading", { name: "Start with familiar defaults" }).waitFor();
  }

  public async processIntegrationsStepAsync() {
    await this.page.getByRole("button", { name: "Build my board" }).click();
  }
}
