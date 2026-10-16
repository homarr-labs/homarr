import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";

import { HeroBannerContent } from "./hero-banner-content";

export const HeroBanner = async () => {
  const serverSettings = await getRscServerSettingsAsync();
  const { appName, logoImageUrl } = serverSettings.branding;
  return <HeroBannerContent appName={appName} logoImageUrl={logoImageUrl} />;
};
