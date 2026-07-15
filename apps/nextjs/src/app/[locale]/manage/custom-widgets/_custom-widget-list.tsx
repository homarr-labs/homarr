"use client";

import { ActionIcon, Avatar, Badge, Card, Group, Stack, Switch, Text, Tooltip } from "@mantine/core";
import { IconApi, IconPencil } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import { NoResults } from "~/components/no-results";
import { CustomWidgetRowActions } from "./_custom-widget-actions";

const displayTypeBadgeColors: Record<string, string> = {
  singleValue: "blue",
  keyValue: "green",
  table: "orange",
  statGrid: "violet",
  progressBars: "teal",
  statusIndicator: "cyan",
  countGrid: "indigo",
  raw: "gray",
  actionButton: "red",
  customJsx: "pink",
};

interface CustomWidgetListProps {
  definitions: RouterOutputs["customWidget"]["all"];
}

export const CustomWidgetList = ({ definitions }: CustomWidgetListProps) => {
  const t = useScopedI18n("customWidget");

  if (definitions.length === 0) {
    return (
      <NoResults
        icon={IconApi}
        title={t("page.list.noResults")}
        action={{ href: "/manage/custom-widgets/new", label: t("action.create") }}
      />
    );
  }

  return (
<Stack gap="sm">
      {definitions.map((def) => (
        <CustomWidgetCard key={def.id} widget={def} />
      ))}
    </Stack>
    </Stack>
  );
};

type WidgetDef = RouterOutputs["customWidget"]["all"][number];

function CustomWidgetCard({ widget }: { widget: WidgetDef }) {
  const t = useScopedI18n("customWidget");
  const toggleMutation = clientApi.customWidget.toggleEnabled.useMutation();
  const utils = clientApi.useUtils();

  const handleToggle = () => {
    toggleMutation.mutate(
      { id: widget.id, enabled: !widget.enabled },
      {
        onSuccess: () => {
          void utils.customWidget.all.invalidate();
          void utils.widget.customApi.getData.invalidate();
          void revalidatePathActionAsync("/manage/custom-widgets");
        },
        onError: () => {
          showErrorNotification({
            title: widget.enabled ? t("action.disable") : t("action.enable"),
            message: t("notification.toggleError"),
          });
        },
      },
    );
  };

  return (
    <Card
      padding="sm"
      style={{
        opacity: widget.enabled ? 1 : 0.55,
        transition: "opacity 150ms ease",
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap="md">
        <Group wrap="nowrap" gap="sm" style={{ flex: 1, minWidth: 0 }}>
          {widget.iconUrl ? (
            <Avatar size={36} radius="sm" src={widget.iconUrl} styles={{ image: { objectFit: "contain" } }} />
          ) : (
            <Avatar size={36} radius="sm" color="red">
              <IconApi size={18} />
            </Avatar>
          )}
          <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
            <Text size="sm" fw={600} lineClamp={1} style={{ minWidth: 0 }}>
              {widget.name}
            </Text>
            {widget.url && (
              <Text size="xs" c="dimmed" ff="monospace" lineClamp={1} style={{ wordBreak: "break-all", minWidth: 0 }}>
                {widget.url}
              </Text>
            )}
          </Stack>
          <Badge
            color={displayTypeBadgeColors[widget.displayType] ?? "gray"}
            size="sm"
            variant="light"
            style={{ flexShrink: 0 }}
          >
            {t(`displayType.${widget.displayType}` as never)}
          </Badge>
        </Group>

        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
          <Tooltip label={widget.enabled ? t("action.disable") : t("action.enable")}>
            <Switch
              size="sm"
              checked={widget.enabled}
              onChange={handleToggle}
              disabled={toggleMutation.isPending}
              aria-label={widget.enabled ? t("action.disable") : t("action.enable")}
            />
          </Tooltip>
          <ActionIcon
            component={Link}
            href={`/manage/custom-widgets/edit/${widget.id}`}
            variant="subtle"
            color="gray"
            aria-label={t("action.edit")}
          >
            <IconPencil size={16} stroke={1.5} />
          </ActionIcon>
          <CustomWidgetRowActions widget={{ id: widget.id, name: widget.name, enabled: widget.enabled }} />
        </Group>
      </Group>
    </Card>
  );
}
