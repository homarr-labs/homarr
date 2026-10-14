import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import { TYPE } from "@formatjs/icu-messageformat-parser";
import { IntlMessageFormat } from "intl-messageformat";
import type { ReactNode } from "react";
import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createFormatter, createTranslator } from "use-intl/core";
import type { IntlError, RichTranslationValues } from "use-intl/core";
import {
  IntlProvider,
  useFormatter,
  useLocale,
  useMessages,
  useNow,
  useTimeZone,
  useTranslations,
} from "use-intl/react";

import { engineMessages, leaves, loadCatalogs, removeEmptyTranslations } from "./catalogs";
import type { Catalog, LoadedCatalog } from "./catalogs";
import type { TranslationObjectCandidate } from "./type-contract";
import { createTypedCandidate } from "./type-contract";

const fixtureNow = new Date("2026-10-10T12:00:00.000Z");
const fixtureInstant = new Date("2026-03-29T00:30:00.000Z");
const fixtureZone = "UTC";
const require = createRequire(import.meta.url);
const mode = process.argv.includes("--development-contract") ? "development" : "production";
assert(require.resolve("use-intl/core").includes(`/esm/${mode}/`));
const bunRuntime: unknown = Reflect.get(globalThis, "Bun");
assert(
  bunRuntime && typeof bunRuntime === "object" && "version" in bunRuntime && typeof bunRuntime.version === "string",
);

type Failure =
  | { kind: "parse"; locale: string; key: string; message: string; detail: string }
  | { kind: "format"; locale: string; key: string; code: string; detail: string };
type Ast = ReturnType<IntlMessageFormat["getAst"]>;

function assertReactNode(value: unknown): asserts value is ReactNode {
  if (value == null || ["string", "number", "bigint", "boolean"].includes(typeof value) || isValidElement(value))
    return;
  if (Array.isArray(value)) {
    for (const child of value) assertReactNode(child);
    return;
  }
  throw new Error("Unexpected rich translation result");
}

async function installedPackage(entry: string) {
  let directory = dirname(require.resolve(entry));
  for (;;) {
    try {
      const file = join(directory, "package.json");
      const data: unknown = JSON.parse(await readFile(file, "utf8"));
      assert(data && typeof data === "object" && "version" in data && typeof data.version === "string");
      return { file, version: data.version, data };
    } catch {
      const parent = dirname(directory);
      if (parent === directory) throw new Error(`Package manifest not found for ${entry}`);
      directory = parent;
    }
  }
}

function valuesFor(ast: Ast): RichTranslationValues {
  const values: RichTranslationValues = {};
  function visit(elements: Ast) {
    for (const element of elements) {
      switch (element.type) {
        case TYPE.argument:
          values[element.value] ??= "fixture";
          break;
        case TYPE.number:
        case TYPE.plural:
          values[element.value] = 2;
          if (element.type === TYPE.plural) Object.values(element.options).forEach((option) => visit(option.value));
          break;
        case TYPE.date:
        case TYPE.time:
          values[element.value] = fixtureInstant;
          break;
        case TYPE.select:
          values[element.value] = "other";
          Object.values(element.options).forEach((option) => visit(option.value));
          break;
        case TYPE.tag:
          values[element.value] = (chunks) => <span data-fixture-tag={element.value}>{chunks}</span>;
          visit(element.children);
          break;
        case TYPE.literal:
        case TYPE.pound:
          break;
      }
    }
  }
  visit(ast);
  return values;
}

function summarizeAst(ast: Ast): { rich: boolean; plural: boolean; number: boolean; dynamic: boolean } {
  const summary = { rich: false, plural: false, number: false, dynamic: false };
  for (const element of ast) {
    if (element.type !== TYPE.literal) summary.dynamic = true;
    if (element.type === TYPE.number) summary.number = true;
    if (element.type === TYPE.tag) {
      summary.rich = true;
      const nested = summarizeAst(element.children);
      summary.plural ||= nested.plural;
      summary.number ||= nested.number;
    }
    if (element.type === TYPE.plural || element.type === TYPE.select) {
      summary.plural ||= element.type === TYPE.plural;
      for (const option of Object.values(element.options)) {
        const nested = summarizeAst(option.value);
        summary.rich ||= nested.rich;
        summary.plural ||= nested.plural;
        summary.number ||= nested.number;
      }
    }
  }
  return summary;
}

