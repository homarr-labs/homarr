import { Box } from "@mantine/core";

import { getScopedI18n } from "@homarr/translation/server";

import "@xterm/xterm/css/xterm.css";

import dynamic from "next/dynamic";

import { fullHeightWithoutHeaderAndFooter } from "~/constants";
import { createMetaTitle } from "~/metadata";

export async function generateMetadata() {
  const t = await getScopedI18n("management");

  return {
    title: createMetaTitle(t("metaTitle")),
  };
}

const ClientSideTerminalComponent = dynamic(() => import("./terminal"), {
  ssr: false,
});

export default function LogsManagementPage() {
  return (
    <Box style={{ borderRadius: 6 }} h={fullHeightWithoutHeaderAndFooter} p="md" bg="black">
      <ClientSideTerminalComponent />
    </Box>
  );
}
