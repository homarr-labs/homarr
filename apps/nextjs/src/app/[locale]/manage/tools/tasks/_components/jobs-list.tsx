"use client";

import React, { useEffect, useState } from "react";
import { ActionIcon, Card, Group, Stack, Text } from "@mantine/core";
import { IconPlayerPlay } from "@tabler/icons-react";
import dayjs from "dayjs";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";

import type { TaskStatus } from "../../../../../../../../../packages/cron-job-status/src";

interface JobsListProps {
  initialJobs: RouterOutputs["cronJobs"]["getJobs"];
}

interface JobState {
  job: JobsListProps["initialJobs"][number];
  status: TaskStatus | null;
}

export const JobsList = ({ initialJobs }: JobsListProps) => {
  const [jobs, setJobs] = useState<JobState[]>(
    initialJobs.map((job) => ({
      job: job,
      status: null,
    })),
  );
  clientApi.cronJobs.subscribeToStatusUpdates.useSubscription(undefined, {
    onData: (data) => {
      const jobByName = jobs.find((job) => job.job.name === data.name);
      if (!jobByName) {
        return;
      }
      setJobs([
        ...jobs.filter((job) => job.job.name !== data.name),
        {
          ...jobByName,
          status: data,
        },
      ]);
    },
  });
  const { mutateAsync } = clientApi.cronJobs.triggerJob.useMutation();
  const handleJobTrigger = React.useCallback((job: JobState) => {
    if (job.status?.status === "running") {
      return;
    }
    void mutateAsync(job.job.name);
  }, []);
  return (
    <Stack>
      {jobs.map((job) => (
        <Card>
          <Group justify={"space-between"} gap={"md"}>
            <Stack gap={0}>
              <Text>{job.job.name}</Text>
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
  const [_, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Text size={"sm"} c={"dimmed"}>
      {dayjs(timestamp).fromNow()}
    </Text>
  );
};

export default TimeAgo;