function translator(catalog: LoadedCatalog, errors: IntlError[] = []) {
  return createTranslator({
    locale: catalog.locale,
    messages: catalog.messages as TranslationObjectCandidate,
    timeZone: fixtureZone,
    onError: (error) => errors.push(error),
  });
}

function verifyFallback(catalogs: LoadedCatalog[]) {
  const english = catalogs.find(({ locale }) => locale === "en");
  assert(english);
  const englishLeaves = new Map(leaves(english.raw));
  let blankFallbacks = 0;
  let extraKeys = 0;
  let whitespacePreserved = 0;
  for (const catalog of catalogs) {
    const merged = new Map(leaves(catalog.messages));
    const raw = new Map(leaves(catalog.raw));
    for (const [key, englishValue] of englishLeaves) {
      const selected = raw.get(key);
      assert.equal(merged.get(key), selected?.trim() ? selected : englishValue);
    }
    for (const [key, value] of raw) {
      if (value.trim() === "") {
        if (englishLeaves.has(key)) blankFallbacks++;
        else assert(!merged.has(key));
      } else {
        assert.equal(merged.get(key), value);
        if (!englishLeaves.has(key)) extraKeys++;
        if (value !== value.trim()) whitespacePreserved++;
      }
    }
    assert(Object.isFrozen(catalog.messages));
  }
  const fixture: Catalog = { nested: { blank: " \n\t", present: "  preserved  " }, extra: "extra" };
  assert.deepEqual(removeEmptyTranslations(fixture), { nested: { present: "  preserved  " }, extra: "extra" });
  return { blankFallbacks, nonblankExtraKeys: extraKeys, nonblankWhitespaceLeaves: whitespacePreserved };
}

function catalogSweep(catalogs: LoadedCatalog[]) {
  const failures: Failure[] = [];
  const englishKeys = new Set(leaves(catalogs.find((item) => item.locale === "en")?.raw ?? {}).map(([key]) => key));
  const units = catalogs.map((catalog) => {
    const errors: IntlError[] = [];
    const t = translator(catalog, errors);
    const raw = leaves(catalog.raw);
    let parsed = 0;
    let dynamicFormatted = 0;
    let richRendered = 0;
    let plurals = 0;
    let numbers = 0;
    for (const [key, message] of raw) {
      try {
        new IntlMessageFormat(message, catalog.locale).getAst();
        parsed++;
      } catch (error) {
        failures.push({ kind: "parse", locale: catalog.locale, key, message, detail: String(error) });
      }
    }
    for (const [key, message] of leaves(catalog.messages)) {
      let ast: Ast;
      try {
        ast = new IntlMessageFormat(message, catalog.locale).getAst();
      } catch {
        continue;
      }
      const summary = summarizeAst(ast);
      if (summary.plural) plurals++;
      if (summary.number) numbers++;
      if (!summary.dynamic) continue;
      const previousErrors = errors.length;
      const result: unknown = Reflect.apply(t.rich, undefined, [key, valuesFor(ast)]);
      assertReactNode(result);
      dynamicFormatted++;
      if (summary.rich) {
        const html = renderToStaticMarkup(<div>{result}</div>);
        assert(!html.includes("<script"));
        richRendered++;
      }
      for (const error of errors.slice(previousErrors)) {
        failures.push({ kind: "format", locale: catalog.locale, key, code: error.code, detail: error.message });
      }
    }
    const rawMap = new Map(raw);
    const mergedMap = new Map(leaves(catalog.messages));
    return {
      locale: catalog.locale,
      sha256: catalog.hash,
      rawStringLeaves: raw.length,
      blankStringLeaves: raw.filter(([, message]) => message.trim() === "").length,
      mergedStringLeaves: mergedMap.size,
      parsedRawLeaves: parsed,
      dynamicFormatted,
      richRendered,
      pluralMessages: plurals,
      numberMessages: numbers,
      extraKeys: [...rawMap.keys()].filter((key) => !englishKeys.has(key)),
    };
  });
  const malformedRuntime = failures
    .filter((failure) => failure.kind === "parse")
    .map((failure) => {
      const catalog = catalogs.find((item) => item.locale === failure.locale);
      assert(catalog);
      const errors: IntlError[] = [];
      const t = translator(catalog, errors);
      const withoutValues: unknown = Reflect.apply(t, undefined, [failure.key]);
      const withEmptyValues: unknown = Reflect.apply(t, undefined, [failure.key, {}]);
      assert.equal(withEmptyValues, failure.key);
      assert.equal(errors.at(-1)?.code, "INVALID_MESSAGE");
      assert.equal(withoutValues, mode === "development" ? failure.key : failure.message);
      return {
        locale: failure.locale,
        key: failure.key,
        withoutValues,
        withEmptyValues,
        errorCodes: errors.map(({ code }) => code),
      };
    });
  return { units, failures, malformedRuntime };
}

