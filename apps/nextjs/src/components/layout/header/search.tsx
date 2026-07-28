"use client";

import { TextInput, UnstyledButton } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

import { openSpotlight } from "@homarr/spotlight";
import { useI18n } from "@homarr/translation/client";

import { useIsMobileBoard } from "../../board/use-mobile-board";
import { HeaderButton } from "./button";
import classes from "./search.module.css";

export const DesktopSearchInput = () => {
  const t = useI18n();
  const isMobileBoard = useIsMobileBoard();

  if (isMobileBoard) return null;

  return (
    <TextInput
      component={UnstyledButton}
      className={classes.desktopSearch}
      w={400}
      size="sm"
      leftSection={<IconSearch size={20} stroke={1.5} />}
      onClick={openSpotlight}
      radius="xl"
    >
      {`${t("search.placeholder")}...`}
    </TextInput>
  );
};

export const MobileSearchButton = () => {
  const t = useI18n();
  const isMobileBoard = useIsMobileBoard();

  return (
    <HeaderButton
      onClick={openSpotlight}
      className={isMobileBoard ? undefined : classes.mobileSearch}
      aria-label={t("search.placeholder")}
    >
      <IconSearch size={20} stroke={1.5} />
    </HeaderButton>
  );
};
