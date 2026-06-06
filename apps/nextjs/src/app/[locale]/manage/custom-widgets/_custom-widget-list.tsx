"use client";

import { Badge, Group, Stack, Table, Text } from "@mantine/core";
import { IconApi } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { useScopedI18n } from "@homarr/translation/client";

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
    <Stack gap="md">
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("table.name")}</Table.Th>
            <Table.Th>{t("table.baseUrl")}</Table.Th>
            <Table.Th>{t("table.endpoint")}</Table.Th>
            <Table.Th>{t("table.display")}</Table.Th>
            <Table.Th w={50} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {definitions.map((def) => (
            <Table.Tr key={def.id}>
              <Table.Td>
                <Group gap="xs">
                  <IconApi size={16} />
                  <Text size="sm" fw={500} lineClamp={1}>
                    {def.name}
                  </Text>
                </Group>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed" lineClamp={1}>
                  {def.baseUrl}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed" lineClamp={1}>
                  {def.endpoint}
                </Text>
              </Table.Td>
              <Table.Td>
                <Badge color={displayTypeBadgeColors[def.displayType] ?? "gray"} size="sm">
                  {t(`displayType.${def.displayType}` as never)}
                </Badge>
              </Table.Td>
              <Table.Td>
                <CustomWidgetRowActions widget={{ id: def.id, name: def.name }} />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
};
