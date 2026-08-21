import { Box, Group, Image, Stack, Title } from "@mantine/core";

import { getI18n } from "@homarr/translation/server";
import { IntegrationMarquee } from "@homarr/ui";

import classes from "./hero-banner.module.css";

export const HeroBanner = async () => {
  const t = await getI18n("management.page.home");

  return (
    <Box className={classes.bannerContainer} p={{ base: "lg", md: "3rem" }} bg="dark.6" pos="relative">
      <Stack gap={0}>
        <Title fz={{ base: "h4", md: "h2" }} c="dimmed">
          {t("heroBanner.title")}
        </Title>
        <Group gap="xs" wrap="nowrap">
          <Image src="/logo/logo.png" w={{ base: 32, md: 40 }} h={{ base: 32, md: 40 }} />
          <Title fz={{ base: "h3", md: "h1" }}>{t("heroBanner.subtitle", { app: "Homarr" })}</Title>
        </Group>
      </Stack>
      <Box visibleFrom="md" className={classes.scrollContainer} w={"30%"} top={0} right={0} pos="absolute">
        <IntegrationMarquee />
      </Box>
    </Box>
  );
};
