import type { ColorScheme } from "@homarr/definitions";
import type { SupportedLanguage } from "@homarr/translation";
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

export const brandingRadiusOptions = ["xs", "sm", "md", "lg", "xl"] as const;
export type BrandingRadius = (typeof brandingRadiusOptions)[number];

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
  appName: z.string().trim().min(1).max(80),
  greeting: z.string().trim().max(160),
  logoImageUrl: brandingImageUrlSchema,
  faviconImageUrl: brandingImageUrlSchema,
  primaryColor: z.string().regex(/^#[\da-f]{6}$/iu, "Primary color must be a 6-digit hex color"),
  secondaryColor: z.string().regex(/^#[\da-f]{6}$/iu, "Secondary color must be a 6-digit hex color"),
  lockPrimaryColor: z.boolean(),
  signInBackgroundImageUrl: brandingImageUrlSchema,
  signInBackgroundOverlay: z.number().min(0).max(0.9),
  authBranding: authBrandingSchema,
  defaultRadius: z.enum(brandingRadiusOptions),
});

export type BrandingSettings = z.infer<typeof brandingServerSettingsSchema>;

export const defaultBrandingSettings: BrandingSettings = {
  appName: "Homarr",
  greeting: "",
  logoImageUrl: null,
  faviconImageUrl: null,
  primaryColor: "#fa5252",
  secondaryColor: "#fd7e14",
  lockPrimaryColor: false,
  signInBackgroundImageUrl: null,
  signInBackgroundOverlay: 0.55,
  authBranding: {
    showAppName: true,
    showLogo: true,
    showGreeting: true,
  },
  defaultRadius: "md",
};

const hasDefaultBrandingColors = (branding: Pick<BrandingSettings, "primaryColor" | "secondaryColor">) =>
  branding.primaryColor.toLowerCase() === defaultBrandingSettings.primaryColor &&
  branding.secondaryColor.toLowerCase() === defaultBrandingSettings.secondaryColor;

export const getBrandingColorOverrides = (
  branding: Pick<BrandingSettings, "primaryColor" | "secondaryColor">,
): Partial<Pick<BrandingSettings, "primaryColor" | "secondaryColor">> => {
  if (hasDefaultBrandingColors(branding)) return {};
  return {
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
  };
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

  const result = brandingServerSettingsSchema.safeParse({
    ...defaultBrandingSettings,
    ...partialValue.data,
    authBranding,
  });
  if (!result.success) return defaultBrandingSettings;

  return result.data;
};

export const defaultServerSettings = {
  analytics: {
    enableGeneral: true,
    instanceId: null as string | null,
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
