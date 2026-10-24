import { notFound } from "next/navigation";
import { Stack } from "@mantine/core";

import { auth } from "@homarr/auth/next";
import { env } from "@homarr/docker/env";

import { KubernetesContextSelector } from "./kubernetes-context-selector";
import { getKubernetesContextsAsync } from "./kubernetes-context";

export default async function KubernetesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && env.ENABLE_KUBERNETES)) {
    notFound();
  }
  const contexts = await getKubernetesContextsAsync();

  return (
    <Stack>
      <KubernetesContextSelector initialContexts={contexts} />
      {children}
    </Stack>
  );
}