function verifyErrors() {
  const errors: IntlError[] = [];
  const messages = { sample: { plain: "Hello {name}", rich: "<b>{name}</b>", bad: "{count, plural, one {oops}}" } };
  const t = createTranslator<Record<string, Record<string, string>>, string>({
    locale: "en",
    messages,
    namespace: "sample",
    onError: (error) => errors.push(error),
  });
  assert.equal(t.has("missing"), false);
  assert.equal(errors.length, 0);
  assert.equal(t("missing"), "sample.missing");
  const withoutValues = t("plain");
  assert.equal(withoutValues, mode === "development" ? "sample.plain" : "Hello {name}");
  assert.equal(t("plain", {}), "sample.plain");
  assert.equal(t("bad", { count: 2 }), "sample.bad");
  const invalidRich: unknown = Reflect.apply(t, undefined, [
    "rich",
    { name: "fixture", b: (chunks: ReactNode) => <b>{chunks}</b> },
  ]);
  assert.equal(invalidRich, "sample.rich");
  const raw: unknown = t.raw("plain");
  assert.equal(raw, "Hello {name}");
  assert.equal(t.markup("rich", { name: "fixture", b: (chunks) => `<b>${chunks}</b>` }), "<b>fixture</b>");
  const missingNamespace = createTranslator<Record<string, Record<string, string>>, string>({
    locale: "en",
    messages,
    namespace: "absent",
    onError: (error) => errors.push(error),
  });
  assert.equal(missingNamespace("anything"), "absent.anything");
  const custom = createTranslator<Record<string, Record<string, string>>, string>({
    locale: "en",
    messages,
    namespace: "sample",
    onError: (error) => errors.push(error),
    getMessageFallback: ({ namespace, key, error }) => `${error.code}:${namespace}.${key}`,
  });
  assert.equal(custom("missing"), "MISSING_MESSAGE:sample.missing");
  assert.deepEqual(
    errors.map(({ code }) => code),
    [
      "MISSING_MESSAGE",
      ...(mode === "development" ? ["FORMATTING_ERROR"] : []),
      "FORMATTING_ERROR",
      "INVALID_MESSAGE",
      "INVALID_MESSAGE",
      "MISSING_MESSAGE",
      "MISSING_MESSAGE",
    ],
  );
  return {
    defaultMissingFallback: "sample.missing",
    customMissingFallback: "MISSING_MESSAGE:sample.missing",
    missingInterpolationWithoutValues: withoutValues,
    errors: errors.map(({ code, message }) => ({ code, message })),
  };
}

