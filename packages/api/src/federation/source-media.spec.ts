import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const fixture = await vi.hoisted(async () => {
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const directory = mkdtempSync(join(tmpdir(), "homarr-source-media-"));
  process.env.DB_URL = join(directory, "database.sqlite");
  process.env.HOMARR_STATE_BACKEND = "memory";
  return { directory };
});

import { getImageIntegrationIdAsync, ImageProxy, isImageFromIntegrationsAsync } from "@homarr/image-proxy";
import { db } from "@homarr/db";
import { createDb } from "@homarr/db/test";
import { rm } from "node:fs/promises";
import type { ApiContext } from "../procedure";
import { readFederatedSourceMedia, signSourceMediaResult } from "./source-media";
import { ApiError } from "../procedure";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==",
  "base64",
);

beforeAll(() => migrate(db, { migrationsFolder: "./packages/db/migrations/sqlite" }));
afterAll(() => rm(fixture.directory, { recursive: true, force: true }));

function context(grantId = "source-media-grant", ids = ["integration-a"]): ApiContext {
  return {
    db: createDb(),
    session: null,
    deviceType: undefined,
    workerAccess: {
      role: "service",
      grantId,
      service: {
        integrationIds: ids,
        access: "query",
        procedurePaths: ["federation.media"],
        audience: "primary",
        principalId: "member",
      },
      authorizeProcedure: () => {},
    },
  };
}

async function signedToken(ctx: ApiContext, assetId: string) {
  const result = (await signSourceMediaResult(ctx, ["integration-a"], { image: `/api/image-proxy/${assetId}` })) as {
    image: string;
  };
  return result.image.replace("/api/federation/source-media/", "");
}

