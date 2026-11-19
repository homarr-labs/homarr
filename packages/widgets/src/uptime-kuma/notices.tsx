"use client";

import type { CSSProperties } from "react";
import type { MantineColor } from "@mantine/core";
import { ActionIcon, Text, Tooltip } from "@mantine/core";
import { IconSpeakerphone, IconTool } from "@tabler/icons-react";
import { useFormatter } from "next-intl";

import { useI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import classes from "./component.module.css";
import type { LoadedStatusPage } from "./monitors";
import { formatRelativeTime, incidentStyleColors } from "./status";

export interface Notice {
  key: string;
  kind: "incident" | "maintenance";
  color: MantineColor;
  title: string;
  description: string | null;
  updatedAt: number | null;
}

export const getNotices = (pages: readonly LoadedStatusPage[], fallbackTitle: string): Notice[] =>
  pages.flatMap(({ integrationId, statusPage }) => [
    ...statusPage.incidents.map((incident) => ({
      key: `${integrationId}:incident:${incident.id}`,
      kind: "incident" as const,
      color: incidentStyleColors[incident.style],
      title: incident.title || fallbackTitle,
      description: incident.content,
      updatedAt: incident.updatedAt ?? incident.createdAt,
    })),
    ...statusPage.maintenances.map((maintenance) => ({
      key: `${integrationId}:maintenance:${maintenance.id}`,
      kind: "maintenance" as const,
      color: "blue",
      title: maintenance.title || fallbackTitle,
      description: maintenance.description,
      updatedAt: null,
    })),
  ]);

const noticeIcons = { incident: IconSpeakerphone, maintenance: IconTool } as const;

export const NoticeList = ({
  notices,
  compact,
  showAge,
  now,
}: {
  notices: readonly Notice[];
  compact: boolean;
  showAge: boolean;
  now: Date | null;
}) => {
  const formatter = useFormatter();

  return (
    <div className={classes.notices}>
      {notices.map((notice) => {
        const Icon = noticeIcons[notice.kind];
        const age = showAge && formatRelativeTime(formatter, notice.updatedAt, now);

        return (
          <div
            key={notice.key}
            className={classes.notice}
            style={{ "--notice-color": `var(--mantine-color-${notice.color}-6)` } as CSSProperties}
            title={compact && notice.description ? notice.description : undefined}
          >
            <Icon className={classes.noticeIcon} aria-hidden />
            <div className={classes.noticeBody}>
              <div className={classes.noticeHeading}>
                <Text size="sm" fw={600} lineClamp={compact ? 1 : 2}>
                  {notice.title}
                </Text>
                {age && (
                  <Text size="xs" c="dimmed" className={classes.noticeAge}>
                    {age}
                  </Text>
                )}
              </div>
              {!compact && notice.description && (
                <Text size="xs" c="dimmed" lineClamp={2}>
                  {notice.description}
                </Text>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const NoticeIndicator = ({ notices }: { notices: readonly Notice[] }) => {
  const t = useI18n("widget.uptimeKuma");
  const first = notices[0];
  if (!first) return null;
  const Icon = noticeIcons[first.kind];

  return (
    <Tooltip
      label={notices.map((notice) => notice.title).join("\n")}
      multiline
      maw={280}
      withArrow
      style={{ whiteSpace: "pre-line" }}
    >
      <ActionIcon
        variant="light"
        color={first.color}
        size="sm"
        radius="xl"
        aria-label={t("notice.label", { count: notices.length })}
        style={{ cursor: "help" }}
      >
        <Icon style={iconSizes.xs} aria-hidden />
      </ActionIcon>
    </Tooltip>
  );
};
