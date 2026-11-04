import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Stack } from "@mantine/core";

import { auth } from "@homarr/auth/next";
import { env } from "@homarr/docker/env";

import { KubernetesContextSelector } from "./kubernetes-context-selector";
import { getKubernetesContextsAsync } from "./kubernetes-context";
import { kubernetesContextCookieName } from "./kubernetes-context.constants";

export default async function KubernetesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && env.ENABLE_KUBERNETES)) {
    notFound();
  }
  const [contexts, cookieStore] = await Promise.all([getKubernetesContextsAsync(), cookies()]);

  return (
    <Stack>
      <KubernetesContextSelector
        initialContexts={contexts}
        initialContextId={cookieStore.get(kubernetesContextCookieName)?.value ?? null}
      />
      {children}
    </Stack>
  );
}
