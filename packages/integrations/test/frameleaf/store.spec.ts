// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";

import { decryptSecret } from "@homarr/common/server";
import { eq } from "@homarr/db";
import { integrations, integrationSecrets } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { FrameleafConnection } from "../../src/frameleaf/connection";
import type { FrameleafState } from "../../src/frameleaf/connection";
import { FrameleafDatabaseStore } from "../../src/frameleaf/store";

const state: FrameleafState = {
  version: 1,
  origin: "https://library.example.test",
  clientId: "test-client",
  status: "connected",
  tokens: { accessToken: "old-access", refreshToken: "single-use-refresh", expiresAt: 0 },
  connection: { grantId: "grant", libraryUserId: "owner" },
};
let database: ReturnType<typeof createDb>;
beforeEach(async () => {
  database = createDb();
  await database
    .insert(integrations)
    .values({ id: "frameleaf-test", name: "Frameleaf", kind: "frameleaf", url: state.origin });
});

describe("Frameleaf encrypted durable claims", () => {
  it("stores only ciphertext and uses an atomic comparison for independent service instances", async () => {
    const first = new FrameleafDatabaseStore(database, "frameleaf-test");
    const second = new FrameleafDatabaseStore(database, "frameleaf-test");
    expect(await first.replaceAsync(null, state)).toBe(true);
    const row = await database.query.integrationSecrets.findFirst();
    expect(row?.value).not.toContain("single-use-refresh");
    if (!row) throw new Error("Expected encrypted connection");
    expect(JSON.parse(decryptSecret(row.value))).toEqual(state);
    let calls = 0;
    const fetcher = async () => {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return new Response(
        JSON.stringify({
          access_token: "new-access",
          refresh_token: "rotated-refresh",
          token_type: "Bearer",
          expires_in: 3600,
        }),
      );
    };
    expect(
      await Promise.all([
        new FrameleafConnection(first, fetcher).accessTokenAsync(),
        new FrameleafConnection(second, fetcher).accessTokenAsync(),
      ]),
    ).toEqual(["new-access", "new-access"]);
    expect(calls).toBe(1);
    expect(await first.readAsync()).toMatchObject({ status: "connected", tokens: { refreshToken: "rotated-refresh" } });
    expect(await first.replaceAsync(state, null)).toBe(false);
  });
  it("refuses to install credentials for another Library origin", async () => {
    const connection = new FrameleafDatabaseStore(database, "frameleaf-test");
    await expect(connection.replaceAsync(null, { ...state, origin: "https://other.example.test" })).rejects.toThrow();
    expect(await connection.readAsync()).toBeNull();
  });

  it("rejects a changed canonical Library address before reading or updating credentials", async () => {
    const store = new FrameleafDatabaseStore(database, "frameleaf-test");
    await store.replaceAsync(null, state);
    await database
      .update(integrations)
      .set({ url: "https://other.example.test" })
      .where(eq(integrations.id, "frameleaf-test"));
    await expect(store.readAsync()).rejects.toThrow();
    await expect(store.replaceAsync(state, null)).rejects.toThrow();
    expect(await database.select().from(integrationSecrets)).toHaveLength(1);
  });
});
