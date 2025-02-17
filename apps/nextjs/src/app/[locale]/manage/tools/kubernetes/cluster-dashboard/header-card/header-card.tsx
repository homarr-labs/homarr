import { Card, Flex, Text, ThemeIcon } from "@mantine/core";
import { IconBrandGit, IconCloudShare, IconGeometry } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import classes from "./header-card.module.css";

type HeaderTypes = "providers" | "version" | "architecture";

interface HeaderCardProps {
  headerType: HeaderTypes;
  value: string;
}

export function HeaderCard(props: HeaderCardProps) {
  const t = useI18n();

  function getIcon(headerType: HeaderTypes) {
    if (headerType === "providers") {
      return <IconCloudShare size={28} stroke={1.5} />;
    } else if (headerType === "version") {
      return <IconBrandGit size={28} stroke={1.5} />;
    }
    return <IconGeometry size={28} stroke={1.5} />;
  }

  function getLabel(headerType: HeaderTypes) {
    if (headerType === "providers") {
      return t("kubernetes.cluster.providers");
    } else if (headerType === "version") {
      return t("kubernetes.cluster.version");
    }
    return t("kubernetes.cluster.architecture");
  }

  return (
    <Card className={classes.header}>
      <Flex align="center">
        <ThemeIcon
          size="xl"
          radius="md"
          variant="gradient"
          gradient={{
            deg: 0,
            from: "var(--mantine-color-blue-4)",
            to: "var(--mantine-color-blue-9)",
          }}
        >
          {getIcon(props.headerType)}
        </ThemeIcon>
        <Text size="xl" fw={500} ml={10}>
          {getLabel(props.headerType)} : {props.value}
        </Text>
      </Flex>
    </Card>
  );
}
