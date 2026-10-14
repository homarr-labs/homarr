import type { FetchContribution } from "@homarr/contracts/contribution";
import type { RequestContext } from "@homarr/contracts/request";
import { hostPath } from "./configuration";
import type {
  CookieCodec,
  CultureFactories,
  PublicCultureOptions,
  PublicHostConfiguration,
  ProxySettingsReader,
} from "./contracts";

export function classifyPublicDocument<Locale extends string>(
  request: Request,
  configuration: Pick<PublicHostConfiguration, "basePath">,
  supportedLanguages: readonly Locale[],
) {
  if (request.method !== "GET" && request.method !== "HEAD") return { kind: "excluded" } as const;
  const pathname = new URL(request.url).pathname;
  const basePath = configuration.basePath;
  if (basePath && pathname !== basePath && !pathname.startsWith(`${basePath}/`)) {
    return { kind: "excluded" } as const;
  }
  const localPathname = pathname.slice(basePath.length) || "/";
  if (
    localPathname.includes(".") ||
    /^\/(?:api|rpc|auth|streams|binary|assets|_next|_vite|__vite|@vite|@fs|@id|favicon|robots)(?:\/|$)/u.test(
      localPathname,
    )
  ) {
    return { kind: "excluded" } as const;
  }
  const firstSegment = localPathname.split("/")[1];
  const explicitLocale = supportedLanguages.find((locale) => locale.toLowerCase() === firstSegment?.toLowerCase());
  const routingPathname =
    explicitLocale && firstSegment !== undefined ? localPathname.slice(firstSegment.length + 1) || "/" : localPathname;
  return { kind: "document", explicitLocale, routingPathname } as const;
}

export function createPublicCultureResources<
  Locale extends string,
  Options extends PublicCultureOptions,
  Culture,
  Preferences,
  Formatter,
  Settings extends { readonly appearance: { readonly defaultColorScheme: "light" | "dark" | "auto" } },
