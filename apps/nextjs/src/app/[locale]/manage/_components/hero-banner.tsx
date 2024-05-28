import { Box, Grid, GridCol, Group, Image, Stack, Title } from "@mantine/core";

import { splitToNChunks } from "@homarr/common";

import classes from "./hero-banner.module.css";

const icons = [
  "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/homarr.svg",
  "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/sabnzbd.svg",
  "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/deluge.svg",
  "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/radarr.svg",
  "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/sonarr.svg",
  "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/lidarr.svg",
  "https://cdn.jsdelivr.net/gh/loganmarchione/homelab-svg-assets/assets/pihole.svg",
  "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/dashdot.png",
  "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/overseerr.svg",
  "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/plex.svg",
  "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/jellyfin.svg",
  "https://cdn.jsdelivr.net/gh/loganmarchione/homelab-svg-assets/assets/homeassistant.svg",
  "https://cdn.jsdelivr.net/gh/loganmarchione/homelab-svg-assets/assets/freshrss.svg",
  "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/readarr.svg",
  "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/transmission.svg",
  "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/qbittorrent.svg",
  "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/nzbget.png",
  "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/openmediavault.svg",
  "https://cdn.jsdelivr.net/gh/loganmarchione/homelab-svg-assets/assets/docker.svg",
  "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/jellyseerr.svg",
  "https://cdn.jsdelivr.net/gh/loganmarchione/homelab-svg-assets/assets/adguardhome.svg",
  "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/tdarr.png",
  "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/prowlarr.svg",
];

const countIconGroups = 3;
const animationDurationInSeconds = 12;

export const HeroBanner = () => {
  const arrayInChunks = splitToNChunks(icons, countIconGroups);
  const gridSpan = 12 / countIconGroups;

  return (
    <Box className={classes.bannerContainer} bg="dark.6" pos="relative">
      <Stack gap={0}>
        <Title order={2} c="dimmed">
          Welcome back to your
        </Title>
        <Group gap="xs">
          <Image src="/logo/logo.png" w={40} h={40} />
          <Title>Homarr Dashboard</Title>
        </Group>
      </Stack>
      <Box className={classes.scrollContainer} w={"30%"} top={0} right={0} pos="absolute">
        <Grid>
          {Array(countIconGroups)
            .fill(0)
            .map((_, columnIndex) => (
              <GridCol key={`grid-column-${columnIndex}`} span={gridSpan}>
                <Stack
                  className={classes.scrollAnimationContainer}
                  style={{
                    animationDuration: `${animationDurationInSeconds - columnIndex}s`,
                  }}
                >
                  {arrayInChunks[columnIndex]?.map((icon, index) => (
                    <Image key={`grid-column-${columnIndex}-scroll-1-${index}`} src={icon} radius="md" w={50} h={50} />
                  ))}

                  {/* This is used for making the animation seem seamless */}
                  {arrayInChunks[columnIndex]?.map((icon, index) => (
                    <Image key={`grid-column-${columnIndex}-scroll-2-${index}`} src={icon} radius="md" w={50} h={50} />
                  ))}
                </Stack>
              </GridCol>
            ))}
        </Grid>
      </Box>
    </Box>
  );
};
