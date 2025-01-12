"use client";

import { Stack, Title } from "@mantine/core";

import { KubernetesNode } from "@homarr/definitions";

import { NodeCard } from "~/app/[locale]/manage/tools/kubernetes/node-components/node-card";

export function KubernetesTable(kubernetesNodes: KubernetesNode[]) {
  const nodesArray = Object.values(kubernetesNodes);
  return (
    <>
      <Stack bg="var(--mantine-color-body)">
        <Title>Nodes</Title>
        {nodesArray.map((kubernetesNode: KubernetesNode) => (
          <NodeCard {...kubernetesNode} key={kubernetesNode.name} />
        ))}
      </Stack>
    </>
  );
}
