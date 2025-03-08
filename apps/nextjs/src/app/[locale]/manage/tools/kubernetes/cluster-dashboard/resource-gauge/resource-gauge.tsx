import React from "react";
import { Group, Paper, Progress, Text, ThemeIcon } from "@mantine/core";
import { IconCpu, IconCube, IconDeviceDesktopAnalytics } from "@tabler/icons-react";

import type { KubernetesCapacity, KubernetesCapacityType } from "@homarr/definitions";
import { isLocaleRTL } from "@homarr/translation";
import { useCurrentLocale, useI18n } from "@homarr/translation/client";

import classes from "./resource-gauge.module.css";

interface KubernetesResourceGaugeProps {
  kubernetesCapacity: KubernetesCapacity;
}

export function ResourceGauge(props: KubernetesResourceGaugeProps) {
  const t = useI18n();
  const currentLocale = useCurrentLocale();
  const isRTL = Boolean(isLocaleRTL(currentLocale));

  return (
    <Paper radius="md" withBorder className={classes.paper} mt={20}>
      <ThemeIcon className={classes.icon} size={60} radius={60} bg={"#326ce5"}>
        {getCapacityIcon(props.kubernetesCapacity.type)}
      </ThemeIcon>

      <Text ta="center" fw={700} className={classes.title}>
        {props.kubernetesCapacity.type}
      </Text>

      {props.kubernetesCapacity.resourcesStats.map((stat) => {
        const isReserved = stat.type === "Reserved";
        const labelKey = isReserved
          ? "kubernetes.cluster.capacity.resource.reserved"
          : "kubernetes.cluster.capacity.resource.used";

        return (
          <div key={stat.percentageValue}>
            <Group justify={"space-between"} mt="xs">
              <Text fz="sm" c="dimmed">
                {isRTL ? (
                  <>
                    {stat.capacityUnit && (
                      <Text component="span" mr={4}>
                        {stat.capacityUnit}
                      </Text>
                    )}
                    <Text component="span">
                      {stat.maxUsedValue} / {stat.usedValue}{" "}
                    </Text>
                    <Text component="span" fw={500}>
                      {t(labelKey)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text component="span" fw={500}>
                      {t(labelKey)}
                    </Text>
                    <Text component="span">
                      {" "}
                      {stat.usedValue} / {stat.maxUsedValue}{" "}
                    </Text>
                    {stat.capacityUnit && (
                      <Text component="span" ml={4}>
                        {stat.capacityUnit}
                      </Text>
                    )}
                  </>
                )}
              </Text>
              <Text fz="sm" c="dimmed">
                {isRTL ? `%${stat.percentageValue}` : `${stat.percentageValue}%`}
              </Text>
            </Group>
            <Progress value={stat.percentageValue} mt={5} color={getProgressBarColor(stat.percentageValue)} />
          </div>
        );
      })}
    </Paper>
  );
}

function getProgressBarColor(value: number): string {
  if (value > 50 && value < 65) {
    return "yellow";
  } else if (value >= 65) {
    return "red";
  }
  return "blue";
}

function getCapacityIcon(capacityType: KubernetesCapacityType): React.ReactNode {
  if (capacityType === "CPU") {
    return <IconCpu size={32} stroke={1.5} />;
  } else if (capacityType === "Memory") {
    return <IconDeviceDesktopAnalytics size={32} stroke={1.5} />;
  }
  return <IconCube size={32} stroke={1.5} />;
}
