import Link from "next/link";
import { Badge, Card, Flex, Group, rem, Stack, Text } from "@mantine/core";
import {
  IconActivity,
  IconCircleDashedCheck,
  IconCpu,
  IconCube,
  IconDeviceDesktopAnalytics,
  IconHeartBroken,
  IconVersions,
} from "@tabler/icons-react";

import { KubernetesNode } from "@homarr/definitions";

import { KubernetesNodeIcon } from "~/app/[locale]/manage/tools/kubernetes/kubernetes-icons/node-icon";
import classes from "../kubernetes.module.css";

export function NodeCard(kubernetesNode: KubernetesNode) {
  const cpuIcon = <IconCpu style={{ width: rem(16), height: rem(16) }} />;
  const ramIcon = <IconDeviceDesktopAnalytics style={{ width: rem(16), height: rem(16) }} />;
  const activityIcon = <IconActivity style={{ width: rem(12), height: rem(12) }} />;
  const checkIcon = <IconCircleDashedCheck style={{ width: rem(12), height: rem(12) }} />;
  const downIcon = <IconHeartBroken style={{ width: rem(12), height: rem(12) }} />;
  const kubernetesVersionIcon = <IconCube style={{ width: rem(15), height: rem(15) }} />;
  const agentVersionIcon = <IconVersions style={{ width: rem(15), height: rem(15) }} />;

  const badgeKubernetesNodeStatusColor = kubernetesNode.status === "Ready" ? "green" : "red";
  const badgeKubernetesNodeStatusIcon = kubernetesNode.status === "Ready" ? checkIcon : downIcon;

  return (
    <Card
      p="sm"
      shadow="md"
      withBorder
      component={Link}
      href={`/manage/tools/kubernetes/node-dashboard/${kubernetesNode.name}`}
      className={classes.cardContainer}
    >
      <Flex gap="sm">
        <Flex align="center">
          <KubernetesNodeIcon />
        </Flex>

        <Group
          grow
          styles={{
            root: {
              flex: 1,
            },
          }}
        >
          <Stack align="stretch" gap="sm">
            <Group align="center" gap="md" justify="space-between">
              <Text fw={700}>{kubernetesNode.name}</Text>

              <Badge leftSection={badgeKubernetesNodeStatusIcon} color={badgeKubernetesNodeStatusColor} variant="light">
                {kubernetesNode.status}
              </Badge>
            </Group>

            <Group align="center" gap="xs" justify="space-between">
              <Flex align="center" gap="md">
                <Flex gap="xs" justify="center" align="center">
                  {kubernetesVersionIcon}
                  <Text size="xs">Kubernetes : v{kubernetesNode.kubernetesVersion}</Text>
                </Flex>
                <Flex gap="xs" justify="center" align="center">
                  {agentVersionIcon}
                  <Text size="xs">{kubernetesNode.agentVersion}</Text>
                </Flex>
              </Flex>

              <Flex gap="xs" justify="center" align="center">
                {activityIcon}
                <Text size="xs">{kubernetesNode.lastHeartbeatTime.toLocaleString()}</Text>
              </Flex>
            </Group>

            <Flex align="center" gap="md">
              <Flex gap="xs" justify="center" align="center">
                {cpuIcon}
                <Text size="xs">{kubernetesNode.cpuCores} CPU</Text>
              </Flex>
              <Flex gap="xs" justify="center" align="center">
                {ramIcon}
                <Text size="xs">{kubernetesNode.ramGB} GB RAM</Text>
              </Flex>
            </Flex>
          </Stack>
        </Group>
      </Flex>
    </Card>
  );
}
