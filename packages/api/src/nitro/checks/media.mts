import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Database as SqliteDatabase } from "bun:sqlite";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";

import type { Database } from "@homarr/db";
import { sqliteSchema } from "@homarr/db/schema";

import {
  mediaBinaryDescriptor,
  mediaBinaryDisposition,
  readMediaBinaryResponseAsync,
} from "../../media-runtime/binary";
import {
  createMediaBinaryResponse,
  hasMatchingMediaValidator,
  MediaSvgExecutionHeldError,
} from "../../media-runtime/response";
import { sanitizeMediaSvg } from "../../media-runtime/sanitizer";
import { createBackendContext } from "../context";
import type { BackendContext, BackendPrincipal } from "../context";
import { createBackendServerClient, defineBackendContribution } from "../contribution";
import { sourcePortRows } from "../port-map";
import { getSourceProcedureMeta, getSourceProjectionMeta } from "../procedure";
import { assertMediaDeletionAuthorized } from "../routers/-media/delete-authorization";
import { prepareMediaUploadAsync } from "../routers/-media/upload";
import {
  createMediaContribution,
  mediaImplementedPaths,
  mediaPendingPaths,
  mediaSourceBindings,
} from "../routers/media";

async function expectCode(operation: Promise<unknown>, code: string) {
  await assert.rejects(operation, (error: unknown) => error instanceof ORPCError && error.code === code);
}

