"use client";

import React from "react";
import { ActionIcon, Badge, Card, Group, Stack, Text } from "@mantine/core";
import { useListState } from "@mantine/hooks";
import { IconPlayerPlay } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useTimeAgo } from "@homarr/common";
import type { TaskStatus } from "@homarr/cron-job-status";
import { useScopedI18n } from "@homarr/translation/client";

interface JobsListProps {
  initialJobs: RouterOutputs["cronJobs"]["getJobs"];
}

interface JobState {
  job: JobsListProps["initialJobs"][number];
  status: TaskStatus | null;
}

export const JobsList = ({ initialJobs }: JobsListProps) => {
  const t = useScopedI18n("management.page.tool.tasks.job");
  const [jobs, handlers] = useListState<JobState>(
    initialJobs.map((job) => ({
      job,
      status: null,
    })),
  );
  clientApi.cronJobs.subscribeToStatusUpdates.useSubscription(undefined, {
    onData: (data) => {
      const jobByName = jobs.find((job) => job.job.name === data.name);
      if (!jobByName) {
        return;
      }
      handlers.applyWhere(
        (job) => job.job.name === data.name,
        (job) => ({ ...job, status: data }),
      );
    },
  });
  const { mutateAsync } = clientApi.cronJobs.triggerJob.useMutation();
  const handleJobTrigger = React.useCallback(
    async (job: JobState) => {
      if (job.status?.status === "running") {
        return;
      }
      await mutateAsync(job.job.name);
    },
    [mutateAsync],
  );
  return (
    <Stack>
      {jobs.map((job) => (
        <Card key={job.job.name}>
          <Group justify={"space-between"} gap={"md"}>
            <Stack gap={0}>
              <Group>
                <Text>{t(`${job.job.name}.label`)}</Text>
                {job.status?.status === "idle" && <Badge variant="default">Idle</Badge>}
                {job.status?.status === "running" && <Badge color="green">Running</Badge>}
                {job.status?.lastExecutionStatus === "error" && <Badge color="red">Error</Badge>}
              </Group>
              {job.status && <TimeAgo timestamp={job.status.lastExecutionTimestamp} />}
            </Stack>

            <ActionIcon
              onClick={() => handleJobTrigger(job)}
              disabled={job.status?.status === "running"}
              variant={"default"}
              size={"xl"}
              radius={"xl"}
            >
              <IconPlayerPlay stroke={1.5} />
            </ActionIcon>
          </Group>
        </Card>
      ))}
    </Stack>
  );
};

const TimeAgo = ({ timestamp }: { timestamp: string }) => {
  const timeAgo = useTimeAgo(timestamp);

  return (
    <Text size={"sm"} c={"dimmed"}>
      {timeAgo}
    </Text>
  );
};
