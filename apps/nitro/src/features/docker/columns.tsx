import { Avatar, Badge, Box, Group, Text, Tooltip } from "@mantine/core";
import type { MRT_ColumnDef } from "mantine-react-table";

import { formatBytes } from "@homarr/common/number";
import type { ByteUnitSystem } from "@homarr/common/number";
import { containerStateColorMap, cpuUsageColor, memoryUsageColor, safeValue } from "@homarr/docker/shared";
import type { TranslationFunction } from "@homarr/translation/standalone";

import { OverflowBadge } from "../../../../../packages/ui/src/components/overflow-badge";
import type { DockerContainer } from "./client";

export function createDockerColumns(
  t: TranslationFunction,
  byteUnit: ByteUnitSystem,
): MRT_ColumnDef<DockerContainer>[] {
  return [
    {
      accessorKey: "name",
      header: t("common.field.name"),
      Cell: ({ row }) => (
        <Group gap="xs" wrap="nowrap">
          <Avatar
            src={row.original.iconUrl}
            size="md"
            radius="sm"
            variant="outline"
            styles={{ image: { objectFit: "contain" } }}
          >
            {row.original.name.at(0)?.toUpperCase()}
          </Avatar>
          <Text truncate maw={500}>
            {row.original.name}
          </Text>
        </Group>
      ),
    },
    {
      accessorKey: "state",
      header: t("docker.field.state.label"),
      size: 120,
      Cell: ({ row }) => (
        <Badge size="lg" radius="sm" variant="light" w={120} color={containerStateColorMap[row.original.state]}>
          {t(`docker.field.state.option.${row.original.state}`)}
        </Badge>
      ),
    },
    {
      accessorKey: "host",
      header: t("docker.field.host.label"),
      size: 140,
      Cell: ({ row }) => (
        <Text truncate title={row.original.host}>
          {row.original.host}
        </Text>
      ),
    },
    {
      accessorKey: "image",
      header: t("docker.field.containerImage.label"),
      maxSize: 200,
      Cell: ({ row }) => (
        <Tooltip label={row.original.image} multiline maw={400}>
          <Box maw={200}>
            <Text truncate="end">{row.original.image}</Text>
          </Box>
        </Tooltip>
      ),
    },
    {
      accessorKey: "ports",
      header: t("docker.field.ports.label"),
      Cell: ({ row }) => {
        if (!row.original.ports?.length) return null;
        return <OverflowBadge overflowCount={1} data={row.original.ports.map((port) => port.PrivatePort.toString())} />;
      },
    },
    {
      accessorKey: "cpuUsage",
      header: "CPU",
      size: 120,
      sortingFn: (left, right) => safeValue(left.original.cpuUsage) - safeValue(right.original.cpuUsage),
      Cell: ({ row }) => (
        <Text size="sm" c={cpuUsageColor(safeValue(row.original.cpuUsage), row.original.state)}>
          {safeValue(row.original.cpuUsage).toFixed(2)}%
        </Text>
      ),
    },
    {
      accessorKey: "memoryUsage",
      header: t("docker.field.stats.memory.label"),
      size: 140,
      sortingFn: (left, right) => safeValue(left.original.memoryUsage) - safeValue(right.original.memoryUsage),
      Cell: ({ row }) => (
        <Text size="sm" c={memoryUsageColor(safeValue(row.original.memoryUsage), row.original.state)}>
          {formatBytes(safeValue(row.original.memoryUsage), { unit: byteUnit })}
        </Text>
      ),
    },
  ];
}
