import assert from "node:assert/strict";
import { test } from "node:test";

import dayjs from "dayjs";

import { getIntlLocale } from "../config";

import { createCultureFormatter, resolveCulturePreferences } from "./culture";
import { formatLocalizedDate, formatLocalizedTime } from "./date";
import { resolveRequestLocale, syncLocalePreference } from "./locale";
import type { LocaleCookieEffect } from "./locale";
import { getIntegrationConnectionState, observeTimeAgo } from "./relative-refresh";
import { createCultureResourceStore, loadRequestCulture } from "./resources";

const resolveFixtureLocale = (locale: string) =>
  resolveRequestLocale({ preferences: { get: () => locale }, readDefaultLocale: async () => "en" });

test("request locale precedence and guest preference effects preserve exact cookie and source defaults", async () => {
  let reads = 0;
  const resolve = (cookie: string | undefined, explicit?: string) =>
    resolveRequestLocale(
      {
        preferences: { get: () => cookie },
        async readDefaultLocale() {
          reads += 1;
          return "de-CH";
        },
      },
      explicit,
    );
  const guest = await resolve(undefined);
  assert.equal(guest.catalogLocale, "de-CH");
  assert.equal(guest.source, "configuration");
  const effects: LocaleCookieEffect[] = [];
  syncLocalePreference(guest, "", (effect) => effects.push(effect));
  assert.equal(effects.length, 0);
  const explicit = await resolve("fr", "HE");
  assert.equal(reads, 1);
  assert.equal(explicit.catalogLocale, "he");
  assert.equal(explicit.direction, "rtl");
  syncLocalePreference(explicit, "/homarr", (effect) => effects.push(effect));
  assert.deepEqual(effects, [
    {
      kind: "cookie",
      name: "homarr.locale",
      value: "he",
      options: { maxAge: 31536000, sameSite: "lax", path: "/homarr" },
    },
  ]);
  assert.equal((await resolve("FR")).catalogLocale, "de-CH");
  assert.equal((await resolve("%66r", "%68e")).catalogLocale, "de-CH");
  const fallback = await resolveRequestLocale({
    preferences: { get: () => undefined },
    readDefaultLocale: async () => "invalid",
  });
  assert.equal(fallback.catalogLocale, "en");
  syncLocalePreference(await resolve(undefined, "fr"), "", (effect) => effects.push(effect));
  assert.equal(effects[1]?.options.path, "/");
  await assert.rejects(() =>
    resolveRequestLocale({
      preferences: { get: () => undefined },
      readDefaultLocale: async () => {
        throw new Error("injected configuration read failure");
      },
    }),
  );
});

test("cold concurrent actual catalogs, Day.js aliases and MRT resources remain request-owned and completion-fenced", async () => {
  const selectedBefore = dayjs.locale();
  const options = { now: new Date("2026-10-10T12:00:00Z"), timeZone: "UTC" };
  const [french, hebrew, chinese, crowdin, norwegian, swiss, catalan, traditionalChinese] = await Promise.all(
    ["fr", "he", "cn", "cr", "no", "de-CH", "ca", "zh"].map(async (locale) =>
      loadRequestCulture(await resolveFixtureLocale(locale), options),
    ),
  );
  assert.ok(french && hebrew && chinese && crowdin && norwegian && swiss && catalan && traditionalChinese);
  assert.equal(french.i18n.getI18n()("common.action.save"), "Sauvegarder");
  assert.notEqual(hebrew.i18n.getI18n()("common.action.save"), french.i18n.getI18n()("common.action.save"));
  assert.equal(hebrew.resolved.direction, "rtl");
  assert.equal(chinese.resolved.intlLocale, "zh-CN");
  assert.equal(chinese.dayjsLocale, "zh-cn");
  assert.equal(crowdin.dayjsLocale, "en-gb");
  assert.equal(crowdin.i18n.snapshot.locale, "cr");
  assert.match(crowdin.i18n.getI18n()("common.action.save"), /crwdns/);
  assert.equal(norwegian.dayjsLocale, "nb");
  assert.equal(swiss.dayjsLocale, "de-ch");
  assert.equal(getIntlLocale("zh"), "zh-TW");
  assert.equal(traditionalChinese.dayjsLocale, "zh-tw");
  assert.equal(typeof french.tableLocalization.actions, "string");
  assert.equal(catalan.tableLocalization.actions, "");
  const clock = { now: () => options.now.getTime() };
  const fr = createCultureFormatter(french, resolveCulturePreferences(null), clock);
  const he = createCultureFormatter(
    hebrew,
    resolveCulturePreferences({ firstDayOfWeek: 0, byteUnitSystem: "binary" }),
    clock,
  );
  const timestamp = new Date("2026-10-10T11:58:00Z");
  assert.match(fr.timeAgo(timestamp), /minutes/);
  assert.notEqual(fr.timeAgo(timestamp), he.timeAgo(timestamp));
  assert.equal(fr.dayjs(timestamp).locale(), "fr");
  assert.equal(he.dayjs(timestamp).locale(), "he");
  assert.equal(fr.dayjs(timestamp, "Asia/Tokyo").hour(), 20);
  assert.equal(he.dayjs(timestamp, "UTC").hour(), 11);
  assert.equal(dayjs.locale(), selectedBefore);
  const store = createCultureResourceStore();
  const old = store.load(french.resolved, options);
  const latest = store.load(hebrew.resolved, options);
  assert.equal((await old).kind, "stale");
  assert.equal((await latest).kind, "ready");
  const state = store.read();
  assert.ok(state.kind === "ready");
  assert.equal(state.value.resolved.catalogLocale, "he");
  const invalidated = store.load(french.resolved, options);
  store.invalidate();
  assert.equal((await invalidated).kind, "stale");
  assert.equal(store.read().kind, "idle");
  let attempts = 0;
  const faultStore = createCultureResourceStore(async (selection, snapshot) => {
    attempts += 1;
    if (attempts === 1) throw new Error("injected resource import failure");
    return loadRequestCulture(selection, snapshot);
  });
  assert.equal((await faultStore.load(french.resolved, options)).kind, "failed");
  assert.equal(faultStore.read().kind, "failed");
  assert.equal(attempts, 1);
  assert.equal((await faultStore.load(french.resolved, options)).kind, "ready");
  const optional = await loadRequestCulture(french.resolved, {});
  assert.equal(optional.i18n.snapshot.now, undefined);
  assert.equal(optional.i18n.snapshot.timeZone, undefined);
});

