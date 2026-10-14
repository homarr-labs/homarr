import { z } from "zod";

import { brandingServerSettingsSchema } from "@homarr/server-settings";
import { supportedLanguages } from "@homarr/translation/languages";
import type { TranslationSnapshot } from "@homarr/translation/standalone";

const numericDateField = z.enum(["numeric", "2-digit"]).optional();
const dateLabel = z.enum(["long", "short", "narrow"]).optional();
const dateStyle = z.enum(["full", "long", "medium", "short"]).optional();
const localeMatcher = z.enum(["lookup", "best fit"]).optional();

const translationFormatsSchema = z.strictObject({
  dateTime: z
    .record(
      z.string(),
      z.strictObject({
        localeMatcher,
        weekday: dateLabel,
        era: dateLabel,
        year: numericDateField,
        month: z.enum(["numeric", "2-digit", "long", "short", "narrow"]).optional(),
        day: numericDateField,
        hour: numericDateField,
        minute: numericDateField,
        second: numericDateField,
        hour12: z.boolean().optional(),
        hourCycle: z.enum(["h11", "h12", "h23", "h24"]).optional(),
        timeZone: z.string().optional(),
        timeZoneName: z.enum(["long", "short"]).optional(),
        formatMatcher: z.enum(["basic", "best fit"]).optional(),
        dateStyle,
        timeStyle: dateStyle,
        calendar: z
          .enum([
            "buddhist",
            "chinese",
            "coptic",
            "ethiopia",
            "ethiopic",
            "gregory",
            "hebrew",
            "indian",
            "islamic",
            "iso8601",
            "japanese",
            "persian",
            "roc",
          ])
          .optional(),
        dayPeriod: dateLabel,
        numberingSystem: z
          .enum([
            "arab",
            "arabext",
            "bali",
            "beng",
            "deva",
            "fullwide",
            "gujr",
            "guru",
            "hanidec",
            "khmr",
            "knda",
            "laoo",
            "latn",
            "limb",
            "mlym",
            "mong",
            "mymr",
            "orya",
            "tamldec",
            "telu",
            "thai",
            "tibt",
          ])
          .optional(),
        fractionalSecondDigits: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
      }),
    )
    .optional(),
  number: z
    .record(
      z.string(),
      z.strictObject({
        localeMatcher,
        style: z.enum(["decimal", "currency", "percent", "unit"]).optional(),
        currency: z.string().optional(),
        currencyDisplay: z.enum(["code", "symbol", "narrowSymbol", "name"]).optional(),
        currencySign: z.enum(["standard", "accounting"]).optional(),
        minimumIntegerDigits: z.number().int().optional(),
        minimumFractionDigits: z.number().int().optional(),
        maximumFractionDigits: z.number().int().optional(),
        minimumSignificantDigits: z.number().int().optional(),
        maximumSignificantDigits: z.number().int().optional(),
        useGrouping: z.union([z.boolean(), z.enum(["min2", "auto", "always"])]).optional(),
        notation: z.enum(["standard", "scientific", "engineering", "compact"]).optional(),
        compactDisplay: z.enum(["short", "long"]).optional(),
        signDisplay: z.enum(["auto", "always", "never", "exceptZero", "negative"]).optional(),
        unit: z.string().optional(),
        unitDisplay: z.enum(["short", "long", "narrow"]).optional(),
        numberingSystem: z.string().optional(),
        roundingPriority: z.enum(["auto", "morePrecision", "lessPrecision"]).optional(),
        roundingIncrement: z
          .union([
            z.literal(1),
            z.literal(2),
            z.literal(5),
            z.literal(10),
            z.literal(20),
            z.literal(25),
            z.literal(50),
            z.literal(100),
            z.literal(200),
            z.literal(250),
            z.literal(500),
            z.literal(1000),
            z.literal(2000),
            z.literal(2500),
            z.literal(5000),
          ])
          .optional(),
        roundingMode: z
          .enum(["ceil", "floor", "expand", "trunc", "halfCeil", "halfFloor", "halfExpand", "halfTrunc", "halfEven"])
          .optional(),
        trailingZeroDisplay: z.enum(["auto", "stripIfInteger"]).optional(),
      }),
    )
    .optional(),
  list: z
    .record(
      z.string(),
      z.strictObject({
        localeMatcher,
        type: z.enum(["conjunction", "disjunction", "unit"]).optional(),
        style: dateLabel,
      }),
    )
    .optional(),
  displayName: z
    .record(
      z.string(),
      z.strictObject({
        localeMatcher,
        type: z.enum(["language", "region", "script", "currency", "calendar", "dateTimeField"]),
        style: dateLabel,
        fallback: z.enum(["code", "none"]).optional(),
        languageDisplay: z.enum(["dialect", "standard"]).optional(),
      }),
    )
    .optional(),
}) satisfies z.ZodType<NonNullable<TranslationSnapshot["formats"]>>;

