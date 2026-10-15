import type { Metadata } from "next";

import { getI18n } from "@homarr/translation/server";

import { env } from "~/env";
import type { RootLayoutData } from "./_root-layout-data";

export const createRootMetadataAsync = async ({
  serverSettings,
  colorScheme,
}: Pick<RootLayoutData, "serverSettings" | "colorScheme">): Promise<Metadata> => {
  const t = await getI18n("metadata");
  const { appName, faviconImageUrl, logoImageUrl } = serverSettings.branding;
  const logo = logoImageUrl ?? "/logo/logo.png";
  const favicon = faviconImageUrl ?? logo;
  const description = t("description");

  return {
    title: {
      default: appName,
      template: `%s • ${appName}`,
    },
    description,
    openGraph: {
      title: t("dashboardTitle", { appName }),
      description,
      url: env.HOMARR_WEBSITE_URL,
      siteName: appName,
    },
    icons: {
      icon: favicon,
      apple: logo,
    },
    appleWebApp: {
      title: appName,
      capable: true,
      startupImage: { url: logo },
      statusBarStyle: colorScheme === "dark" ? "black-translucent" : "default",
    },
  };
};
