"use client";

import { useState } from "react";
import { SegmentedControl, Stack } from "@mantine/core";

import type { BeszelTimePeriod } from "@homarr/definitions/beszel";
import { beszelTimePeriodSchema, defaultBeszelTimePeriod } from "@homarr/definitions/beszel";
import { createModal } from "@homarr/modals";

import { beszelCompactTimePeriodOptions } from "./options";
import { BeszelStatsView } from "./stats-view";

const allCharts = {
  cpu: true,
  memory: true,
  disk: true,
  diskIO: true,
  network: true,
  gpuUsage: true,
  gpuMemory: true,
  gpuPower: true,
  dockerCpu: true,
  dockerMemory: true,
  dockerNetwork: true,
} as const;

interface BeszelSystemStatsModalProps {
  integrationId: string;
  systemId: string;
}

export const BeszelSystemStatsModal = createModal<BeszelSystemStatsModalProps>(({ innerProps }) => {
  const [timePeriod, setTimePeriod] = useState<BeszelTimePeriod>(defaultBeszelTimePeriod);

  return (
    <Stack gap="md">
      <SegmentedControl
        size="xs"
        value={timePeriod}
        onChange={(value) => {
          const period = beszelTimePeriodSchema.safeParse(value);
          if (period.success) setTimePeriod(period.data);
        }}
        data={beszelCompactTimePeriodOptions}
      />
      <BeszelStatsView
        integrationIds={[innerProps.integrationId]}
        systemId={innerProps.systemId}
        timePeriod={timePeriod}
        visibility={allCharts}
        columns={2}
        onSwitchToHistorical={() => setTimePeriod(defaultBeszelTimePeriod)}
      />
    </Stack>
  );
}).withOptions({
  defaultTitle: (t) => t("widget.beszelSystemStats.name"),
  size: 1200,
});
