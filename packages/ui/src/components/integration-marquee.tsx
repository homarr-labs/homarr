import type { CSSProperties } from "react";
import { Image } from "@mantine/core";

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
  <div className={[classes.root, className].filter(Boolean).join(" ")} aria-hidden>
    {iconGroups.map((icons, columnIndex) => (
      <div
        key={columnIndex}
        className={classes.track}
        style={{ "--marquee-duration": `${animationDuration - columnIndex * 3}s` } as CSSProperties}
      >
        {[...icons, ...icons].map((icon, iconIndex) => (
          <div key={`${icon}-${iconIndex}`} className={classes.iconFrame}>
            <Image src={icon} alt="" fit="contain" w={52} h={52} />
          </div>
        ))}
      </div>
    ))}
  </div>
);
