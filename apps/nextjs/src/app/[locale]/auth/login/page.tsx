import { redirect } from "next/navigation";
import { Alert, Code, Text } from "@mantine/core";
import { IconLogin } from "@tabler/icons-react";

import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";
import { env } from "@homarr/auth/env";
import { auth } from "@homarr/auth/next";
import { OnboardingAuthShell } from "@homarr/onboarding";
import { getBrandingColorOverrides } from "@homarr/server-settings";
import { getI18n } from "@homarr/translation/server";
import { sanitizeRedirectionUrl } from "@homarr/validation/redirection-url";

import { env as appEnv } from "~/env";

import { LoginForm } from "./_login-form";

interface LoginProps {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
}

export default async function Login(props: LoginProps) {
  const [searchParams, session] = await Promise.all([props.searchParams, auth()]);

  if (session) {
    redirect(sanitizeRedirectionUrl(searchParams.callbackUrl));
  }

  const [t, serverSettings] = await Promise.all([getI18n("user.page.login"), getRscServerSettingsAsync()]);
  const branding = serverSettings.branding;
  const wordmarkColors = getBrandingColorOverrides(branding);
  const showCustomGreeting = branding.authBranding.showGreeting && branding.greeting.length > 0;
  const description = showCustomGreeting ? branding.greeting : t("subtitle");

  return (
    <OnboardingAuthShell
      title={t("title")}
      description={description}
      icon={<IconLogin size={24} />}
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
      {appEnv.DEMO_MODE ? (
        <Alert icon={<IconLogin size={18} />} color="blue" variant="light">
          <Text size="sm" fw={500}>
            Demo mode is enabled. Sign in with username <Code>demo</Code> and password <Code>demo</Code>
          </Text>
        </Alert>
      ) : null}
      <LoginForm
        providers={env.AUTH_PROVIDERS}
        oidcClientName={env.AUTH_OIDC_CLIENT_NAME}
        isOidcAutoLoginEnabled={env.AUTH_OIDC_AUTO_LOGIN}
        callbackUrl={searchParams.callbackUrl ?? "/"}
      />
    </OnboardingAuthShell>
  );
}
