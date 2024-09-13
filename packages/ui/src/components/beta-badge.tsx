import type { BadgeProps } from "@mantine/core";
import { Badge } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

interface BetaBadgeProps {
  size: BadgeProps["size"];
}

export const BetaBadge = ({ size }: BetaBadgeProps) => {
  const t = useI18n();
  return (
    <Badge size={size} color="green" variant="outline">
      {t("common.beta")}
    </Badge>
  );
};
