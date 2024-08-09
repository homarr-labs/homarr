import SuperJSON from "superjson";

import { db, eq } from "@homarr/db";
import { serverSettings } from "@homarr/db/schema/sqlite";
import type { defaultServerSettings } from "@homarr/server-settings";

export const SearchEngineOptimization = async () => {
  const analyticSetting = await db.query.serverSettings.findFirst({
    where: eq(serverSettings.settingKey, "analytics"),
  });

  if (!analyticSetting) {
    return null;
  }

  const value = SuperJSON.parse<(typeof defaultServerSettings)["crawlingAndIndexing"]>(analyticSetting.value);

  const robotsAttributes = [...(value.noIndex ? ["noindex"] : []), ...(value.noIndex ? ["nofollow"] : [])];

  const googleAttributes = [
    ...(value.noSiteLinksSearchBox ? ["nositelinkssearchbox"] : []),
    ...(value.noTranslate ? ["notranslate"] : []),
  ];

  return (
    <>
      <meta name="robots" content={robotsAttributes.join(",")} />
      <meta name="google" content={googleAttributes.join(",")} />
    </>
  );
};
