import { Avatar, Box } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

import classes from "./loading.module.css";

export function StatsLoading({ iconUrl, source, size = 20 }: { iconUrl?: string; source?: string; size?: number }) {
  const t = useI18n("widget.stats");
  let label = t("loading");
  if (source) label = `${source}: ${label}`;

  return (
    <Box component="output" w={size} h={size} className={classes.root} aria-label={label}>
      <Avatar
        component="span"
        classNames={{ image: classes.image }}
        src={iconUrl}
        size="64%"
        radius={0}
        variant="transparent"
        alt=""
        aria-hidden="true"
        imageProps={{ referrerPolicy: "no-referrer" }}
        styles={{ image: { objectFit: "contain" } }}
      >
        <span />
      </Avatar>
    </Box>
  );
}
