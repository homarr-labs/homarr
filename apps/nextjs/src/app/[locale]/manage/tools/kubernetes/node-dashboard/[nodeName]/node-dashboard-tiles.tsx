import React from "react";
import Link from "next/link";
import { Card, Group, Text } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";

import classes from "../../kubernetes.module.css";

interface KubernetesProps {
  icon: React.ReactNode;
  count: number;
  label: string;
  nodeName: string;
}

export function NodeDashboardTiles(props: KubernetesProps) {
  return (
    <Card
      withBorder
      component={Link}
      href={`/manage/tools/kubernetes/node-dashboard/${props.nodeName}/${props.label}`}
      className={classes.cardContainer}
    >
      <Group justify="space-between" wrap="nowrap">
        {props.icon}
        <Group gap="xs">
          <Text size="xl" fw={700} tt="capitalize">
            {props.count} {props.label}
          </Text>
          <IconArrowRight />
        </Group>
      </Group>
    </Card>
  );
}
