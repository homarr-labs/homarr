import { redirect } from "next/navigation";
import { Alert, Code, Text } from "@mantine/core";
import { IconLogin } from "@tabler/icons-react";

import { env } from "@homarr/auth/env";
import { auth } from "@homarr/auth/next";
import { OnboardingAuthShell } from "@homarr/onboarding";
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
  const searchParams = await props.searchParams;
  const session = await auth();

  if (session) {
    redirect(sanitizeRedirectionUrl(searchParams.callbackUrl));
  }

  const t = await getI18n("user.page.login");

  return (
    <OnboardingAuthShell title={t("title")} description={t("subtitle")} icon={<IconLogin size={24} />}>
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
