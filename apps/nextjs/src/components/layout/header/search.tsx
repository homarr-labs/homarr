"use client";

import { TextInput, UnstyledButton } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

import { openSpotlight } from "@homarr/spotlight/open";
import { useI18n } from "@homarr/translation/client";

import { HeaderButton } from "./button";
import classes from "./search.module.css";

export const DesktopSearchInput = () => {
  const t = useI18n();

  return (
    <TextInput
      data-homarr-dev-benchmark-interaction="search"
      component={UnstyledButton}
      className={classes.desktopSearch}
      w={400}
      size="sm"
      leftSection={<IconSearch size={20} stroke={1.5} />}
      onClick={() => openSpotlight()}
      radius="xl"
    >
      {`${t("search.placeholder")}...`}
    </TextInput>
  );
};

export const MobileSearchButton = ({ alwaysVisible = false }: { alwaysVisible?: boolean }) => {
  const t = useI18n();
  return (
    <HeaderButton
      data-homarr-dev-benchmark-interaction="search"
      onClick={() => openSpotlight()}
      className={alwaysVisible ? undefined : classes.mobileSearch}
      aria-label={t("search.placeholder")}
    >
      <IconSearch size={20} stroke={1.5} />
    </HeaderButton>
  );
};