function verifyPlurals() {
  const samples = [0, 1, 2, 3, 5, 11, 21, 22, 101, 1.5];
  const results = ["en", "ru", "pl", "he"].map((locale) => {
    const t = createTranslator({
      locale,
      messages: {
        category: "{count, plural, zero {zero} one {one} two {two} few {few} many {many} other {other}}",
        exact: "{count, plural, =0 {exact-zero} =1 {exact-one} one {category-one} other {category-other}}",
        escaped: "It's '{name}' and ''{name}''",
        nested: "<outer><inner>{name}</inner></outer><empty></empty>",
      },
      onError: (error) => {
        throw error;
      },
    });
    const values = samples.map((count) => {
      const category = t("category", { count });
      assert.equal(category, new Intl.PluralRules(locale).select(count));
      return { count, category };
    });
    assert.equal(t("exact", { count: 0 }), "exact-zero");
    assert.equal(t("exact", { count: 1 }), "exact-one");
    const numericStringExact: unknown = Reflect.apply(t, undefined, ["exact", { count: "1" }]);
    assert.equal(numericStringExact, "exact-one");
    assert.equal(t("escaped", { name: "Ada" }), "It's {name} and 'Ada'");
    const html = renderToStaticMarkup(
      <div>
        {t.rich("nested", {
          name: "<script>alert(1)</script>",
          outer: (chunks) => <strong>{chunks}</strong>,
          inner: (chunks) => <em>{chunks}</em>,
          empty: () => <a href="/fixture/docs">Docs</a>,
        })}
      </div>,
    );
    assert.equal(
      html,
      '<div><strong><em>&lt;script&gt;alert(1)&lt;/script&gt;</em></strong><a href="/fixture/docs">Docs</a></div>',
    );
    return { locale, values, numericStringExact, nestedRichHtml: html };
  });
  return results;
}

function richExamples(catalog: LoadedCatalog) {
  const t = translator(catalog);
  return {
    app: renderToStaticMarkup(
      <div>{t.rich("widget.common.app.description", { here: () => <a href="/fixture/apps/new">here</a> })}</div>,
    ),
    docs: renderToStaticMarkup(
      <div>{t.rich("group.reservedNotice.message", { checkoutDocs: () => <a href="/fixture/docs">Docs</a> })}</div>,
    ),
    status: renderToStaticMarkup(
      <div>
        {t.rich("integration.testConnection.error.statusCode.description", {
          statusCode: 503,
          reason: "<unavailable>",
          url: () => <a href="/fixture/status">status</a>,
        })}
      </div>,
    ),
    certificate: renderToStaticMarkup(
      <div>
        {t.rich("integration.testConnection.error.certificate.alert.extract.message", {
          docsLink: () => <a href="/fixture/certificates">Docs</a>,
        })}
      </div>,
    ),
    invite: renderToStaticMarkup(
      <div>{t.rich("management.page.user.invite.action.copy.description", { b: (chunks) => <b>{chunks}</b> })}</div>,
    ),
    assistant: renderToStaticMarkup(
      <div>
        {t.rich("assistant.providerQuota.reset", {
          relative: "in 2 hours",
          time: () => <time dateTime={fixtureNow.toISOString()}>12:00 UTC</time>,
        })}
      </div>,
    ),
  };
}

