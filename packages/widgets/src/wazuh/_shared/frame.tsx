"use client";

import type { ReactNode } from "react";
import { Anchor, Box, Group, Stack, Text, ThemeIcon, Tooltip, UnstyledButton } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { useCurrentIntlLocale } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import { WidgetQueryLoadingState } from "../../common/query-state-indicator";
import { useWidgetNow } from "../../common/use-widget-now";
import classes from "./wazuh.module.css";

dayjs.extend(relativeTime);

interface WazuhWidgetFrameProps {
  icon: TablerIcon;
  title: ReactNode;
  /** Deep link into the Wazuh dashboard for the header. */
  href?: string | null;
  headerRight?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** Tighter paddings for small tiles. */
  compact?: boolean;
  iconColor?: string;
}

export const WazuhWidgetFrame = ({
  icon: Icon,
  title,
  href,
  headerRight,
  footer,
  children,
  compact = false,
  iconColor = "blue",
}: WazuhWidgetFrameProps) => (
  <Stack h="100%" gap={compact ? 4 : 8} p={compact ? 6 : 10} className={classes.frame}>
    <Group justify="space-between" gap={6} wrap="nowrap" className={classes.header}>
      <Group gap={6} wrap="nowrap" miw={0} style={{ flex: 1 }}>
        <ThemeIcon size={compact ? 18 : 22} radius="sm" variant="light" color={iconColor} style={{ flexShrink: 0 }}>
          <Icon size={compact ? 12 : 14} stroke={1.8} />
        </ThemeIcon>
        {href ? (
          <Anchor
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            c="inherit"
            underline="never"
            className={classes.headerLink}
            miw={0}
          >
            <Text size="sm" fw={600} truncate component="span">
              {title}
            </Text>
            <IconExternalLink size={12} className={classes.headerLinkIcon} />
          </Anchor>
        ) : (
          <Text size="sm" fw={600} truncate>
            {title}
          </Text>
        )}
      </Group>
      {headerRight !== undefined && (
        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
          {headerRight}
        </Group>
      )}
    </Group>
    <Box className={classes.body}>{children}</Box>
    {footer}
  </Stack>
);

export const WazuhPendingState = () => <WidgetQueryLoadingState />;

/** Relative time that re-renders every minute, with the absolute local time in a tooltip. */
export const WazuhRelativeTime = ({
  value,
  short = false,
  size = "xs",
}: {
  value: string | number | null;
  short?: boolean;
  size?: "xs" | "sm";
}) => {
  const locale = useCurrentIntlLocale();
  useWidgetNow("minute");
  if (value === null)
    return (
      <Text size={size} c="dimmed">
        -
      </Text>
    );
  const date = dayjs(value);
  return (
    <Tooltip label={date.toDate().toLocaleString(locale)} withArrow openDelay={300}>
      <Text size={size} c="dimmed" className={classes.nowrap}>
        {date.fromNow(short)}
      </Text>
    </Tooltip>
  );
};

interface WazuhStatTileProps {
  label: string;
  value: string;
  color: string;
  href?: string | null;
  active?: boolean;
  onClick?: () => void;
  hint?: string;
  compact?: boolean;
}

/** Small stat tile with a coloured accent, used for counts at the top of widgets. */
export const WazuhStatTile = ({ label, value, color, href, active, onClick, hint, compact }: WazuhStatTileProps) => {
  const content = (
    <Stack
      gap={0}
      className={classes.tile}
      data-active={active}
      style={{ "--tile-color": `var(--mantine-color-${color}-6)` }}
    >
      <Text fw={700} size={compact ? "sm" : "lg"} lh={1.15} className={classes.tileValue}>
        {value}
      </Text>
      <Text size="10px" c="dimmed" tt="uppercase" fw={600} truncate lh={1.3}>
        {label}
      </Text>
    </Stack>
  );
  const wrapped = onClick ? (
    <UnstyledButton onClick={onClick} className={classes.tileButton}>
      {content}
    </UnstyledButton>
  ) : href ? (
    <Anchor
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      underline="never"
      c="inherit"
      className={classes.tileButton}
    >
      {content}
    </Anchor>
  ) : (
    content
  );
  return hint ? (
    <Tooltip label={hint} withArrow openDelay={300}>
      <Box miw={0} style={{ flex: 1 }}>
        {wrapped}
      </Box>
    </Tooltip>
  ) : (
    <Box miw={0} style={{ flex: 1 }}>
      {wrapped}
    </Box>
  );
};

/** Legend chip: coloured dot, label and value. */
export const WazuhLegendChip = ({ color, label, value }: { color: string; label: string; value?: string }) => (
  <Group gap={4} wrap="nowrap" className={classes.nowrap}>
    <Box className={classes.dot} style={{ background: `var(--mantine-color-${color.replace(".", "-")})` }} />
    {label && (
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    )}
    {value !== undefined && (
      <Text size="xs" fw={600}>
        {value}
      </Text>
    )}
  </Group>
);
