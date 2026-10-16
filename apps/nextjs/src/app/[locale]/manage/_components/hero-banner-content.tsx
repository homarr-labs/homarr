"use client";

import { Box, Group, Image, Stack, Title } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";
import { IntegrationMarquee } from "@homarr/ui";
import { useWorkerResourceUrl } from "@homarr/worker-client/resources";

import classes from "./hero-banner.module.css";

export function HeroBannerContent({ appName, logoImageUrl }: { appName: string; logoImageUrl: string | null }) {
  const t = useI18n("management.page.home");
  const logo = useWorkerResourceUrl(logoImageUrl ?? "/logo/logo.png");
  return (
    <Box className={classes.bannerContainer} p={{ base: "lg", md: "3rem" }} bg="dark.6" pos="relative">
      <Stack gap={0}>
        <Title fz={{ base: "h4", md: "h2" }} c="dimmed">
          {t("heroBanner.title")}
        </Title>
        <Group gap="sm" wrap="nowrap">
          <Image
            src={logo}
            alt={`${appName} logo`}
            w="auto"
            h={{ base: 48, md: 64 }}
            maw={{ base: 128, md: 192 }}
            fit="contain"
            style={{ flexShrink: 0 }}
          />
          <Title fz={{ base: "h3", md: "h1" }}>{t("heroBanner.subtitle", { app: appName })}</Title>
        </Group>
      </Stack>
      <Box visibleFrom="md" className={classes.scrollContainer} w="30%" top={0} right={0} pos="absolute">
        <IntegrationMarquee />
      </Box>
    </Box>
  );
}
