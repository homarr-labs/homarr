"use client";

import { Select } from "@mantine/core";

import type { LogLevel } from "@homarr/log/constants";
import { logLevelConfiguration, logLevels } from "@homarr/log/constants";
import { useI18n } from "@homarr/translation/client";

import { useLogContext } from "./log-context";

export const LogLevelSelection = () => {
  const { level, setLevel } = useLogContext();
  const t = useI18n();

  return (
    <Select
      data={logLevels.map((level) => ({
        value: level,
        label: `${logLevelConfiguration[level].prefix} ${t(`log.level.option.${level}`)}`,
      }))}
      value={level}
      onChange={(value) => setLevel(value as LogLevel)}
      checkIconPosition="right"
    />
  );
};
