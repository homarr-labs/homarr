import { Suspense } from "react";
import { Stack } from "@mantine/core";

import { KubernetesContextSelector } from "./kubernetes-context-selector";

export default function KubernetesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Stack>
      <Suspense fallback={null}>
        <KubernetesContextSelector />
      </Suspense>
      {children}
    </Stack>
  );
}
