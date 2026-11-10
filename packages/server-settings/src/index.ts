import type { ColorScheme } from "@homarr/definitions";
import type { SupportedLanguage } from "@homarr/translation";
import type { CustomTheme } from "@homarr/validation/theme";
import { customThemeSchema, parseStoredCustomTheme, themeSelectionSchema } from "@homarr/validation/theme";
import { z } from "zod/v4";

export const defaultServerSettingsKeys = [
  "analytics",
  "crawlingAndIndexing",
  "board",
  "user",
  "appearance",
  "branding",
  "culture",
  "search",
] as const;

export type ServerSettingsRecord = Record<(typeof defaultServerSettingsKeys)[number], Record<string, unknown>>;

export { cornerStyleValues as brandingRadiusOptions } from "@homarr/definitions";
export type { CornerStyle as BrandingRadius } from "@homarr/definitions";

export const authBrandingSchema = z.object({
  showAppName: z.boolean(),
  showLogo: z.boolean(),
  showGreeting: z.boolean(),
});

const brandingImageUrlSchema = z
  .string()
  .trim()
  .max(2_048)
  .refine((value) => {
    if (value.startsWith("/") && !value.startsWith("//")) return true;
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Image must be an HTTP(S) URL or an app-relative path")
  .nullable();

export const brandingServerSettingsSchema = z.object({
  themeId: themeSelectionSchema,
  customTheme: customThemeSchema.nullable(),
  appName: z.string().trim().min(1).max(80),
  greeting: z.string().trim().max(160),
  logoImageUrl: brandingImageUrlSchema,
  faviconImageUrl: brandingImageUrlSchema,
  signInBackgroundImageUrl: brandingImageUrlSchema,
  signInBackgroundOverlay: z.number().min(0).max(0.9),
  showSignInMarquee: z.boolean(),
  authBranding: authBrandingSchema,
});

export type BrandingSettings = z.infer<typeof brandingServerSettingsSchema>;

export const defaultBrandingSettings: BrandingSettings = {
  themeId: "default",
  customTheme: null,
  appName: "Homarr",
  greeting: "",
  logoImageUrl: null,
  faviconImageUrl: null,
  signInBackgroundImageUrl: null,
  signInBackgroundOverlay: 0.55,
  showSignInMarquee: true,
  authBranding: {
    showAppName: true,
    showLogo: true,
    showGreeting: true,
  },
};

const legacyLoginBrandingSchema = z.object({
  showCustomAppNameOnLogin: z.boolean().optional(),
  showCustomLogoOnLogin: z.boolean().optional(),
  showCustomGreetingOnLogin: z.boolean().optional(),
  showCustomAppNameOnInvite: z.boolean().optional(),
  showCustomLogoOnInvite: z.boolean().optional(),
  showCustomGreetingOnInvite: z.boolean().optional(),
});

export const parseBrandingSettings = (value: unknown): BrandingSettings => {
  const partialValue = z.record(z.string(), z.unknown()).safeParse(value);
  if (!partialValue.success) return defaultBrandingSettings;

  const legacyBranding = legacyLoginBrandingSchema.safeParse(partialValue.data);
  const partialAuthBranding = authBrandingSchema.partial().safeParse(partialValue.data.authBranding);
  const authBranding = { ...defaultBrandingSettings.authBranding };

  if (legacyBranding.success) {
    const legacy = legacyBranding.data;
    authBranding.showAppName = legacy.showCustomAppNameOnLogin ?? authBranding.showAppName;
    authBranding.showLogo = legacy.showCustomLogoOnLogin ?? authBranding.showLogo;
    authBranding.showGreeting = legacy.showCustomGreetingOnLogin ?? authBranding.showGreeting;
  }
  if (partialAuthBranding.success) Object.assign(authBranding, partialAuthBranding.data);

  let customTheme = parseStoredCustomTheme(partialValue.data.customTheme);
  let themeId = themeSelectionSchema.safeParse(partialValue.data.themeId).data ?? "default";
  if (themeId === "custom" && !customTheme) themeId = "default";

  // Fold legacy appearance settings into the portable theme once. Explicit theme
  // values win, except for the old enforced primary color.
  const legacy = partialValue.data;
  let preset = themeId;
  if (preset === "custom") preset = "default";
  const document: CustomTheme = structuredClone(
    themeId === "custom" && customTheme ? customTheme : { preset, theme: {} },
  );
  let migrated = false;
  if (document.preset === "default" || legacy.lockPrimaryColor === true) {
    for (const [key, fallback] of [
      ["primary", "#fa5252"],
      ["secondary", "#fd7e14"],
    ] as const) {
      const color = legacy[`${key}Color`];
      if (typeof color !== "string" || !/^#[\da-f]{6}$/iu.test(color)) continue;
      if (key === "secondary" && document.preset !== "default") continue;
      if (color.toLowerCase() === fallback && legacy.lockPrimaryColor !== true) continue;
      for (const scheme of ["light", "dark"] as const) {
        if (document[scheme]?.[key] && legacy.lockPrimaryColor !== true) continue;
        document[scheme] = { ...document[scheme], [key]: color };
      }
      if (key === "primary" && legacy.lockPrimaryColor === true) {
        document.theme.primaryColor = "primaryColor";
        if (document.theme.colors) {
          delete document.theme.colors.primaryColor;
          delete document.theme.colors.presetPrimaryLight;
          delete document.theme.colors.presetPrimaryDark;
        }
      }
      migrated = true;
    }
  }
  if (
    typeof legacy.defaultRadius === "string" &&
    legacy.defaultRadius !== "md" &&
    document.theme.defaultRadius === undefined
  ) {
    document.theme.defaultRadius = legacy.defaultRadius;
    migrated = true;
  }
  if (typeof legacy.customCss === "string" && legacy.customCss && document.customCss === undefined) {
    document.customCss = legacy.customCss;
    migrated = true;
  }
  if (migrated) {
    const parsed = customThemeSchema.safeParse(document);
    if (parsed.success) {
      customTheme = parsed.data;
      themeId = "custom";
    }
  }

  const result = brandingServerSettingsSchema.safeParse({
    ...defaultBrandingSettings,
    ...partialValue.data,
    authBranding,
    themeId,
    customTheme,
  });
  if (!result.success) return defaultBrandingSettings;

  return result.data;
};

export const defaultServerSettings = {
  analytics: {
    enableGeneral: true,
    instanceId: null as string | null,
    lastSuccessfulSnapshotAt: null as string | null,
  },
  crawlingAndIndexing: {
    noIndex: true,
    noFollow: true,
    noTranslate: true,
    noSiteLinksSearchBox: false,
  },
  board: {
    homeBoardId: null as string | null,
    mobileHomeBoardId: null as string | null,
    enableStatusByDefault: true,
    forceDisableStatus: false,
  },
  user: {
    enableGravatar: true,
  },
  appearance: {
    defaultColorScheme: "auto" as ColorScheme,
  },
  branding: defaultBrandingSettings,
  culture: {
    defaultLocale: "en" as SupportedLanguage,
  },
  search: {
    defaultSearchEngineId: null as string | null,
  },
} satisfies ServerSettingsRecord;

export type ServerSettings = typeof defaultServerSettings;
