"use client";

import { Spotlight } from "@homarr/spotlight";
import { useScopedI18n } from "@homarr/translation/client";
import { IconSearch } from "@homarr/ui";

export const ClientSpotlight = () => {
  const t = useScopedI18n("common.search");

  return (
    <Spotlight
      actions={[]}
      nothingFound={t("nothingFound")}
      highlightQuery
      searchProps={{
        leftSection: <IconSearch size={20} stroke={1.5} />,
        placeholder: `${t("placeholder")}...`,
      }}
      yOffset={12}
    />
  );
};
