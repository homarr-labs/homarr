import { notFound } from "next/navigation";
import { Card, Center, Stack, Text, Title } from "@mantine/core";

import { db } from "@alparr/db";
import { getScopedI18n } from "@alparr/translation/server";

import { LogoWithTitle } from "~/components/layout/logo";
import { InitUserForm } from "./_components/init-user-form";

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
        <LogoWithTitle />
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
