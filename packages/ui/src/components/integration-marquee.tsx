import { Image, Marquee, SimpleGrid } from "@mantine/core";

import { splitToNChunks } from "@homarr/common";

import classes from "./integration-marquee.module.css";

const localIconPaths = [
  "/images/apps/sonarr.svg",
  "/images/apps/radarr.svg",
  "/images/apps/lidarr.svg",
  "/images/apps/readarr.svg",
  "/images/apps/nextcloud.svg",
  "/images/apps/truenas.svg",
  "/images/apps/unraid-alt.svg",
  "/images/apps/imdb.svg",
  "/images/apps/lastfm.svg",
  "/images/apps/tmdb.svg",
  "/images/apps/the-tvdb.svg",
  "/images/apps/vgmdb.svg",
];
const iconGroups = splitToNChunks(localIconPaths, 3);
const animationDuration = iconGroups.flat().length * 2;

export const IntegrationMarquee = ({ className }: { className?: string }) => (
  <SimpleGrid
    className={className}
    cols={3}
    spacing="xl"
    h="calc(100% + 6rem)"
    my="-3rem"
    style={{ transform: "rotate(10deg)" }}
    aria-hidden
  >
    {iconGroups.map((icons, columnIndex) => (
      <Marquee
        key={columnIndex}
        orientation="vertical"
        repeat={2}
        duration={(animationDuration - columnIndex * 3) * 1000}
        gap="xl"
        fadeEdges={false}
        h="100%"
        className={classes.marquee}
        classNames={{ content: classes.content }}
      >
        {icons.map((icon) => (
          <Image
            key={`${icon}-${columnIndex}`}
            src={icon}
            alt=""
            fit="contain"
            w={52}
            h={52}
            loading="lazy"
            decoding="async"
          />
        ))}
      </Marquee>
    ))}
  </SimpleGrid>
);
