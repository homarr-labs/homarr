import { Image, Marquee, SimpleGrid } from "@mantine/core";

import { splitToNChunks } from "@homarr/common";
import { integrationDefs } from "@homarr/definitions";

import classes from "./integration-marquee.module.css";

const iconGroups = splitToNChunks(
  Object.values(integrationDefs)
    .filter((integration) => integration.name !== "Mock")
    .map((integration) => integration.iconUrl),
  3,
);
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
          <Image key={`${icon}-${columnIndex}`} src={icon} alt="" fit="contain" w={52} h={52} />
        ))}
      </Marquee>
    ))}
  </SimpleGrid>
);
