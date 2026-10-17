"use client";

import type { CSSProperties } from "react";
import { ActionIcon, Text, Tooltip } from "@mantine/core";
import { IconSpeakerphone, IconTool } from "@tabler/icons-react";

import type { UptimeKumaIncident, UptimeKumaMaintenance } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import classes from "./component.module.css";
import { incidentStyleColors } from "./status";

export interface Notice {
  key: string;
  kind: "incident" | "maintenance";
  color: string;
  title: string;
  description: string | null;
}

export const toNotices = (
  incidents: readonly UptimeKumaIncident[],
  maintenances: readonly UptimeKumaMaintenance[],
  fallbackTitle: string,
): Notice[] => [
  ...incidents.map((incident) => ({
    key: `incident-${incident.id}`,
    kind: "incident" as const,
    color: incidentStyleColors[incident.style],
    title: incident.title || fallbackTitle,
    description: incident.content,
  })),
  ...maintenances.map((maintenance) => ({
    key: `maintenance-${maintenance.id}`,
    kind: "maintenance" as const,
    color: "blue",
    title: maintenance.title || fallbackTitle,
    description: maintenance.description,
  })),
];

const noticeIcons = { incident: IconSpeakerphone, maintenance: IconTool } as const;

export const NoticeList = ({ notices, compact }: { notices: readonly Notice[]; compact: boolean }) => (
  <div className={classes.notices}>
    {notices.map((notice) => {
      const Icon = noticeIcons[notice.kind];
      return (
        <div
          key={notice.key}
          className={classes.notice}
          style={{ "--notice-color": `var(--mantine-color-${notice.color}-6)` } as CSSProperties}
          title={compact && notice.description ? notice.description : undefined}
        >
          <Icon className={classes.noticeIcon} aria-hidden />
          <div className={classes.noticeBody}>
            <Text size="sm" fw={600} lineClamp={compact ? 1 : 2}>
              {notice.title}
            </Text>
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

export const NoticeIndicator = ({ notices }: { notices: readonly Notice[] }) => {
  const t = useI18n("widget.uptimeKuma");
  const first = notices[0];
  if (!first) return null;
  const Icon = noticeIcons[first.kind];
  const label = notices.map((notice) => notice.title).join("\n");

  return (
    <Tooltip label={label} multiline maw={280} withArrow style={{ whiteSpace: "pre-line" }}>
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