test("source culture values preserve UTC dates, timestamp zones, byte rounding and disposable relative refresh", async () => {
  assert.equal(formatLocalizedDate("invalid", "en-US", { dateStyle: "short" }), "?");
  assert.equal(formatLocalizedDate("2026-10-10", "en-US", { dateStyle: "short" }), "10/10/26");
  assert.equal(
    formatLocalizedDate("2026-10-10", "en-US", { dateStyle: "short", timeZone: "America/Los_Angeles" }),
    "10/9/26",
  );
  assert.equal(formatLocalizedTime("2026-10-10T13:05:00Z", "en-US", { hour12: true, timeZone: "UTC" }), "1:05 PM");
  assert.equal(
    formatLocalizedTime("2026-10-10T13:05:01Z", "en-US", { hour12: false, includeSeconds: true, timeZone: "UTC" }),
    "13:05:01",
  );
  const resolved = await resolveRequestLocale({
    preferences: { get: () => "en" },
    readDefaultLocale: async () => "en",
  });
  const culture = await loadRequestCulture(resolved, {});
  let now = Date.parse("2026-10-10T12:00:00Z");
  const clock = { now: () => now };
  const decimal = createCultureFormatter(culture, resolveCulturePreferences(null), clock);
  const binary = createCultureFormatter(
    culture,
    resolveCulturePreferences({ byteUnitSystem: "binary", firstDayOfWeek: 6 }),
    clock,
  );
  assert.equal(decimal.preferences.firstDayOfWeek, 1);
  assert.equal(binary.preferences.firstDayOfWeek, 6);
  assert.equal(decimal.formatBytes(1000), "1.0 KB");
  assert.equal(binary.formatBytes(1024), "1.0 KiB");
  assert.equal(binary.formatBytes(1023.99), "1.0 KiB");
  assert.equal(decimal.formatBitRate(1500000), "1.5 Mb/s");
  assert.deepEqual(decimal.formatBytesPair(1000, 2000000), { used: "0.0 MB", total: "2.0 MB" });
  let tick: (() => void) | undefined;
  let cleared = false;
  const published: string[] = [];
  const stop = observeTimeAgo(new Date(now - 120000), {
    calculateTimeAgo: decimal.timeAgo,
    publish: (value) => published.push(value),
    scheduler: {
      setInterval(callback, delay) {
        assert.equal(delay, 1000);
        tick = callback;
        return 7;
      },
      clearInterval(handle) {
        assert.equal(handle, 7);
        cleared = true;
      },
    },
  });
  assert.equal(published[0], "2 minutes ago");
  now += 60000;
  assert.ok(tick);
  tick();
  assert.equal(published[1], "3 minutes ago");
  stop();
  tick();
  assert.equal(published.length, 2);
  assert.equal(cleared, true);
  assert.deepEqual(getIntegrationConnectionState(new Date(now - 30000), clock), {
    connected: false,
    delayUntilTimeout: 0,
  });
});
