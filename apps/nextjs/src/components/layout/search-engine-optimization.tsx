import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";

export const SearchEngineOptimization = async () => {
  const { crawlingAndIndexing: crawlingAndIndexingSetting } = await getRscServerSettingsAsync();

  const robotsAttributes: string[] = [];

  if (crawlingAndIndexingSetting.noIndex) {
    robotsAttributes.push("noindex");
  }

  if (crawlingAndIndexingSetting.noFollow) {
    robotsAttributes.push("nofollow");
  }

  const googleAttributes: string[] = [];

  if (crawlingAndIndexingSetting.noSiteLinksSearchBox) {
    googleAttributes.push("nositelinkssearchbox");
  }

  if (crawlingAndIndexingSetting.noTranslate) {
    googleAttributes.push("notranslate");
  }

  return (
    <>
      <meta name="robots" content={robotsAttributes.join(",")} />
      <meta name="google" content={googleAttributes.join(",")} />
    </>
  );
};
