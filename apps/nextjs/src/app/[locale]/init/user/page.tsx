import { notFound } from "next/navigation";

import { db } from "@homarr/db";
import { getScopedI18n } from "@homarr/translation/server";
import { Card, Center, Stack, Text, Title } from "@homarr/ui";

import { LogoWithTitle } from "~/components/layout/logo";
import { InitUserForm } from "./_init-user-form";

export default async function InitUser() {
  const firstUser = await db.query.users.findFirst({
    columns: {
      id: true,
    },
  });

  if (firstUser) {
    notFound();
  }

  const t = await getScopedI18n("user.page.init");

  return (
    <Center>
      <Stack align="center" mt="xl">
        <LogoWithTitle size="lg" />
        <Stack gap={6} align="center">
          <Title order={3} fw={400} ta="center">
            {t("title")}
          </Title>
          <Text size="sm" c="gray.5" ta="center">
            {t("subtitle")}
          </Text>
        </Stack>
        <Card bg="dark.8" w={64 * 6} maw="90vw">
          <InitUserForm />
        </Card>
      </Stack>
    </Center>
  );
}
