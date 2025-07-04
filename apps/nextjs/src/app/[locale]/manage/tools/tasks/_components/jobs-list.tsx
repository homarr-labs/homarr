"use client";

import React, { useState, useTransition } from "react";
import { ActionIcon, Badge, Button, Card, Group, Select, Stack, Text } from "@mantine/core";
import { useMap } from "@mantine/hooks";
import { IconPlayerPlay, IconPower, IconSettings } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { getMantineColor, useTimeAgo } from "@homarr/common";
import type { TaskStatus } from "@homarr/cron-job-status";
import { useForm } from "@homarr/form";
import { createModal, useModalAction } from "@homarr/modals";
import { TranslationFunction } from "@homarr/translation";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import { IconPowerOff } from "@homarr/ui/icons";

interface JobsListProps {
  initialJobs: RouterOutputs["cronJobs"]["getJobs"];
}

type JobName = RouterOutputs["cronJobs"]["getJobs"][number]["name"];

export const JobsList = ({ initialJobs }: JobsListProps) => {
  const [jobs] = clientApi.cronJobs.getJobs.useSuspenseQuery(undefined, {
    initialData: initialJobs,
    refetchOnMount: false,
  });

  const jobStatusMap = useMap<string, TaskStatus | null>(initialJobs.map(({ name }) => [name, null] as const));

  clientApi.cronJobs.subscribeToStatusUpdates.useSubscription(undefined, {
    onData: (data) => {
      jobStatusMap.set(data.name, data);
    },
  });

  return (
    <Stack>
      {jobs.map((job) => {
        const status = jobStatusMap.get(job.name);

        return <JobCard key={job.name} job={job} status={status ?? null} />;
      })}
    </Stack>
  );
};

const cronExpressions = [
  {
    value: "*/5 * * * * *",
    label: (t) => t("management.page.tool.tasks.interval.seconds", { interval: 5 }),
  },
  {
    value: "*/10 * * * * *",
    label: (t) => t("management.page.tool.tasks.interval.seconds", { interval: 10 }),
  },
  {
    value: "*/20 * * * * *",
    label: (t) => t("management.page.tool.tasks.interval.seconds", { interval: 20 }),
  },
  {
    value: "* * * * *",
    label: (t) => t("management.page.tool.tasks.interval.minutes", { interval: 1 }),
  },
  {
    value: "*/5 * * * *",
    label: (t) => t("management.page.tool.tasks.interval.minutes", { interval: 5 }),
  },
  {
    value: "*/10 * * * *",
    label: (t) => t("management.page.tool.tasks.interval.minutes", { interval: 10 }),
  },
  {
    value: "*/15 * * * *",
    label: (t) => t("management.page.tool.tasks.interval.minutes", { interval: 15 }),
  },
  {
    value: "0 * * * *",
    label: (t) => t("management.page.tool.tasks.interval.hours", { interval: 1 }),
  },
  {
    value: "0 0 * * */1",
    label: (t) => t("management.page.tool.tasks.interval.midnight"),
  },
  {
    value: "0 0 * * 1",
    label: (t) => t("management.page.tool.tasks.interval.weeklyMonday"),
  },
] satisfies { value: string; label: (t: TranslationFunction) => string }[];

interface JobCardProps {
  job: RouterOutputs["cronJobs"]["getJobs"][number];
  status: TaskStatus | null;
}

