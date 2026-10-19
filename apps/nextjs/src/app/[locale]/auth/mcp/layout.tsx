import type { PropsWithChildren } from "react";
import type { Metadata } from "next";
import { Text } from "@mantine/core";
import { IconShieldLock } from "@tabler/icons-react";

import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";
import { OnboardingAuthShell } from "@homarr/onboarding";
import { getBrandingColorOverrides } from "@homarr/server-settings";
import { getI18n } from "@homarr/translation/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getI18n("user.page.mcpConsent");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function McpConsentLayout({ children }: PropsWithChildren) {
  const [t, serverSettings] = await Promise.all([getI18n("user.page.mcpConsent"), getRscServerSettingsAsync()]);
  const branding = serverSettings.branding;
  const wordmarkColors = getBrandingColorOverrides(branding);

  return (
    <OnboardingAuthShell
      title={t("title")}
      description={
        <Text component="span" inherit c="var(--mantine-color-text)">
          {t("description")}
        </Text>
      }
      icon={<IconShieldLock size={24} />}
      width="min(100%, 48rem)"
      appName={branding.appName}
      showAppName={branding.authBranding.showAppName}
      showAppLogo={branding.authBranding.showLogo}
      primaryColor={branding.primaryColor}
      secondaryColor={branding.secondaryColor}
      wordmarkPrimaryColor={wordmarkColors.primaryColor}
      wordmarkSecondaryColor={wordmarkColors.secondaryColor}
      logoImageUrl={branding.logoImageUrl ?? undefined}
      backgroundImageUrl={branding.signInBackgroundImageUrl ?? undefined}
      backgroundOverlay={branding.signInBackgroundOverlay}
      radius={branding.defaultRadius}
    >
      {children}
    </OnboardingAuthShell>
  );
}
