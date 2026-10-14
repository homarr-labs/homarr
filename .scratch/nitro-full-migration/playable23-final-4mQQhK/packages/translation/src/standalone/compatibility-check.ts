import assert from "node:assert/strict";
import { createRequire } from "node:module";

import { supportedLanguages } from "../languages";

import { loadMessages } from "./catalogs";
import { loadRequestI18n } from "./server";
import type { I18nErrorHandlers } from "./types";
import { translateIfNecessary } from "./types";

const require = createRequire(import.meta.url);
const mode = process.argv.includes("--development-contract") ? "development" : "production";
assert(require.resolve("use-intl/core").includes(`/esm/${mode}/`));
const errorCodes: string[] = [];
const handlers: I18nErrorHandlers = { onError: (error) => errorCodes.push(error.code) };
const fixture = { timeZone: "UTC", now: new Date("2026-10-10T12:00:00.000Z") };
const english = await loadRequestI18n({ locale: "en", ...fixture, ...handlers });
const t = english.getI18n();
const noValues = t("customWidget.editor.status.characters");
assert.equal(noValues, mode === "development" ? "customWidget.editor.status.characters" : "{count, number} characters");
assert.equal(t("customWidget.editor.status.characters", {}), "customWidget.editor.status.characters");
assert.deepEqual(errorCodes, mode === "development" ? ["FORMATTING_ERROR", "FORMATTING_ERROR"] : ["FORMATTING_ERROR"]);
assert.equal(
  translateIfNecessary(t, (translator) => translator("common.filesystemUsage", { count: 2 })),
  "Show usage for 2 filesystems",
);
assert.equal(translateIfNecessary(t, "unchanged"), "unchanged");
assert.equal(translateIfNecessary(t, undefined), undefined);
errorCodes.length = 0;
assert.equal(Reflect.apply(t.has, undefined, ["missing.fixture.key"]), false);
assert.deepEqual(errorCodes, []);
assert.equal(Reflect.apply(t, undefined, ["missing.fixture.key"]), "missing.fixture.key");
assert.deepEqual(errorCodes, ["MISSING_MESSAGE"]);

const french = await loadRequestI18n({ locale: "fr", ...fixture, ...handlers });
const fr = french.getI18n();
assert.equal(fr("widget.mediaServer.footer.streams", { count: 2 }), "2 active streams");
assert.equal(fr.raw("app.action.create.description"), "Créer une nouvelle application ");
assert.equal(
  fr.raw("tips.multiSelectApps"),
  "Astuce : Maintenez Ctrl / <unk> pour sélectionner plusieurs applications à la fois",
);
errorCodes.length = 0;
assert.equal(fr("tips.multiSelectApps", {}), "tips.multiSelectApps");
assert.deepEqual(errorCodes, ["INVALID_MESSAGE"]);
const format = french.getFormatter();
assert.equal(format.number(12345.67), "12 345,67");
assert.equal(format.relativeTime(new Date("2026-10-10T11:00:00.000Z"), { unit: "hour" }), "il y a 1 heure");
assert.equal(
  format.dateTime(new Date("2026-03-29T00:30:00.000Z"), { dateStyle: "full", timeStyle: "short", hour12: false }),
  "dimanche 29 mars 2026 à 00:30",
);
const catalogs = await Promise.all(
  supportedLanguages.map(async (locale) => {
    const messages = await loadMessages(locale);
    assert(Object.isFrozen(messages));
    assert(Object.isFrozen(messages.widget.common.app));
    assert.equal(typeof messages.widget.common.app.description, "string");
    return locale;
  }),
);
assert.equal(catalogs.length, 36);
assert((await loadMessages("cr")).widget.common.app.description.startsWith("crwdns"));
assert.equal((await loadRequestI18n({ locale: "unsupported-fixture", ...fixture })).snapshot.locale, "en");
console.log(
  JSON.stringify(
    {
      mode,
      catalogs: catalogs.length,
      omittedValues: noValues,
      preservedMalformedEntry: true,
      explicitUTCFixture: true,
      sourceFacadeChecks: "passed",
    },
    null,
    2,
  ),
);
