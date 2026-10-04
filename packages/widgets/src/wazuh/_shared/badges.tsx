"use client";

import { Tooltip } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

import { getWazuhLevelColor, getWazuhSeverityForLevel } from "./severity";
import classes from "./wazuh.module.css";

export const WazuhLevelBadge = ({ level }: { level: number }) => {
  const t = useI18n("widget.wazuh");
  return (
    <Tooltip
      label={t("levelTooltip", { level: String(level), severity: t(`severity.${getWazuhSeverityForLevel(level)}`) })}
      withArrow
      openDelay={300}
    >
      <span className={classes.levelBadge} data-color={getWazuhLevelColor(level)}>
        {level}
      </span>
    </Tooltip>
  );
};

export const WazuhChip = ({
  children,
  color,
  title,
}: {
  children: string;
  color?: "violet" | "cyan" | "red";
  title?: string;
}) => (
  <span className={classes.chip} data-color={color} title={title ?? children}>
    {children}
  </span>
);

const privateRanges = [
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^127\./,
  /^169\.254\./,
  /^fc|^fd|^fe80|^::1$/i,
];

export const isPrivateIp = (ip: string) => privateRanges.some((range) => range.test(ip));
