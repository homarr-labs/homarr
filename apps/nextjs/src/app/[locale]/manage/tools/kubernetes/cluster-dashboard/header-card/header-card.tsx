import { Card, Flex, Text, ThemeIcon } from "@mantine/core";

import { isLocaleRTL } from "@homarr/translation";
import { useCurrentLocale, useI18n } from "@homarr/translation/client";

import { HeaderIcon } from "~/app/[locale]/manage/tools/kubernetes/cluster-dashboard/header-card/header-icon";
import classes from "./header-card.module.css";

export type HeaderTypes = "providers" | "version" | "architecture";

interface HeaderCardProps {
  headerType: HeaderTypes;
  value: string;
}

export function HeaderCard(props: HeaderCardProps) {
  const tCluster = useI18n("kubernetes.cluster");
  const tField = useI18n("kubernetes.field");
  const currentLocale = useCurrentLocale();
  const isRTL = isLocaleRTL(currentLocale);
  const label = props.headerType === "architecture" ? tField("architecture.label") : tCluster(props.headerType);

  return (
    <Card className={classes.header}>
      <Flex align="center" justify={isRTL ? "space-between" : "flex-start"} gap="md" direction={"row"}>
        <ThemeIcon
          size="xl"
          variant="gradient"
          gradient={{
            deg: 0,
            from: "var(--mantine-color-blue-4)",
            to: "var(--mantine-color-blue-9)",
          }}
        >
          <HeaderIcon type={props.headerType} />
        </ThemeIcon>
        <Text size="xl" fw={500} dir={isRTL ? "rtl" : "ltr"}>
          {isRTL ? `${props.value} : ${label}` : `${label} : ${props.value}`}
        </Text>
      </Flex>
    </Card>
  );
}
