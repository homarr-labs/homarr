import { useEffect, useRef, useState } from "react";
import { ActionIcon, Alert, Badge, Button, Group, Select, Text, Tooltip } from "@mantine/core";
import { IconPlayerPlay, IconPower, IconRefresh } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";

import { isLocaleSupported, localeConfigurations } from "@homarr/translation";
import type { TranslationObject, ScopedTranslationFunction } from "@homarr/translation/standalone";
import { useCurrentLocale, useFormatter, useI18n, useNow } from "@homarr/translation/standalone/client";
import { IconPowerOff } from "@homarr/ui/icons";
import { TaskStatusBadgeView } from "@homarr/ui/source-views/recovery-operations";

import { operationsCronIntervals } from "../../features/operations/intervals";

export type OperationsTaskName = keyof TranslationObject["management"]["page"]["tool"]["tasks"]["job"];

export interface OperationsTaskDisplay<Name extends OperationsTaskName = OperationsTaskName> {
  readonly name: Name;
  readonly cron: string;
  readonly isEnabled: boolean;
  readonly preventCustomInterval: boolean;
  readonly preventManualExecution: boolean;
}

export interface OperationsTaskStatusDisplay {
  readonly status: "running" | "idle";
  readonly lastExecutionTimestamp?: string | null;
  readonly lastExecutionStatus?: "success" | "error" | null;
}

export type OperationsTaskControl = "interval" | "toggle" | "trigger";

export interface OperationsTasksTableProps<Name extends OperationsTaskName = OperationsTaskName> {
  jobs: readonly OperationsTaskDisplay<Name>[];
  statuses?: ReadonlyMap<string, OperationsTaskStatusDisplay>;
  pending?: ReadonlyMap<string, "interval" | "enable" | "disable" | "trigger" | "start" | "stop">;
  onTrigger?: (job: OperationsTaskDisplay<Name>) => Promise<void>;
  onToggle?: (job: OperationsTaskDisplay<Name>) => Promise<void>;
  onInterval?: (job: OperationsTaskDisplay<Name>, cron: string) => Promise<void>;
  onRefresh?: () => void;
  refreshing?: boolean;
  readOnly?: boolean;
  heldReason?: string;
}