const raw = new SqliteDatabase(":memory:");
try {
  raw.exec(`
CREATE TABLE user (id TEXT PRIMARY KEY NOT NULL, name TEXT, image TEXT, email TEXT);
CREATE TABLE media (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, content BLOB NOT NULL, contentType TEXT NOT NULL, size INTEGER NOT NULL, createdAt INTEGER NOT NULL, creatorId TEXT REFERENCES user(id));
`);
  const queries: string[] = [];
  const db = drizzle(raw, {
    schema: sqliteSchema,
    logger: {
      logQuery(query) {
        queries.push(query);
      },
    },
  }) as unknown as Database;
  const bytes = Buffer.from([0, 255, 0, 13, 10, 128, 34]);
  raw.query("INSERT INTO user VALUES (?, ?, ?, ?)").run("owner", "Owner", "fixture-image", "owner@example.invalid");
  raw.query("INSERT INTO user VALUES (?, ?, ?, ?)").run("other", "Other", null, "other@example.invalid");
  const insert = raw.query("INSERT INTO media VALUES (?, ?, ?, ?, ?, ?, ?)");
  insert.run("old", "Own match old", bytes, "image/png", bytes.length, 1, "owner");
  insert.run("new", "Own match new", bytes, "image/png", bytes.length, 3, "owner");
  insert.run("other", "Other match", bytes, "image/jpeg", bytes.length, 2, "other");
  insert.run("orphan", "Orphan", bytes, "image/gif", bytes.length, 4, null);

  const owner: BackendPrincipal = {
    kind: "authenticated",
    user: { id: "owner", name: null, image: null, email: null, colorScheme: "dark", permissions: [] },
  };
  const viewer: BackendPrincipal = { kind: "authenticated", user: { ...owner.user, permissions: ["media-view-all"] } };
  const admin: BackendPrincipal = { kind: "authenticated", user: { ...owner.user, permissions: ["admin"] } };
  const uploader: BackendPrincipal = { kind: "authenticated", user: { ...owner.user, permissions: ["media-upload"] } };
  const anonymous: BackendPrincipal = { kind: "anonymous" };
  const context = (principal: BackendPrincipal, signal = new AbortController().signal): BackendContext =>
    createBackendContext({
      db,
      principal,
      signal,
      request: new Request("https://fixture.invalid/rpc"),
      deviceType: undefined,
      demo: { enabled: false, readOnly: false },
      setup: {
        async isClaimOnlyAccessAllowed() {
          throw new Error("Unexpected setup access");
        },
        async currentStep() {
          throw new Error("Unexpected setup access");
        },
      },
      effect() {
        throw new Error("Unexpected response effect");
      },
      onDispose() {
        throw new Error("Unexpected request resource");
      },
    });
  let acquisitions = 0;
  let releases = 0;
  let currentChecks = 0;
  const contribution = createMediaContribution({
    tables: sqliteSchema,
    operators: { and, desc, eq, like },
    async acquireReadAsync(request) {
      acquisitions++;
      return {
        db,
        principal: request.principal,
        async assertCurrentAsync() {
          currentChecks++;
        },
        async releaseAsync() {
          releases++;
        },
      };
    },
  });
  assert.deepEqual(
    mediaSourceBindings.map(({ path }) => path),
    sourcePortRows.filter(([path]) => path.startsWith("media.")).map(([path]) => path),
  );
  assert.deepEqual(contribution.leaves, mediaImplementedPaths);
  assert.deepEqual(mediaPendingPaths, ["media.uploadMedia", "media.deleteMedia"]);
  assert.deepEqual(Object.keys(contribution.router.media), ["getPaginated"]);
  assert.equal(getSourceProcedureMeta(contribution.router.media.getPaginated)?.access.kind, "protected");
  assert.equal(getSourceProcedureMeta(contribution.router.media.getPaginated)?.kind, "query");
  assert.equal(getSourceProjectionMeta(contribution.router.media.getPaginated), undefined);
  const source = await readFile("packages/api/src/router/medias/media-router.ts", "utf8");
  for (const binding of mediaSourceBindings) assert.match(source, new RegExp(`^  ${binding.path.split(".")[1]}:`, "m"));
  assert.throws(
    () =>
      defineBackendContribution({
        ...contribution,
        router: { media: { wrong: contribution.router.media.getPaginated } },
      }),
    /route does not match/,
  );

  await expectCode(
    createBackendServerClient(contribution, context(anonymous)).media.getPaginated({ includeFromAllUsers: true }),
    "UNAUTHORIZED",
  );
  assert.equal(acquisitions, 0);
  assert.equal(queries.length, 0);
  const stopped = new AbortController();
  stopped.abort(new Error("Stopped fixture"));
  await expectCode(
    createBackendServerClient(contribution, context(owner, stopped.signal)).media.getPaginated({}),
    "INTERNAL_SERVER_ERROR",
  );
  assert.equal(acquisitions, 0);
  assert.equal(queries.length, 0);

  const own = createBackendServerClient(contribution, context(owner)).media;
  const ownPage = await own.getPaginated({});
  assert.deepEqual(
    ownPage.items.map(({ id }) => id),
    ["new", "old"],
  );
  assert.equal(ownPage.totalCount, 2);
  assert.ok(ownPage.items[0]);
  assert.equal("content" in ownPage.items[0], false);
  assert.deepEqual(ownPage.items[0]?.creator, {
    id: "owner",
    name: "Owner",
    image: "fixture-image",
    email: "owner@example.invalid",
  });
  assert.equal(
    queries.some((query) => /order by .*"createdAt" desc/.test(query)),
    true,
  );
  assert.equal(
    queries.slice(0, 2).some((query) => /"content"/.test(query)),
    false,
  );
  assert.deepEqual(
    (await own.getPaginated({ includeFromAllUsers: true })).items.map(({ id }) => id),
    ["new", "old"],
  );
  assert.equal(
    (await createBackendServerClient(contribution, context(admin)).media.getPaginated({ includeFromAllUsers: true }))
      .totalCount,
    2,
  );
  const all = createBackendServerClient(contribution, context(viewer)).media;
  assert.equal((await all.getPaginated({})).totalCount, 2);
  const beforePaddedQueries = queries.length;
  const beforePaddedAcquisitions = acquisitions;
  await assert.rejects(
    all.getPaginated({ includeFromAllUsers: true, search: " match ", pageSize: 1, page: 2 }),
    (error: unknown) =>
      error instanceof ORPCError &&
      error.code === "INTERNAL_SERVER_ERROR" &&
      error.cause instanceof Error &&
      error.cause.message === 'Unmergable intersection. Error path: ["search"]',
  );
  assert.equal(queries.length, beforePaddedQueries);
  assert.equal(acquisitions, beforePaddedAcquisitions);
  const fullPage = await all.getPaginated({ includeFromAllUsers: true, search: "match", pageSize: 1, page: 2 });
  assert.deepEqual(
    fullPage.items.map(({ id }) => id),
    ["other"],
  );
  assert.equal(fullPage.totalCount, 3);
  assert.deepEqual(
    (await all.getPaginated({ includeFromAllUsers: true })).items.map(({ id }) => id),
    ["orphan", "new", "other", "old"],
  );
  assert.equal((await all.getPaginated({ includeFromAllUsers: true })).items[0]?.creator, null);
  assert.equal(acquisitions, releases);
  assert.equal(currentChecks, acquisitions * 3);

  const revoked = createMediaContribution({
    tables: sqliteSchema,
    operators: { and, desc, eq, like },
    async acquireReadAsync() {
      return {
        db,
        principal: owner,
        async assertCurrentAsync() {
          throw new Error("Fixture authority revoked");
        },
        async releaseAsync() {
          releases++;
        },
      };
    },
  });
  const beforeRevoked = queries.length;
  await expectCode(createBackendServerClient(revoked, context(owner)).media.getPaginated({}), "INTERNAL_SERVER_ERROR");
  assert.equal(queries.length, beforeRevoked);

  let bodyReads = 0;
  const uploadResources = { createId: () => "uploaded-fixture", async assertCurrentAsync() {} };
  const readBody = async () => {
    bodyReads++;
    return { files: [new File([bytes], "Literal name.png", { type: "image/png" })] };
  };
  await expectCode(prepareMediaUploadAsync(context(anonymous), readBody, uploadResources), "UNAUTHORIZED");
  await expectCode(prepareMediaUploadAsync(context(admin), readBody, uploadResources), "FORBIDDEN");
  assert.equal(bodyReads, 0);
  const rows = await prepareMediaUploadAsync(context(uploader), readBody, uploadResources);
  assert.deepEqual(rows, [
    {
      id: "uploaded-fixture",
      creatorId: "owner",
      content: bytes,
      size: bytes.length,
      contentType: "image/png",
      name: "Literal name.png",
    },
  ]);
  assert.throws(
    () => assertMediaDeletionAuthorized(admin, { id: "other", creatorId: "other" }),
    (error: unknown) => error instanceof ORPCError && error.code === "FORBIDDEN",
  );
  assert.throws(
    () => assertMediaDeletionAuthorized(owner, undefined),
    (error: unknown) => error instanceof ORPCError && error.code === "NOT_FOUND",
  );
  assertMediaDeletionAuthorized(owner, { id: "old", creatorId: "owner" });

  const etag = `"${createHash("sha256").update(bytes).digest("base64url")}"`;
  for (const validator of [etag, `W/${etag}`, `"not-this", W/${etag}`, "*"])
    assert.equal(hasMatchingMediaValidator(validator, etag), true);
  for (const validator of [
    `${etag},`,
    `${etag}, `,
    `${etag}, invalid`,
    `w/${etag}`,
    `* ,${etag}`,
    `"bad\u0001",${etag}`,
    `${etag} trailing`,
  ])
    assert.equal(hasMatchingMediaValidator(validator, etag), false);
  const response = createMediaBinaryResponse({ content: bytes, contentType: "image/png" }, null);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("etag"), etag);
  assert.equal(response.headers.get("content-length"), String(bytes.length));
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(response.headers.get("cache-control"), "private, no-cache");
  assert.equal(
    response.headers.get("content-security-policy"),
    "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  );
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  const conditional = createMediaBinaryResponse({ content: bytes, contentType: "image/png" }, `W/${etag}`);
  assert.equal(conditional.status, 304);
  assert.equal(conditional.body, null);
  assert.equal(conditional.headers.has("content-length"), false);
  assert.equal(createMediaBinaryResponse(undefined, null).status, 404);
  for (const contentType of ["image/svg+xml", "image/svg"])
    assert.throws(
      () => createMediaBinaryResponse({ content: Buffer.from("<svg/>"), contentType }, "*"),
      MediaSvgExecutionHeldError,
    );
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24" onload="alert(1)"><script>alert(2)</script><defs><filter id="homarr-svg-filter"><feGaussianBlur stdDeviation="1.5" /></filter></defs><rect x="2" y="3" width="12" height="8" fill="#123456" filter="url(#homarr-svg-filter)" onclick="alert(3)"/><a xlink:href="javascript:alert(4)"><circle cx="6" cy="6" r="2"/></a><a xlink:href="data:text/html;base64,PHNjcmlwdD5hbGVydCg1KTwvc2NyaXB0Pg=="><path d="M1 1L2 2"/></a><foreignObject><iframe src="data:text/html;base64,PHNjcmlwdD5hbGVydCg2KTwvc2NyaXB0Pg=="></iframe></foreignObject><text x="1" y="20">Café ☀</text></svg>',
  );
  const sanitizedSvg = sanitizeMediaSvg(svg.toString("utf8"), { USE_PROFILES: { svg: true, svgFilters: true } });
  assert.doesNotMatch(
    sanitizedSvg,
    /script|onload|onclick|javascript:|data:text\/html|foreignObject|iframe|xlink:href/i,
  );
  assert.match(sanitizedSvg, /viewBox="0 0 24 24"/);
  assert.match(
    sanitizedSvg,
    /<filter id="homarr-svg-filter"><feGaussianBlur stdDeviation="1.5"><\/feGaussianBlur><\/filter>/,
  );
  assert.match(sanitizedSvg, /x="2" y="3" width="12" height="8" fill="#123456" filter="url\(#homarr-svg-filter\)"/);
  assert.match(sanitizedSvg, /<circle cx="6" cy="6" r="2"><\/circle>/);
  assert.match(sanitizedSvg, /<path d="M1 1L2 2"><\/path>/);
  assert.match(sanitizedSvg, /Café ☀/);
  const sanitizedBytes = Buffer.from(sanitizedSvg);
  const rawSvgEtag = `"${createHash("sha256").update(svg).digest("base64url")}"`;
  const sanitizedSvgEtag = `"${createHash("sha256").update(sanitizedBytes).digest("base64url")}"`;
  assert.notEqual(rawSvgEtag, sanitizedSvgEtag);
  assert.notEqual(sanitizedBytes.length, svg.length);
  assert.notEqual(sanitizedBytes.length, sanitizedSvg.length);
  for (const contentType of ["image/svg+xml", "image/svg"]) {
    const image = { content: svg, contentType };
    const sanitizedResponse = createMediaBinaryResponse(image, null, sanitizeMediaSvg);
    assert.equal(sanitizedResponse.status, 200);
    assert.equal(sanitizedResponse.headers.get("content-type"), contentType);
    assert.equal(sanitizedResponse.headers.get("content-length"), String(sanitizedBytes.length));
    assert.equal(sanitizedResponse.headers.get("etag"), sanitizedSvgEtag);
    assert.equal(sanitizedResponse.headers.get("cache-control"), response.headers.get("cache-control"));
    assert.equal(
      sanitizedResponse.headers.get("content-security-policy"),
      response.headers.get("content-security-policy"),
    );
    assert.equal(sanitizedResponse.headers.get("x-content-type-options"), "nosniff");
    assert.deepEqual(Buffer.from(await sanitizedResponse.arrayBuffer()), sanitizedBytes);
    for (const validator of [rawSvgEtag, `W/${rawSvgEtag}`]) {
      const rawConditional = createMediaBinaryResponse(image, validator, sanitizeMediaSvg);
      assert.equal(rawConditional.status, 200);
      assert.equal(rawConditional.headers.get("etag"), sanitizedSvgEtag);
      assert.equal(rawConditional.headers.get("content-length"), String(sanitizedBytes.length));
      assert.deepEqual(Buffer.from(await rawConditional.arrayBuffer()), sanitizedBytes);
    }
    for (const validator of [sanitizedSvgEtag, `W/${sanitizedSvgEtag}`, "*"]) {
      const sanitizedConditional = createMediaBinaryResponse(image, validator, sanitizeMediaSvg);
      assert.equal(sanitizedConditional.status, 304);
      assert.equal(sanitizedConditional.body, null);
      assert.equal(sanitizedConditional.headers.get("etag"), sanitizedSvgEtag);
      assert.equal(sanitizedConditional.headers.has("content-length"), false);
    }
  }
  const boundNonSvg = createMediaBinaryResponse({ content: bytes, contentType: "image/png" }, null, sanitizeMediaSvg);
  assert.equal(boundNonSvg.headers.get("etag"), etag);
  assert.equal(boundNonSvg.headers.get("content-length"), String(bytes.length));
  assert.deepEqual(Buffer.from(await boundNonSvg.arrayBuffer()), bytes);
  assert.equal(mediaBinaryDisposition.status, "held");
  assert.deepEqual(mediaBinaryDescriptor.access, { kind: "public" });
  assert.equal("handle" in mediaBinaryDescriptor, false);

  let binaryReleases = 0;
  const binaryResources = {
    medias: sqliteSchema.medias,
    eq,
    async acquireReadAsync() {
      return {
        db,
        async assertCurrentAsync() {},
        async releaseAsync() {
          binaryReleases++;
        },
      };
    },
  };
  const binaryContext = {
    request: new Request("https://fixture.invalid/api/user-medias/other"),
    signal: new AbortController().signal,
    onDispose() {
      throw new Error("Unexpected acquisition after buffered response");
    },
  };
  const beforeBinary = queries.length;
  const binary = await readMediaBinaryResponseAsync(binaryResources, binaryContext, { id: "other" });
  assert.deepEqual(Buffer.from(await binary.arrayBuffer()), bytes);
  assert.equal(binary.headers.get("content-type"), "image/jpeg");
  assert.ok(queries[beforeBinary]);
  assert.match(queries[beforeBinary], /select "content", "contentType"/);
  assert.equal(queries[beforeBinary]?.includes("creatorId"), false);
  assert.equal((await readMediaBinaryResponseAsync(binaryResources, binaryContext, { id: "missing" })).status, 404);
  assert.equal(binaryReleases, 2);
  console.log(
    JSON.stringify({
      nativeUnmounted: mediaImplementedPaths,
      absentPending: mediaPendingPaths,
      binaryExecution: mediaBinaryDisposition.status,
      deniedListingQueries: 0,
      nonSvgSqliteByteAndEtagChecks: "passed",
      svgSecurityProof: "bounded-actual-engine-passed",
      svgContentTypes: ["image/svg+xml", "image/svg"],
      svgSourceProfile: { USE_PROFILES: { svg: true, svgFilters: true } },
      svgInputBytes: svg.length,
      svgSanitizedBytes: sanitizedBytes.length,
      svgRawEtag: rawSvgEtag,
      svgSanitizedEtag: sanitizedSvgEtag,
      svgRawValidatorRejected: true,
      dualEngineAtomicMutations: "held",
      externalCalls: 0,
    }),
  );
} finally {
  raw.close();
}
