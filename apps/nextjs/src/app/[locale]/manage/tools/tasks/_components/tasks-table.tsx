"use client";

import { ActionIcon, Badge, Button, Group, Select, Text, Tooltip } from "@mantine/core";
import { useMap } from "@mantine/hooks";
import { IconPlayerPlay, IconPower, IconRefresh } from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useTimeAgo } from "@homarr/common";
import type { TaskStatus } from "@homarr/cron-job-status";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks";
import { IconPowerOff } from "@homarr/ui/icons";

const cronExpressions = [
  {
    value: "*/1 * * * * *",
    label: (t: ScopedTranslationFunction<"management.page.tool.tasks">) => t("interval.seconds", { interval: 1 }),
  },
  {
    value: "*/5 * * * * *",
    label: (t: ScopedTranslationFunction<"management.page.tool.tasks">) => t("interval.seconds", { interval: 5 }),
  },
  {
    value: "*/10 * * * * *",
    label: (t: ScopedTranslationFunction<"management.page.tool.tasks">) => t("interval.seconds", { interval: 10 }),
  },
  {
    value: "*/20 * * * * *",
    label: (t: ScopedTranslationFunction<"management.page.tool.tasks">) => t("interval.seconds", { interval: 20 }),
  },
  {
    value: "*/30 * * * * *",
    label: (t: ScopedTranslationFunction<"management.page.tool.tasks">) => t("interval.seconds", { interval: 30 }),
  },
  {
    value: "* * * * *",
    label: (t: ScopedTranslationFunction<"management.page.tool.tasks">) => t("interval.minutes", { interval: 1 }),
  },
  {
    value: "*/5 * * * *",
    label: (t: ScopedTranslationFunction<"management.page.tool.tasks">) => t("interval.minutes", { interval: 5 }),
  },
  {
    value: "*/10 * * * *",
    label: (t: ScopedTranslationFunction<"management.page.tool.tasks">) => t("interval.minutes", { interval: 10 }),
  },
  {
    value: "*/15 * * * *",
    label: (t: ScopedTranslationFunction<"management.page.tool.tasks">) => t("interval.minutes", { interval: 15 }),
  },
  // Every hour
  {
    value: "0 * * * *",
    label: (t: ScopedTranslationFunction<"management.page.tool.tasks">) => t("interval.hours", { interval: 1 }),
  },
  // Every two hours
  {
    value: "0 */2 * * *",
    label: (t: ScopedTranslationFunction<"management.page.tool.tasks">) => t("interval.hours", { interval: 2 }),
  },
  // Every four hours
  {
    value: "0 */4 * * *",
    label: (t: ScopedTranslationFunction<"management.page.tool.tasks">) => t("interval.hours", { interval: 4 }),
  },
  // Every midnight
  {
    value: "0 0 * * */1",
    label: (t: ScopedTranslationFunction<"management.page.tool.tasks">) => t("interval.midnight"),
  },
  {
    value: "0 0 * * 1",
    label: (t: ScopedTranslationFunction<"management.page.tool.tasks">) => t("interval.weeklyMonday"),
  },
] satisfies { value: string; label: (t: ScopedTranslationFunction<"management.page.tool.tasks">) => string }[];

type JobData = RouterOutputs["cronJobs"]["getJobs"][number] & {
  status?: TaskStatus | null;
  lastExecutionTime?: string;
};

type TaskControl = "interval" | "toggle" | "trigger";

const restoreTaskControlFocus = (jobName: string, action: TaskControl, originalControl: HTMLElement | null) => {
  const focusWhenEnabled = (attemptsRemaining: number) => {
    if (document.activeElement && document.activeElement !== document.body) return;

    let control: HTMLElement | null = null;
    if (originalControl?.isConnected && originalControl !== document.body) control = originalControl;
    if (!control) {
      const controls = document.querySelectorAll<HTMLElement>(`[data-task-action="${action}"]`);
      for (const candidate of controls) {
        if (candidate.dataset.taskName !== jobName) continue;
        control = candidate;
        break;
      }
    }

    if (control && !control.matches(":disabled")) {
      control.focus();
      return;
    }
    if (attemptsRemaining <= 0) return;
    window.setTimeout(() => focusWhenEnabled(attemptsRemaining - 1), 100);
  };

  window.setTimeout(() => focusWhenEnabled(50), 0);
};