function verifyFormatting(catalogs: LoadedCatalog[]) {
  const actualPluralKey = "init.studio.board.columnCount";
  const actualNumberKey = "customWidget.editor.status.characters";
  const samples = [0, 1, 2, 5, 11, 21, 22, 1.5];
  return ["en", "fr", "ru", "pl", "he"].map((locale) => {
    const catalog = catalogs.find((item) => item.locale === locale);
    assert(catalog);
    const errors: IntlError[] = [];
    const t = translator(catalog, errors);
    const format = createFormatter({
      locale,
      timeZone: fixtureZone,
      now: fixtureNow,
      onError: (error) => errors.push(error),
    });
    const numberOptions = { maximumFractionDigits: 2 };
    const dateOptions = { dateStyle: "full", timeStyle: "short", hour12: false } as const;
    const number = format.number(12345.67, numberOptions);
    const date = format.dateTime(fixtureInstant, dateOptions);
    const relative = format.relativeTime(new Date(fixtureNow.getTime() - 3600000), { unit: "hour" });
    assert.equal(number, new Intl.NumberFormat(locale, numberOptions).format(12345.67));
    assert.equal(
      date,
      new Intl.DateTimeFormat(locale, { ...dateOptions, timeZone: fixtureZone }).format(fixtureInstant),
    );
    assert.equal(relative, new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-1, "hour"));
    const raw = new Map(leaves(catalog.messages));
    const pluralMessage = raw.get(actualPluralKey);
    const numberMessage = raw.get(actualNumberKey);
    assert(pluralMessage && numberMessage);
    const pluralFormatter = new IntlMessageFormat(pluralMessage, locale);
    const pluralOutputs = samples.map((count) => {
      const output = t(actualPluralKey, { count });
      assert.equal(output, pluralFormatter.format({ count }));
      return { count, output };
    });
    const numericString: unknown = Reflect.apply(t, undefined, [actualPluralKey, { count: "2" }]);
    assert.equal(numericString, pluralFormatter.format({ count: "2" }));
    const numberOutput = t(actualNumberKey, { count: 12345.67 });
    assert.equal(numberOutput, new IntlMessageFormat(numberMessage, locale).format({ count: 12345.67 }));
    assert.deepEqual(errors, []);
    return {
      locale,
      number,
      date,
      relative,
      actualPluralKey,
      pluralOutputs,
      numericString,
      actualNumberKey,
      numberOutput,
    };
  });
}

function appLink() {
  return <a href="/fixture/apps/new">here</a>;
}

function HookView() {
  const t = useTranslations();
  const scoped = useTranslations("widget.common.app");
  const format = useFormatter();
  const now = useNow();
  const locale = useLocale();
  const zone = useTimeZone();
  const messages = useMessages();
  assert.equal(now.toISOString(), fixtureNow.toISOString());
  assert.equal(zone, fixtureZone);
  assert(t.has("widget.common.app.description"));
  assert("widget" in messages);
  return (
    <section data-locale={locale} data-zone={zone} data-now={now.toISOString()}>
      <p>{scoped.rich("description", { here: appLink })}</p>
      <p>{t("init.studio.board.columnCount", { count: 2 })}</p>
      <p>{format.number(12345.67, { maximumFractionDigits: 2 })}</p>
      <p>{format.dateTime(fixtureInstant, { dateStyle: "full", timeStyle: "short", hour12: false })}</p>
      <p>{format.relativeTime(new Date(fixtureNow.getTime() - 3600000), { unit: "hour" })}</p>
    </section>
  );
}

async function verifyConcurrentRequests(catalogs: LoadedCatalog[]) {
  const pair = ["en", "he"].map((locale) => {
    const catalog = catalogs.find((item) => item.locale === locale);
    assert(catalog);
    return catalog;
  });
  const { promise: bothReady, resolve: arrive } = Promise.withResolvers<void>();
  let waiting = 0;
  const results = await Promise.all(
    pair.map(async (catalog) => {
      const errors: IntlError[] = [];
      const t = translator(catalog, errors);
      const formatter = createFormatter({
        locale: catalog.locale,
        timeZone: fixtureZone,
        now: fixtureNow,
        onError: (error) => errors.push(error),
      });
      const before = t("init.studio.board.columnCount", { count: 2 });
      if (++waiting === 2) arrive();
      await bothReady;
      for (let iteration = 0; iteration < 12; iteration++) {
        await Promise.resolve();
        assert.equal(t("init.studio.board.columnCount", { count: 2 }), before);
      }
      const numberOptions = { maximumFractionDigits: 2 };
      assert.equal(
        formatter.number(12345.67, numberOptions),
        new Intl.NumberFormat(catalog.locale, numberOptions).format(12345.67),
      );
      assert.equal(
        formatter.relativeTime(new Date(fixtureNow.getTime() - 3600000), { unit: "hour" }),
        new Intl.RelativeTimeFormat(catalog.locale, { numeric: "auto" }).format(-1, "hour"),
      );
      const html = renderToStaticMarkup(
        <IntlProvider
          locale={catalog.locale}
          messages={engineMessages(catalog.messages)}
          timeZone={fixtureZone}
          now={fixtureNow}
          onError={(error) => errors.push(error)}
        >
          <HookView />
        </IntlProvider>,
      );
      assert(html.includes(`data-locale="${catalog.locale}"`));
      assert.deepEqual(errors, []);
      return {
        catalogLocale: catalog.locale,
        messageEngineLocale: catalog.locale,
        formatterLocale: catalog.locale,
        fixtureZone,
        fixtureNow: fixtureNow.toISOString(),
        before,
        after: t("init.studio.board.columnCount", { count: 2 }),
        number: formatter.number(12345.67, numberOptions),
        html,
      };
    }),
  );
  assert.notEqual(results[0]?.before, results[1]?.before);
  return results;
}

