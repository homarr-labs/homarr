import { redirect } from "next/navigation";
import { Card, Center, Stack, Text, Title } from "@mantine/core";

import { env } from "@homarr/auth/env.mjs";
import { auth } from "@homarr/auth/next";
import { getScopedI18n } from "@homarr/translation/server";

import { HomarrLogoWithTitle } from "~/components/layout/logo/homarr-logo";
import { LoginForm } from "./_login-form";

interface LoginProps {
  searchParams: {
    redirectAfterLogin?: string;
  };
}

export default async function Login({ searchParams }: LoginProps) {
  const session = await auth();

  if (session) {
    redirect(searchParams.redirectAfterLogin ?? "/");
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
        <Card bg="dark.8" w={64 * 6} maw="90vw">
          <LoginForm
            providers={env.AUTH_PROVIDERS}
            oidcClientName={env.AUTH_OIDC_CLIENT_NAME}
            isOidcAutoLoginEnabled={env.AUTH_OIDC_AUTO_LOGIN}
            callbackUrl={searchParams.redirectAfterLogin ?? "/"}
          />
        </Card>
      </Stack>
    </Center>
  );
}