const createColumns = (
  tCommon: ScopedTranslationFunction<"common">,
  tTasks: ScopedTranslationFunction<"management.page.tool.tasks">,
  jobStatusMap: Map<string, TaskStatus | null>,
  triggerMutation: ReturnType<typeof clientApi.cronJobs.triggerJob.useMutation>,
  updateIntervalMutation: ReturnType<typeof clientApi.cronJobs.updateJobInterval.useMutation>,
  enableMutation: ReturnType<typeof clientApi.cronJobs.enableJob.useMutation>,
  disableMutation: ReturnType<typeof clientApi.cronJobs.disableJob.useMutation>,
  loadingStates: Map<string, { toggle: boolean; trigger: boolean; interval: boolean }>,
): MRT_ColumnDef<JobData>[] => [
  {
    accessorKey: "name",
    header: tCommon("field.name"),
    Cell({ row }) {
      const status = jobStatusMap.get(row.original.name);
      return (
        <Group gap="xs">
          <Text fw={500}>{tTasks(`job.${row.original.name}.label`)}</Text>
          <StatusBadge isEnabled={row.original.isEnabled} status={status ?? null} />
          {status?.lastExecutionStatus === "error" && (
            <Badge color="red" size="sm">
              {tTasks("status.error")}
            </Badge>
          )}
        </Group>
      );
    },
  },
  {
    accessorKey: "cron",
    header: tTasks("field.interval.label"),
    size: 200,
    Cell({ row }) {
      if (row.original.preventCustomInterval) return null;

      const handleIntervalChange = async (newCron: string | null, originalControl: HTMLElement | null) => {
        if (!newCron || newCron === row.original.cron) return;

        const currentStates = loadingStates.get(row.original.name) ?? {
          toggle: false,
          trigger: false,
          interval: false,
        };
        loadingStates.set(row.original.name, {
          ...currentStates,
          interval: true,
        });

        try {
          await updateIntervalMutation.mutateAsync({
            name: row.original.name,
            cron: newCron,
          });
        } catch {
          // The mutation callback displays the error notification.
        } finally {
          const updatedStates = loadingStates.get(row.original.name) ?? {
            toggle: false,
            trigger: false,
            interval: false,
          };
          loadingStates.set(row.original.name, {
            ...updatedStates,
            interval: false,
          });
          restoreTaskControlFocus(row.original.name, "interval", originalControl);
        }
      };

      return (
        <Select
          value={row.original.cron}
          onChange={(newCron) => {
            let originalControl: HTMLElement | null = null;
            if (document.activeElement instanceof HTMLElement) originalControl = document.activeElement;
            void handleIntervalChange(newCron, originalControl);
          }}
          data={cronExpressions.map(({ value, label }) => ({
            value,
            label: label(tTasks),
          }))}
          data-task-action="interval"
          data-task-name={row.original.name}
          size="sm"
          disabled={loadingStates.get(row.original.name)?.interval ?? false}
          style={{ minWidth: 180 }}
        />
      );
    },
  },
  {
    accessorKey: "lastExecutionTime",
    header: tTasks("field.lastExecution.label"),
    size: 150,
    Cell({ row }) {
      const status = jobStatusMap.get(row.original.name);
      if (!status?.lastExecutionTimestamp) {
        return (
          <Text size="sm" c="dimmed">
            —
          </Text>
        );
      }
      return <TimeAgo timestamp={status.lastExecutionTimestamp} />;
    },
  },
  {
    id: "actions",
    header: tTasks("field.actions.label"),
    size: 120,
    enableSorting: false,
    Cell({ row }) {
      const status = jobStatusMap.get(row.original.name);
      const jobLabel = tTasks(`job.${row.original.name}.label`);
      const triggerPending = loadingStates.get(row.original.name)?.trigger ?? false;
      const togglePending = loadingStates.get(row.original.name)?.toggle ?? false;
      const triggerLabel = tTasks("action.run", { name: jobLabel });
      let toggleLabel = tTasks("action.enable", { name: jobLabel });
      if (row.original.isEnabled) toggleLabel = tTasks("action.disable", { name: jobLabel });

      const handleToggleEnabled = async (originalControl: HTMLButtonElement) => {
        const currentStates = loadingStates.get(row.original.name) ?? {
          toggle: false,
          trigger: false,
          interval: false,
        };
        loadingStates.set(row.original.name, {
          ...currentStates,
          toggle: true,
        });
        try {
          if (row.original.isEnabled) {
            await disableMutation.mutateAsync(row.original.name);
          } else {
            await enableMutation.mutateAsync(row.original.name);
          }
        } catch {
          // The mutation callback displays the error notification.
        } finally {
          const updatedStates = loadingStates.get(row.original.name) ?? {
            toggle: false,
            trigger: false,
            interval: false,
          };
          loadingStates.set(row.original.name, {
            ...updatedStates,
            toggle: false,
          });
          restoreTaskControlFocus(row.original.name, "toggle", originalControl);
        }
      };

      const handleTrigger = async (originalControl: HTMLButtonElement) => {
        if (status?.status === "running" || triggerPending) return;

        const currentStates = loadingStates.get(row.original.name) ?? {
          toggle: false,
          trigger: false,
          interval: false,
        };
        loadingStates.set(row.original.name, {
          ...currentStates,
          trigger: true,
        });
        try {
          await triggerMutation.mutateAsync(row.original.name);
        } catch {
          // The mutation callback displays the error notification.
        } finally {
          const updatedStates = loadingStates.get(row.original.name) ?? {
            toggle: false,
            trigger: false,
            interval: false,
          };
          loadingStates.set(row.original.name, {
            ...updatedStates,
            trigger: false,
          });
          restoreTaskControlFocus(row.original.name, "trigger", originalControl);
        }
      };

      return (
        <Group gap="xs">
          {!row.original.preventManualExecution && (
            <Tooltip label={triggerLabel} openDelay={500}>
              <ActionIcon
                aria-label={triggerLabel}
                onClick={(event) => void handleTrigger(event.currentTarget)}
                data-task-action="trigger"
                data-task-name={row.original.name}
                disabled={status?.status === "running" || triggerPending}
                loading={triggerPending}
                variant="light"
                color="green"
                size="md"
              >
                <IconPlayerPlay size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label={toggleLabel} openDelay={500}>
            <ActionIcon
              aria-label={toggleLabel}
              onClick={(event) => void handleToggleEnabled(event.currentTarget)}
              data-task-action="toggle"
              data-task-name={row.original.name}
              disabled={togglePending}
              loading={togglePending}
              variant="light"
              color={row.original.isEnabled ? "green" : "gray"}
              size="md"
            >
              {row.original.isEnabled ? <IconPower size={16} /> : <IconPowerOff size={16} />}
            </ActionIcon>
          </Tooltip>
        </Group>
      );
    },
  },
];

interface TasksTableProps {
  initialJobs: RouterOutputs["cronJobs"]["getJobs"];
}

export const TasksTable = ({ initialJobs }: TasksTableProps) => {
  const tCommon = useI18n("common");
  const tTasks = useI18n("management.page.tool.tasks");

  const { data: jobs } = clientApi.cronJobs.getJobs.useQuery(undefined, {
    initialData: initialJobs,
    refetchOnMount: false,
  });

  const jobStatusMap = useMap<string, TaskStatus | null>(initialJobs.map(({ name }) => [name, null] as const));

  const loadingStates = useMap<string, { toggle: boolean; trigger: boolean; interval: boolean }>();

  clientApi.cronJobs.subscribeToStatusUpdates.useSubscription(undefined, {
    onData: (data) => {
      jobStatusMap.set(data.name, data);
    },
  });

  const triggerMutation = clientApi.cronJobs.triggerJob.useMutation({
    onError() {
      showErrorNotification({
        title: tCommon("error"),
        message: tTasks("trigger.error.message"),
      });
    },
    onSuccess() {
      showSuccessNotification({
        title: tCommon("success"),
        message: tTasks("trigger.success.message"),
      });
    },
  });
  const updateIntervalMutation = clientApi.cronJobs.updateJobInterval.useMutation({
    onError() {
      showErrorNotification({
        title: tCommon("error"),
        message: tTasks("interval.update.error.message"),
      });
    },
    onSuccess: async () => {
      await utils.cronJobs.getJobs.invalidate();
      showSuccessNotification({
        title: tCommon("success"),
        message: tTasks("interval.update.success.message"),
      });
    },
  });
  const enableMutation = clientApi.cronJobs.enableJob.useMutation({
    onError() {
      showErrorNotification({
        title: tCommon("error"),
        message: tTasks("toggle.error.message"),
      });
    },
    onSuccess: async () => {
      await utils.cronJobs.getJobs.invalidate();
      showSuccessNotification({
        title: tCommon("success"),
        message: tTasks("enable.success.message"),
      });
    },
  });
  const disableMutation = clientApi.cronJobs.disableJob.useMutation({
    onError() {
      showErrorNotification({
        title: tCommon("error"),
        message: tTasks("toggle.error.message"),
      });
    },
    onSuccess: async () => {
      await utils.cronJobs.getJobs.invalidate();
      showSuccessNotification({
        title: tCommon("success"),
        message: tTasks("disable.success.message"),
      });
    },
  });

  // Utils for refresh functionality
  const utils = clientApi.useUtils();
  const handleRefreshAsync = async () => {
    try {
      await utils.cronJobs.getJobs.invalidate();
      showSuccessNotification({
        title: tCommon("success"),
        message: tTasks("refresh.success.message"),
      });
    } catch {
      showErrorNotification({
        title: tCommon("error"),
        message: tTasks("refresh.error.message"),
      });
    }
  };

  const table = useTranslatedMantineReactTable({
    data: jobs,
    enableDensityToggle: false,
    enableColumnActions: false,
    enableColumnFilters: false,
    enablePagination: false,
    enableRowSelection: false,
    enableTableFooter: false,
    enableBottomToolbar: false,
    enableRowActions: false,
    enableColumnOrdering: false,
    enableSorting: false,
    enableSortingRemoval: false,
    positionGlobalFilter: "right",
    mantineSearchTextInputProps: {
      placeholder: tTasks("table.search", { count: String(jobs.length) }),
      style: { minWidth: 300 },
    },
    initialState: { density: "xs", showGlobalFilter: true },
    renderTopToolbarCustomActions: () => (
      <Button variant="default" rightSection={<IconRefresh size="1rem" />} onClick={handleRefreshAsync}>
        {tCommon("action.refresh")}
      </Button>
    ),
    columns: createColumns(
      tCommon,
      tTasks,
      jobStatusMap,
      triggerMutation,
      updateIntervalMutation,
      enableMutation,
      disableMutation,
      loadingStates,
    ),
  });

  return <MantineReactTable table={table} />;
};

interface StatusBadgeProps {
  isEnabled: boolean;
  status: TaskStatus | null;
}

const StatusBadge = ({ isEnabled, status }: StatusBadgeProps) => {
  const tTasks = useI18n("management.page.tool.tasks");

  if (!isEnabled) {
    return (
      <Badge color="yellow" size="sm">
        {tTasks("status.disabled")}
      </Badge>
    );
  }

  if (!status) return null;

  if (status.status === "running") {
    return (
      <Badge color="green" size="sm">
        {tTasks("status.running")}
      </Badge>
    );
  }

  return (
    <Badge variant="default" size="sm">
      {tTasks("status.idle")}
    </Badge>
  );
};

const TimeAgo = ({ timestamp }: { timestamp: string }) => {
  const timeAgo = useTimeAgo(new Date(timestamp));

  return (
    <Text size="sm" c="dimmed">
      {timeAgo}
    </Text>
  );
};