const localeSchema = z.enum(supportedLanguages);
const instantSchema = z
  .number()
  .int()
  .refine((value) => Number.isFinite(new Date(value).getTime()));

export const publicSettingsSchema = z.object({
  board: z.object({
    homeBoardId: z.string().nullable(),
    mobileHomeBoardId: z.string().nullable(),
    enableStatusByDefault: z.boolean(),
    forceDisableStatus: z.boolean(),
  }),
  search: z.object({ defaultSearchEngineId: z.string().nullable() }),
  user: z.object({ enableGravatar: z.boolean() }),
  branding: brandingServerSettingsSchema,
});

export const publicCultureSchema = z.object({
  resolved: z.object({
    catalogLocale: localeSchema,
    intlLocale: z.string().min(2),
    direction: z.enum(["ltr", "rtl"]),
    source: z.enum(["explicit", "cookie", "configuration", "fallback"]),
    defaultLocale: localeSchema,
    cookieLocale: z.string().optional(),
  }),
  capturedClock: instantSchema,
  translation: z.object({
    locale: localeSchema,
    nowEpoch: instantSchema,
    timeZone: z.string().min(1),
    formats: translationFormatsSchema.optional(),
  }),
  preferences: z.object({
    firstDayOfWeek: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
    ]),
    byteUnitSystem: z.enum(["binary", "decimal"]),
  }),
});

export const renderSnapshotSchema = z
  .object({
    version: z.literal(1),
    requestId: z.string().uuid(),
    locale: z.string().min(2).max(35),
    theme: z.enum(["light", "dark"]).optional(),
    direction: z.enum(["ltr", "rtl"]),
    session: z.object({ kind: z.enum(["anonymous", "authenticated"]) }).readonly(),
    setup: z.object({ kind: z.enum(["unavailable", "required", "ready"]) }).readonly(),
    renderRevision: z.string().max(128),
  })
  .readonly();

export const renderAssetsSchema = z
  .object({
    entry: z.string().optional(),
    css: z.array(z.object({ href: z.string(), "data-vite-dev-id": z.string().optional() }).readonly()).readonly(),
    js: z.array(z.object({ href: z.string() }).readonly()).readonly(),
  })
  .readonly();

export const bootstrapSchema = z
  .object({
    snapshot: renderSnapshotSchema,
    assets: renderAssetsSchema,
    publicSettings: publicSettingsSchema,
    culture: publicCultureSchema,
    colorScheme: z.enum(["light", "dark", "auto"]),
    routing: z.object({
      origin: z.url().refine((value) => new URL(value).origin === value),
      localePrefix: z
        .string()
        .refine(
          (value) =>
            value === "" || supportedLanguages.some((locale) => value.toLowerCase() === `/${locale.toLowerCase()}`),
        ),
    }),
    document: z.object({
      description: z.string(),
      dashboardTitle: z.string(),
      websiteUrl: z.url(),
    }),
  })
  .readonly();

export type RenderSnapshot = z.infer<typeof renderSnapshotSchema>;
export type RenderAssets = z.infer<typeof renderAssetsSchema>;
export type Bootstrap = z.infer<typeof bootstrapSchema>;
