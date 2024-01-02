"use client";

import { spotlight } from "@homarr/spotlight";
import { useScopedI18n } from "@homarr/translation/client";
import { ActionIcon, IconSearch, TextInput, UnstyledButton } from "@homarr/ui";

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
      onClick={spotlight.open}
    >
      {t("placeholder")}
    </TextInput>
  );
};

export const MobileSearchButton = () => {
  return (
    <ActionIcon
      className={classes.mobileSearch}
      variant="subtle"
      color="gray"
      onClick={spotlight.open}
    >
      <IconSearch size={20} stroke={1.5} />
    </ActionIcon>
  );
};
