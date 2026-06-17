"use client";

import { useEffect } from "react";
import { ActionIcon, Avatar, Badge, Group, Stack, Table, Text } from "@mantine/core";
import { IconApi, IconPencil } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { customWidgetImportSchema } from "@homarr/validation/custom-widget";

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

const iconProps = { size: 16, stroke: 1.5 };

interface CustomWidgetListProps {
  definitions: RouterOutputs["customWidget"]["all"];
}

export const CustomWidgetList = ({ definitions }: CustomWidgetListProps) => {
  const t = useScopedI18n("customWidget");
  const utils = clientApi.useUtils();
  const importMutation = clientApi.customWidget.import.useMutation({
    onSuccess: () => {
      showSuccessNotification({ title: t("action.paste"), message: "Custom widget imported" });
      void utils.customWidget.all.invalidate();
      void revalidatePathActionAsync("/manage/custom-widgets");
    },
    onError: (err) => {
      showErrorNotification({ title: t("action.paste"), message: err.message || "Failed to import" });
    },
  });

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const raw = e.clipboardData?.getData("text/plain");
      if (!raw) return;
      let parsed: unknown;
      try { parsed = JSON.parse(raw); } catch { return; }
      const result = customWidgetImportSchema.safeParse(parsed);
      if (!result.success) return;
      e.preventDefault();
      importMutation.mutate(result.data);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [importMutation]);

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
    <Stack gap="md">
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("table.name")}</Table.Th>
            <Table.Th>{t("table.url")}</Table.Th>
            <Table.Th>{t("table.display")}</Table.Th>
            <Table.Th w={90} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {definitions.map((def) => (
            <Table.Tr key={def.id} style={{ opacity: def.enabled ? undefined : 0.5 }}>
              <Table.Td>
                <Group gap="xs" wrap="nowrap">
                  {def.iconUrl ? (
                    <Avatar size={20} radius="sm" src={def.iconUrl} styles={{ image: { objectFit: "contain" } }} />
                  ) : (
                    <IconApi size={16} />
                  )}
                  <Text size="sm" fw={500} lineClamp={1} c={def.enabled ? undefined : "dimmed"} style={{ minWidth: 0 }}>
                    {def.name}
                  </Text>
                </Group>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed" lineClamp={1}>
                  {def.url}
                </Text>
              </Table.Td>
              <Table.Td>
                <Badge color={displayTypeBadgeColors[def.displayType] ?? "gray"} size="sm">
                  {t(`displayType.${def.displayType}` as never)}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group gap={4} justify="flex-end" wrap="nowrap">
                  <ActionIcon
                    component={Link}
                    href={`/manage/custom-widgets/edit/${def.id}`}
                    variant="filled"
                    color="red"
                    aria-label={t("action.edit")}
                  >
                    <IconPencil {...iconProps} />
                  </ActionIcon>
                  <CustomWidgetRowActions widget={{ id: def.id, name: def.name, enabled: def.enabled }} />
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
};
