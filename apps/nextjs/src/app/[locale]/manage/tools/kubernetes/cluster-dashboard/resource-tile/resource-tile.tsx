import React from "react";
import Link from "next/link";
import { Card, Group, Text } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import { KubernetesConfigMapIcon } from "~/app/[locale]/manage/tools/kubernetes/kubernetes-icons/configmap-icon";
import { KubernetesIngressIcon } from "~/app/[locale]/manage/tools/kubernetes/kubernetes-icons/ingress-icon";
import { KubernetesNamespaceIcon } from "~/app/[locale]/manage/tools/kubernetes/kubernetes-icons/namespace-icon";
import { KubernetesNodeIcon } from "~/app/[locale]/manage/tools/kubernetes/kubernetes-icons/node-icon";
import { KubernetesPodIcon } from "~/app/[locale]/manage/tools/kubernetes/kubernetes-icons/pod-icon";
import { KubernetesSecretIcon } from "~/app/[locale]/manage/tools/kubernetes/kubernetes-icons/secret-icon";
import { KubernetesServiceIcon } from "~/app/[locale]/manage/tools/kubernetes/kubernetes-icons/service-icon";
import { KubernetesVolumeIcon } from "~/app/[locale]/manage/tools/kubernetes/kubernetes-icons/volume-icon";
import classes from "./resource-tile.module.css";

interface ResourceTileProps {
  count: number;
  label: string;
}

export function ResourceTile(props: ResourceTileProps) {
  const t = useI18n();

  const getResourceDetails = (resourceLabel: string) => {
    switch (resourceLabel) {
      case "nodes":
        return { icon: <KubernetesNodeIcon />, displayName: t("kubernetes.cluster.resources.nodes") };
      case "namespaces":
        return { icon: <KubernetesNamespaceIcon />, displayName: t("kubernetes.cluster.resources.namespaces") };
      case "ingresses":
        return { icon: <KubernetesIngressIcon />, displayName: t("kubernetes.cluster.resources.ingresses") };
      case "services":
        return { icon: <KubernetesServiceIcon />, displayName: t("kubernetes.cluster.resources.services") };
      case "pods":
        return { icon: <KubernetesPodIcon />, displayName: t("kubernetes.cluster.resources.pods") };
      case "configmaps":
        return { icon: <KubernetesConfigMapIcon />, displayName: t("kubernetes.cluster.resources.configmaps") };
      case "secrets":
        return { icon: <KubernetesSecretIcon />, displayName: t("kubernetes.cluster.resources.secrets") };
      case "volumes":
        return { icon: <KubernetesVolumeIcon />, displayName: t("kubernetes.cluster.resources.volumes") };
      default:
        return { icon: null, displayName: resourceLabel };
    }
  };

  const { icon, displayName } = getResourceDetails(props.label);

  return (
    <Card
      withBorder
      component={Link}
      href={`/manage/tools/kubernetes/${props.label}`}
      className={classes.cardContainer}
    >
      <Group justify="space-between" wrap="nowrap">
        {icon}
        <Group gap="xs">
          <Text size="xl" fw={700} tt="capitalize">
            {props.count} {displayName}
          </Text>
          <IconArrowRight />
        </Group>
      </Group>
    </Card>
  );
}
