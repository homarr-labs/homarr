import { Box, Group } from "@mantine/core";

import { getI18n } from "@homarr/translation/server";

import "@xterm/xterm/css/xterm.css";

import { notFound } from "next/navigation";

import { auth } from "@homarr/auth/next";
import { logsEnv } from "@homarr/core/infrastructure/logs/env";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { fullHeightWithoutHeaderAndFooter } from "~/constants";
import { ClientSideTerminalComponent } from "./client";
import { LogFontSizeSlider } from "./font-size-slider";
import { LogLevelSelection } from "./level-selection";
import { LogContextProvider } from "./log-context";

export async function generateMetadata() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    return {};
  }
  const t = await getI18n("management");

  return {
    title: t("metaTitle"),
  };
}

interface LogsManagementPageProps {
  searchParams: Promise<{ focus?: string | string[] }>;
}

export default async function LogsManagementPage({ searchParams }: LogsManagementPageProps) {
  const session = await auth();
  if (!session?.user.permissions.includes("other-view-logs")) {
    notFound();
  }

  const focus = (await searchParams).focus;
  let focusTimestamp: number | undefined;
  if (typeof focus === "string") {
    const parsedFocusTimestamp = Number(focus);
    if (Number.isSafeInteger(parsedFocusTimestamp) && parsedFocusTimestamp > 0) {
      focusTimestamp = parsedFocusTimestamp;
    }
  }

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
