import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";
import Database from "better-sqlite3";
import { expect, test } from "vitest";

import { decryptSecretWithKey } from "../packages/common/src/encryption";
import { convert } from "../tools/mysql-to-sqlite/src/convert.mjs";
import {
  createFixture,
  fixtureBoard,
  fixtureCiphertext,
  fixtureMedia,
  fixturePassword,
  fixtureSecret,
  fixtureUser,
} from "../tools/mysql-to-sqlite/test/fixture.mjs";
import { createHomarrContainer } from "./shared/create-homarr-container";
import { loginAsync } from "./shared/login";

// This deliberately starts from the supported MySQL release, not a freshly seeded v2 database.
test("converted MySQL data boots, authenticates and survives a v2 restart", async () => {
  const root = path.join(__dirname, "tmp");
  await mkdir(root, { recursive: true });
  const appdata = await mkdtemp(path.join(root, "mysql-conversion-"));
  const output = path.join(appdata, "db", "db.sqlite");
  await mkdir(path.dirname(output));
  const fixture = await createFixture();

  try {
    await convert({ connectionOptions: fixture.connectionOptions, output, homarrStopped: true });
    const browser = await chromium.launch();
    try {
      for (let boot = 0; boot < 2; boot++) {
        const container = await createHomarrContainer({ mounts: { "/appdata": appdata } }).start();
        const context = await browser.newContext();
        try {
          const baseUrl = `http://${container.getHost()}:${container.getMappedPort(7575)}`;
          const page = await context.newPage();
          await loginAsync({
            page,
            baseUrl,
            credentials: { username: fixtureUser, password: fixturePassword },
            destination: "/boards/converted-board",
          });
          await page.locator('[data-testid="board-canvas"][data-board-hydrated="true"]').waitFor({ timeout: 30_000 });
          expect(page.url()).toContain("/boards/converted-board");
          const media = await context.request.get(`${baseUrl}/api/user-medias/migration-media`);
          expect(media.status()).toBe(200);
          expect(media.headers()["content-type"]).toContain("application/octet-stream");
          expect(await media.body()).toEqual(fixtureMedia);
        } finally {
          await context.close();
          await container.stop();
        }

        // Inspect after shutdown so WAL data is settled; the second boot proves persisted state.
        const db = new Database(output, { readonly: true });
        try {
          expect(db.pragma("integrity_check", { simple: true })).toBe("ok");
          expect(db.pragma("foreign_key_check")).toEqual([]);
          expect(db.prepare("SELECT id, name FROM board WHERE id = ?").get(fixtureBoard)).toEqual({
            id: fixtureBoard,
            name: "converted-board",
          });
          const secret = db
            .prepare('SELECT value FROM "integrationSecret" WHERE integration_id = ? AND kind = ?')
            .get("migration-integration", "apiKey") as { value: `${string}.${string}` };
          expect(secret.value).toBe(fixtureCiphertext);
          expect(decryptSecretWithKey(secret.value, Buffer.alloc(32))).toBe(fixtureSecret);
          expect(db.prepare("SELECT id FROM custom_widget_definition WHERE id = ?").get("migration-custom")).toEqual({
            id: "migration-custom",
          });
        } finally {
          db.close();
        }
      }
    } finally {
      await browser.close();
    }
  } finally {
    await fixture.cleanup();
    await rm(appdata, { recursive: true, force: true });
  }
}, 180_000);
