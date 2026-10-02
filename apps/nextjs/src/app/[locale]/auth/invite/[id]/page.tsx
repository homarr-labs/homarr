import { notFound } from "next/navigation";
import { IconUserPlus } from "@tabler/icons-react";

import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";
import { auth } from "@homarr/auth/next";
import { isProviderEnabled } from "@homarr/auth/server";
import { and, db, eq } from "@homarr/db";
import { invites } from "@homarr/db/schema";
import { OnboardingAuthShell } from "@homarr/onboarding";
import { defaultBrandingSettings, getBrandingColorOverrides } from "@homarr/server-settings";
import { getI18n } from "@homarr/translation/server";

import { RegistrationForm } from "./_registration-form";

interface InviteUsagePageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    token: string;
  }>;
}

export default async function InviteUsagePage(props: InviteUsagePageProps) {
  if (!isProviderEnabled("credentials")) notFound();

  const [searchParams, params, session] = await Promise.all([props.searchParams, props.params, auth()]);
  if (session) notFound();

  const invite = await db.query.invites.findFirst({
    where: and(eq(invites.id, params.id), eq(invites.token, searchParams.token)),
    columns: {
      id: true,
      token: true,
      expirationDate: true,
    },
    with: {
      creator: {
        columns: {
          name: true,
        },
      },
    },
  });

  if (!invite || invite.expirationDate < new Date()) notFound();

  const [t, serverSettings] = await Promise.all([getI18n("user.page.invite"), getRscServerSettingsAsync()]);
  const branding = serverSettings.branding;
  const wordmarkColors = getBrandingColorOverrides(branding);
  const showCustomAppName = branding.authBranding.showAppName && branding.appName !== defaultBrandingSettings.appName;
  const showCustomGreeting = branding.authBranding.showGreeting && branding.greeting.length > 0;
  const title = showCustomAppName ? t("titleWithAppName", { appName: branding.appName }) : t("title");
  const defaultDescription = showCustomAppName
    ? t("subtitleWithAppName", { appName: branding.appName })
    : t("subtitle");
  const description = showCustomGreeting ? branding.greeting : defaultDescription;

  return (
    <OnboardingAuthShell
      title={title}
      description={description}
      icon={<IconUserPlus size={24} />}
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      footer={t("description", { username: invite.creator.name! })}
    >
      <RegistrationForm invite={invite} />
    </OnboardingAuthShell>
  );
}
