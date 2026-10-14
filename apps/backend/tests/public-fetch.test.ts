import { expect, test } from "bun:test";

import type { RequestContext } from "@homarr/contracts/request";
import {
  createCultureFormatter,
  loadRequestCulture,
  resolveCulturePreferences,
  resolveRequestLocale,
} from "@homarr/translation/runtime";

import { bootstrapSchema, publicSettingsSchema } from "../../nitro/src/contracts/render";
import { createApplication } from "../src/server/application";
import { renderPublicPage } from "../../nitro/src/ssr/render";

async function prepareSyntheticPublicPage(
  context: RequestContext,
  locale: "en" | "he" = "en",
  colorScheme: "light" | "dark" = "light",
): Promise<Parameters<typeof renderPublicPage>[2]> {
  context.signal.throwIfAborted();
  if (context.principal.kind !== "anonymous")
    throw new Error("Synthetic public rendering requires an anonymous request");
  const capturedClock = 1_700_000_000_000;
  const timeZone = "UTC";
  const resolved = await resolveRequestLocale({
    preferences: { get: () => undefined },
    readDefaultLocale: async () => locale,
  });
  const culture = await loadRequestCulture(resolved, { now: new Date(capturedClock), timeZone });
  const culturePreferences = resolveCulturePreferences(null);
  const serverSettings = publicSettingsSchema.parse({
    board: {
      homeBoardId: null,
      mobileHomeBoardId: null,
      enableStatusByDefault: false,
      forceDisableStatus: false,
    },
    search: { defaultSearchEngineId: null },
    user: { enableGravatar: false },
    branding: {
      appName: "Synthetic public fetch",
      greeting: "",
      logoImageUrl: null,
      faviconImageUrl: null,
      primaryColor: "#fa5252",
      secondaryColor: "#fd7e14",
      lockPrimaryColor: false,
      signInBackgroundImageUrl: null,
      signInBackgroundOverlay: 0,
      authBranding: { showAppName: true, showLogo: false, showGreeting: false },
      defaultRadius: "md",
      customCss: "",
    },
  });
  context.signal.throwIfAborted();
  return {
    revision: "homarr.public-resource-preparation.v1",
    baseUrl: "http://127.0.0.1:3200",
    principal: context.principal,
    setup: context.setup,
    settings: {
      culture: { defaultLocale: resolved.defaultLocale },
      appearance: { defaultColorScheme: colorScheme },
      serverSettings,
    },
    colorScheme,
    culture,
    resolved,
    culturePreferences,
    formatter: createCultureFormatter(culture, culturePreferences, { now: () => capturedClock }),
    routingPathname: new URL(context.request.url).pathname,
    cultureSeed: { capturedClock, nowEpoch: capturedClock, timeZone },
  };
}

test("unconfigured protected contributions deny forged identities before their handler runs", async () => {
  const application = createApplication({
    contributions: [
      {
        id: "protected-boundary",
        routes: [
          {
            phase: "api",
            path: "/api/private",
            access: { kind: "protected", action: "read", resource: "private" },
            handle: async () => ({ kind: "response", response: Response.json({ private: "must not render" }) }),
          },
        ],
      },
    ],
  });
  const response = await application.fetch(
    new Request("http://127.0.0.1:3200/api/private", {
      headers: { cookie: "admin=true", authorization: "Bearer forged", "x-user-id": "admin" },
    }),
  );
  expect(response.status).toBe(401);
  expect(await response.text()).not.toContain("must not render");
  await application.dispose();
});

test("SSR redirects, nested not-found, denied management and failed contributions retain correct HTTP outcomes", async () => {
  const application = createApplication({
    render: async (context) =>
      renderPublicPage(context, { css: [], js: [] }, await prepareSyntheticPublicPage(context)),
    contributions: [
      {
        id: "failure-boundary",
        routes: [
          {
            phase: "api",
            path: "/api/failure",
            access: { kind: "public" },
            async handle() {
              throw new Error("Private diagnostic must not be serialized");
            },
          },
        ],
      },
    ],
  });
  const redirect = await application.fetch(new Request("http://127.0.0.1:3200/management"));
  expect(redirect.status).toBe(302);
  expect(redirect.headers.get("location")).toBe("/manage");
  const missing = await application.fetch(new Request("http://127.0.0.1:3200/about/runtime/missing"));
  expect(missing.status).toBe(404);
  expect(await missing.text()).toContain("Page not found");
  const denied = await application.fetch(new Request("http://127.0.0.1:3200/manage"));
  expect(denied.status).toBe(401);
  expect(await denied.text()).toContain("Access denied");
  const failed = await application.fetch(new Request("http://127.0.0.1:3200/api/failure"));
  expect(failed.status).toBe(500);
  expect(await failed.text()).not.toContain("Private diagnostic");
  const apiMissing = await application.fetch(new Request("http://127.0.0.1:3200/api/unknown"));
  expect(apiMissing.status).toBe(404);
  expect(apiMissing.headers.get("content-type")).toContain("application/json");
  const head = await application.fetch(new Request("http://127.0.0.1:3200/", { method: "HEAD" }));
  expect(head.status).toBe(200);
  expect(await head.text()).toBe("");
  const unknown = await application.fetch(new Request("http://127.0.0.1:3200/not-a-page"));
  expect(unknown.status).toBe(404);
  expect(await unknown.text()).toContain("Page not found");
  await application.dispose();
});

