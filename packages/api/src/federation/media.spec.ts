import { beforeEach, describe, expect, test, vi } from "vitest";

import { eq } from "@homarr/db";
import { federationConnections, integrationOrigins, integrations, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import { toBase64Url, utf8 } from "@homarr/remote-protocol";

import type { ApiContext } from "../procedure";
import { readFederatedMedia, rewriteFederatedMedia } from "./media";

const { call } = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock("./client", () => ({ callFederatedProcedure: call }));
beforeEach(() => {
  call.mockReset();
});

async function setup(expiresAt = Date.now() + 60_000) {
  const db = createDb();
  await db.insert(users).values({ id: "owner", name: "owner" });
  await db.insert(federationConnections).values({
    id: "connection",
    workerId: "worker",
    name: "Source",
    publicKey: "{}",
    encryptedConfiguration: "encrypted",
    enabled: true,
  });
  await db.insert(integrations).values({ id: "alias", name: "Remote", kind: "immich", url: "https://worker.invalid" });
  await db
    .insert(integrationOrigins)
    .values({ integrationId: "alias", connectionId: "connection", remoteIntegrationId: "source" });
  const context: ApiContext = {
    db,
    session: {
      user: { id: "owner", permissions: ["integration-full-all"], colorScheme: "dark" },
      expires: "2099-01-01",
    },
    deviceType: undefined,
    workerAccess: { role: "owner", grantId: "grant", authorizeProcedure() {} },
  };
  const sourceToken = `${toBase64Url(utf8(JSON.stringify({ integrationId: "source", expiresAt })))}.source-signature`;
  const result = rewriteFederatedMedia(context, "connection", new Map([["source", "alias"]]), {
    image: `/api/federation/source-media/${sourceToken}`,
  }) as { image: string };
  const token = result.image.slice("/api/federation/media/".length);
  return { context, db, token, sourceToken, request: new Request("https://primary.invalid" + result.image) };
}

describe("primary worker media authority", () => {
  test("returns bounded image bytes through the source's native capability route", async () => {
    const { context, token, sourceToken, request } = await setup();
    const bytes = Uint8Array.from([137, 80, 78, 71]);
    call.mockResolvedValue({ data: toBase64Url(bytes), contentType: "image/png", size: bytes.byteLength });
    const response = await readFederatedMedia(context, token, request);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(call).toHaveBeenCalledWith(
      context,
      "connection",
      ["federation", "media"],
      { integrationId: "source", token: sourceToken },
      { signal: request.signal },
    );
  });

  test("tampering and another worker grant cannot use a media capability", async () => {
    const { context, token, request } = await setup();
    await expect(readFederatedMedia(context, token + "x", request)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    if (context.workerAccess) context.workerAccess.grantId = "another-grant";
    await expect(readFederatedMedia(context, token, request)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(call).not.toHaveBeenCalled();
  });

  test("expired media, disabled sources, and removed primary permissions fail before fetching", async () => {
    const expired = await setup(Date.now() - 1);
    await expect(readFederatedMedia(expired.context, expired.token, expired.request)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    const { context, db, token, request } = await setup();
    await db.update(federationConnections).set({ enabled: false }).where(eq(federationConnections.id, "connection"));
    await expect(readFederatedMedia(context, token, request)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await db.update(federationConnections).set({ enabled: true }).where(eq(federationConnections.id, "connection"));
    if (context.session) context.session.user.permissions = [];
    await expect(readFederatedMedia(context, token, request)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(call).not.toHaveBeenCalled();
  });

  test("source disable during a read does not release completed pixels", async () => {
    const { context, db, token, request } = await setup();
    call.mockImplementation(async () => {
      await db.update(federationConnections).set({ enabled: false }).where(eq(federationConnections.id, "connection"));
      return { data: toBase64Url(Uint8Array.from([1])), contentType: "image/png", size: 1 };
    });
    await expect(readFederatedMedia(context, token, request)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
