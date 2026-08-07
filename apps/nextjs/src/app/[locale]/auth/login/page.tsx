import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Alert, Card, Center, Code, Loader, Stack, Text, Title } from "@mantine/core";
import { IconLogin } from "@tabler/icons-react";

import { env } from "@homarr/auth/env";
import { auth } from "@homarr/auth/next";
import { getScopedI18n } from "@homarr/translation/server";
import { sanitizeRedirectionUrl } from "@homarr/validation/redirection-url";

import { env as appEnv } from "~/env";

import { HomarrLogoWithTitle } from "~/components/layout/logo/homarr-logo";
import { LoginForm } from "./_login-form";

interface LoginProps {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
}

async function LoginContent({ searchParams }: { searchParams: { callbackUrl?: string } }) {
  const session = await auth();

  if (session) {
    redirect(sanitizeRedirectionUrl(searchParams.callbackUrl));
  }

  const t = await getScopedI18n("user.page.login");

  return (
    <Center>
      <Stack align="center" mt="xl">
        <HomarrLogoWithTitle size="lg" />
        <Stack gap={6} align="center">
          <Title order={3} fw={400} ta="center">
            {t("title")}
          </Title>
          <Text size="sm" c="gray.5" ta="center">
            {t("subtitle")}
          </Text>
        </Stack>
        {appEnv.DEMO_MODE && (
          <Alert icon={<IconLogin size={18} />} color="blue" variant="light" w={64 * 6} maw="90vw">
            <Text size="sm" fw={500}>
              Demo mode is enabled. Sign in with username <Code>demo</Code> and password <Code>demo</Code>
            </Text>
          </Alert>
        )}
        <Card w={64 * 6} maw="90vw">
          <LoginForm
            providers={env.AUTH_PROVIDERS}
            oidcClientName={env.AUTH_OIDC_CLIENT_NAME}
            isOidcAutoLoginEnabled={env.AUTH_OIDC_AUTO_LOGIN}
            callbackUrl={searchParams.callbackUrl ?? "/"}
          />
        </Card>
      </Stack>
    </Center>
  );
}

export default async function Login(props: LoginProps) {
  const searchParams = await props.searchParams;

  return (
    <Suspense
      fallback={
        <Center h="100vh">
          <Loader size="lg" />
        </Center>
      }
    >
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