test("public cold SSR is uncached and gives each concurrent request its own safe snapshot", async () => {
  const memoKey = Symbol("request-isolation");
  const application = createApplication({
    async render(context) {
      const values = await Promise.all([
        context.memoize(memoKey, async () => context.requestId),
        context.memoize(memoKey, async () => "must not replace this request's memo"),
      ]);
      expect(values).toEqual([context.requestId, context.requestId]);
      const details = new URL(context.request.url).searchParams.get("view") === "details";
      return renderPublicPage(
        context,
        { css: [], js: [] },
        await prepareSyntheticPublicPage(context, details ? "he" : "en", details ? "dark" : "light"),
      );
    },
  });
  const documents = await Promise.all(
    Array.from({ length: 8 }, async (_, index) => {
      const response = await application.fetch(
        new Request(`http://127.0.0.1:3200/about/runtime/foundation?view=${index % 2 ? "details" : "summary"}`, {
          headers: { cookie: `session=private-${index}`, authorization: `Bearer secret-${index}` },
        }),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      const html = await response.text();
      expect(html).toContain("Runtime foundation");
      expect(html).not.toContain(`private-${index}`);
      expect(html).not.toContain(`secret-${index}`);
      const match = /<script id="homarr-bootstrap" type="application\/json">([^<]+)<\/script>/.exec(html);
      expect(match?.[1]).toBeDefined();
      const bootstrap = bootstrapSchema.parse(JSON.parse(match?.[1] ?? "null"));
      expect(bootstrap.snapshot.session.kind).toBe("anonymous");
      expect(bootstrap.snapshot.locale).toBe(index % 2 ? "he" : "en");
      expect(bootstrap.snapshot.theme).toBe(index % 2 ? "dark" : "light");
      expect(bootstrap.snapshot.direction).toBe(index % 2 ? "rtl" : "ltr");
      expect(Object.isFrozen(bootstrap.snapshot)).toBe(true);
      return bootstrap.snapshot.requestId;
    }),
  );
  expect(new Set(documents).size).toBe(8);
  await application.dispose();
});

test("response effects preserve multiple cookies and request resources live until the body closes", async () => {
  let disposed = false;
  const application = createApplication({
    contributions: [
      {
        id: "response-boundary",
        routes: [
          {
            phase: "api",
            path: "/api/response",
            access: { kind: "public" },
            async handle(context) {
              context.onDispose(() => {
                disposed = true;
              });
              context.effect({ kind: "cookie", value: "first=one; HttpOnly; Path=/" });
              context.effect({ kind: "cookie", value: "second=two; HttpOnly; Path=/" });
              return { kind: "response", response: new Response("Public response") };
            },
          },
        ],
      },
    ],
  });
  const response = await application.fetch(new Request("http://127.0.0.1:3200/api/response"));
  expect(response.headers.getSetCookie()).toEqual(["first=one; HttpOnly; Path=/", "second=two; HttpOnly; Path=/"]);
  expect(disposed).toBe(false);
  expect(await response.text()).toBe("Public response");
  expect(disposed).toBe(true);
  await application.dispose();
});

test("shutdown waits for asynchronous source cancellation before disposing request and contribution resources", async () => {
  const cancellationStarted = Promise.withResolvers<void>();
  const releaseCancellation = Promise.withResolvers<void>();
  const events: string[] = [];
  const application = createApplication({
    contributions: [
      {
        id: "stream-lifetime",
        routes: [
          {
            phase: "stream",
            path: "/streams/lifetime",
            access: { kind: "public" },
            async handle(context) {
              context.onDispose(() => {
                events.push("request-disposed");
              });
              return {
                kind: "response",
                response: new Response(
                  new ReadableStream<Uint8Array>({
                    async cancel() {
                      events.push("cancel-started");
                      cancellationStarted.resolve();
                      await releaseCancellation.promise;
                      events.push("cancel-settled");
                    },
                  }),
                ),
              };
            },
          },
        ],
        dispose() {
          events.push("contribution-disposed");
        },
      },
    ],
  });
  const response = await application.fetch(new Request("http://127.0.0.1:3200/streams/lifetime"));
  const shutdown = application.dispose();
  try {
    await cancellationStarted.promise;
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(events).toEqual(["cancel-started"]);
    releaseCancellation.resolve();
    await shutdown;
    expect(events).toEqual(["cancel-started", "cancel-settled", "request-disposed", "contribution-disposed"]);
    await expect(response.text()).rejects.toThrow("Request aborted");
  } finally {
    releaseCancellation.resolve();
    await shutdown;
  }
});

test.each(["handler-abort", "render-abort", "finalization-error"] as const)(
  "discarded response cancellation settles before request disposal: %s",
  async (scenario) => {
    const abort = new AbortController();
    const cancellationStarted = Promise.withResolvers<void>();
    const releaseCancellation = Promise.withResolvers<void>();
    const events: string[] = [];
    const source = new Response(
      new ReadableStream<Uint8Array>({
        async cancel() {
          events.push("cancel-started");
          cancellationStarted.resolve();
          await releaseCancellation.promise;
          events.push("cancel-settled");
        },
      }),
    );
    async function returnResponse(context: RequestContext) {
      context.onDispose(() => {
        events.push("request-disposed");
      });
      if (scenario === "finalization-error")
        context.effect({ kind: "header", name: "Set-Cookie", value: "invalid=effect", mode: "set" });
      else abort.abort();
      return source;
    }
    const application = createApplication({
      render: returnResponse,
      contributions:
        scenario === "render-abort"
          ? []
          : [
              {
                id: "discarded-response",
                routes: [
                  {
                    phase: "api",
                    path: "/api/discarded",
                    access: { kind: "public" },
                    async handle(context) {
                      return { kind: "response", response: await returnResponse(context) };
                    },
                  },
                ],
              },
            ],
    });
    const result = application.fetch(
      new Request(`http://127.0.0.1:3200/${scenario === "render-abort" ? "discarded" : "api/discarded"}`, {
        signal: abort.signal,
      }),
    );
    try {
      await Promise.race([
        cancellationStarted.promise,
        result.then(() => {
          throw new Error("Response completed without source cancellation");
        }),
      ]);
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(events).toEqual(["cancel-started"]);
      releaseCancellation.resolve();
      const response = await result;
      expect(response.status).toBe(scenario === "finalization-error" ? 500 : 499);
      expect(events).toEqual(["cancel-started", "cancel-settled", "request-disposed"]);
    } finally {
      releaseCancellation.resolve();
      await result;
      await source.body?.cancel();
      await application.dispose();
    }
  },
);

test.each(["HEAD", "consumer"] as const)(
  "failed asynchronous cancellation settles once before shutdown disposal: %s",
  async (scenario) => {
    const cancellationStarted = Promise.withResolvers<void>();
    const releaseCancellation = Promise.withResolvers<void>();
    const events: string[] = [];
    const errors: unknown[] = [];
    const failure = new Error("Source cancellation failed");
    const application = createApplication({
      reportError(error) {
        errors.push(error);
      },
      async render(context) {
        context.onDispose(() => {
          events.push("request-disposed");
        });
        return new Response(
          new ReadableStream<Uint8Array>({
            async cancel() {
              events.push("cancel-started");
              cancellationStarted.resolve();
              await releaseCancellation.promise;
              events.push("cancel-settled");
              throw failure;
            },
          }),
        );
      },
    });
    const response = application.fetch(
      new Request("http://127.0.0.1:3200/response", {
        method: scenario === "HEAD" ? "HEAD" : "GET",
      }),
    );
    const cancellation =
      scenario === "consumer"
        ? (await response).body?.cancel().then(
            () => undefined,
            (error: unknown) => error,
          )
        : undefined;
    await cancellationStarted.promise;
    const shutdown = application.dispose();
    try {
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(events).toEqual(["cancel-started"]);
      releaseCancellation.resolve();
      await shutdown;
      if (scenario === "consumer") expect(await cancellation).toBe(failure);
      else {
        expect((await response).status).toBe(499);
        expect(errors).toEqual([failure]);
      }
      expect(events).toEqual(["cancel-started", "cancel-settled", "request-disposed"]);
    } finally {
      releaseCancellation.resolve();
      await shutdown;
      await response;
      await cancellation;
    }
  },
);
