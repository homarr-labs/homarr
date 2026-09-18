import { Avatar, Loader } from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import classes from "./loading.module.css";

export function StatsLoading({ iconUrl, source, size = 20 }: { iconUrl?: string; source?: string; size?: number }) {
  const t = useI18n("widget.stats");
  let label = t("loading");
  if (source) label = `${source}: ${label}`;

  return (
    <Loader size={size} className={classes.root} role="status" aria-label={label}>
      <span className={classes.halo} aria-hidden="true" />
      <Avatar
        component="span"
        className={classes.logo}
        src={iconUrl}
        size="100%"
        radius={0}
        variant="transparent"
        alt=""
        aria-hidden="true"
        imageProps={{ referrerPolicy: "no-referrer" }}
        styles={{ image: { objectFit: "contain" } }}
      >
        <IconChartBar className={classes.fallback} />
      </Avatar>
    </Loader>
  );
}
