import { Card, Center, Stack, Text, Title } from "@mantine/core";

import { getScopedI18n } from "@homarr/translation/server";

import { HomarrLogoWithTitle } from "~/components/layout/logo/homarr-logo";
import { LoginForm } from "./_login-form";

export default async function Login() {
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
          <LoginForm />
        </Card>
      </Stack>
    </Center>
  );
}
