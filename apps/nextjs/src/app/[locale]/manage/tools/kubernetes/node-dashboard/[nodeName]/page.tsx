import { SimpleGrid, Title } from "@mantine/core";

import { KubernetesConfigMapIcon } from "~/app/[locale]/manage/tools/kubernetes/kubernetes-icons/configmap-icon";
import { KubernetesIngressIcon } from "~/app/[locale]/manage/tools/kubernetes/kubernetes-icons/ingress-icon";
import { KubernetesNamespaceIcon } from "~/app/[locale]/manage/tools/kubernetes/kubernetes-icons/namespace-icon";
import { KubernetesPodIcon } from "~/app/[locale]/manage/tools/kubernetes/kubernetes-icons/pod-icon";
import { KubernetesSecretIcon } from "~/app/[locale]/manage/tools/kubernetes/kubernetes-icons/secret-icon";
import { KubernetesServiceIcon } from "~/app/[locale]/manage/tools/kubernetes/kubernetes-icons/service-icon";
import { KubernetesVolumeIcon } from "~/app/[locale]/manage/tools/kubernetes/kubernetes-icons/volume-icon";
import { NodeDashboardTiles } from "~/app/[locale]/manage/tools/kubernetes/node-dashboard/[nodeName]/node-dashboard-tiles";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";

interface NodeDashboardPageProps {
  params: Promise<{ nodeName: string }>;
}

export default async function NodeDashboardPage(props: NodeDashboardPageProps) {
  const params = await props.params;

  const nodeDashboardNavigationLinks = [
    {
      label: "namespaces",
      icon: <KubernetesNamespaceIcon />,
      count: 10,
    },
    {
      label: "ingresses",
      icon: <KubernetesIngressIcon />,
      count: 4,
    },
    {
      label: "services",
      icon: <KubernetesServiceIcon />,
      count: 4,
    },
    {
      label: "pods",
      icon: <KubernetesPodIcon />,
      count: 20,
    },
    {
      label: "secrets",
      icon: <KubernetesSecretIcon />,
      count: 10,
    },
    {
      label: "configmaps",
      icon: <KubernetesConfigMapIcon />,
      count: 13,
    },
    {
      label: "volumes",
      icon: <KubernetesVolumeIcon />,
      count: 0,
    },
  ];

  return (
    <>
      <DynamicBreadcrumb
        dynamicMappings={new Map([[params.nodeName, params.nodeName]])}
        nonInteractable={["node-dashboard"]}
      />
      <Title>Node dashboard</Title>

      <SimpleGrid cols={{ xs: 1, sm: 2, md: 3 }} p="md">
        {nodeDashboardNavigationLinks.map((link) => (
          <NodeDashboardTiles
            icon={link.icon}
            count={link.count}
            label={link.label}
            nodeName={params.nodeName}
            key={link.label}
          />
        ))}
      </SimpleGrid>
    </>
  );
}
