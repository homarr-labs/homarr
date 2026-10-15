import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";

import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";
import { auth } from "@homarr/auth/next";
import type { SupportedLanguage } from "@homarr/translation";
import { isLocaleSupported } from "@homarr/translation";

import { getCurrentColorSchemeAsync } from "~/theme/color-scheme";
import { loadRootLayoutDataAsync } from "./_root-layout-data";
import { RootLayoutView } from "./_root-layout-view";
import { createRootMetadataAsync } from "./_root-metadata";

export const generateMetadata = async (): Promise<Metadata> => {
  const [serverSettings, colorScheme] = await Promise.all([getRscServerSettingsAsync(), getCurrentColorSchemeAsync()]);
  return await createRootMetadataAsync({ serverSettings, colorScheme });
};

export const generateViewport = async (): Promise<Viewport> => {
  const serverSettings = await getRscServerSettingsAsync();
  return { themeColor: serverSettings.branding.primaryColor };
};

export default async function Layout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: SupportedLanguage }>;
}) {
  const { locale } = await props.params;
  if (!isLocaleSupported(locale)) notFound();

  const [data, colorScheme] = await Promise.all([loadRootLayoutDataAsync(auth()), getCurrentColorSchemeAsync()]);
  return (
    <RootLayoutView locale={locale} data={{ ...data, colorScheme }}>
      {props.children}
    </RootLayoutView>
  );
}
