import { getScopedI18n } from "@homarr/translation/server";
import { Box } from "@homarr/ui";

import "@xterm/xterm/css/xterm.css";

import dynamic from "next/dynamic";

export async function generateMetadata() {
  const t = await getScopedI18n("management");
  const metaTitle = `${t("metaTitle")} • Homarr`;

  return {
    title: metaTitle,
  };
}

const ClientSideTerminalComponent = dynamic(() => import("./terminal"), {
  ssr: false,
});

export default function LogsManagementPage() {
  return (
    <div>
      <Box style={{ borderRadius: 6 }} p="md" bg="black">
        <ClientSideTerminalComponent />
      </Box>
    </div>
  );
}
