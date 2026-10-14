import { Box, Group, Image, Stack, Title } from "@mantine/core";

import type { HeroBannerViewProps } from "./contracts";
import classes from "./hero-banner.module.css";

export const HeroBannerView = ({ title, subtitle, logoImageUrl, logoAlt, marquee }: HeroBannerViewProps) => {
  return (
    <Box className={classes.bannerContainer} p={{ base: "lg", md: "3rem" }} bg="dark.6" pos="relative">
      <Stack gap={0}>
        <Title fz={{ base: "h4", md: "h2" }} c="dimmed">
          {title}
        </Title>
        <Group gap="sm" wrap="nowrap">
          <Image
            src={logoImageUrl}
            alt={logoAlt}
            w="auto"
            h={{ base: 48, md: 64 }}
            maw={{ base: 128, md: 192 }}
            fit="contain"
            style={{ flexShrink: 0 }}
          />
          <Title fz={{ base: "h3", md: "h1" }}>{subtitle}</Title>
        </Group>
      </Stack>
      <Box visibleFrom="md" className={classes.scrollContainer} w={"30%"} top={0} right={0} pos="absolute">
        {marquee}
      </Box>
    </Box>
  );
};
