"use client";

import { openSpotlight } from "@homarr/spotlight";
import { useScopedI18n } from "@homarr/translation/client";
import { IconSearch, TextInput, UnstyledButton } from "@homarr/ui";

import { HeaderButton } from "./button";
import classes from "./search.module.css";

export const DesktopSearchInput = () => {
  const t = useScopedI18n("common.search");

  return (
    <TextInput
      component={UnstyledButton}
      className={classes.desktopSearch}
      w={400}
      size="sm"
      leftSection={<IconSearch size={20} stroke={1.5} />}
      onClick={openSpotlight}
    >
      {t("placeholder")}
    </TextInput>
  );
};

export const MobileSearchButton = () => {
  return (
    <HeaderButton onClick={openSpotlight} className={classes.mobileSearch}>
      <IconSearch size={20} stroke={1.5} />
    </HeaderButton>
  );
};