>(options: {
  readonly configuration: PublicHostConfiguration;
  readonly factories: CultureFactories<Locale, Options, Culture, Preferences, Formatter>;
  readonly cookies: CookieCodec;
  readonly colorSchemeCookieKey: "homarr.color-scheme";
  readonly proxyReader: Pick<ProxySettingsReader, "getDefaultLocaleAsync">;
  readSettingsAsync(context: RequestContext): Promise<Settings>;
  snapshotOptions(context: RequestContext, capturedNow: number): Options;
  now(): number;
  assertCurrent(): void;
}) {
  const trustedOrigin = new URL(options.configuration.baseUrl);
  const secure = trustedOrigin.protocol === "https:";
  const preparationKey = Symbol("public-request-culture");
  const classify = (request: Request) =>
    classifyPublicDocument(request, options.configuration, options.factories.supportedLanguages);

  function prepareAsync(context: RequestContext) {
    return context.memoize(preparationKey, async () => {
      options.assertCurrent();
      context.signal.throwIfAborted();
      const document = classify(context.request);
      if (document.kind !== "document") throw new Error("Culture preparation is limited to public document requests");
      if (context.principal.kind !== "anonymous") throw new Error("Private render resources are not joined");
      const capturedClock = options.now();
      if (!Number.isFinite(capturedClock)) throw new TypeError("Culture requires an explicit finite clock");
      const suppliedOptions = options.snapshotOptions(context, capturedClock);
      if (suppliedOptions.now !== undefined && !Number.isFinite(suppliedOptions.now.getTime())) {
        throw new TypeError("An explicitly supplied culture now must be a valid Date");
      }
      const snapshotOptions = Object.freeze({
        ...suppliedOptions,
        ...(suppliedOptions.now === undefined ? {} : { now: new Date(suppliedOptions.now.getTime()) }),
      });
      const preferences = options.cookies.parse(context.request.headers.get("cookie") ?? "");
      const resolved = await options.factories.resolveRequestLocale(
        {
          preferences: { get: (name) => preferences[name] },
          readDefaultLocale: () => options.proxyReader.getDefaultLocaleAsync(),
        },
        document.explicitLocale,
      );
      context.signal.throwIfAborted();
      const settings = await options.readSettingsAsync(context);
      const culture = await options.factories.loadRequestCulture(resolved, snapshotOptions);
      const culturePreferences = options.factories.resolveCulturePreferences(null);
      const formatter = options.factories.createCultureFormatter(culture, culturePreferences, {
        now: () => capturedClock,
      });
      const cookieColorScheme = preferences[options.colorSchemeCookieKey];
      const colorScheme =
        cookieColorScheme === "light" || cookieColorScheme === "dark" || cookieColorScheme === "auto"
          ? cookieColorScheme
          : settings.appearance.defaultColorScheme;
      if (colorScheme !== "light" && colorScheme !== "dark" && colorScheme !== "auto") {
        throw new Error("The source appearance preference is unsupported");
      }
      context.signal.throwIfAborted();
      options.assertCurrent();
      options.factories.syncLocalePreference(resolved, options.configuration.basePath, (effect) => {
        context.effect({
          kind: "cookie",
          value: options.cookies.serialize(effect.name, effect.value, { ...effect.options, secure }),
        });
      });
      return Object.freeze({
        revision: "homarr.public-resource-preparation.v1" as const,
        baseUrl: options.configuration.baseUrl,
        principal: Object.freeze({ kind: "anonymous" as const }),
        setup: context.setup,
        settings,
        colorScheme,
        culture,
        resolved: Object.freeze({ ...resolved }),
        culturePreferences: Object.freeze({ ...culturePreferences }),
        formatter,
        routingPathname: document.routingPathname,
        cultureSeed: Object.freeze({
          capturedClock,
          ...(snapshotOptions.now === undefined ? {} : { nowEpoch: snapshotOptions.now.getTime() }),
          ...(snapshotOptions.timeZone === undefined ? {} : { timeZone: snapshotOptions.timeZone }),
          ...(snapshotOptions.formats === undefined ? {} : { formats: structuredClone(snapshotOptions.formats) }),
        }),
      });
    });
  }

  const localeCommit: FetchContribution = {
    phase: "api",
    path: hostPath(options.configuration, "/api/preferences/locale"),
    access: { kind: "public" },
    async handle(context) {
      if (context.request.method !== "POST") {
        return { kind: "response", response: new Response(null, { status: 405, headers: { allow: "POST" } }) };
      }
      if (
        context.request.headers.get("origin") !== trustedOrigin.origin ||
        context.request.headers.get("sec-fetch-site") === "cross-site"
      ) {
        return { kind: "response", response: new Response(null, { status: 403 }) };
      }
      if (context.request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
        return { kind: "response", response: new Response(null, { status: 415 }) };
      }
      options.assertCurrent();
      context.signal.throwIfAborted();
      if (context.principal.kind !== "anonymous") {
        return { kind: "response", response: new Response(null, { status: 403 }) };
      }
      let value: unknown;
      try {
        value = await readBoundedJsonAsync(
          context.request,
          context.signal,
          options.configuration.localeMutationBodyLimit,
        );
      } catch (error) {
        if (!(error instanceof LocaleInputError)) throw error;
        return { kind: "response", response: new Response(null, { status: error.status }) };
      }
      if (typeof value !== "object" || value === null || !("locale" in value) || Object.keys(value).length !== 1) {
        return { kind: "response", response: new Response(null, { status: 400 }) };
      }
      const requestedLocale = value.locale;
      const locale = options.factories.supportedLanguages.find((candidate) => candidate === requestedLocale);
      if (locale === undefined) return { kind: "response", response: new Response(null, { status: 400 }) };
      context.signal.throwIfAborted();
      options.assertCurrent();
      const effect = options.factories.createLocaleCookieEffect(locale, options.configuration.basePath);
      context.effect({
        kind: "cookie",
        value: options.cookies.serialize(effect.name, effect.value, { ...effect.options, secure }),
      });
      return { kind: "response", response: new Response(null, { status: 204 }) };
    },
  };

  return Object.freeze({ prepareAsync, localeCommit, classify });
}

class LocaleInputError extends Error {
  constructor(readonly status: 400 | 413) {
    super("Invalid locale mutation input");
  }
}

async function readBoundedJsonAsync(request: Request, signal: AbortSignal, limit: number): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const length = Number(contentLength);
    if (!/^\d+$/u.test(contentLength) || !Number.isSafeInteger(length)) throw new LocaleInputError(400);
    if (length > limit) throw new LocaleInputError(413);
  }
  if (!request.body) throw new LocaleInputError(400);
  const reader = request.body.getReader();
  let cancellation: Promise<void> | undefined;
  const cancel = () => {
    cancellation ??= reader.cancel(signal.reason);
    void cancellation.catch(() => undefined);
  };
  signal.addEventListener("abort", cancel, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  let finished = false;
  try {
    signal.throwIfAborted();
    while (true) {
      const result = await reader.read();
      signal.throwIfAborted();
      if (result.done) {
        finished = true;
        break;
      }
      size += result.value.byteLength;
      if (size > limit) throw new LocaleInputError(413);
      chunks.push(result.value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
    } catch {
      throw new LocaleInputError(400);
    }
  } finally {
    signal.removeEventListener("abort", cancel);
    try {
      if (!finished) await (cancellation ?? reader.cancel());
    } finally {
      reader.releaseLock();
    }
  }
}
