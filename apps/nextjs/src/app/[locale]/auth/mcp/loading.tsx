import { Skeleton, Stack, Text } from "@mantine/core";

import { getI18n } from "@homarr/translation/server";

export default async function McpConsentLoading() {
  const t = await getI18n("user.page.mcpConsent");

  return (
    <Stack gap="sm">
      <Text component="output" size="sm">
        {t("loading")}
      </Text>
      <Skeleton h={24} w="60%" animate={false} aria-hidden />
      <Skeleton h={100} animate={false} aria-hidden />
      <Skeleton h={44} animate={false} aria-hidden />
    </Stack>
  );
}