function restoreTaskControlFocus(
  jobName: string,
  action: OperationsTaskControl,
  originalControl: HTMLElement | null,
  signal: AbortSignal,
) {
  const focusWhenEnabled = (attemptsRemaining: number) => {
    if (signal.aborted) return;
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
}

function createColumns<Name extends OperationsTaskName>(
  props: OperationsTasksTableProps<Name>,
  tCommon: ScopedTranslationFunction<"common">,
  tTasks: ScopedTranslationFunction<"management.page.tool.tasks">,
  restoreFocus: (name: string, action: OperationsTaskControl, element: HTMLElement | null) => void,
  setActionError: (error: unknown) => void,
): MRT_ColumnDef<OperationsTaskDisplay<Name>>[] {
  const jobLabels: Record<OperationsTaskName, string> = {
    analytics: tTasks("job.analytics.label"),
    iconsUpdater: tTasks("job.iconsUpdater.label"),
    ping: tTasks("job.ping.label"),
  };
  return [
    {
      accessorKey: "name",
      header: tCommon("field.name"),
      Cell({ row }) {
        const status = props.statuses?.get(row.original.name);
        return (
          <Group gap="xs">
            <Text fw={500}>{jobLabels[row.original.name]}</Text>
            <TaskStatusBadgeView
              isEnabled={row.original.isEnabled}
              status={status?.status ?? null}
              disabledLabel={tTasks("status.disabled")}
              runningLabel={tTasks("status.running")}
              idleLabel={tTasks("status.idle")}
            />
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
        const job = row.original;
        if (job.preventCustomInterval) return null;
        const handleIntervalChange = async (cron: string | null, originalControl: HTMLElement | null) => {
          if (!cron || cron === job.cron || props.readOnly || props.pending?.has(job.name) || !props.onInterval) return;
          try {
            setActionError(null);
            await props.onInterval(job, cron);
          } catch (error: unknown) {
            setActionError(error);
          } finally {
            restoreFocus(job.name, "interval", originalControl);
          }
        };
        return (
          <Select
            value={job.cron}
            onChange={(cron) => {
              let originalControl: HTMLElement | null = null;
              if (document.activeElement instanceof HTMLElement) originalControl = document.activeElement;
              void handleIntervalChange(cron, originalControl);
            }}
            data={operationsCronIntervals.map((entry) => ({
              value: entry.value,
              label:
                "interval" in entry
                  ? tTasks(`interval.${entry.unit}`, { interval: entry.interval })
                  : tTasks(`interval.${entry.unit}`),
            }))}
            aria-label={`${tTasks("field.interval.label")} ${jobLabels[job.name]}`}
            data-task-action="interval"
            data-task-name={job.name}
            size="sm"
            disabled={props.readOnly || props.pending?.has(job.name) || !props.onInterval}
            style={{ minWidth: 180 }}
          />
        );
      },
    },
    {
      id: "lastExecutionTime",
      header: tTasks("field.lastExecution.label"),
      size: 150,
      Cell({ row }) {
        const status = props.statuses?.get(row.original.name);
        if (!status?.lastExecutionTimestamp)
          return (
            <Text size="sm" c="dimmed">
              —
            </Text>
          );
        return <TimeAgo timestamp={status.lastExecutionTimestamp} />;
      },
    },
    {
      id: "actions",
      header: tTasks("field.actions.label"),
      size: 120,
      enableSorting: false,
      Cell({ row }) {
        const job = row.original;
        const status = props.statuses?.get(job.name);
        const pending = props.pending?.get(job.name);
        const triggerPending = pending === "trigger";
        const togglePending = pending === "enable" || pending === "disable";
        const jobLabel = jobLabels[job.name];
        const triggerLabel = tTasks("action.run", { name: jobLabel });
        let toggleLabel = tTasks("action.enable", { name: jobLabel });
        if (job.isEnabled) toggleLabel = tTasks("action.disable", { name: jobLabel });
        const handleToggle = async (originalControl: HTMLButtonElement) => {
          if (props.readOnly || pending || !props.onToggle) return;
          try {
            setActionError(null);
            await props.onToggle(job);
          } catch (error: unknown) {
            setActionError(error);
          } finally {
            restoreFocus(job.name, "toggle", originalControl);
          }
        };
        const handleTrigger = async (originalControl: HTMLButtonElement) => {
          if (props.readOnly || status?.status === "running" || pending || !props.onTrigger) return;
          try {
            setActionError(null);
            await props.onTrigger(job);
          } catch (error: unknown) {
            setActionError(error);
          } finally {
            restoreFocus(job.name, "trigger", originalControl);
          }
        };
        return (
          <Group gap="xs">
            {!job.preventManualExecution && (
              <Tooltip label={triggerLabel} openDelay={500}>
                <ActionIcon
                  aria-label={triggerLabel}
                  onClick={(event) => void handleTrigger(event.currentTarget)}
                  data-task-action="trigger"
                  data-task-name={job.name}
                  disabled={props.readOnly || status?.status === "running" || pending !== undefined || !props.onTrigger}
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
                onClick={(event) => void handleToggle(event.currentTarget)}
                data-task-action="toggle"
                data-task-name={job.name}
                disabled={props.readOnly || pending !== undefined || !props.onToggle}
                loading={togglePending}
                variant="light"
                color={job.isEnabled ? "green" : "gray"}
                size="md"
              >
                {job.isEnabled ? <IconPower size={16} /> : <IconPowerOff size={16} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        );
      },
    },
  ];
}

export function OperationsTasksTable<Name extends OperationsTaskName>(props: OperationsTasksTableProps<Name>) {
  const tCommon = useI18n("common");
  const tTasks = useI18n("management.page.tool.tasks");
  const locale = useCurrentLocale();
  const [actionError, setActionError] = useState<unknown>(null);
  const focusLifetime = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    focusLifetime.current = controller;
    return () => {
      controller.abort();
      focusLifetime.current = null;
    };
  }, []);

  const { data: localization } = useSuspenseQuery({
    queryKey: ["mantine-react-table-locale", locale],
    queryFn: async () => {
      if (!isLocaleSupported(locale)) throw new Error(`Unsupported table locale: ${locale}`);
      return await localeConfigurations[locale].importMrtLocalization();
    },
  });

  const restoreFocus = (name: string, action: OperationsTaskControl, element: HTMLElement | null) => {
    const lifetime = focusLifetime.current;
    if (lifetime) restoreTaskControlFocus(name, action, element, lifetime.signal);
  };
  const columns = createColumns(props, tCommon, tTasks, restoreFocus, (error) => {
    if (focusLifetime.current && !focusLifetime.current.signal.aborted) setActionError(error);
  });

  const table = useMantineReactTable({
    data: [...props.jobs],
    localization,
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
      placeholder: tTasks("table.search", { count: String(props.jobs.length) }),
      style: { minWidth: 300 },
    },
    initialState: { density: "xs", showGlobalFilter: true },
    renderTopToolbarCustomActions: () => (
      <Button
        variant="default"
        rightSection={<IconRefresh size="1rem" />}
        disabled={!props.onRefresh}
        loading={props.refreshing}
        onClick={props.onRefresh}
      >
        {tCommon("action.refresh")}
      </Button>
    ),
    columns,
  });

  return (
    <>
      {actionError !== null && (
        <Alert color="red" role="alert">
          {actionError instanceof Error ? actionError.message : tCommon("error")}
        </Alert>
      )}
      {(props.readOnly || !props.onTrigger || !props.onToggle || !props.onInterval || !props.onRefresh) && (
        <Alert color="yellow" aria-live="polite">
          {props.heldReason ?? "Native task actions are unavailable. Display-only feedback; no job will be executed."}
        </Alert>
      )}
      <MantineReactTable table={table} />
    </>
  );
}

function TimeAgo({ timestamp }: { timestamp: string }) {
  const formatter = useFormatter();
  const now = useNow({ updateInterval: 1000 });
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime()))
    return (
      <Text size="sm" c="dimmed">
        —
      </Text>
    );
  return (
    <Text size="sm" c="dimmed">
      {formatter.relativeTime(date, now)}
    </Text>
  );
}
