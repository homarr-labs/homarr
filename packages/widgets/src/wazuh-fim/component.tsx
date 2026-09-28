"use client";

import { Box, Center, Group, ScrollArea, Stack, Text, ThemeIcon, Tooltip } from "@mantine/core";
import {
  IconFileAlert,
  IconFileMinus,
  IconFilePencil,
  IconFilePlus,
  IconFileUnknown,
  IconShieldCheck,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { WazuhFimEntry } from "@homarr/integrations/types";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import { WidgetEmptyState } from "../common/empty-state";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import type { WidgetComponentProps } from "../definition";
import { WazuhChip } from "../wazuh/_shared/badges";
import { WazuhErrorState } from "../wazuh/_shared/error-state";
import { WazuhLegendChip, WazuhRelativeTime, WazuhSkeleton, WazuhWidgetFrame } from "../wazuh/_shared/frame";
import { formatWazuhCount } from "../wazuh/_shared/severity";
import { useWazuhLinks } from "../wazuh/_shared/use-wazuh-links";
import classes from "../wazuh/_shared/wazuh.module.css";

const eventStyles: Record<WazuhFimEntry["event"], { icon: TablerIcon; color: string }> = {
  added: { icon: IconFilePlus, color: "green" },
  modified: { icon: IconFilePencil, color: "yellow" },
  deleted: { icon: IconFileMinus, color: "red" },
  unknown: { icon: IconFileUnknown, color: "gray" },
};

const formatPath = (entry: WazuhFimEntry) => {
  if (!entry.isRegistry) return entry.path;
  const path = entry.path.replace(/^HKEY_LOCAL_MACHINE/, "HKLM").replace(/^HKEY_CURRENT_USER/, "HKCU");
  return entry.valueName ? `${path}\\${entry.valueName}` : path;
};

export default function WazuhFimWidget({ integrationIds, options, width, height }: WidgetComponentProps<"wazuhFim">) {
  const t = useI18n("widget.wazuhFim");
  const tShared = useI18n("widget.wazuh");
  const locale = useCurrentIntlLocale();
  const integrationId = integrationIds[0] ?? "";
  const query = clientApi.widget.wazuh.getFim.useQuery(
    {
      integrationId,
      range: options.range,
      event: options.event,
      limit: options.limit,
      includeRegistry: options.includeRegistry,
    },
    { staleTime: 60_000, refetchInterval: 60_000 },
  );
  const result = getUsableWidgetQueryData(query);
  const links = useWazuhLinks(result?.dashboardUrl);
  const compact = height < 170 || width < 260;
  const title = t("title", { range: tShared(`range.${options.range}`) });

  if (isInitialWidgetQueryPending(query)) {
    return (
      <WazuhWidgetFrame icon={IconFileAlert} title={title} compact={compact} iconColor="yellow">
        <WazuhSkeleton variant="list" rows={5} />
      </WazuhWidgetFrame>
    );
  }
  if (!result) return <WidgetEmptyState />;
  if (result.error) return <WazuhErrorState error={result.error} compact={height < 160} />;

  const fim = result.data;
  const wide = width >= 440;

  return (
    <WazuhWidgetFrame
      icon={IconFileAlert}
      title={title}
      href={links?.fim()}
      compact={compact}
      iconColor="yellow"
      headerRight={
        width >= 330 ? (
          <Group gap={8} wrap="nowrap">
            {(["added", "modified", "deleted"] as const).map((event) => (
              <Tooltip key={event} label={t(`event.${event}`)} withArrow>
                <div>
                  <WazuhLegendChip
                    color={`${eventStyles[event].color}.6`}
                    label=""
                    value={formatWazuhCount(fim.counts[event], locale)}
                  />
                </div>
              </Tooltip>
            ))}
          </Group>
        ) : undefined
      }
    >
      {fim.entries.length === 0 ? (
        <Center h="100%">
          <Stack align="center" gap={4}>
            <IconShieldCheck size={28} stroke={1.5} color="var(--mantine-color-green-6)" />
            <Text size="sm" c="dimmed" ta="center">
              {t("empty")}
            </Text>
          </Stack>
        </Center>
      ) : (
        <ScrollArea h="100%" type="auto" scrollbarSize={6} offsetScrollbars="y">
          <Stack gap={1}>
            {fim.entries.map((entry) => {
              const style = eventStyles[entry.event];
              const Icon = style.icon;
              const path = formatPath(entry);
              const href = links?.fim(entry.agentId);
              return (
                <Box
                  key={entry.id}
                  component={href ? "a" : "div"}
                  {...(href ? { href, target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={classes.row}
                  style={{ paddingBlock: compact ? 2 : 4 }}
                >
                  <Tooltip label={`${t(`event.${entry.event}`)} · ${entry.description}`} withArrow openDelay={300}>
                    <ThemeIcon size={22} radius="sm" variant="light" color={style.color} style={{ flexShrink: 0 }}>
                      <Icon size={14} stroke={1.7} />
                    </ThemeIcon>
                  </Tooltip>
                  <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
                    {/* Paths are truncated from the start so the file name stays visible. */}
                    <Text size="xs" className={`${classes.mono} ${classes.pathStart}`} title={path}>
                      {path}
                    </Text>
                    <Group gap={6} wrap="nowrap" c="dimmed" fz={11}>
                      <Text size="11px" c={`${style.color}.5`} fw={600} className={classes.nowrap}>
                        {t(`event.${entry.event}`)}
                      </Text>
                      {entry.agentName && (
                        <Text size="11px" truncate>
                          {entry.agentName}
                        </Text>
                      )}
                      {wide && entry.user && (
                        <Text size="11px" truncate>
                          {t("user", { user: entry.user })}
                        </Text>
                      )}
                      {entry.isRegistry && width >= 360 && <WazuhChip color="cyan">{t("registry")}</WazuhChip>}
                    </Group>
                  </Stack>
                  <WazuhRelativeTime value={entry.timestamp} short={!wide} />
                </Box>
              );
            })}
          </Stack>
        </ScrollArea>
      )}
    </WazuhWidgetFrame>
  );
}
