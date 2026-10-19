"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Anchor, AppShell, AppShellHeader, AppShellMain, Breadcrumbs, Group, Text } from "@mantine/core";
import { IconHomeFilled, IconPlugConnected } from "@tabler/icons-react";
import { useAtomValue } from "jotai";

import { Link } from "@homarr/ui";

import { appShellHeaderHeight } from "~/components/layout/constants";
import { ClientBurger, navigationCollapsedAtom } from "~/components/layout/header/burger";
import { homarrLogoPath } from "~/components/layout/logo/constants";
import { LogoWithTitle } from "~/components/layout/logo/logo";
import { MainNavigation } from "~/components/layout/navigation";
import { ManagePageLayout } from "~/components/manage/manage-page-layout";

import { useWorkerWorkspace } from "./context";
import { WorkerSetup } from "./setup";

export function WorkerManagementPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { initialLink = "", clearInitialLink } = useWorkerWorkspace();
  let initialTab = params.get("tab") ?? "overview";
  if (initialTab === "workers") initialTab = "overview";
  if (initialTab === "organizations") initialTab = "users";
  if (initialTab === "account") initialTab = "mcp";
  if (!["overview", "users", "sharing", "connection", "mcp"].includes(initialTab)) initialTab = "overview";
  if (initialLink) initialTab = "connection";
  return (
    <ManagePageLayout
      title="Worker"
      breadcrumb={
        <Breadcrumbs mb="md">
          <Anchor component={Link} href="/manage" aria-label="Management home">
            <IconHomeFilled size={18} />
          </Anchor>
          <Text size="sm">Worker</Text>
        </Breadcrumbs>
      }
    >
      <WorkerSetup
        initialLink={initialLink}
        initialTab={initialTab}
        onClose={() => {
          clearInitialLink?.();
          router.push("/boards");
        }}
      />
    </ManagePageLayout>
  );
}

/** Worker setup remains available before a worker can supply the normal Homarr settings. */
export function DisconnectedWorkersPage() {
  const collapsed = useAtomValue(navigationCollapsedAtom);
  return (
    <AppShell
      header={{ height: appShellHeaderHeight }}
      navbar={{ width: 300, breakpoint: "sm", collapsed: { mobile: collapsed } }}
      padding="xs"
    >
      <AppShellHeader>
        <Group h="100%" px="md" gap="md">
          <ClientBurger />
          <LogoWithTitle
            size="md"
            title="Homarr"
            image={{ src: homarrLogoPath, alt: "Homarr logo", shouldUseNextImage: true }}
          />
        </Group>
      </AppShellHeader>
      <MainNavigation links={[{ label: "Worker", icon: IconPlugConnected, href: "/manage/workers" }]} />
      <AppShellMain>
        <WorkerManagementPage />
      </AppShellMain>
    </AppShell>
  );
}