describe("source-worker media capabilities", () => {
  test("projects only exact native image references and binds the token to its selected integration", async () => {
    const ctx = context();
    const [first, second] = await new ImageProxy("integration-a").createImagesAsync([
      "https://private.invalid/image-a",
      "https://private.invalid/image-b",
    ]);
    const result = (await signSourceMediaResult(ctx, ["integration-a"], {
      image: first,
      nested: [second],
      arbitrary: "https://upstream.invalid/private-image",
      markup: "![image](/api/image-proxy/asset-a)",
    })) as { image: string; nested: string[]; arbitrary: string; markup: string };
    expect(result.image).toMatch(/^\/api\/federation\/source-media\/[A-Za-z0-9_-]+\.[a-f0-9]{64}$/u);
    expect(result.nested[0]).toMatch(/^\/api\/federation\/source-media\//u);
    expect(result.arbitrary).toBe("https://upstream.invalid/private-image");
    expect(result.markup).toBe("![image](/api/image-proxy/asset-a)");
    await expect(
      readFederatedSourceMedia(ctx, "integration-b", result.image.split("/").at(-1) ?? ""),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  test("fetches source-local image bytes without returning private URLs or authentication headers", async () => {
    let auth: string | undefined;
    const server = createServer((request, response) => {
      auth = request.headers.authorization;
      response.writeHead(200, { "Content-Type": "image/png" });
      response.end(png);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const path = await new ImageProxy("integration-a").createImageAsync(
        `http://127.0.0.1:${(server.address() as AddressInfo).port}/private.png`,
        { Authorization: "Bearer source-only-image-key" },
      );
      const ctx = context();
      const result = await readFederatedSourceMedia(
        ctx,
        "integration-a",
        await signedToken(ctx, path.split("/").at(-1) ?? ""),
      );
      expect(result).toEqual({ data: png.toString("base64url"), contentType: "image/png", size: png.length });
      expect(auth).toBe("Bearer source-only-image-key");
      expect(JSON.stringify(result)).not.toContain("source-only-image-key");
      expect(JSON.stringify(result)).not.toContain("127.0.0.1");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        }),
      );
    }
  });

  test("rejects forged, expired, cross-grant, cross-integration, and non-service access", async () => {
    const ctx = context("media-bound-grant", ["integration-a", "integration-b"]);
    const path = await new ImageProxy("integration-a").createImageAsync("https://private.invalid/not-fetched");
    const token = await signedToken(ctx, path.split("/").at(-1) ?? "");
    const [encoded = "", signature = ""] = token.split(".");
    const forged = `${encoded}.${signature.replace(/^./u, signature.startsWith("0") ? "1" : "0")}`;
    await expect(readFederatedSourceMedia(ctx, "integration-a", forged)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(readFederatedSourceMedia(context("another-grant"), "integration-a", token)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(readFederatedSourceMedia(ctx, "integration-b", token)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      readFederatedSourceMedia({ ...ctx, workerAccess: undefined }, "integration-a", token),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as { expiresAt: number };
    vi.setSystemTime(payload.expiresAt + 1);
    try {
      await expect(readFederatedSourceMedia(ctx, "integration-a", token)).rejects.toMatchObject({ code: "FORBIDDEN" });
    } finally {
      vi.useRealTimers();
    }
  });

  test.each([
    { name: "HTML", type: "text/html", body: Buffer.from("<script>private()</script>"), code: "BAD_GATEWAY" },
    {
      name: "HTML advertised as PNG",
      type: "image/png",
      body: Buffer.from("<html>not an image</html>"),
      code: "BAD_GATEWAY",
    },
    {
      name: "SVG",
      type: "image/svg+xml",
      body: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
      code: "BAD_GATEWAY",
    },
    {
      name: "response above 8 MiB",
      type: "image/png",
      body: Buffer.alloc(8 * 1024 * 1024 + 1),
      code: "PAYLOAD_TOO_LARGE",
    },
    {
      name: "PNG exceeding the pixel budget",
      type: "image/png",
      body: (() => {
        const image = Buffer.from(png);
        image.writeUInt32BE(6000, 16);
        image.writeUInt32BE(6000, 20);
        return image;
      })(),
      code: "PAYLOAD_TOO_LARGE",
    },
  ])("rejects $name from the private source", async ({ type, body, code }) => {
    const server = createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": type });
      response.end(body);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const path = await new ImageProxy("integration-a").createImageAsync(
        `http://127.0.0.1:${(server.address() as AddressInfo).port}/image`,
      );
      const ctx = context();
      await expect(
        readFederatedSourceMedia(ctx, "integration-a", await signedToken(ctx, path.split("/").at(-1) ?? "")),
      ).rejects.toMatchObject({ code });
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        }),
      );
    }
  });

  test("rechecks revocation after the upstream image has completed", async () => {
    let revoked = false;
    const ctx = context();
    if (!ctx.workerAccess) throw new Error("Test service access is missing");
    ctx.workerAccess.authorizeProcedure = () => {
      if (revoked) throw new ApiError({ code: "FORBIDDEN", message: "Revoked" });
    };
    const server = createServer((_request, response) => {
      revoked = true;
      response.writeHead(200, { "Content-Type": "image/png" });
      response.end(png);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const path = await new ImageProxy("integration-a").createImageAsync(
        `http://127.0.0.1:${(server.address() as AddressInfo).port}/image`,
      );
      await expect(
        readFederatedSourceMedia(ctx, "integration-a", await signedToken(ctx, path.split("/").at(-1) ?? "")),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        }),
      );
    }
  });

  test("does not launder another integration's or an unscoped asset reference from native response text", async () => {
    const ctx = context("wide-grant", ["integration-a", "integration-b"]);
    const foreign = await new ImageProxy("integration-b").createImageAsync("https://private.invalid/foreign-image");
    const unscoped = await new ImageProxy().createImageAsync("https://private.invalid/legacy-image");
    await expect(signSourceMediaResult(ctx, ["integration-a"], { image: foreign })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(signSourceMediaResult(ctx, ["integration-a"], { image: unscoped })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    const signed = (await signSourceMediaResult(ctx, ["integration-a", "integration-b"], { image: foreign })) as {
      image: string;
    };
    const payload = JSON.parse(
      Buffer.from(signed.image.split("/").at(-1)?.split(".")[0] ?? "", "base64url").toString(),
    ) as { integrationId: string };
    expect(payload.integrationId).toBe("integration-b");
  });

  test("separates immutable media ownership for identical URLs and credentials in single and bulk registration", async () => {
    const headers = { Authorization: "Bearer same-source-key" };
    const a = new ImageProxy("integration-a");
    const b = new ImageProxy("integration-b");
    const url = "https://private.invalid/same-picture";
    const first = await a.createImageAsync(url, headers);
    const second = await b.createImagesAsync([url], headers);
    expect(second[0]).not.toBe(first);
    expect(await a.createImagesAsync([url], headers)).toEqual([first]);
    const firstId = first.split("/").at(-1) ?? "";
    const secondId = second[0]?.split("/").at(-1) ?? "";
    expect(await getImageIntegrationIdAsync(firstId)).toBe("integration-a");
    expect(await getImageIntegrationIdAsync(secondId)).toBe("integration-b");
    expect(await isImageFromIntegrationsAsync(firstId, ["integration-b"])).toBe(false);
    expect(await isImageFromIntegrationsAsync(secondId, ["integration-a", "integration-b"])).toBe(true);
  });
});
