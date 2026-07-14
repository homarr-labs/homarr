"use client";

import { useState } from "react";
import { SegmentedControl, Stack } from "@mantine/core";

import { createModal } from "@homarr/modals";

import type { BeszelTimePeriod } from "./chart";
import { BeszelStatsView } from "./stats-view";

const timePeriodOptions: { value: BeszelTimePeriod; label: string }[] = [
  { value: "1m", label: "Live" },
  { value: "1h", label: "1H" },
  { value: "12h", label: "12H" },
  { value: "24h", label: "24H" },
  { value: "1w", label: "1W" },
  { value: "30d", label: "30D" },
];

const allCharts = {
  cpu: true,
  memory: true,
  disk: true,
  diskIO: true,
  network: true,
  dockerCpu: true,
  dockerMemory: true,
  dockerNetwork: true,
} as const;

interface BeszelSystemStatsModalProps {
  integrationId: string;
  systemId: string;
}

export const BeszelSystemStatsModal = createModal<BeszelSystemStatsModalProps>(({ innerProps }) => {
  const [timePeriod, setTimePeriod] = useState<BeszelTimePeriod>("1h");

  return (
    <Stack gap="md">
      <SegmentedControl
        size="xs"
        value={timePeriod}
        onChange={(value) => setTimePeriod(value as BeszelTimePeriod)}
        data={timePeriodOptions}
      />
      <BeszelStatsView
        integrationIds={[innerProps.integrationId]}
        systemId={innerProps.systemId}
        timePeriod={timePeriod}
        visibility={allCharts}
        columns={2}
        onSwitchToHistorical={() => setTimePeriod("1h")}
      />
    </Stack>
  );
}).withOptions({
  defaultTitle: (t) => t("widget.beszelSystemStats.name"),
  size: 1200,
});
