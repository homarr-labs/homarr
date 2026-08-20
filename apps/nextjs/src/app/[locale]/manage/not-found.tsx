import { Anchor, Center, Stack, Text, Title } from "@mantine/core";

import { getI18n } from "@homarr/translation/server";
import { Link } from "@homarr/ui";

export default async function NotFound() {
  const t = await getI18n("management.notFound");
  return (
    <Center h="100%">
      <Stack align="center">
        <Title order={1}>{t("title")}</Title>
        <Text>{t("text")}</Text>
        <Anchor component={Link} href="/manage">
          {t("backToHome")}
        </Anchor>
      </Stack>
    </Center>
  );
}
