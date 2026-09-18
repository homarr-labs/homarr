import { Avatar, Loader } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

import classes from "./loading.module.css";

export function StatsLoading({ iconUrl, source, size = 20 }: { iconUrl?: string; source?: string; size?: number }) {
  const t = useI18n("widget.stats");
  let label = t("loading");
  if (source) label = `${source}: ${label}`;

  return (
    <Loader size={size} className={classes.root} role="status" aria-label={label}>
      <span className={classes.ring} aria-hidden="true" />
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
    </Loader>
  );
}