const JobCard = ({ job, status }: JobCardProps) => {
  const t = useI18n();
  const tTasks = useScopedI18n("management.page.tool.tasks");
  const triggerMutation = clientApi.cronJobs.triggerJob.useMutation();
  const handleJobTrigger = React.useCallback(
    async (name: JobName) => {
      if (status?.status === "running") return;
      await triggerMutation.mutateAsync(name);
    },
    [triggerMutation, status],
  );

  const { openModal } = useModalAction(TaskConfigurationModal);
  const [isEnabled, setEnabled] = useState(job.isEnabled);
  const disableMutation = clientApi.cronJobs.disableJob.useMutation();
  const enableMutation = clientApi.cronJobs.enableJob.useMutation();

  const [activeStatePending, startActiveTransition] = useTransition();
  const handleActiveChange = () =>
    startActiveTransition(async () => {
      if (isEnabled) {
        await disableMutation.mutateAsync(job.name, {
          onSuccess() {
            setEnabled(false);
          },
        });
      } else {
        await enableMutation.mutateAsync(job.name, {
          onSuccess() {
            setEnabled(true);
          },
        });
      }
    });

  return (
    <Card key={job.name} withBorder>
      <Group justify={"space-between"} gap={"md"}>
        <Stack gap={0}>
          <Group>
            <Text>{tTasks(`job.${job.name}.label`)}</Text>
            <StatusBadge isEnabled={isEnabled} status={status} />
            {status?.lastExecutionStatus === "error" && <Badge color="red">{tTasks("status.error")}</Badge>}
          </Group>
          <Group gap="xs">
            {status && (
              <>
                <TimeAgo timestamp={status.lastExecutionTimestamp} />
                <Text size="sm" c="dimmed">
                  •
                </Text>
                <Text size="sm" c="dimmed">
                  {cronExpressions.find((expression) => expression.value === job.cron)?.label(t) ?? job.cron}
                </Text>
              </>
            )}
          </Group>
        </Stack>

        <Group>
          {!job.preventManualExecution && (
            <ActionIcon
              onClick={() => handleJobTrigger(job.name)}
              disabled={status?.status === "running"}
              loading={triggerMutation.isPending}
              variant="default"
              size="xl"
              radius="xl"
            >
              <IconPlayerPlay color={getMantineColor("green", 6)} stroke={1.5} />
            </ActionIcon>
          )}
          <ActionIcon onClick={handleActiveChange} loading={activeStatePending} variant="default" size="xl" radius="xl">
            {isEnabled ? (
              <IconPower color={getMantineColor("green", 6)} stroke={1.5} />
            ) : (
              <IconPowerOff color={getMantineColor("gray", 6)} stroke={1.5} />
            )}
          </ActionIcon>
          <ActionIcon
            onClick={() =>
              openModal(
                { job },
                {
                  title: tTasks("settings.title", {
                    jobName: tTasks(`job.${job.name}.label`),
                  }),
                },
              )
            }
            variant={"default"}
            size={"xl"}
            radius={"xl"}
          >
            <IconSettings stroke={1.5} />
          </ActionIcon>
        </Group>
      </Group>
    </Card>
  );
};

interface StatusBadgeProps {
  isEnabled: boolean;
  status: TaskStatus | null;
}

const StatusBadge = ({ isEnabled, status }: StatusBadgeProps) => {
  const t = useScopedI18n("management.page.tool.tasks");
  if (!isEnabled) return <Badge color="yellow">{t("status.disabled")}</Badge>;

  if (!status) return null;

  if (status.status === "running") return <Badge color="green">{t("status.running")}</Badge>;
  return <Badge variant="default">{t("status.idle")}</Badge>;
};

const TimeAgo = ({ timestamp }: { timestamp: string }) => {
  const timeAgo = useTimeAgo(new Date(timestamp));

  return (
    <Text size={"sm"} c={"dimmed"}>
      {timeAgo}
    </Text>
  );
};

const TaskConfigurationModal = createModal<{
  job: RouterOutputs["cronJobs"]["getJobs"][number];
}>(({ actions, innerProps }) => {
  const t = useI18n();
  const form = useForm({
    initialValues: {
      cron: innerProps.job.cron,
    },
  });
  const { mutateAsync, isPending } = clientApi.cronJobs.updateJobInterval.useMutation();
  const utils = clientApi.useUtils();

  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        utils.cronJobs.getJobs.setData(undefined, (data) =>
          data?.map((job) =>
            job.name === innerProps.job.name
              ? {
                  ...job,
                  cron: values.cron,
                }
              : job,
          ),
        );
        await mutateAsync(
          {
            name: innerProps.job.name,
            cron: values.cron,
          },
          {
            onSuccess() {
              actions.closeModal();
            },
            async onSettled() {
              await utils.cronJobs.getJobs.invalidate();
            },
          },
        );
      })}
    >
      <Stack gap="sm">
        <Select
          label={t("management.page.tool.tasks.field.interval.label")}
          {...form.getInputProps("cron")}
          data={cronExpressions.map(({ value, label }) => ({ value, label: label(t) }))}
        />
        <Group justify="end">
          <Button variant="subtle" color="gray" disabled={isPending} onClick={actions.closeModal}>
            {t("common.action.cancel")}
          </Button>
          <Button type="submit" loading={isPending}>
            {t("common.action.save")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}).withOptions({
  defaultTitle: "",
});
