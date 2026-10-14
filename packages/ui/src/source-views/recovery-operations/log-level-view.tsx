"use client";

import { Select } from "@mantine/core";

import type { LogLevelViewProps } from "./contracts";

export const LogLevelView = ({ level, options, onChange }: LogLevelViewProps) => (
  <Select
    data={options.map(({ value, label }) => ({ value, label }))}
    value={level}
    onChange={(value) => {
      const nextLevel = value && options.find((option) => option.value === value);
      if (nextLevel) {
        onChange(nextLevel.value);
      }
    }}
    checkIconPosition="right"
  />
);
