import type { PropsWithChildren } from "react";
import { AppShellMain } from "@mantine/core";

import { MainHeader } from "~/components/layout/header";
import { ClientShell } from "~/components/layout/shell";

export default function MainLayout({ children }: PropsWithChildren) {
  return (
    <ClientShell hasNavigation={false}>
      <MainHeader />
      <AppShellMain>{children}</AppShellMain>
    </ClientShell>
  );
}