const packages = Object.fromEntries(
  await Promise.all(
    [
      "next-intl",
      "use-intl/core",
      "react",
      "react-dom/server",
      "intl-messageformat",
      "@formatjs/icu-messageformat-parser",
      "deepmerge",
    ].map(async (entry) => {
      const { version, file, data } = await installedPackage(entry);
      return [
        entry,
        {
          version,
          file,
          ...(entry === "next-intl" && "dependencies" in data ? { dependencies: data.dependencies } : {}),
        },
      ];
    }),
  ),
);
assert.equal(packages["use-intl/core"]?.version, "4.13.1");
assert.equal(packages["next-intl"]?.version, "4.13.1");
const catalogs = await loadCatalogs();
const fallback = verifyFallback(catalogs);
const sweep = catalogSweep(catalogs);
const english = catalogs.find(({ locale }) => locale === "en");
assert(english);
const errors = verifyErrors();
const plurals = verifyPlurals();
const formatting = verifyFormatting(catalogs);
const rich = richExamples(english);
const typedCandidate = createTypedCandidate(english.messages as TranslationObjectCandidate);
const callbackResult =
  typeof typedCandidate.callback === "function"
    ? typedCandidate.callback(typedCandidate.root)
    : typedCandidate.callback;
assert.equal(callbackResult, "Show usage for 2 filesystems");
assert.equal(typedCandidate.root("widget.common.app.noData"), typedCandidate.scoped("noData"));
assert(rich.app.includes('<a href="/fixture/apps/new">here</a>'));
assert(rich.status.includes("&lt;unavailable&gt;"));
assert(rich.invite.includes("<b>"));
assert(rich.assistant.includes("<time"));
const concurrent = await verifyConcurrentRequests(catalogs);
const after = await loadCatalogs();
assert.deepEqual(
  after.map(({ hash }) => hash),
  catalogs.map(({ hash }) => hash),
);
const report = {
  status: "compatibility-probe-completed-with-existing-catalog-findings",
  runtime: process.version,
  bunVersion: bunRuntime.version,
  mode,
  resolvedEngineEntry: require.resolve("use-intl/core"),
  packages,
  fixture: {
    timeZone: fixtureZone,
    now: fixtureNow.toISOString(),
    instant: fixtureInstant.toISOString(),
    productDefault: false,
  },
  fallback,
  catalogSweep: sweep,
  errorContracts: errors,
  pluralFixtures: plurals,
  formattingFixtures: formatting,
  realEnglishRichExamples: rich,
  typedCandidate: {
    callbackResult,
    rootAndScopedEqual: true,
    keyNamespaceCompileAssertions: true,
    ICUArgumentGenerationClaimed: false,
  },
  concurrentRequests: concurrent,
  catalogHashesUnchanged: true,
};
await writeFile(new URL(`./results-${mode}.json`, import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      status: report.status,
      mode,
      catalogs: catalogs.length,
      rawLeaves: sweep.units.reduce((sum, unit) => sum + unit.rawStringLeaves, 0),
      failures: sweep.failures.length,
      fallback,
      catalogHashesUnchanged: true,
    },
    null,
    2,
  ),
);
