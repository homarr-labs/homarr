import { Spotlight } from "@mantine/spotlight";

import { useI18n } from "@homarr/translation/client";

export const SpotlightNoResults = ({ className }: { className?: string }) => {
  const t = useI18n();

  return <Spotlight.Empty className={className}>{t("search.nothingFound")}</Spotlight.Empty>;
};
