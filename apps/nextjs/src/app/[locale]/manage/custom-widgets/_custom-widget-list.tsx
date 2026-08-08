"use client";

import { ActionIcon, Avatar, Badge, Card, Group, Stack, Switch, Text, Tooltip } from "@mantine/core";
import { IconAlertTriangle, IconApi, IconPencil, IconSparkles } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import { NoResults } from "~/components/no-results";
import { CustomWidgetRowActions } from "./_custom-widget-actions";

interface CustomWidgetListProps {
  definitions: RouterOutputs["customWidget"]["list"];
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
  );
};

type WidgetDef = RouterOutputs["customWidget"]["list"][number];

function CustomWidgetCard({ widget }: { widget: WidgetDef }) {
  const t = useScopedI18n("customWidget");
  const toggleMutation = clientApi.customWidget.toggleEnabled.useMutation();
  const utils = clientApi.useUtils();

  const handleToggle = () => {
    toggleMutation.mutate(
      { id: widget.id, enabled: !widget.enabled },
      {
        onSuccess: async () => {
          await utils.widget.customApi.getData.cancel();
          void utils.customWidget.list.invalidate();
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
      withBorder={!widget.valid}
      bd={
        widget.migrationRequired
          ? "1px solid var(--mantine-color-yellow-6)"
          : !widget.valid
            ? "1px solid var(--mantine-color-red-6)"
            : undefined
      }
      style={{
        opacity: widget.valid && !widget.enabled ? 0.55 : 1,
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
            {widget.migrationRequired ? (
              <Text size="xs" c="yellow.8">
                {t("page.list.migrationDescription")}
              </Text>
            ) : !widget.valid ? (
              <Text size="xs" c="red">
                {t("page.list.invalidDefinitionDescription")}
              </Text>
            ) : null}
            {widget.sources[0] && (
              <Text size="xs" c="dimmed" ff="monospace" lineClamp={1} style={{ wordBreak: "break-all", minWidth: 0 }}>
                {widget.sources.map((source) => source.origin).join(" · ")}
              </Text>
            )}
          </Stack>
          {widget.migrationRequired ? (
            <Tooltip label={t("page.list.migrationInstructions")} multiline maw={420}>
              <Badge
                color="yellow"
                size="sm"
                variant="light"
                leftSection={<IconSparkles size={12} />}
                style={{ flexShrink: 0 }}
              >
                {t("page.list.migrationRequired")}
              </Badge>
            </Tooltip>
          ) : widget.valid ? (
            <Badge color="pink" size="sm" variant="light" style={{ flexShrink: 0 }}>
              JSX · {widget.requestCount}
            </Badge>
          ) : (
            <Tooltip
              label={widget.validationIssues
                .map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message))
                .join("\n")}
              multiline
              maw={520}
            >
              <Badge
                color="red"
                size="sm"
                variant="light"
                leftSection={<IconAlertTriangle size={12} />}
                style={{ flexShrink: 0 }}
              >
                {t("page.list.invalidDefinition")}
              </Badge>
            </Tooltip>
          )}
          {widget.missingSecrets.length > 0 && (
            <Tooltip
              label={t("page.list.missingCredentialsDescription", { count: widget.missingSecrets.length })}
              multiline
              maw={320}
            >
              <Badge
                color="yellow"
                size="sm"
                variant="light"
                leftSection={<IconAlertTriangle size={12} />}
                style={{ flexShrink: 0 }}
              >
                {t("page.list.missingCredentials", { count: widget.missingSecrets.length })}
              </Badge>
            </Tooltip>
          )}
        </Group>

        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
          {widget.valid && (
            <>
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
            </>
          )}
          <CustomWidgetRowActions
            widget={{
              id: widget.id,
              name: widget.name,
              enabled: widget.enabled,
              valid: widget.valid,
              migrationRequired: widget.migrationRequired,
            }}
          />
        </Group>
      </Group>
    </Card>
  );
}
