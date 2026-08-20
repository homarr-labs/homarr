import { Box, Group } from "@mantine/core";

import { getScopedI18n } from "@homarr/translation/server";

import "@xterm/xterm/css/xterm.css";

import { notFound } from "next/navigation";

import { auth } from "@homarr/auth/next";
import { logsEnv } from "@homarr/core/infrastructure/logs/env";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { fullHeightWithoutHeaderAndFooter } from "~/constants";
import { createMetaTitle } from "~/metadata";
import { ClientSideTerminalComponent } from "./client";
import { LogFontSizeSlider } from "./font-size-slider";
import { LogLevelSelection } from "./level-selection";
import { LogContextProvider } from "./log-context";

export async function generateMetadata() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    return {};
  }
  const t = await getScopedI18n("management");

  return {
    title: createMetaTitle(t("metaTitle")),
  };
}

interface LogsManagementPageProps {
  searchParams: Promise<{ focus?: string }>;
}

export default async function LogsManagementPage({ searchParams }: LogsManagementPageProps) {
  const session = await auth();
  if (!session?.user.permissions.includes("other-view-logs")) {
    notFound();
  }

  const parsedFocusTimestamp = Number((await searchParams).focus);
  const focusTimestamp =
    Number.isSafeInteger(parsedFocusTimestamp) && parsedFocusTimestamp > 0 ? parsedFocusTimestamp : undefined;

  return (
    <LogContextProvider defaultLevel={logsEnv.LEVEL}>
      <Group justify="space-between" align="center" wrap="nowrap">
        <DynamicBreadcrumb />
        <Group gap="md" wrap="nowrap">
          <LogFontSizeSlider />
          <LogLevelSelection />
        </Group>
      </Group>
      <Box style={{ borderRadius: 6 }} h={fullHeightWithoutHeaderAndFooter} p="md" bg="black">
        <ClientSideTerminalComponent focusTimestamp={focusTimestamp} />
      </Box>
    </LogContextProvider>
  );
}
